/**
 * Arbiter-internal paths start with $ and are not user-facing form data.
 * Filter them out of write intents.
 */
export function isArbiterInternalPath(path: string): boolean {
  return path.startsWith("$") && !path.startsWith("$ui.");
}
