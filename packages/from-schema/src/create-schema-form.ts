import type { ValidatorFn } from "@formbar/core";
import { createStandardSchemaValidator, isStandardSchemaLike } from "@formbar/core";
import { type JsonSchema, type SchemaFieldInfo, type SchemaMetadata, ingestSchema } from "@scheman/core";
import { createJsonSchemaValidator, isJsonSchema } from "./adapters/json-schema-validator.js";
import { applyFormbarMetadata } from "./formbar-metadata.js";
import type { FormbarOption, FormbarOptionTitleResolver, FormbarOptionWarning } from "./formbar-options.js";
import { type LayoutMiddleware, applyLayoutMiddleware } from "./layout-middleware.js";
import { compileLayout } from "./layout/layout-compiler.js";
import type { LayoutNode } from "./layout/layout-types.js";
import { prepareSchemaOptions } from "./schema-form-options.js";

export interface CreateSchemaFormOptions {
	/** Additional validators to include beyond the auto-detected schema validator */
	readonly validators?: readonly ValidatorFn[] | undefined;
	/** Override the auto-compiled layout with a custom LayoutNode tree */
	readonly layoutOverride?: LayoutNode | undefined;
	/** Middleware pipeline applied to the compiled layout tree */
	readonly layoutMiddleware?: readonly LayoutMiddleware[] | undefined;
	/** Synchronously resolves option titles without coupling schema ingestion to a UI framework */
	readonly resolveOptionTitle?: FormbarOptionTitleResolver | undefined;
}

export interface SchemaFormResult {
	readonly fields: readonly SchemaFieldInfo[];
	readonly layout: LayoutNode;
	readonly metadata: SchemaMetadata;
	readonly validators: readonly ValidatorFn[];
	readonly defaults: Readonly<Record<string, unknown>>;
	readonly optionsByPath: ReadonlyMap<string, readonly FormbarOption[]>;
	readonly warnings: readonly FormbarOptionWarning[];
}

/**
 * Creates a form instance from a schema definition (Zod v4 or JSON Schema).
 * Automatically extracts fields, compiles a layout tree, generates validators,
 * and resolves default values from the schema.
 *
 * @param schema - A Zod schema, JSON Schema object, or any Standard Schema v1 implementation.
 * @param options - Additional configuration: extra validators, layout overrides, middleware.
 * @returns A configured {@link SchemaFormResult} with validators, layout tree, and field info map.
 *
 * @example
 * ```typescript
 * import { z } from "zod";
 * import { createSchemaForm } from "@formbar/from-schema";
 *
 * const { form, layout, fields } = createSchemaForm(
 *   z.object({
 *     email: z.string().email(),
 *     age: z.number().min(18),
 *   }),
 * );
 * ```
 */
export function createSchemaForm(schema: unknown, options?: CreateSchemaFormOptions): SchemaFormResult {
	const rawResult = ingestSchema(schema);
	const prepared = prepareSchemaOptions(applyFormbarMetadata(rawResult), schema, options?.resolveOptionTitle);
	const result = prepared.result;
	let layout = options?.layoutOverride ?? compileLayout(result);

	if (options?.layoutMiddleware?.length) {
		const fieldInfoMap = new Map<string, SchemaFieldInfo>(result.fields.map((f: SchemaFieldInfo) => [f.path, f]));
		layout = applyLayoutMiddleware(layout, options.layoutMiddleware, fieldInfoMap);
	}

	const validators: ValidatorFn[] = [];
	if (isStandardSchemaLike(schema)) {
		validators.push(createStandardSchemaValidator(schema));
	} else if (isJsonSchema(schema)) {
		validators.push(createJsonSchemaValidator(schema as JsonSchema));
	}
	if (options?.validators) {
		validators.push(...options.validators);
	}
	const defaults: Record<string, unknown> = {};
	for (const f of result.fields) {
		if (f.defaultValue !== undefined) {
			defaults[f.path] = f.defaultValue;
		}
	}
	return {
		fields: result.fields,
		metadata: result.metadata,
		layout,
		validators,
		defaults,
		optionsByPath: prepared.optionsByPath,
		warnings: prepared.warnings,
	};
}
