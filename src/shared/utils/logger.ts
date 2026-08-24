/**
 * Structured JSON logger mapping output metadata.
 */
export const logger = {
  info(meta: Record<string, unknown>, message: string): void {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "INFO",
        ...meta,
        message,
      })
    );
  },

  warn(meta: Record<string, unknown>, message: string): void {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "WARN",
        ...meta,
        message,
      })
    );
  },

  error(meta: Record<string, unknown>, message: string): void {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "ERROR",
        ...meta,
        message,
      })
    );
  },
};
