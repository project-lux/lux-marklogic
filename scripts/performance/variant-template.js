'use strict';

// This template may be used to gather metrics on an optimization idea.  This is a preliminary
// step to validate or invalidate an approach.  Typically, such variants are created and tested
// while collaborating with an LLM and those demonstrating potential are then further vetted,
// starting with the /scripts/performance/benchmark-template-optic.js.  See the "LLM Kickoff"
// section in /docs/lux-optic-primer.md for more details.
//
// Why this exists:
// - Every variant should report its own timing and cardinality metrics.
// - Keep this script standalone so ideas can be proven before engine changes.
//
// How to use:
// 1) Copy into an investigation folder under /scratch/performance/.
// 2) Rename the file (for example: variant-9-my-idea.js).
// 3) Replace the "Variant Logic" section only.
// 4) Run in Query Console and compare the metrics object across variants.

import op from 'MarkLogic/optic.mjs';

//#region Configuration

const scenario = 'Variant Template: replace with your idea name';
const targetId =
  'https://lux.collections.yale.edu/data/object/0006363c-3ee0-401f-afab-cb3892698e92';
const offset = 0;
const limit = 20;

// Repeat runs in one execution to reduce noise and produce min/max/avg.
const runs = 5;

// Keep true for fast comparisons. Set false only when inspecting rows.
const includeRows = false;

//#endregion Configuration

//#region Metrics helpers

function nowMs() {
  return Number(fn.currentDateTime() - xs.dateTime('1970-01-01T00:00:00'));
}

function stats(values) {
  if (!values || values.length === 0) {
    return { runs: 0, min: 0, max: 0, avg: 0, stddev: 0 };
  }

  const n = values.length;
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / n;
  const variance =
    values.reduce((acc, x) => acc + (x - avg) * (x - avg), 0) / n;
  return {
    runs: n,
    min: Math.min(...values),
    max: Math.max(...values),
    avg: Math.round(avg),
    stddev: Math.round(Math.sqrt(variance)),
  };
}

function runOne() {
  const marks = {};
  const phase = (name, fnToRun) => {
    const t0 = nowMs();
    const value = fnToRun();
    const t1 = nowMs();
    marks[name] = t1 - t0;
    return value;
  };

  // --- Variant Logic (replace this section) ---

  const la = op.prefixer('https://linked.art/ns/terms/');
  const lux = op.prefixer('https://lux.collections.yale.edu/ns/');

  // Phase 1: Resolve first hop via CTS triples
  const setIris = phase('phase1_innerHopCtsMs', () =>
    cts
      .triples(
        [],
        [la('member_of')],
        [],
        '=',
        ['eager', 'concurrent'],
        cts.documentQuery([targetId]),
      )
      .toArray()
      .map((t) => sem.tripleObject(t)),
  );

  // Phase 2: Resolve second hop via CTS triples
  const agentIris = phase('phase2_outerHopCtsMs', () =>
    cts
      .triples(
        setIris.concat(sem.iri('/does/not/exist')),
        [lux('agentOfCuration')],
        [],
        '=',
        ['eager', 'concurrent'],
      )
      .toArray()
      .map((t) => sem.tripleObject(t)),
  );

  // Phase 3: Final plan/query execution
  const rows = phase('phase3_opticFinishMs', () =>
    op
      .fromSearch(
        cts.andQuery([
          cts.jsonPropertyValueQuery(
            'dataType',
            ['Person', 'Group'],
            ['exact'],
          ),
          cts.documentQuery(agentIris.map(String).concat('/does/not/exist')),
        ]),
      )
      .joinInner(
        op.fromLexicons(
          {
            uri: cts.uriReference(),
            dataType: cts.fieldReference('anyDataTypeName', [
              'type=string',
              'collation=http://marklogic.com/collation/codepoint',
            ]),
          },
          null,
          op.fragmentIdCol('frag'),
        ),
        op.on(op.fragmentIdCol('fragmentId'), op.fragmentIdCol('frag')),
      )
      .groupBy(['uri'], [op.sample('dataType', op.col('dataType'))])
      .select([op.as('id', op.col('uri')), op.as('type', op.col('dataType'))])
      .offset(offset)
      .limit(limit)
      .result()
      .toArray(),
  );

  // Optional correctness probe. Keeps parity checks close to each run.
  const estimate = phase('phase4_estimateMs', () =>
    cts.estimate(
      cts.andQuery([
        cts.jsonPropertyValueQuery('dataType', ['Person', 'Group'], ['exact']),
        cts.documentQuery(agentIris.map(String).concat('/does/not/exist')),
      ]),
    ),
  );

  // --- End Variant Logic ---

  const totalMs = Object.values(marks).reduce((a, b) => a + b, 0);

  return {
    marks,
    totalMs,
    counts: {
      setIris: setIris.length,
      agentIris: agentIris.length,
      rowCount: rows.length,
      estimate,
    },
    rows,
  };
}

//#endregion Metrics helpers

//#region Execute and summarize

const runResults = [];
for (let i = 0; i < runs; i += 1) {
  runResults.push(runOne());
}

const totalMsSeries = runResults.map((r) => r.totalMs);
const phaseNames = Object.keys(runResults[0].marks);
const phaseStats = {};
phaseNames.forEach((name) => {
  phaseStats[name] = stats(runResults.map((r) => r.marks[name]));
});

const latest = runResults[runResults.length - 1];

const results = {
  scenario,
  runs,
  totalsMs: stats(totalMsSeries),
  phasesMs: phaseStats,
  latestCounts: latest.counts,
  rows: includeRows ? latest.rows : undefined,
  guidance: {
    compare: ['totalsMs', 'phasesMs', 'latestCounts'],
    note: 'Keep includeRows=false during timing comparisons.',
  },
};

export default results;

//#endregion Execute and summarize
