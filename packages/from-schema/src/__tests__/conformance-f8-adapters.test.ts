import type { JsonSchema } from "@scheman/core";
import { SchemaError, extractFromZod, ingestSchema, isStandardSchema } from "@scheman/core";
import { describe, expect, test } from "vitest";
import { createJsonSchemaValidator, isJsonSchema } from "../adapters/json-schema-validator.js";
import { FromSchemaError } from "../errors.js";
import { applyFormbarMetadata } from "../formbar-metadata.js";

/**
 * F8: Schema adapters conformance fixtures.
 * Verifies: Standard Schema + function validators, JSON Schema adapter,
 * generic Zod metadata extraction, Formbar metadata policy.
 */

describe("F8: JSON Schema adapter", () => {
	test("isJsonSchema detects valid JSON Schema objects", () => {
		expect(isJsonSchema({ type: "object", properties: {} })).toBe(true);
		expect(isJsonSchema({ type: "string" })).toBe(true);
		expect(isJsonSchema({ enum: ["a", "b"] })).toBe(true);
		expect(isJsonSchema({ items: { type: "string" } })).toBe(true);
	});

	test("isJsonSchema rejects non-schema values", () => {
		expect(isJsonSchema(null)).toBe(false);
		expect(isJsonSchema(undefined)).toBe(false);
		expect(isJsonSchema("string")).toBe(false);
		expect(isJsonSchema(42)).toBe(false);
		expect(isJsonSchema({})).toBe(false);
	});

	test("createJsonSchemaValidator produces a validator function", () => {
		const schema: JsonSchema = { type: "object", properties: { x: { type: "string" } } };
		const validator = createJsonSchemaValidator(schema);
		expect(typeof validator).toBe("function");
	});

	test("validator function returns issues for invalid data", () => {
		const validator = createJsonSchemaValidator({
			type: "object",
			properties: { x: { type: "string" } },
			required: ["x"],
		});
		const issues = validator({ data: {}, uiState: {}, stage: "submit" });
		expect(issues.length).toBeGreaterThan(0);
	});

	test("JSON Schema ingestion via ingestSchema", () => {
		const schema: JsonSchema = {
			type: "object",
			properties: {
				name: { type: "string" },
				age: { type: "number" },
			},
			required: ["name"],
		};
		const result = ingestSchema(schema);
		expect(result.fields.length).toBe(2);
		expect(result.fields.find((f) => f.path === "name")?.required).toBe(true);
		expect(result.fields.find((f) => f.path === "age")?.required).toBe(false);
	});
});

describe("F8: Standard Schema detection", () => {
	test("isStandardSchema detects Standard Schema v1 objects", () => {
		const mock = {
			"~standard": { version: 1, vendor: "test", validate: () => ({ value: null }) },
		};
		expect(isStandardSchema(mock)).toBe(true);
	});

	test("isStandardSchema rejects non-standard objects", () => {
		expect(isStandardSchema({})).toBe(false);
		expect(isStandardSchema(null)).toBe(false);
		expect(isStandardSchema({ "~standard": "not-object" })).toBe(false);
	});
});

describe("F8: Zod metadata rules", () => {
	test("generic extraction preserves x-formbar for downstream policy", () => {
		const result = extractMockZodMetadata({ "x-formbar": { widget: "input" } });

		expect(result.fields[0]?.metadata?.extensions).toEqual({ "x-formbar": { widget: "input" } });
	});

	test("Formbar rejects x-formbar metadata at its boundary", () => {
		const result = extractMockZodMetadata({ "x-formbar": { widget: "input" } });
		let thrown: unknown;

		try {
			applyFormbarMetadata(result);
		} catch (error) {
			thrown = error;
		}

		expect(thrown).toBeInstanceOf(FromSchemaError);
		expect((thrown as FromSchemaError).code).toBe("FORMBAR_ZOD_XFORMBAR_FORBIDDEN");
	});

	test("generic extraction preserves namespaced formbar metadata", () => {
		const options = [{ label: "Text", value: "text" }];
		const result = extractMockZodMetadata({ formbar: { widget: "text-input", options } });
		expect(result.fields).toHaveLength(1);
		expect(result.fields[0]?.metadata?.extensions).toEqual({
			formbar: { widget: "text-input", options },
		});
	});

	test("Formbar elevates recognized widget and options metadata", () => {
		const options = [{ label: "Text", value: "text" }];
		const raw = extractMockZodMetadata({ formbar: { widget: "text-input", options } });
		const result = applyFormbarMetadata(raw);

		expect(result.fields[0]?.metadata).toMatchObject({ widget: "text-input", options });
		expect(result.fields[0]?.metadata?.extensions).toBeUndefined();
	});
});

function extractMockZodMetadata(metadata: Readonly<Record<string, unknown>>) {
	return extractFromZod({
		_def: {
			typeName: "ZodObject",
			shape: () => ({
				name: { _def: { typeName: "ZodString", metadata } },
			}),
		},
	});
}

describe("F8: Unsupported schema rejection", () => {
	test("ingestSchema throws for unknown schema type", () => {
		expect(() => ingestSchema({ random: true })).toThrow(SchemaError);
	});

	test("ingestSchema returns validation-only result for non-Zod Standard Schema vendor", () => {
		const mock = {
			"~standard": { version: 1, vendor: "valibot", validate: () => ({ value: null }) },
		};
		const result = ingestSchema(mock);
		expect(result.fields).toEqual([]);
		expect(result.metadata).toEqual({ vendor: "valibot", validationOnly: true });
	});
});
