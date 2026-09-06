import type { FormApi } from "@formbar/core";
import type { FormbarOption, LayoutNode, SchemaFieldInfo } from "@formbar/from-schema";
import { isSectionNode } from "@formbar/from-schema";
import { type ResolvedFieldState, useSchemaForm } from "@formbar/react-schema";
import { useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui";
import { ArrayRenderer } from "./ArrayRenderer";
import { DemoFormField } from "./DemoFormField";

const COLUMN_CLASSES: Record<number, string> = {
	1: "grid grid-cols-1 gap-4",
	2: "grid grid-cols-1 sm:grid-cols-2 gap-4",
	3: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
};

/** Extract items schemas for array fields from the raw JSON Schema */
function buildArrayItemsMap(rawSchema: object): ReadonlyMap<string, Record<string, unknown>> {
	const map = new Map<string, Record<string, unknown>>();
	const props = (rawSchema as Record<string, unknown>).properties as
		| Record<string, Record<string, unknown>>
		| undefined;
	if (!props) return map;
	for (const [key, fieldSchema] of Object.entries(props)) {
		if (fieldSchema.type === "array" && fieldSchema.items && typeof fieldSchema.items === "object") {
			map.set(key, fieldSchema.items as Record<string, unknown>);
		}
	}
	return map;
}

interface DemoFormRootProps {
	readonly schema: object;
	readonly data: Record<string, unknown>;
	readonly layout?: object;
	readonly onChange: (path: string, value: unknown) => void;
	readonly responsive?: boolean;
}

export function DemoFormRoot({
	schema,
	data,
	layout: layoutOverride,
	onChange,
	responsive: _responsive,
}: DemoFormRootProps) {
	const { form, fields, layout, optionsByPath, fieldStates } = useSchemaForm(schema, {
		initialData: data,
		layoutOverride: layoutOverride as LayoutNode | undefined,
	});
	const [formData, setFormData] = useState<Record<string, unknown>>(data);

	const fieldMap = useMemo(() => {
		const map = new Map<string, SchemaFieldInfo>();
		for (const f of fields) map.set(f.path, f);
		return map;
	}, [fields]);

	const arrayItemsMap = useMemo(() => buildArrayItemsMap(schema), [schema]);

	const handleChange = useCallback(
		(path: string, value: unknown) => {
			setFormData((prev) => ({ ...prev, [path]: value }));
			onChange(path, value);
		},
		[onChange],
	);
	const renderContext = { form, fieldMap, optionsByPath, fieldStates, onChange: handleChange, arrayItemsMap };

	return (
		<>
			<Card className="border-border">
				<CardHeader>
					<CardTitle className="text-foreground">Live Form</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col gap-4">{renderNode(layout, renderContext)}</div>
				</CardContent>
			</Card>
			<Card className="border-border mt-4">
				<CardHeader className="pb-2">
					<CardTitle className="text-sm text-foreground">Form Data (JSON)</CardTitle>
				</CardHeader>
				<CardContent>
					<pre className="rounded-md bg-surface-inset p-3 text-xs text-code-foreground overflow-auto max-h-48 border border-border-muted font-mono">
						{JSON.stringify(formData, null, 2)}
					</pre>
				</CardContent>
			</Card>
		</>
	);
}

interface DemoRenderContext {
	readonly form: FormApi;
	readonly fieldMap: Map<string, SchemaFieldInfo>;
	readonly optionsByPath: ReadonlyMap<string, readonly FormbarOption[]>;
	readonly fieldStates: ReadonlyMap<string, ResolvedFieldState>;
	readonly onChange: (path: string, value: unknown) => void;
	readonly arrayItemsMap: ReadonlyMap<string, Record<string, unknown>>;
}

function renderNode(node: LayoutNode, context: DemoRenderContext): React.ReactNode {
	if (node.type === "field" && node.path) {
		return renderFieldNode(node, context);
	}

	if (isSectionNode(node)) {
		const columns = (node.props?.columns as number) ?? 1;
		const title = node.props?.title;
		const gridClass = COLUMN_CLASSES[columns] ?? "flex flex-col gap-4";
		return (
			<div key={node.id} className="flex flex-col gap-3">
				{title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
				<div className={gridClass}>{node.children?.map((child) => renderNode(child, context))}</div>
			</div>
		);
	}

	if (node.type === "array" && node.path) {
		return (
			<ArrayRenderer
				key={node.id}
				node={node}
				form={context.form}
				fieldMap={context.fieldMap}
				optionsByPath={context.optionsByPath}
				fieldStates={context.fieldStates}
				onChange={context.onChange}
				itemSchema={context.arrayItemsMap.get(node.path)}
			/>
		);
	}

	return (
		<div key={node.id} className="flex flex-col gap-4">
			{node.children?.map((child) => renderNode(child, context))}
		</div>
	);
}

function renderFieldNode(node: LayoutNode, context: DemoRenderContext): React.ReactNode {
	const field = node.path ? context.fieldMap.get(node.path) : undefined;
	if (!field) return null;
	return (
		<DemoFormField
			key={node.id}
			form={context.form}
			field={field}
			options={context.optionsByPath.get(field.path)}
			fieldState={context.fieldStates.get(field.path)}
			onChange={context.onChange}
		/>
	);
}
