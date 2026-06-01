const UNSAFE_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Throws if a path segment could lead to prototype pollution.
 */
export function assertSafeSegment(segment: string): void {
	if (UNSAFE_SEGMENTS.has(segment)) {
		throw new Error(`Unsafe path segment rejected: "${segment}"`);
	}
}
