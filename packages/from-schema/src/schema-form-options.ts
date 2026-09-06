import { type SchemaFieldInfo, type SchemaIngestionResult, isJsonSchema } from "@scheman/core";
import {
	type FormbarOption,
	type FormbarOptionTitleResolver,
	type FormbarOptionWarning,
	normalizeFormbarOptions,
} from "./formbar-options.js";
import { extractJsonSchemaArrayItemOptionFields } from "./json-schema-option-fields.js";

export interface PreparedSchemaOptions {
	readonly result: SchemaIngestionResult;
	readonly optionsByPath: ReadonlyMap<string, readonly FormbarOption[]>;
	readonly warnings: readonly FormbarOptionWarning[];
}

export function prepareSchemaOptions(
	result: SchemaIngestionResult,
	schema: unknown,
	resolveTitle?: FormbarOptionTitleResolver,
): PreparedSchemaOptions {
	const warnings: FormbarOptionWarning[] = [];
	const optionsByPath = new Map<string, readonly FormbarOption[]>();
	const fieldsByPath = collectOptionFields(result.fields, schema);
	for (const field of fieldsByPath.values()) {
		const metadata = field.metadata;
		if (!hasOptionMetadata(field)) continue;
		const normalized = normalizeFormbarOptions(metadata, {
			path: field.path,
			...(resolveTitle ? { resolveTitle } : {}),
		});
		optionsByPath.set(field.path, normalized.options);
		warnings.push(...normalized.warnings);
	}
	return { result, optionsByPath, warnings };
}

function collectOptionFields(
	fields: readonly SchemaFieldInfo[],
	schema: unknown,
): ReadonlyMap<string, SchemaFieldInfo> {
	const fieldsByPath = new Map<string, SchemaFieldInfo>();
	for (const field of fields) fieldsByPath.set(field.path, field);
	if (isJsonSchema(schema)) {
		for (const field of extractJsonSchemaArrayItemOptionFields(schema)) {
			const existing = fieldsByPath.get(field.path);
			if (!existing || !hasOptionMetadata(existing)) fieldsByPath.set(field.path, field);
		}
	}
	return fieldsByPath;
}

function hasOptionMetadata(field: SchemaFieldInfo): boolean {
	const metadata = field.metadata;
	return Boolean(metadata && (Array.isArray(metadata.enum) || metadata.options !== undefined));
}
