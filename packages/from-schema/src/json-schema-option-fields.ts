import { type JsonSchema, type SchemaFieldInfo, dereferenceSchema, extractFromJsonSchema } from "@scheman/core";
import { applyFormbarMetadata } from "./formbar-metadata.js";

export function extractJsonSchemaOptionFields(schema: JsonSchema): readonly SchemaFieldInfo[] {
	const fields: SchemaFieldInfo[] = [];
	const dereferenced = dereferenceSchema(schema);
	visitJsonSchema(dereferenced, "", fields, new WeakSet());
	return fields;
}

function visitJsonSchema(schema: JsonSchema, path: string, fields: SchemaFieldInfo[], active: WeakSet<object>): void {
	if (active.has(schema)) return;
	active.add(schema);
	const field = extractDirectOptionField(schema, path);
	if (field) fields.push(field);
	for (const [key, property] of Object.entries(schema.properties ?? {})) {
		visitJsonSchema(property, joinPath(path, key), fields, active);
	}
	if (schema.items) {
		const itemPath = isDirectObjectSchema(schema.items) ? path : `${path}[]`;
		visitJsonSchema(schema.items, itemPath, fields, active);
	}
	active.delete(schema);
}

function extractDirectOptionField(schema: JsonSchema, path: string): SchemaFieldInfo | undefined {
	if (!path || !hasDirectOptionMetadata(schema)) return undefined;
	const wrapped: JsonSchema = { type: "object", properties: { item: withoutApplicators(schema) } };
	const result = applyFormbarMetadata(extractFromJsonSchema(wrapped));
	const itemField = result.fields.find((field) => field.path === "item");
	if (!itemField) return undefined;
	return { ...itemField, path };
}

function hasDirectOptionMetadata(schema: JsonSchema): boolean {
	const formbar = schema["x-formbar"];
	const hasOptions = typeof formbar === "object" && formbar !== null && "options" in formbar;
	return Array.isArray(schema.enum) || hasOptions;
}

function withoutApplicators(schema: JsonSchema): JsonSchema {
	const { allOf: _allOf, anyOf: _anyOf, oneOf: _oneOf, if: _if, then: _then, else: _else, ...direct } = schema;
	return direct;
}

function isDirectObjectSchema(schema: JsonSchema): boolean {
	return schema.type === "object" || schema.properties !== undefined;
}

function joinPath(parent: string, child: string): string {
	return parent ? `${parent}.${child}` : child;
}
