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

	test("preserves Zod wrapper enumOptions with inner enum values", () => {
		const result = createSchemaForm(
			z.object({
				scope: z
					.enum(["any", "documents"])
					.optional()
					.meta({
						formbar: {
							enumOptions: [{ value: "documents", label: "Documents" }],
						},
					}),
			}),
		);

		const field = result.fields.find((item) => item.path === "scope");
		expect(field?.required).toBe(false);
		expect(field?.metadata?.enum).toEqual(["any", "documents"]);
		expect(field?.metadata?.enumOptions).toEqual([{ value: "documents", label: "Documents" }]);
		expect(normalizeEnumOptions(field?.metadata)).toEqual([
			{ value: "any", label: "any" },
			{ value: "documents", label: "Documents" },
		]);
	});

	test("applies reused Zod enum metadata to each field path", () => {
		const sharedScope = z.enum(["any", "documents"]).meta({
			formbar: {
				enumOptions: [{ value: "any", label: "Any" }],
			},
		});
		const result = createSchemaForm(
			z.object({
				primaryScope: sharedScope,
				secondaryScope: sharedScope,
			}),
		);

		const fields = result.fields.filter((field) => field.path.endsWith("Scope"));
		expect(fields).toHaveLength(2);
		expect(fields.map((field) => normalizeEnumOptions(field.metadata))).toEqual([
			[
				{ value: "any", label: "Any" },
				{ value: "documents", label: "documents" },
			],
			[
				{ value: "any", label: "Any" },
				{ value: "documents", label: "documents" },
			],
		]);
	});
});
