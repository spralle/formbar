import type { SchemaFieldInfo, SchemaFieldMetadata, SchemaIngestionResult } from "@scheman/core";

export function applyZodFormbarEnumOptions(result: SchemaIngestionResult, schema: unknown): SchemaIngestionResult {
	const metadataByPath = new Map<string, ZodEnumMetadata>();
	collectZodEnumMetadata(schema, "", metadataByPath, new Set<object>());
	if (metadataByPath.size === 0) return result;

	return {
		...result,
		fields: result.fields.map((field) => mergeZodEnumMetadata(field, metadataByPath.get(field.path))),
	};
}

interface ZodEnumMetadata {
	readonly enumValues?: readonly unknown[];
	readonly enumOptions?: unknown;
}

function collectZodEnumMetadata(
	schema: unknown,
	path: string,
	metadataByPath: Map<string, ZodEnumMetadata>,
	visiting: Set<object>,
): void {
	if (!isRecord(schema) || visiting.has(schema)) return;
	visiting.add(schema);

	const def = getZodDef(schema);
	const enumOptions = getInlineFormbar(schema, def)?.enumOptions;
	const enumValues = getZodEnumValues(def);
	if (path && (enumOptions !== undefined || enumValues)) {
		mergeCollectedMetadata(metadataByPath, path, createZodEnumMetadata(enumOptions, enumValues));
	}

	for (const [key, child] of getZodObjectShape(def)) {
		collectZodEnumMetadata(child, path ? `${path}.${key}` : key, metadataByPath, visiting);
	}

	const inner = getZodInnerSchema(def);
	if (inner) collectZodEnumMetadata(inner, path, metadataByPath, visiting);
	visiting.delete(schema);
}

function mergeZodEnumMetadata(field: SchemaFieldInfo, zodMetadata: ZodEnumMetadata | undefined): SchemaFieldInfo {
	if (!zodMetadata) return field;
	const metadata = { ...field.metadata } as Record<string, unknown>;
	let changed = false;

	if (zodMetadata.enumOptions !== undefined && metadata.enumOptions === undefined) {
		metadata.enumOptions = zodMetadata.enumOptions;
		changed = true;
	}
	if (zodMetadata.enumValues && metadata.enum === undefined) {
		metadata.enum = zodMetadata.enumValues;
		changed = true;
	}

	return changed ? { ...field, metadata: metadata as SchemaFieldMetadata } : field;
}

function createZodEnumMetadata(enumOptions: unknown, enumValues: readonly unknown[] | undefined): ZodEnumMetadata {
	return {
		...(enumOptions !== undefined ? { enumOptions } : {}),
		...(enumValues ? { enumValues } : {}),
	};
}

function mergeCollectedMetadata(
	metadataByPath: Map<string, ZodEnumMetadata>,
	path: string,
	next: ZodEnumMetadata,
): void {
	const previous = metadataByPath.get(path);
	metadataByPath.set(path, {
		...(next.enumOptions !== undefined ? { enumOptions: next.enumOptions } : {}),
		...(next.enumValues ? { enumValues: next.enumValues } : {}),
		...previous,
	});
}

function getZodDef(schema: Record<string, unknown>): Record<string, unknown> | undefined {
	const zodInternals = schema._zod;
	if (isRecord(zodInternals) && isRecord(zodInternals.def)) return zodInternals.def;
	return isRecord(schema._def) ? schema._def : undefined;
}

function getInlineFormbar(
	schema: Record<string, unknown>,
	def: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
	const metadata = getSchemaMetadata(schema) ?? (isRecord(def?.metadata) ? def.metadata : undefined);
	const formbar = metadata?.formbar;
	return isRecord(formbar) ? formbar : undefined;
}

function getSchemaMetadata(schema: Record<string, unknown>): Record<string, unknown> | undefined {
	if (typeof schema.meta !== "function") return undefined;
	const metadata = (schema.meta as () => unknown)();
	return isRecord(metadata) ? metadata : undefined;
}

function getZodObjectShape(def: Record<string, unknown> | undefined): Array<[string, unknown]> {
	const shape = typeof def?.shape === "function" ? (def.shape as () => unknown)() : def?.shape;
	return isRecord(shape) ? Object.entries(shape) : [];
}

function getZodEnumValues(def: Record<string, unknown> | undefined): readonly unknown[] | undefined {
	if (Array.isArray(def?.values)) return def.values;
	if (Array.isArray(def?.options)) return def.options;
	const entries = isRecord(def?.entries) ? def.entries : undefined;
	return entries ? Object.values(entries) : undefined;
}

function getZodInnerSchema(def: Record<string, unknown> | undefined): unknown {
	return def?.innerType ?? def?.inner ?? def?.schema ?? def?.type;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
