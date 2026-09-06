import type { FormApi } from "@formbar/core";
import {
	type FormbarOption,
	type LayoutNode,
	type SchemaFieldInfo,
	normalizeFormbarOptions,
} from "@formbar/from-schema";
import type { ResolvedFieldState } from "@formbar/react-schema";
import { useCallback, useState } from "react";
import { Badge, Button, Input, Label, Switch } from "../ui";
import { isDemoFieldDisabled, isDemoSchemaDisabled } from "./demo-field-disabled";
import { FormbarOptionsSelect } from "./formbar-options-control";

let nextArrayItemKey = 0;

function createArrayItemKey(): string {
	nextArrayItemKey += 1;
	return `array-item-${nextArrayItemKey}`;
}

export interface ArrayRendererProps {
	readonly node: LayoutNode;
	readonly form: FormApi;
	readonly fieldMap: Map<string, SchemaFieldInfo>;
	readonly fieldStates?: ReadonlyMap<string, ResolvedFieldState>;
	readonly onChange: (path: string, value: unknown) => void;
	readonly itemSchema?: Record<string, unknown>;
}

export function ArrayRenderer({ node, form, fieldMap, fieldStates, onChange, itemSchema }: ArrayRendererProps) {
	const field = node.path ? fieldMap.get(node.path) : undefined;
	const title = field?.metadata?.title ?? node.path ?? "Items";
	const disabled = isDemoFieldDisabled(field, node.path ? fieldStates?.get(node.path) : undefined);
	const [items, setItems] = useState<unknown[]>(() => {
		const data = form.getState().data as Record<string, unknown> | undefined;
		const val = data?.[node.path ?? ""];
		return Array.isArray(val) ? val : [];
	});
	const [itemKeys, setItemKeys] = useState<string[]>(() => items.map(createArrayItemKey));

	const updateItems = useCallback(
		(newItems: unknown[]) => {
			setItems(newItems);
			if (node.path) onChange(node.path, newItems);
		},
		[node.path, onChange],
	);

	const addItem = () => {
		const hasRealChildren = node.children?.some((c) => c.type === "field" && c.path && !c.path.endsWith("[]")) ?? false;
		const isObjectItems = hasRealChildren || itemSchema?.type === "object";
		setItemKeys([...itemKeys, createArrayItemKey()]);
		updateItems([...items, isObjectItems ? {} : ""]);
	};

	const removeItem = (index: number) => {
		setItemKeys(itemKeys.filter((_, i) => i !== index));
		updateItems(items.filter((_, i) => i !== index));
	};

	return (
		<ArrayPanel
			title={title}
			items={items}
			itemKeys={itemKeys}
			itemSchema={itemSchema}
			node={node}
			fieldMap={fieldMap}
			fieldStates={fieldStates}
			disabled={disabled}
			updateItems={updateItems}
			removeItem={removeItem}
			addItem={addItem}
		/>
	);
}

interface ArrayPanelProps extends ArrayItemRowsProps {
	readonly title: string;
	readonly addItem: () => void;
	readonly disabled: boolean;
}

function ArrayPanel({
	title,
	items,
	itemKeys,
	itemSchema,
	node,
	fieldMap,
	fieldStates,
	disabled,
	updateItems,
	removeItem,
	addItem,
}: ArrayPanelProps) {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<Label className="text-sm font-semibold text-foreground">{title}</Label>
				<Badge variant="secondary" className="text-xs">
					{items.length} items
				</Badge>
			</div>
			<div className="flex flex-col gap-2 rounded-md border border-border-muted p-3">
				{items.length === 0 && <p className="text-xs text-muted-foreground italic">No items yet</p>}
				<ArrayItemRows
					items={items}
					itemKeys={itemKeys}
					itemSchema={itemSchema}
					node={node}
					fieldMap={fieldMap}
					fieldStates={fieldStates}
					disabled={disabled}
					updateItems={updateItems}
					removeItem={removeItem}
				/>
				<Button variant="outline" size="sm" onClick={addItem} className="self-start mt-1" disabled={disabled}>
					+ Add Item
				</Button>
			</div>
		</div>
	);
}

interface ArrayItemRowsProps {
	readonly items: unknown[];
	readonly itemKeys: string[];
	readonly itemSchema?: Record<string, unknown>;
	readonly node: LayoutNode;
	readonly fieldMap: Map<string, SchemaFieldInfo>;
	readonly fieldStates?: ReadonlyMap<string, ResolvedFieldState>;
	readonly disabled: boolean;
	readonly updateItems: (newItems: unknown[]) => void;
	readonly removeItem: (index: number) => void;
}

function ArrayItemRows({
	items,
	itemKeys,
	itemSchema,
	node,
	fieldMap,
	fieldStates,
	disabled,
	updateItems,
	removeItem,
}: ArrayItemRowsProps) {
	return (
		<>
			{items.map((item, index) => (
				<ArrayItem
					key={itemKeys[index]}
					item={item}
					index={index}
					items={items}
					itemSchema={itemSchema}
					node={node}
					fieldMap={fieldMap}
					fieldStates={fieldStates}
					disabled={disabled}
					updateItems={updateItems}
					removeItem={removeItem}
				/>
			))}
		</>
	);
}

interface ArrayItemProps {
	readonly item: unknown;
	readonly index: number;
	readonly items: unknown[];
	readonly itemSchema?: Record<string, unknown>;
	readonly node: LayoutNode;
	readonly fieldMap: Map<string, SchemaFieldInfo>;
	readonly fieldStates?: ReadonlyMap<string, ResolvedFieldState>;
	readonly disabled: boolean;
	readonly updateItems: (newItems: unknown[]) => void;
	readonly removeItem: (index: number) => void;
}

interface ArrayFieldEntry {
	readonly key: string;
	readonly label: string;
	readonly options: readonly FormbarOption[] | undefined;
	readonly fieldType: string;
	readonly disabled: boolean;
}

function ArrayItem({
	item,
	index,
	items,
	itemSchema,
	node,
	fieldMap,
	fieldStates,
	disabled,
	updateItems,
	removeItem,
}: ArrayItemProps) {
	if (typeof item !== "object" || item === null) {
		return renderPrimitiveArrayItem(item, index, items, itemSchema, disabled, updateItems, removeItem);
	}

	const record = item as Record<string, unknown>;
	const fieldEntries = getArrayFieldEntries(node, itemSchema, fieldMap, fieldStates, disabled);

	return (
		<div className="flex items-start gap-2">
			<div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-md border border-border-muted p-3">
				{fieldEntries.map(({ key, label, options, fieldType, disabled }) => (
					<div key={key} className="flex flex-col gap-1">
						<Label className="text-xs text-muted-foreground">{label}</Label>
						{renderArrayItemField(key, record, fieldType, options, disabled, (newValue) => {
							const newItems = [...items];
							newItems[index] = { ...record, [key]: newValue };
							updateItems(newItems);
						})}
					</div>
				))}
			</div>
			<Button
				variant="ghost"
				size="sm"
				onClick={() => removeItem(index)}
				disabled={disabled}
				className="text-destructive shrink-0 h-8 w-8 p-0"
			>
				×
			</Button>
		</div>
	);
}

function renderPrimitiveArrayItem(
	item: unknown,
	index: number,
	items: unknown[],
	itemSchema: Record<string, unknown> | undefined,
	fieldDisabled: boolean,
	updateItems: (newItems: unknown[]) => void,
	removeItem: (index: number) => void,
): React.ReactNode {
	const options = getSchemaFormbarOptions(itemSchema);
	const disabled = fieldDisabled || isDemoSchemaDisabled(itemSchema);
	const updateItem = (newValue: unknown) => {
		const newItems = [...items];
		newItems[index] = newValue;
		updateItems(newItems);
	};

	return (
		<div className="flex items-center gap-2">
			{options ? (
				<FormbarOptionsSelect
					options={options}
					value={item}
					onChange={updateItem}
					fieldDisabled={disabled}
					className="flex-1"
					triggerClassName="h-8 text-xs"
				/>
			) : (
				<Input
					className="flex-1"
					value={String(item ?? "")}
					onChange={(e) => updateItem(e.target.value)}
					placeholder={`Item ${index + 1}`}
					disabled={disabled}
				/>
			)}
			<Button
				variant="ghost"
				size="sm"
				onClick={() => removeItem(index)}
				disabled={fieldDisabled}
				className="text-destructive shrink-0 h-8 w-8 p-0"
			>
				×
			</Button>
		</div>
	);
}

function getArrayFieldEntries(
	node: LayoutNode,
	itemSchema: Record<string, unknown> | undefined,
	fieldMap: Map<string, SchemaFieldInfo>,
	fieldStates: ReadonlyMap<string, ResolvedFieldState> | undefined,
	parentDisabled: boolean,
): ArrayFieldEntry[] {
	const realChildren = node.children?.filter(
		(child) => child.type === "field" && child.path && !child.path.endsWith("[]"),
	);
	if (realChildren && realChildren.length > 0) {
		return realChildren.map((child) => {
			const field = child.path ? fieldMap.get(child.path) : undefined;
			const key = child.path ? (child.path.split(".").pop() ?? "") : "";
			return {
				key,
				label: field?.metadata?.title ?? key,
				options: getFieldFormbarOptions(field),
				fieldType: field?.type ?? "string",
				disabled: parentDisabled || isDemoFieldDisabled(field, child.path ? fieldStates?.get(child.path) : undefined),
			};
		});
	}

	const properties = (itemSchema?.properties ?? {}) as Record<string, Record<string, unknown>>;
	return Object.entries(properties).map(([key, propSchema]) => ({
		key,
		label: (propSchema.title as string) ?? key,
		options: getSchemaFormbarOptions(propSchema),
		fieldType: propSchema.type as string,
		disabled: parentDisabled || isDemoSchemaDisabled(propSchema),
	}));
}

function renderArrayItemField(
	key: string,
	record: Record<string, unknown>,
	fieldType: string,
	options: readonly FormbarOption[] | undefined,
	disabled: boolean,
	onChange: (value: unknown) => void,
): React.ReactNode {
	if (options) {
		return (
			<FormbarOptionsSelect
				options={options}
				value={record[key]}
				onChange={onChange}
				fieldDisabled={disabled}
				className="flex-1"
				triggerClassName="h-8 text-xs"
			/>
		);
	}
	if (fieldType === "boolean") {
		return <Switch checked={Boolean(record[key])} onCheckedChange={onChange} disabled={disabled} />;
	}
	if (fieldType === "number" || fieldType === "integer") {
		return (
			<Input
				type="number"
				className="h-8 text-xs"
				value={String(record[key] ?? "")}
				onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
				disabled={disabled}
			/>
		);
	}
	return (
		<Input
			className="h-8 text-xs"
			value={String(record[key] ?? "")}
			onChange={(e) => onChange(e.target.value)}
			disabled={disabled}
		/>
	);
}

export function getSchemaFormbarOptions(
	schema: Record<string, unknown> | undefined,
): readonly FormbarOption[] | undefined {
	const formbar = schema?.["x-formbar"] as Record<string, unknown> | undefined;
	if (!Array.isArray(schema?.enum) && !Array.isArray(formbar?.options)) return undefined;
	const result = normalizeFormbarOptions({ enum: schema.enum, options: formbar?.options });
	return result.options.length > 0 ? result.options : undefined;
}

function getFieldFormbarOptions(field: SchemaFieldInfo | undefined): readonly FormbarOption[] | undefined {
	if (!field?.metadata || (!Array.isArray(field.metadata.enum) && !Array.isArray(field.metadata.options)))
		return undefined;
	const options = normalizeFormbarOptions(field.metadata).options;
	return options.length > 0 ? options : undefined;
}
