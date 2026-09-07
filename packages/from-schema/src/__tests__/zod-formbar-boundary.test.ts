import { isStandardSchemaLike } from "@formbar/core";
import { ingestSchema } from "@scheman/core";
import { describe, expect, test } from "vitest";
import { z as z3Current } from "zod3-current";
import { z as z3Min } from "zod3-min";
import { z as z4Current } from "zod4-current";
import { z as z4Min } from "zod4-min";
import { isJsonSchema } from "../adapters/json-schema-validator.js";
import { createSchemaForm } from "../create-schema-form.js";

const enumValues = ["enabled", "disabled"];
const formbarMetadata = { widget: "radio" };

function expectFormbarBoundary(schema: unknown) {
	const generic = ingestSchema(schema);
	const genericMetadata = generic.fields[0]?.metadata;

	expect(genericMetadata?.extensions?.formbar).toEqual(formbarMetadata);
	expect(genericMetadata?.enum).toEqual(enumValues);

	const elevated = createSchemaForm(schema);
	const elevatedMetadata = elevated.fields[0]?.metadata;

	expect(elevatedMetadata).toMatchObject({ ...formbarMetadata, enum: enumValues });
	expect(elevatedMetadata?.extensions).toBeUndefined();
}

function expectZod4ValidationBoundary(schema: unknown, overlapsJsonSchema: boolean) {
	expect(isStandardSchemaLike(schema)).toBe(true);
	expect(isJsonSchema(schema)).toBe(overlapsJsonSchema);

	const [validator] = createSchemaForm(schema).validators;
	expect(validator).toBeDefined();
	expect(validator?.({ data: { state: "enabled" }, uiState: {} })).toEqual([]);

	const issues = validator?.({ data: { state: "other" }, uiState: {} });
	expect(issues).toHaveLength(1);
	expect(issues?.[0]).toMatchObject({
		code: "SCHEMA_VALIDATION",
		path: { namespace: "data", segments: ["state"] },
		source: { origin: "standard-schema", validatorId: "standard-schema:zod" },
	});
}

describe("Formbar metadata with supported Zod versions", () => {
	test("supports the exact Zod 3 minimum, 3.24.0", () => {
		const field = z3Min.enum(enumValues as [string, ...string[]]);
		(field._def as z3Min.ZodTypeDef & { metadata?: unknown }).metadata = {
			formbar: formbarMetadata,
		};

		expectFormbarBoundary(z3Min.object({ state: field }));
	});

	test("supports the current stable Zod 3, 3.25.76", () => {
		const field = z3Current.enum(enumValues as [string, ...string[]]);
		(field._def as z3Current.ZodTypeDef & { metadata?: unknown }).metadata = {
			formbar: formbarMetadata,
		};

		expectFormbarBoundary(z3Current.object({ state: field }));
	});

	test("supports the exact Zod 4 minimum, 4.0.0", () => {
		const schema = z4Min.object({
			state: z4Min.enum(enumValues).meta({
				formbar: formbarMetadata,
			}),
		});

		expectFormbarBoundary(schema);
		expectZod4ValidationBoundary(schema, false);
	});

	test("supports the current stable Zod 4, 4.5.4", () => {
		const schema = z4Current.object({
			state: z4Current.enum(enumValues).meta({
				formbar: formbarMetadata,
			}),
		});

		expectFormbarBoundary(schema);
		expectZod4ValidationBoundary(schema, true);
	});
});
