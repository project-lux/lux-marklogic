class StopWatch {
  constructor(start = false) {
    this.LAP_NAME_START = 'START';
    this.LAP_NAME_LAST = 'LAST';
    this.LAP_NAME_STOP = 'STOP';
    this.RESERVED_LAP_NAMES = [
      this.LAP_NAME_START,
      this.LAP_NAME_LAST,
      this.LAP_NAME_STOP,
    ];
    this.reset();
    if (start === true) {
      this.start();
    }
  }

  reset() {
    this.lapsMap = new Map();
  }

  start() {
    const start = new Date().getTime();
    this.lapsMap.set(this.LAP_NAME_START, start);
    this.lapsMap.set(this.LAP_NAME_LAST, start);
    return 0;
  }

  // Capture and return the named lap's elapsed time.
  lap(lapName, mayAddTo = false) {
    if (this.RESERVED_LAP_NAMES.includes(lapName)) {
      throw new Error(`'${lapName} is a reserved lap name.`);
    }
    if (this.lapsMap.get(this.LAP_NAME_LAST) == null) {
      throw new Error('Call start() first.');
    }

    const lapDuration = this.lapsMap.get(lapName) || 0;
    if (lapDuration > 0 && !mayAddTo) {
      throw new Error(`Lap '${lapName}' already exists.`);
    }

    const previousTotal = this.lapsMap.get(this.LAP_NAME_LAST);
    const durationSinceLast = new Date().getTime() - previousTotal;
    this.lapsMap.set(lapName, lapDuration + durationSinceLast);
    this.lapsMap.set(this.LAP_NAME_LAST, previousTotal + durationSinceLast);
    return durationSinceLast; // Return could also include lapDuration.
  }

  addTo(lapName) {
    return this.lap(lapName, true);
  }

  // stops the stop watch and returns the total elapsed time.
  stop() {
    this.lapsMap.set(this.LAP_NAME_STOP, new Date().getTime());
    return this.totalElapsed();
  }

  lapElapsed(lapName) {
    return this.lapsMap.has(lapName) ? this.lapsMap.get(lapName) : -1;
  }

  totalElapsed() {
    return (
      this.lapsMap.get(this.LAP_NAME_STOP) -
      this.lapsMap.get(this.LAP_NAME_START)
    );
  }

  lapsToObject() {
    const obj = {};
    const exclude = this.RESERVED_LAP_NAMES;
    this.lapsMap.forEach(function (value, key) {
      if (!exclude.includes(key)) {
        obj[key] = value;
      }
    });
    return obj;
  }
}

export { StopWatch };
