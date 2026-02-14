/**
 * Development-only logger. No-ops in production to avoid leaking info and console noise.
 */
const isDev = import.meta.env.DEV;

export const logger = {
  debug: (...args: unknown[]) => isDev && console.log(...args),
  warn: (...args: unknown[]) => isDev && console.warn(...args),
  error: (...args: unknown[]) => isDev && console.error(...args),
};
