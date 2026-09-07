import type { Candidate, ReleasePlan } from "./types";

export type JsonObject = Record<string, unknown>;

export async function readJsonResponse(response: Response, context: string): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		throw new Error(`${context} returned invalid JSON`);
	}
}

export function expectObject(value: unknown, context: string): JsonObject {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${context} must be a JSON object`);
	return value as JsonObject;
}

export function expectString(value: unknown, context: string): string {
	if (typeof value !== "string") throw new Error(`${context} must be a string`);
	return value;
}

export function expectBoolean(value: unknown, context: string): boolean {
	if (typeof value !== "boolean") throw new Error(`${context} must be a boolean`);
	return value;
}

export function optionalString(value: unknown, context: string): string | undefined {
	if (value === undefined) return undefined;
	return expectString(value, context);
}

export function optionalStringArray(value: unknown, context: string): string[] | undefined {
	if (value === undefined) return undefined;
	if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
		throw new Error(`${context} must be an array of strings`);
	}
	return value as string[];
}

function parseCandidate(value: unknown, index: number): Candidate {
	const item = expectObject(value, `release plan candidate ${index}`);
	const tagAction = item.tagAction;
	const releaseAction = item.releaseAction;
	if (tagAction !== "create" && tagAction !== "none")
		throw new Error(`release plan candidate ${index} has invalid tagAction`);
	if (releaseAction !== "create" && releaseAction !== "none") {
		throw new Error(`release plan candidate ${index} has invalid releaseAction`);
	}
	return {
		name: expectString(item.name, `release plan candidate ${index} name`),
		version: expectString(item.version, `release plan candidate ${index} version`),
		directory: expectString(item.directory, `release plan candidate ${index} directory`),
		tag: expectString(item.tag, `release plan candidate ${index} tag`),
		notes: expectString(item.notes, `release plan candidate ${index} notes`),
		prerelease: expectBoolean(item.prerelease, `release plan candidate ${index} prerelease`),
		releaseCommit: expectString(item.releaseCommit, `release plan candidate ${index} releaseCommit`),
		tagAction,
		releaseAction,
	};
}

export function parseReleasePlan(value: unknown): ReleasePlan {
	const plan = expectObject(value, "release plan");
	if (plan.schemaVersion !== 1) throw new Error("release plan has an unsupported schemaVersion");
	if (!Array.isArray(plan.candidates)) throw new Error("release plan candidates must be an array");
	return {
		schemaVersion: 1,
		repository: expectString(plan.repository, "release plan repository"),
		releaseCommit: expectString(plan.releaseCommit, "release plan releaseCommit"),
		candidates: plan.candidates.map(parseCandidate),
	};
}
