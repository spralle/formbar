import { ingestSchema } from "@scheman/core";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { createSchemaForm } from "../create-schema-form.js";
import { normalizeFormbarOptions } from "../formbar-options.js";

describe("normalizeFormbarOptions", () => {
	test("keeps enum values and order authoritative over record order", () => {
		const result = normalizeFormbarOptions({
			enum: ["first", "second", "third"],
			options: [
				{ value: "third", title: "Third" },
				{ value: "first", title: "First" },
			],
		});

		expect(result.options).toEqual([
			{ value: "first", title: "First" },
			{ value: "second", title: "second" },
			{ value: "third", title: "Third" },
		]);
		expect(result.warnings).toEqual([]);
	});

	test("matches primitive values by exact value and type", () => {
		const result = normalizeFormbarOptions({
			enum: [1, "1", true, null],
			options: [{ value: "1", title: "String one" }, { value: 1, title: "Number one" }, true, null],
		});

		expect(result.options).toEqual([
			{ value: 1, title: "Number one" },
			{ value: "1", title: "String one" },
			{ value: true, title: "true" },
			{ value: null, title: "null" },
		]);
	});

	test("warns and falls back when a record only matches after coercion", () => {
		const result = normalizeFormbarOptions(
			{ enum: [1], options: [{ value: "1", title: "Wrong type" }] },
			{ path: "quantity" },
		);

		expect(result.options).toEqual([{ value: 1, title: "1" }]);
		expect(result.warnings).toEqual([
			expect.objectContaining({
				code: "FORMBAR_OPTION_UNMATCHED",
				path: "quantity",
				index: 0,
				value: "1",
			}),
		]);
	});

	test("supports partial records and primitive options without enum", () => {
		expect(normalizeFormbarOptions({ options: ["plain", { value: 2, disabled: true }, false] }).options).toEqual([
			{ value: "plain", title: "plain" },
			{ value: 2, title: "2", disabled: true },
			{ value: false, title: "false" },
		]);
	});

	test("emits stable warnings and uses the first duplicate record", () => {
		const result = normalizeFormbarOptions(
			{
				enum: ["kept", "fallback"],
				options: [
					{ value: "kept", title: "First" },
					{ value: "kept", title: "Second" },
					{ value: "missing", title: "Missing" },
					{ value: [], title: "Invalid value" },
					{ value: "fallback", title: 42 },
				],
			},
			{ path: "scope" },
		);

		expect(result.options).toEqual([
			{ value: "kept", title: "First" },
			{ value: "fallback", title: "fallback" },
		]);
		expect(result.warnings).toEqual([
			{
				code: "FORMBAR_OPTION_DUPLICATE",
				path: "scope",
				index: 1,
				value: "kept",
				message: 'Field "scope" option at index 1 duplicates an earlier value and was ignored.',
			},
			{
				code: "FORMBAR_OPTION_UNMATCHED",
				path: "scope",
				index: 2,
				value: "missing",
				message: 'Field "scope" option at index 2 does not exactly match an enum value and was ignored.',
			},
			{
				code: "FORMBAR_OPTION_MALFORMED",
				path: "scope",
				index: 3,
				value: [],
				message: 'Field "scope" option at index 3 is malformed.',
			},
			{
				code: "FORMBAR_OPTION_MALFORMED",
				path: "scope",
				index: 4,
				value: "fallback",
				message: 'Field "scope" option at index 4 is malformed.',
			},
		]);
	});

	test("warns when options is not an array", () => {
		const result = normalizeFormbarOptions({ options: "invalid" }, { path: "mode" });
		expect(result.options).toEqual([]);
		expect(result.warnings).toEqual([
			{
				code: "FORMBAR_OPTIONS_NOT_ARRAY",
				path: "mode",
				index: -1,
				value: "invalid",
				message: 'Field "mode" options must be an array.',
			},
		]);
	});

	test("resolves titles through callback, literal title, then String(value)", () => {
		const seen: unknown[] = [];
		const result = normalizeFormbarOptions(
			{
				enum: ["localized", "literal", 3],
				options: [
					{ value: "localized", title: "Literal ignored" },
					{ value: "literal", title: "Literal title" },
				],
			},
			{
				path: "choice",
				resolveTitle: (context) => {
					seen.push(context);
					return context.value === "localized" ? "Resolved title" : undefined;
				},
			},
		);

		expect(result.options.map((option) => option.title)).toEqual(["Resolved title", "Literal title", "3"]);
		expect(seen).toHaveLength(3);
		expect(seen[0]).toEqual({ path: "choice", index: 0, value: "localized", literalTitle: "Literal ignored" });
	});
});

describe("schema form options", () => {
	const optionRecords = [
		{ value: "off", title: "Off" },
		{ value: "on", title: "On", disabled: true },
	];

	test("normalizes JSON Schema and Zod metadata with parity through Scheman", () => {
		const jsonResult = createSchemaForm({
			type: "object",
			properties: {
				state: { type: "string", enum: ["on", "off"], "x-formbar": { options: optionRecords } },
			},
		});
		const zodSchema = z.object({
			state: z.enum(["on", "off"]).meta({ formbar: { options: optionRecords } }),
		});
		const genericZod = ingestSchema(zodSchema);
		const zodResult = createSchemaForm(zodSchema);

		expect(genericZod.fields[0]?.metadata?.extensions?.formbar?.options).toEqual(optionRecords);
		expect(jsonResult.fields[0]?.metadata?.options).toEqual(optionRecords);
		expect(zodResult.fields[0]?.metadata?.options).toEqual(optionRecords);
		expect(jsonResult.optionsByPath.get("state")).toEqual(zodResult.optionsByPath.get("state"));
		expect(zodResult.optionsByPath.get("state")).toEqual([
			{ value: "on", title: "On", disabled: true },
			{ value: "off", title: "Off" },
		]);
		expect(jsonResult.warnings).toEqual([]);
		expect(zodResult.warnings).toEqual([]);
	});

	test("surfaces warnings without turning choices into validation constraints", () => {
		const result = createSchemaForm({
			type: "object",
			properties: {
				mode: {
					type: "string",
					"x-formbar": { options: ["guided", { value: "guided", title: "Duplicate" }] },
				},
			},
		});
		const issues = result.validators[0]?.({ data: { mode: "custom" }, uiState: {}, stage: "submit" });

		expect(result.optionsByPath.get("mode")).toEqual([{ value: "guided", title: "guided" }]);
		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0]?.code).toBe("FORMBAR_OPTION_DUPLICATE");
		expect(issues).toEqual([]);
	});

	test("does not reinterpret unions as enums", () => {
		const result = createSchemaForm(z.object({ value: z.union([z.literal("a"), z.literal("b")]) }));
		expect(result.fields[0]?.type).toBe("union");
		expect(result.fields[0]?.metadata?.enum).toBeUndefined();
		expect(result.optionsByPath.get("value")).toBeUndefined();
	});

	test("keeps object-valued enum entries as stored objects", () => {
		const storedObject = { id: 1 };
		const result = normalizeFormbarOptions({
			enum: [storedObject],
			options: [{ value: 1, title: "Not an object label" }],
		});

		expect(result.options).toEqual([{ value: storedObject, title: "[object Object]" }]);
		expect(result.warnings[0]?.code).toBe("FORMBAR_OPTION_UNMATCHED");
	});
});
