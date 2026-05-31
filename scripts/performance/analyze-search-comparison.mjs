#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * analyze-search-comparison.mjs
 *
 * Read a search comparison JSON (produced by the perf comparison tooling) and emit
 * a Markdown analysis grouping the slowest tests by query pattern shape.
 *
 * Scoped to the search endpoint (/api/search/{scope}); non-search entries are skipped.
 *
 * Usage:
 *   node scripts/performance/analyze-search-comparison.mjs <comparison.json> [options]
 *
 * Options:
 *   --output <file>         Write Markdown to <file> (default: stdout)
 *   --config <path>         Path to searchTermsConfigOptic.mjs
 *                           (default: scratch/config/searchTermsConfigOptic.mjs)
 *   --patterns-dir <path>   Repo-relative path used for pattern links in the output
 *                           (default: src/main/ml-modules/root/lib/search/patterns)
 *   --top-detail <N>        Render detailed sections only for the N largest groups
 *                           (default: all)
 *   --help                  Show this help
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

// -------------------- CLI parsing --------------------

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  printHelpAndExit(0);
}

const opts = {
  input: null,
  output: null,
  config: 'scratch/config/searchTermsConfigOptic.mjs',
  patternsDir: 'src/main/ml-modules/root/lib/search/patterns',
  topDetail: Infinity,
};

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--output') opts.output = args[++i];
  else if (a === '--config') opts.config = args[++i];
  else if (a === '--patterns-dir') opts.patternsDir = args[++i];
  else if (a === '--top-detail') opts.topDetail = Number(args[++i]);
  else if (a.startsWith('--')) {
    console.error(`Unknown option: ${a}`);
    printHelpAndExit(2);
  } else if (!opts.input) opts.input = a;
  else {
    console.error(`Unexpected positional argument: ${a}`);
    printHelpAndExit(2);
  }
}

if (!opts.input) {
  console.error('Missing required <comparison.json> argument.');
  printHelpAndExit(2);
}

function printHelpAndExit(code) {
  const here = url.fileURLToPath(import.meta.url);
  const text = fs.readFileSync(here, 'utf8');
  // Print the leading comment block.
  const block = text.match(/^\/\*\*[\s\S]*?\*\//);
  console.error(block ? block[0] : 'See header comment.');
  process.exit(code);
}

// -------------------- Load inputs --------------------

const repoRoot = findRepoRoot(process.cwd());
const inputPath = path.resolve(opts.input);
const configPath = path.isAbsolute(opts.config)
  ? opts.config
  : path.join(repoRoot, opts.config);

if (!fs.existsSync(inputPath)) {
  console.error(`Input not found: ${inputPath}`);
  process.exit(2);
}
if (!fs.existsSync(configPath)) {
  console.error(`searchTermsConfigOptic.mjs not found: ${configPath}`);
  process.exit(2);
}

const comparison = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const configText = fs.readFileSync(configPath, 'utf8');

function findRepoRoot(start) {
  let dir = start;
  for (let i = 0; i < 20; i++) {
    if (fs.existsSync(path.join(dir, 'build.gradle'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

// -------------------- Parse searchTermsConfigOptic.mjs --------------------

// Build maps:
//   termMap:    "scope.term" -> patternName
//   targetMap:  "scope.term" -> targetScope (for hops)
//
// The config file is regular: top-level scope keys at fixed indent, terms one level
// deeper, and `patternName: '...'` / `targetScope: '...'` lines within each term block.
//
// We do not eval the file (it imports MarkLogic-only modules); a textual scan suffices
// because the file is generated and has a consistent shape.

const SCOPE_NAMES = new Set([
  'agent',
  'concept',
  'event',
  'item',
  'place',
  'reference',
  'set',
  'work',
]);

const termMap = new Map();
const targetMap = new Map();

{
  const lines = configText.split(/\r?\n/);
  let currentScope = null;
  let scopeIndent = -1;
  let pendingTerm = null;
  const termOpenRe = /^(\s+)([A-Za-z_][A-Za-z0-9_]*):\s*\{\s*$/;
  const patternRe = /^\s+patternName:\s*'([^']+)'/;
  const targetRe = /^\s+targetScope:\s*'([^']+)'/;
  for (const line of lines) {
    const m = line.match(termOpenRe);
    if (m) {
      const indent = m[1].length;
      const name = m[2];
      if (SCOPE_NAMES.has(name) && indent <= 6) {
        currentScope = name;
        scopeIndent = indent;
        pendingTerm = null;
        continue;
      }
      if (currentScope && indent === scopeIndent + 2) {
        pendingTerm = name;
        continue;
      }
    }
    if (pendingTerm) {
      const p = line.match(patternRe);
      if (p) {
        const key = `${currentScope}.${pendingTerm}`;
        if (!termMap.has(key)) termMap.set(key, p[1]);
      }
      const t = line.match(targetRe);
      if (t) {
        const key = `${currentScope}.${pendingTerm}`;
        if (!targetMap.has(key)) targetMap.set(key, t[1]);
      }
      // Don't clear pendingTerm on the patternName line: targetScope may follow.
      // Clear when the next term opens (handled above).
    }
  }
}

// patternName -> source file name (camelCase patternName matches PascalCase file).
const PATTERN_FILE = {
  annTopK: 'AnnTopK.mjs',
  dateRange: 'DateRange.mjs',
  documentIdOrIri: 'DocumentIdOrIri.mjs',
  geospatial: 'Geospatial.mjs',
  hopInverse: 'HopInverse.mjs',
  hopWithField: 'HopWithField.mjs',
  indexedRange: 'IndexedRange.mjs',
  indexedValue: 'IndexedValue.mjs',
  indexedWord: 'IndexedWord.mjs',
  keyword: 'Keyword.mjs',
};

// PascalCase display name from patternName.
function patternDisplayName(p) {
  const f = PATTERN_FILE[p];
  return f ? f.replace(/\.mjs$/, '') : p;
}
function patternLink(p) {
  const f = PATTERN_FILE[p];
  if (!f) return `\`${p}\``;
  const dir = opts.patternsDir.startsWith('/')
    ? opts.patternsDir
    : `/${opts.patternsDir}`;
  return `[${patternDisplayName(p)}](${dir}/${f})`;
}

// -------------------- Walk comparison entries --------------------

const slowestBase = comparison.slowest_baseline_analysis ?? [];
const slowestCurr = comparison.slowest_current_analysis ?? [];
const union = new Map(); // test_name -> row

for (const entry of [...slowestBase, ...slowestCurr]) {
  const name = entry.test_name;
  if (!name || union.has(name)) continue;
  const u = entry.baseline_url ?? entry.current_url ?? '';
  const scope = extractSearchScope(u);
  if (!scope) continue; // skip non-search-endpoint entries
  const criteria = decodeCriteria(u);
  union.set(name, {
    test: name,
    scope,
    baseline: entry.baseline_duration ?? null,
    current: entry.current_duration ?? null,
    baselineStatus: entry.baseline_status ?? null,
    currentStatus: entry.current_status ?? null,
    criteria,
  });
}

function extractSearchScope(u) {
  const m = u.match(/\/api\/search\/([^/?]+)/);
  return m ? m[1] : null;
}

function decodeCriteria(u) {
  try {
    const qIdx = u.indexOf('?q=');
    if (qIdx < 0) return null;
    const tail = u.slice(qIdx + 3);
    const end = tail.indexOf('&');
    const raw = end < 0 ? tail : tail.slice(0, end);
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

// -------------------- Classify each test --------------------

const STOP_KEYS = new Set([
  '_lang',
  '_complete',
  '_options',
  '_scope',
  '_stemmed',
  '_weight',
]);
const LOGIC_KEYS = new Set(['AND', 'OR', 'NOT']);

function classify(row) {
  const patterns = new Set();
  const terms = new Set();
  const logics = new Set();
  if (!row.criteria) return { patterns, terms, logics, parseError: true };
  let obj;
  try {
    obj = JSON.parse(row.criteria);
  } catch {
    return { patterns, terms, logics, parseError: true };
  }
  walk(obj, row.scope, patterns, terms, logics);
  return { patterns, terms, logics, parseError: false };
}

function walk(node, scope, patterns, terms, logics) {
  if (node == null) return;
  if (Array.isArray(node)) {
    for (const x of node) walk(x, scope, patterns, terms, logics);
    return;
  }
  if (typeof node !== 'object') return;
  for (const [name, value] of Object.entries(node)) {
    if (LOGIC_KEYS.has(name)) {
      logics.add(name);
      walk(value, scope, patterns, terms, logics);
      continue;
    }
    if (STOP_KEYS.has(name)) continue;
    if (name === 'id') {
      patterns.add('documentIdOrIri');
      terms.add('id');
      continue;
    }
    terms.add(name);
    const key = `${scope}.${name}`;
    const patternName = termMap.get(key);
    if (patternName) patterns.add(patternName);
    else patterns.add(`UNKNOWN(${key})`);
    const childScope = targetMap.get(key) ?? scope;
    walk(value, childScope, patterns, terms, logics);
  }
}

// -------------------- Group & summarize --------------------

const rows = [];
for (const row of union.values()) {
  const c = classify(row);
  const ratio =
    row.baseline > 0 && row.current != null
      ? Math.round((row.current / row.baseline) * 10) / 10
      : null;
  rows.push({
    ...row,
    ratio,
    patterns: [...c.patterns].sort(),
    terms: [...c.terms].sort(),
    logics: [...c.logics].sort(),
    parseError: c.parseError,
  });
}

// Group key: terms + logics produces stable shape buckets.
const groups = new Map();
for (const r of rows) {
  const key = `${r.terms.join(',')} | ${r.logics.join(',')}`;
  if (!groups.has(key))
    groups.set(key, { key, members: [], patterns: r.patterns });
  groups.get(key).members.push(r);
}

const groupList = [...groups.values()]
  .map((g) => {
    const m = g.members;
    const baselines = m.map((x) => x.baseline).filter((x) => x != null);
    const currents = m.map((x) => x.current).filter((x) => x != null);
    const ratios = m.map((x) => x.ratio).filter((x) => x != null);
    const scopes = [...new Set(m.map((x) => x.scope))].sort();
    return {
      ...g,
      n: m.length,
      scopes,
      baseMin: Math.min(...baselines),
      baseMax: Math.max(...baselines),
      currMin: currents.length ? Math.min(...currents) : null,
      currMax: currents.length ? Math.max(...currents) : null,
      avgRatio: ratios.length
        ? Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 10) /
          10
        : null,
      maxRatio: ratios.length ? Math.max(...ratios) : null,
    };
  })
  .sort((a, b) => {
    // Impact = avgRatio * n (severity × volume). Ties broken by maxRatio then n.
    const impactA = (a.avgRatio ?? 0) * a.n;
    const impactB = (b.avgRatio ?? 0) * b.n;
    return (
      impactB - impactA || (b.maxRatio ?? 0) - (a.maxRatio ?? 0) || b.n - a.n
    );
  });

// Number groups sequentially.
groupList.forEach((g, i) => {
  g.shape = i + 1;
  g.description = shapeDescription(g);
});

// Produce a human-friendly shape description (markdown-flavoured) from terms+logics.
function shapeDescription(g) {
  const terms = g.members[0]?.terms ?? [];
  const logics = g.members[0]?.logics ?? [];
  const nonIdTerms = terms.filter((t) => t !== 'id');

  // Special cases for keyword shapes.
  if (terms.length === 1 && terms[0] === 'text' && logics.length === 0) {
    return 'single `text` keyword';
  }
  if (terms.length === 1 && terms[0] === 'text' && logics.includes('AND')) {
    return 'multi-`text` AND';
  }

  const ttick = (t) => `\`${t}\``;
  const termList = (terms.length ? terms : ['?']).map(ttick).join(', ');

  // Degenerate single-term in AND (1-element AND wrapper).
  if (nonIdTerms.length === 1 && logics.length === 1 && logics[0] === 'AND') {
    return `\`${nonIdTerms[0]}.id\` in 1-element AND`;
  }
  // Single naked hop by id.
  if (nonIdTerms.length === 1 && logics.length === 0 && terms.includes('id')) {
    return `naked \`${nonIdTerms[0]}.id\``;
  }
  if (logics.length === 0) {
    return termList;
  }
  return `${logics.join('+')}(${termList})`;
}

// -------------------- Render markdown --------------------

const out = [];
const meta = comparison.metadata ?? {};
const summary = comparison.summary ?? {};
const dp = comparison.detailed_performance ?? {};

const totalTests =
  summary.test_count?.baseline ?? summary.test_count?.current ?? '?';
const baselineLabel = meta.baseline_dir ?? meta.baseline_file ?? 'baseline';
const currentLabel = meta.current_dir ?? meta.current_file ?? 'current';

const totalUnion = rows.length;
const severe = rows.filter((r) => r.ratio != null && r.ratio >= 10).length;
const flips = rows.filter(
  (r) => r.currentStatus && r.currentStatus !== 'PASS',
).length;
const sev = bucket(rows);

function bucket(rs) {
  const r = { fail: 0, severe: 0, moderate: 0, mild: 0, unscored: 0 };
  for (const x of rs) {
    if (x.currentStatus && x.currentStatus !== 'PASS') r.fail++;
    else if (x.ratio == null) r.unscored++;
    else if (x.ratio >= 10) r.severe++;
    else if (x.ratio >= 3) r.moderate++;
    else r.mild++;
  }
  return r;
}

// Title — H2 + bold so VS Code TOC generators (which honour plain H1/H2) skip it.
// Placed immediately above the TOC; real sections below the TOC start at H1.
out.push(`## **Search Comparison: Pattern-Level Analysis**`);
out.push('');

// -------- TOC (auto-generated) --------
out.push('## Contents');
out.push('');
out.push('- [Input](#input)');
out.push('- [Scope of this analysis](#scope-of-this-analysis)');
out.push(
  `- [Aggregate (full ${totalTests} tests)](#aggregate-full-${totalTests}-tests)`,
);
out.push('- [Severity distribution](#severity-distribution)');
out.push(
  `- [Pattern shapes — ${totalUnion}-test union](#pattern-shapes--${totalUnion}-test-union)`,
);
out.push('- [Detailed per-shape analysis](#detailed-per-shape-analysis)');
// Sub-entries added once group anchors are known (see below).
const tocShapeIdx = out.length;
out.push(''); // placeholder line for sub-toc; replaced later
out.push('');

// -------- Input --------
out.push('# Input');
out.push('');
out.push(
  `Source: \`${path.relative(repoRoot, inputPath).replace(/\\/g, '/')}\``,
);
out.push(
  `- baseline: \`${baselineLabel}\` (${meta.baseline_timestamp ?? 'n/a'})`,
);
out.push(
  `- current:  \`${currentLabel}\` (${meta.current_timestamp ?? 'n/a'})`,
);
out.push(`- generated: ${new Date().toISOString()}`);
out.push('');

// -------- Scope --------
out.push(`# Scope of this analysis`);
out.push('');
out.push(
  `- Source contains \`slowest_baseline_analysis\` and \`slowest_current_analysis\` (top-100 each).`,
);
out.push(
  `- This analysis covers the **union of those two lists, restricted to /api/search/{scope} = ${totalUnion} distinct tests**.`,
);
out.push(
  `- The middle of the ${totalTests}-test distribution is not visible per-test in this JSON, so this view is tail-biased. Aggregate stats below reflect all ${totalTests}.`,
);
out.push(
  `- Within the union: **${flips} functional regression(s)** (non-PASS in current) and **${severe} tests with ≥10× regression**.`,
);
out.push('');

// -------- Aggregate --------
out.push(`# Aggregate (full ${totalTests} tests)`);
out.push('');
out.push('| Metric | Baseline | Current | Δ |');
out.push('|---|---|---|---|');
const mean = dp.statistical_metrics?.mean;
if (mean) out.push(rowAgg('Mean', mean.baseline, mean.current));
const pct = dp.percentiles ?? {};
for (const k of ['p50', 'p90', 'p95', 'p99', 'p99.9']) {
  if (pct[k]) out.push(rowAgg(k, pct[k].baseline, pct[k].current));
}
if (summary.pass_rate) {
  out.push(
    `| Pass rate | ${summary.pass_rate.baseline}% | ${summary.pass_rate.current}% | ${summary.pass_rate.change} |`,
  );
}
out.push('');

function rowAgg(label, b, c) {
  if (b == null || c == null) return `| ${label} | ${b} | ${c} | — |`;
  const delta = b > 0 ? `+${Math.round(((c - b) / b) * 100)}%` : '—';
  const bold = label === 'p99.9' || label === 'Mean' ? '**' : '';
  return `| ${label} | ${b} ms | ${c} ms | ${bold}${delta}${bold} |`;
}

// -------- Severity distribution (moved up per request) --------
out.push(`# Severity distribution`);
out.push('');
out.push(`Bucketed counts across the ${totalUnion}-test union.`);
out.push('');
out.push('| Severity | Count | Notes |');
out.push('|---|---|---|');
out.push(`| Functional fail | ${sev.fail} | status != PASS in current |`);
out.push(`| Severe (≥10× ratio) | ${sev.severe} | |`);
out.push(`| Moderate (3–10×) | ${sev.moderate} | |`);
out.push(`| Mild (<3×) | ${sev.mild} | |`);
out.push(
  `| Unscored | ${sev.unscored} | missing baseline or current duration |`,
);
out.push('');

// -------- Shape table --------
out.push(`# Pattern shapes — ${totalUnion}-test union`);
out.push('');
out.push(
  `Rows ordered by impact (avg ratio × n), then max ratio. Pattern files live in [${opts.patternsDir}](/${opts.patternsDir}).`,
);
out.push('');
out.push(
  '| # | Shape | Patterns | n | scopes | base range (ms) | curr range (ms) | avg ratio | max ratio |',
);
out.push('|---|---|---|---|---|---|---|---|---|');
for (const g of groupList) {
  const patterns = g.patterns.map(patternLink).join(', ');
  const anchor = sectionAnchor(g);
  const numCell = `[${g.shape}](#${anchor})`;
  const baseRange = `${g.baseMin}–${g.baseMax}`;
  const currRange =
    g.currMin == null
      ? '—'
      : g.currMin === g.currMax
        ? `${g.currMin}`
        : `${g.currMin}–${g.currMax}`;
  out.push(
    `| ${numCell} | ${g.description} | ${patterns} | ${g.n} | ${g.scopes.join(',')} | ${baseRange} | ${currRange} | ${g.avgRatio ?? '—'}× | ${g.maxRatio ?? '—'}× |`,
  );
}
out.push('');
out.push(
  `Total: ${totalUnion} tests across ${groupList.length} distinct shapes.`,
);
out.push('');

function slug(s) {
  // Match GitHub / VS Code preview slugifier: lowercase, strip punctuation
  // (do NOT replace it with `-`), then convert whitespace to `-` without
  // collapsing runs (VS Code preserves them).
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s/g, '-');
}

function sectionAnchor(g) {
  return slug(sectionHeaderText(g));
}

function sectionHeaderText(g) {
  const ratio =
    g.maxRatio == null
      ? ''
      : ` (n=${g.n}, avg ${g.avgRatio}×, max ${g.maxRatio}×)`;
  return `Shape ${g.shape} - ${g.description}${ratio}`;
}

// -------- Detailed sections --------
out.push(`# Detailed per-shape analysis`);
out.push('');
const detailGroups = Number.isFinite(opts.topDetail)
  ? groupList.slice(0, opts.topDetail)
  : groupList;
for (const g of detailGroups) {
  out.push(`## ${sectionHeaderText(g)}`);
  out.push('');
  out.push(`- Patterns: ${g.patterns.map(patternLink).join(', ')}`);
  out.push(`- Scopes: ${g.scopes.join(', ')}`);
  out.push(
    `- Baseline range: ${g.baseMin}–${g.baseMax} ms; current range: ${g.currMin == null ? '—' : `${g.currMin}–${g.currMax}`} ms`,
  );
  if (g.avgRatio != null) {
    out.push(`- Ratio: avg ${g.avgRatio}×, max ${g.maxRatio}×`);
  }
  const sorted = [...g.members].sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0));
  const showN = Math.min(5, sorted.length);
  out.push('');
  out.push(`Worst ${showN} of ${g.n}:`);
  out.push('');
  out.push('| Test | scope | base (ms) | curr (ms) | ratio | currStatus |');
  out.push('|---|---|---|---|---|---|');
  for (const m of sorted.slice(0, showN)) {
    out.push(
      `| ${m.test} | ${m.scope} | ${m.baseline ?? '—'} | ${m.current ?? '—'} | ${m.ratio ?? '—'}× | ${m.currentStatus ?? '—'} |`,
    );
  }
  const worst = sorted[0];
  if (worst?.criteria) {
    out.push('');
    out.push(`Example criteria (test \`${worst.test}\`):`);
    out.push('');
    out.push('```json');
    try {
      out.push(JSON.stringify(JSON.parse(worst.criteria), null, 2));
    } catch {
      out.push(worst.criteria);
    }
    out.push('```');
  }
  out.push('');
}

if (detailGroups.length < groupList.length) {
  out.push(
    `_(${groupList.length - detailGroups.length} additional shape(s) omitted; rerun without \`--top-detail\` to include them.)_`,
  );
  out.push('');
}

// Inject the TOC sub-entries for detailed sections now that anchors exist.
const tocSubLines = detailGroups
  .map((g) => `  - [${sectionHeaderText(g)}](#${sectionAnchor(g)})`)
  .join('\n');
out[tocShapeIdx] = tocSubLines;

// Write output
const md = out.join('\n');
if (opts.output) {
  fs.writeFileSync(path.resolve(opts.output), md);
  console.error(`Wrote ${opts.output}`);
} else {
  process.stdout.write(md);
}
