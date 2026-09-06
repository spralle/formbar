import type { SchemaIngestionResult } from "@scheman/core";
import {
	type FormbarOption,
	type FormbarOptionTitleResolver,
	type FormbarOptionWarning,
	normalizeFormbarOptions,
} from "./formbar-options.js";

export interface PreparedSchemaOptions {
	readonly result: SchemaIngestionResult;
	readonly optionsByPath: ReadonlyMap<string, readonly FormbarOption[]>;
	readonly warnings: readonly FormbarOptionWarning[];
}

export function prepareSchemaOptions(
	result: SchemaIngestionResult,
	resolveTitle?: FormbarOptionTitleResolver,
): PreparedSchemaOptions {
	const warnings: FormbarOptionWarning[] = [];
	const optionsByPath = new Map<string, readonly FormbarOption[]>();
	for (const field of result.fields) {
		const metadata = field.metadata;
		if (!metadata || (!Array.isArray(metadata.enum) && metadata.options === undefined)) continue;
		const normalized = normalizeFormbarOptions(metadata, {
			path: field.path,
			...(resolveTitle ? { resolveTitle } : {}),
		});
		optionsByPath.set(field.path, normalized.options);
		warnings.push(...normalized.warnings);
	}
	return { result, optionsByPath, warnings };
}
