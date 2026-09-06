import { describe, expect, it } from "vitest";
import { getPreset } from "../playground/presets";
import {
	applySources,
	createPlaygroundSession,
	resetLiveForm,
	resetSession,
	updateSource,
} from "../playground/session";

function presetDocument() {
	const preset = getPreset("basic-contact");
	if (!preset) throw new Error("missing test preset");
	return preset.document;
}

describe("playground session", () => {
	it("keeps the last document and revision when any source fails", () => {
		const original = createPlaygroundSession(presetDocument());
		const invalid = updateSource(updateSource(original, "schema", "{}"), "rules", "not-json");
		const result = applySources(invalid);
		expect(result.applied).toBe(original.applied);
		expect(result.revision).toBe(0);
		expect(result.errors.rules).toBeTruthy();
	});

	it("applies atomically and increments revision only on apply and resets", () => {
		const original = createPlaygroundSession(presetDocument());
		const edited = updateSource(original, "initialData", '{"name":"Ada"}');
		const applied = applySources(edited);
		expect(applied.applied.initialData).toEqual({ name: "Ada" });
		expect(applied.revision).toBe(1);
		expect(resetLiveForm(applied).revision).toBe(2);
		expect(resetSession(applied, presetDocument()).revision).toBe(2);
	});
});
