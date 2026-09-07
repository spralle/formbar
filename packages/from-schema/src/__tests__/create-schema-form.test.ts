import { type ValidatorFn, isStandardSchemaLike } from "@formbar/core";
import { describe, expect, test, vi } from "vitest";
import { isJsonSchema } from "../adapters/json-schema-validator.js";
import { createSchemaForm } from "../create-schema-form.js";
import type { LayoutNode } from "../layout/layout-types.js";

const simpleJsonSchema = {
	type: "object",
	properties: {
		name: { type: "string" },
		age: { type: "integer" },
		email: { type: "string", format: "email" },
	},
	required: ["name", "email"],
};

describe("createSchemaForm", () => {
	test("returns fields, layout, metadata, and validators for JSON Schema", () => {
		const result = createSchemaForm(simpleJsonSchema);
		expect(result.fields.length).toBeGreaterThan(0);
		expect(result.layout).toBeDefined();
		expect(result.metadata).toBeDefined();
		expect(result.validators.length).toBeGreaterThanOrEqual(1);
	});

	test("uses layoutOverride when provided", () => {
		const override: LayoutNode = {
			type: "section",
			props: { title: "Custom" },
			children: [],
		};
		const result = createSchemaForm(simpleJsonSchema, { layoutOverride: override });
		expect(result.layout).toBe(override);
	});

	test("includes additional validators from options", () => {
		const mockValidator: ValidatorFn = () => [];
		const result = createSchemaForm(simpleJsonSchema, { validators: [mockValidator] });
		// Should have JSON Schema validator + our mock
		expect(result.validators.length).toBeGreaterThanOrEqual(2);
		expect(result.validators).toContain(mockValidator);
	});

	test("throws for non-JSON schema object", () => {
		const nonJsonSchema = { notASchema: true };
		expect(() => createSchemaForm(nonJsonSchema)).toThrow();
	});

	test("extracts correct fields with paths, types, and required flags", () => {
		const result = createSchemaForm(simpleJsonSchema);
		const nameField = result.fields.find((f) => f.path === "name");
		const ageField = result.fields.find((f) => f.path === "age");
		const emailField = result.fields.find((f) => f.path === "email");

		expect(nameField).toBeDefined();
		expect(nameField?.required).toBe(true);
		expect(nameField?.type).toBe("string");

		expect(ageField).toBeDefined();
		expect(ageField?.required).toBe(false);
		expect(ageField?.type).toBe("integer");

		expect(emailField).toBeDefined();
		expect(emailField?.required).toBe(true);
	});

	test("metadata contains vendor info for JSON Schema", () => {
		const result = createSchemaForm(simpleJsonSchema);
		expect(result.metadata.vendor).toBe("json-schema");
	});

	test("auto-wires validation for Standard Schema", () => {
		const schema = {
			"~standard": {
				version: 1 as const,
				vendor: "test",
				validate: (data: unknown) => {
					const d = data as Record<string, unknown>;
					if (!d.name) return { issues: [{ message: "Name required", path: ["name"] }] };
					return { value: data };
				},
			},
		};

		const result = createSchemaForm(schema);
		expect(result.validators.length).toBeGreaterThan(0);
	});

	test("prefers Standard Schema validation for a dual-shape schema", () => {
		const validate = vi.fn((data: unknown) => ({
			issues: [{ message: "Rejected by Standard Schema", path: ["state"] }],
		}));
		const schema = {
			type: "object",
			properties: { state: { type: "string", enum: ["enabled"] } },
			"~standard": {
				version: 1 as const,
				vendor: "dual-shape",
				validate,
			},
		};
		const callerValidator: ValidatorFn = () => [];

		expect(isStandardSchemaLike(schema)).toBe(true);
		expect(isJsonSchema(schema)).toBe(true);
		const result = createSchemaForm(schema, { validators: [callerValidator] });

		expect(result.validators).toHaveLength(2);
		expect(result.validators[1]).toBe(callerValidator);
		const issues = result.validators[0]?.({ data: { state: "disabled" }, uiState: {} });
		expect(validate).toHaveBeenCalledOnce();
		expect(validate).toHaveBeenCalledWith({ state: "disabled" });
		expect(issues).toHaveLength(1);
		expect(issues?.[0]).toMatchObject({
			code: "SCHEMA_VALIDATION",
			path: { namespace: "data", segments: ["state"] },
			source: { origin: "standard-schema", validatorId: "standard-schema:dual-shape" },
		});
	});
});
