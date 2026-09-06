import { createArbiterPlugin } from "@formbar/arbiter";
import type { FormApi, FormState } from "@formbar/core";
import type { FormbarOption, LayoutNode, SchemaFieldInfo } from "@formbar/from-schema";
import { isSectionNode } from "@formbar/from-schema";
import { type ResolvedFieldState, useSchemaForm } from "@formbar/react-schema";
import { useCallback, useEffect, useMemo, useState } from "react";
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

const EMPTY_RULES: readonly unknown[] = [];
const EMPTY_UI_STATE: Readonly<Record<string, unknown>> = {};

export interface DemoFormSnapshot {
	readonly state: FormState<Record<string, unknown>, Record<string, unknown>>;
	readonly metadata: unknown;
	readonly warnings: readonly unknown[];
}

interface DemoFormRootProps {
	readonly schema: object;
	readonly data: Record<string, unknown>;
	readonly layout?: object;
	readonly onChange: (path: string, value: unknown) => void;
	readonly responsive?: boolean;
	readonly rules?: readonly unknown[];
	readonly initialUiState?: Record<string, unknown>;
	readonly onSnapshot?: (snapshot: DemoFormSnapshot) => void;
}

export function DemoFormRoot(props: DemoFormRootProps) {
	const { formData, renderContext, layout } = useDemoFormRootState(props);
	return <DemoFormCards formData={formData} renderContext={renderContext} layout={layout} />;
}

function useDemoFormRootState({
	schema,
	data,
	layout: layoutOverride,
	onChange,
	rules = EMPTY_RULES,
	initialUiState = EMPTY_UI_STATE,
	onSnapshot,
}: DemoFormRootProps) {
	const plugins = useMemo(
		() =>
			rules.length
				? [createArbiterPlugin({ rules: rules as NonNullable<Parameters<typeof createArbiterPlugin>[0]["rules"]> })]
				: [],
		[rules],
	);
	const { form, fields, layout, optionsByPath, fieldStates, metadata, warnings } = useSchemaForm<
		Record<string, unknown>,
		Record<string, unknown>
	>(schema, {
		initialData: data,
		initialUiState,
		...(layoutOverride ? { layoutOverride: layoutOverride as LayoutNode } : {}),
		plugins,
	});
	const [formData, setFormData] = useState<Record<string, unknown>>(() => form.getState().data);
	const fieldMap = useMemo(() => indexFields(fields), [fields]);
	const arrayItemsMap = useMemo(() => buildArrayItemsMap(schema), [schema]);
	const handleChange = useCallback(
		(path: string, value: unknown) => {
			onChange(path, value);
		},
		[onChange],
	);
	useEffect(() => {
		const publish = () => {
			const state = form.getState();
			setFormData(state.data);
			onSnapshot?.({ state, metadata, warnings });
		};
		publish();
		return form.subscribe(publish);
	}, [form, metadata, onSnapshot, warnings]);
	const renderContext = { form, fieldMap, optionsByPath, fieldStates, onChange: handleChange, arrayItemsMap };
	return { formData, renderContext, layout };
}

function indexFields(fields: readonly SchemaFieldInfo[]): Map<string, SchemaFieldInfo> {
	return new Map(fields.map((field) => [field.path, field]));
}

interface DemoFormCardsProps {
	readonly formData: Record<string, unknown>;
	readonly renderContext: DemoRenderContext;
	readonly layout: LayoutNode;
}

function DemoFormCards({ formData, renderContext, layout }: DemoFormCardsProps) {
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
