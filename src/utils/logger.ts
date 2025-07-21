export const log = (...args: unknown[]): void => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args);
  }
};

export const error = (...args: unknown[]): void => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(...args);
  }
};

export default { log, error };
