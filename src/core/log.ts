export interface Logger {
  /** Shown when the "debug" setting is on, and always in dev builds. */
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  setDebug(on: boolean): void;
}

/**
 * `[nyte:<ns> +123ms]`-prefixed console logger. The elapsed time is since the document started
 * (performance.now()), so the boot timeline can be read off the console. Debug lines use
 * console.log, not console.debug: Chrome DevTools hides the "Verbose" level by default.
 */
export function createLogger(ns: string, debugEnabled = false): Logger {
  let debug = debugEnabled;
  const prefix = (): string => {
    const elapsed = typeof performance !== "undefined" ? ` +${Math.round(performance.now())}ms` : "";
    return `[nyte:${ns}${elapsed}]`;
  };
  return {
    debug: (...args) => {
      if (debug) console.log(prefix(), ...args);
    },
    info: (...args) => console.info(prefix(), ...args),
    warn: (...args) => console.warn(prefix(), ...args),
    error: (...args) => console.error(prefix(), ...args),
    setDebug: (on) => {
      debug = on;
    },
  };
}

export const silentLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  setDebug: () => undefined,
};
