import { describe, expect, test } from "vitest";
import { z } from "zod";
import { createSchemaForm } from "../create-schema-form.js";
import { normalizeEnumOptions } from "../enum-options.js";

describe("normalizeEnumOptions", () => {
	test("falls back to string labels when enumOptions are absent", () => {
		expect(normalizeEnumOptions({ enum: ["any", "documents"] })).toEqual([
			{ value: "any", label: "any" },
			{ value: "documents", label: "documents" },
		]);
	});

	test("merges partial enumOptions without adding validation values", () => {
		const options = normalizeEnumOptions({
			enum: ["any", "documents"],
			enumOptions: [
				{ value: "documents", label: "Documents", disabled: true, description: "Document fields only" },
				{ value: "images", label: "Images" },
			],
		});

		expect(options).toEqual([
			{ value: "any", label: "any" },
			{ value: "documents", label: "Documents", disabled: true, description: "Document fields only" },
		]);
	});

	test("preserves primitive enum value types", () => {
		const options = normalizeEnumOptions({
			enum: [0, true, null],
			enumOptions: [{ value: 0, label: "Zero" }],
		});

		expect(options).toEqual([
			{ value: 0, label: "Zero" },
			{ value: true, label: "true" },
			{ value: null, label: "null" },
		]);
	});
});

describe("formbar enumOptions metadata", () => {
	test("elevates JSON Schema x-formbar enumOptions metadata", () => {
		const result = createSchemaForm({
			type: "object",
			properties: {
				scope: {
					enum: ["any", "documents"],
					"x-formbar": {
						enumOptions: [{ value: "documents", label: "Documents" }],
					},
				},
			},
		});

		expect(result.fields[0]?.metadata?.enumOptions).toEqual([{ value: "documents", label: "Documents" }]);
		expect(result.fields[0]?.metadata?.extensions).toBeUndefined();
	});

	test("elevates Zod formbar enumOptions metadata", () => {
		const result = createSchemaForm(
			z.object({
				scope: z.enum(["any", "documents"]).meta({
					formbar: {
						enumOptions: [{ value: "any", label: "Any" }],
					},
				}),
			}),
		);

		expect(result.fields[0]?.metadata?.enumOptions).toEqual([{ value: "any", label: "Any" }]);
		expect(result.fields[0]?.metadata?.enum).toEqual(["any", "documents"]);
	});
});
