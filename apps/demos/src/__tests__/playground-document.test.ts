import { describe, expect, it } from "vitest";
import { SOURCE_LIMIT_BYTES } from "../playground/contracts";
import { parseDocument, stringifyDocument } from "../playground/document";
import { getPreset } from "../playground/presets";

function validSources() {
	const preset = getPreset("basic-contact");
	if (!preset) throw new Error("missing test preset");
	return stringifyDocument(preset.document);
}

describe("playground document", () => {
	it.each([
		["schema", "[]", "object"],
		["layout", "[]", "object or null"],
		["rules", "{}", "array"],
		["initialData", "[]", "object"],
		["initialUiState", "null", "object"],
	] as const)("reports a shape error for %s", (key, value, message) => {
		const result = parseDocument({ ...validSources(), [key]: value });
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.errors[key]).toContain(message);
	});

	it("reports strict JSON errors against their source", () => {
		const result = parseDocument({ ...validSources(), rules: "[trailing,]" });
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.errors.rules).toBeTruthy();
	});

	it("rejects custom layout nodes and oversized sources", () => {
		const custom = parseDocument({ ...validSources(), layout: '{"type":"tabs","id":"root"}' });
		expect(custom.ok).toBe(false);
		if (!custom.ok) expect(custom.errors.layout).toContain("built-in node");
		const huge = parseDocument({ ...validSources(), schema: `{"value":"${"x".repeat(SOURCE_LIMIT_BYTES)}"}` });
		expect(huge.ok).toBe(false);
		if (!huge.ok) expect(huge.errors.schema).toContain("exceeds");
	});
});
