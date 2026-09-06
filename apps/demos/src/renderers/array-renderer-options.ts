import type { FormbarOption, LayoutNode, SchemaFieldInfo } from "@formbar/from-schema";
import type { ResolvedFieldState } from "@formbar/react-schema";
import { isDemoFieldDisabled, isDemoSchemaDisabled } from "./demo-field-disabled";

export interface ArrayFieldEntry {
	readonly key: string;
	readonly label: string;
	readonly options: readonly FormbarOption[] | undefined;
	readonly fieldType: string;
	readonly disabled: boolean;
}

export function getArrayFieldEntries(
	node: LayoutNode,
	itemSchema: Record<string, unknown> | undefined,
	fieldMap: Map<string, SchemaFieldInfo>,
	optionsByPath: ReadonlyMap<string, readonly FormbarOption[]>,
	fieldStates: ReadonlyMap<string, ResolvedFieldState> | undefined,
	parentDisabled: boolean,
): ArrayFieldEntry[] {
	const realChildren = node.children?.filter(
		(child) => child.type === "field" && child.path && !child.path.endsWith("[]"),
	);
	if (realChildren?.length) {
		return realChildren.map((child) =>
			createFieldEntry(child.path ?? "", fieldMap, optionsByPath, fieldStates, parentDisabled),
		);
	}
	return createSchemaFieldEntries(node.path ?? "", itemSchema, optionsByPath, parentDisabled);
}

function createFieldEntry(
	path: string,
	fieldMap: Map<string, SchemaFieldInfo>,
	optionsByPath: ReadonlyMap<string, readonly FormbarOption[]>,
	fieldStates: ReadonlyMap<string, ResolvedFieldState> | undefined,
	parentDisabled: boolean,
): ArrayFieldEntry {
	const field = fieldMap.get(path);
	const key = path.split(".").pop() ?? "";
	return {
		key,
		label: field?.metadata?.title ?? key,
		options: toRenderableOptions(optionsByPath.get(path)),
		fieldType: field?.type ?? "string",
		disabled: parentDisabled || isDemoFieldDisabled(field, fieldStates?.get(path)),
	};
}

function createSchemaFieldEntries(
	arrayPath: string,
	itemSchema: Record<string, unknown> | undefined,
	optionsByPath: ReadonlyMap<string, readonly FormbarOption[]>,
	parentDisabled: boolean,
): ArrayFieldEntry[] {
	const properties = (itemSchema?.properties ?? {}) as Record<string, Record<string, unknown>>;
	return Object.entries(properties).map(([key, propSchema]) => {
		const path = arrayPath ? `${arrayPath}.${key}` : key;
		return {
			key,
			label: (propSchema.title as string) ?? key,
			options: toRenderableOptions(optionsByPath.get(path)),
			fieldType: propSchema.type as string,
			disabled: parentDisabled || isDemoSchemaDisabled(propSchema),
		};
	});
}

export function toRenderableOptions(
	options: readonly FormbarOption[] | undefined,
): readonly FormbarOption[] | undefined {
	return options?.length ? options : undefined;
}
