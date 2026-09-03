import type { SchemaFieldInfo, SchemaFieldMetadata, SchemaIngestionResult } from "@scheman/core";
import { FromSchemaError } from "./errors.js";

/**
 * Known formbar metadata keys that get elevated to the field metadata level.
 * These are extracted from `extensions.formbar` and merged directly into the field metadata.
 */
const KNOWN_FORMBAR_KEYS = new Set([
	"title",
	"description",
	"enum",
	"default",
	"minimum",
	"maximum",
	"exclusiveMinimum",
	"exclusiveMaximum",
	"minLength",
	"maxLength",
	"format",
	"pattern",
	"widget",
	"options",
	"label",
	"placeholder",
]);

/**
 * Post-processes schema ingestion results to apply formbar-specific metadata conventions.
 *
 * The upstream `@scheman/core` generically extracts `.meta({ formbar: {...} })` as
 * `extensions.formbar`. This function detects that extension and elevates known keys
 * (widget, label, placeholder, options, etc.) to the field metadata level.
 *
 * Also enforces that `x-formbar` is not used in Zod metadata (it should be `.meta({ formbar: {...} })`).
 */
export function applyFormbarMetadata(result: SchemaIngestionResult): SchemaIngestionResult {
	const fields = result.fields.map(processField);
	return { ...result, fields };
}

function processField(field: SchemaFieldInfo): SchemaFieldInfo {
	const extensions = field.metadata?.extensions;
	if (!extensions) return field;

	// Reject x-formbar convention (should use formbar key directly)
	if ("x-formbar" in extensions) {
		throw new FromSchemaError(
			"FORMBAR_ZOD_XFORMBAR_FORBIDDEN",
			`Field "${field.path}": x-formbar is not allowed. Use .meta({ formbar: { ... } }) instead.`,
		);
	}

	const formbarExt = extensions.formbar as Record<string, unknown> | undefined;
	if (!formbarExt) return field;

	// Elevate known keys to field metadata level, remainder stays in extra
	const elevated: Record<string, unknown> = {};
	const extra: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(formbarExt)) {
		if (KNOWN_FORMBAR_KEYS.has(key)) {
			elevated[key] = value;
		} else {
			extra[key] = value;
		}
	}

	// Remove formbar from extensions
	const { formbar: _, ...remainingExtensions } = extensions;
	const hasRemainingExtensions = Object.keys(remainingExtensions).length > 0;

	const newMetadata: SchemaFieldMetadata = {
		...field.metadata,
		...elevated,
		...(Object.keys(extra).length > 0
			? { extra: { ...((field.metadata?.extra as Record<string, unknown>) ?? {}), ...extra } }
			: {}),
		...(hasRemainingExtensions ? { extensions: remainingExtensions } : { extensions: undefined }),
	};

	// Clean up undefined extensions
	const cleanMetadata = Object.fromEntries(
		Object.entries(newMetadata).filter(([, v]) => v !== undefined),
	) as SchemaFieldMetadata;

	return { ...field, metadata: cleanMetadata };
}
