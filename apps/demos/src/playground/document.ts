import { createArbiterPlugin } from "@formbar/arbiter";
import { type LayoutNode, createSchemaForm } from "@formbar/from-schema";
import {
	PLAYGROUND_DOCUMENT_VERSION,
	type PlaygroundDocument,
	type PlaygroundSources,
	SOURCE_LIMIT_BYTES,
	type SourceErrors,
	type SourceKey,
	TOTAL_LIMIT_BYTES,
} from "./contracts";

export const SOURCE_KEYS: readonly SourceKey[] = ["schema", "layout", "rules", "initialData", "initialUiState"];
const BUILT_IN_NODES = new Set(["group", "section", "field", "array"]);

export function stringifyDocument(document: PlaygroundDocument): PlaygroundSources {
	return {
		schema: formatJson(document.schema),
		layout: formatJson(document.layout),
		rules: formatJson(document.rules),
		initialData: formatJson(document.initialData),
		initialUiState: formatJson(document.initialUiState),
	};
}

export function formatJson(value: unknown): string {
	return `${JSON.stringify(value, null, 2)}\n`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateLayout(node: unknown, location = "layout"): string | undefined {
	if (!isRecord(node)) return `${location} must be an object`;
	if (typeof node.type !== "string" || !BUILT_IN_NODES.has(node.type)) {
		return `${location}.type must be a built-in node: group, section, field, or array`;
	}
	if (typeof node.id !== "string" || !node.id) return `${location}.id must be a non-empty string`;
	if ((node.type === "field" || node.type === "array") && typeof node.path !== "string") {
		return `${location}.path must be a string for ${node.type} nodes`;
	}
	if (node.children === undefined) return;
	if (!Array.isArray(node.children)) return `${location}.children must be an array`;
	for (let index = 0; index < node.children.length; index += 1) {
		const error = validateLayout(node.children[index], `${location}.children[${index}]`);
		if (error) return error;
	}
}

function parseSource(key: SourceKey, source: string, errors: SourceErrors): unknown {
	if (new Blob([source]).size > SOURCE_LIMIT_BYTES) {
		errors[key] = `Source exceeds ${SOURCE_LIMIT_BYTES.toLocaleString()} bytes`;
		return;
	}
	try {
		return JSON.parse(source);
	} catch (error) {
		errors[key] = error instanceof Error ? error.message : "Invalid JSON";
	}
}

function validateShapes(values: Record<SourceKey, unknown>, errors: SourceErrors): void {
	if (!errors.schema && !isRecord(values.schema)) errors.schema = "Schema must be a JSON object";
	if (!errors.layout && values.layout !== null && !isRecord(values.layout))
		errors.layout = "Layout must be an object or null";
	if (!errors.rules && !Array.isArray(values.rules)) errors.rules = "Rules must be a JSON array";
	if (!errors.initialData && !isRecord(values.initialData)) errors.initialData = "Initial Data must be a JSON object";
	if (!errors.initialUiState && !isRecord(values.initialUiState))
		errors.initialUiState = "UI State must be a JSON object";
	if (!errors.layout && values.layout !== null) {
		const layoutError = validateLayout(values.layout);
		if (layoutError) errors.layout = layoutError;
	}
}

function preflight(values: Record<SourceKey, unknown>, errors: SourceErrors): void {
	if (Object.keys(errors).length > 0) return;
	try {
		createSchemaForm(values.schema);
	} catch (error) {
		errors.schema = `Schema could not be created: ${error instanceof Error ? error.message : String(error)}`;
	}
	if (errors.schema) return;
	if (values.layout !== null) {
		try {
			createSchemaForm(values.schema, { layoutOverride: values.layout as LayoutNode });
		} catch (error) {
			errors.layout = `Layout could not be created: ${error instanceof Error ? error.message : String(error)}`;
		}
	}
	if (errors.layout || (values.rules as unknown[]).length === 0) return;
	try {
		const plugin = createArbiterPlugin({
			rules: values.rules as NonNullable<Parameters<typeof createArbiterPlugin>[0]["rules"]>,
		});
		plugin.onDispose?.();
	} catch (error) {
		errors.rules = `Rules could not create an Arbitre session: ${error instanceof Error ? error.message : String(error)}`;
	}
}

export type ParseDocumentResult =
	| { readonly ok: true; readonly document: PlaygroundDocument }
	| { readonly ok: false; readonly errors: SourceErrors };

export function parseDocument(sources: PlaygroundSources): ParseDocumentResult {
	const errors: SourceErrors = {};
	const total = SOURCE_KEYS.reduce((size, key) => size + new Blob([sources[key]]).size, 0);
	if (total > TOTAL_LIMIT_BYTES) errors.schema = `All sources exceed ${TOTAL_LIMIT_BYTES.toLocaleString()} bytes`;
	const values = Object.fromEntries(SOURCE_KEYS.map((key) => [key, parseSource(key, sources[key], errors)])) as Record<
		SourceKey,
		unknown
	>;
	validateShapes(values, errors);
	preflight(values, errors);
	if (Object.keys(errors).length > 0) return { ok: false, errors };
	return {
		ok: true,
		document: { version: PLAYGROUND_DOCUMENT_VERSION, ...values } as PlaygroundDocument,
	};
}
