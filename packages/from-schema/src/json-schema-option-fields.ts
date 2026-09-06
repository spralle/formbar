import { type JsonSchema, type SchemaFieldInfo, dereferenceSchema, extractFromJsonSchema } from "@scheman/core";
import { applyFormbarMetadata } from "./formbar-metadata.js";

const BRANCH_KEYS = ["allOf", "anyOf", "oneOf"] as const;

export function extractJsonSchemaArrayItemOptionFields(schema: JsonSchema): readonly SchemaFieldInfo[] {
	const fields: SchemaFieldInfo[] = [];
	const dereferenced = dereferenceSchema(schema);
	visitJsonSchema(dereferenced, "", fields, new WeakSet());
	return fields;
}

function visitJsonSchema(schema: JsonSchema, path: string, fields: SchemaFieldInfo[], active: WeakSet<object>): void {
	if (active.has(schema)) return;
	active.add(schema);
	for (const [key, property] of Object.entries(schema.properties ?? {})) {
		visitJsonSchema(property, joinPath(path, key), fields, active);
	}
	if (schema.items) {
		const itemPath = `${path}[]`;
		const itemField = extractPrimitiveItemField(schema.items, itemPath);
		if (itemField) fields.push(itemField);
		visitJsonSchema(schema.items, itemPath, fields, active);
	}
	for (const key of BRANCH_KEYS) {
		for (const branch of schema[key] ?? []) visitJsonSchema(branch, path, fields, active);
	}
	for (const branch of [schema.if, schema.then, schema.else]) {
		if (branch) visitJsonSchema(branch, path, fields, active);
	}
	active.delete(schema);
}

function extractPrimitiveItemField(schema: JsonSchema, path: string): SchemaFieldInfo | undefined {
	const wrapped: JsonSchema = { type: "object", properties: { item: schema } };
	const result = applyFormbarMetadata(extractFromJsonSchema(wrapped));
	const itemField = result.fields.find((field) => field.path === "item");
	if (!itemField || itemField.type === "array" || itemField.type === "object") return undefined;
	return { ...itemField, path };
}

function joinPath(parent: string, child: string): string {
	return parent ? `${parent}.${child}` : child;
}
