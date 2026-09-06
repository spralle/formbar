import type { SchemaFieldInfo } from "@formbar/from-schema";
import type { ResolvedFieldState } from "@formbar/react-schema";

export function isDemoFieldDisabled(field: SchemaFieldInfo | undefined, state?: ResolvedFieldState): boolean {
	return (
		field?.metadata?.readOnly === true ||
		(field?.metadata as Record<string, unknown> | undefined)?.disabled === true ||
		state?.readOnly === true ||
		state?.disabled === true
	);
}

export function isDemoSchemaDisabled(schema: Record<string, unknown> | undefined): boolean {
	const formbar = schema?.["x-formbar"] as Record<string, unknown> | undefined;
	return schema?.readOnly === true || formbar?.disabled === true;
}
