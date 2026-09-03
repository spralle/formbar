import type { FormApi } from "@formbar/core";
import {
	type FormbarEnumOption,
	type LayoutNode,
	type SchemaFieldInfo,
	normalizeEnumOptions,
} from "@formbar/from-schema";
import { useCallback, useState } from "react";
import {
	Badge,
	Button,
	Input,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Switch,
} from "../ui";
import { getEnumOptionKey, getEnumValueByKey, getSelectedEnumOptionKey } from "./enum-option-keys";

let nextArrayItemKey = 0;

function createArrayItemKey(): string {
	nextArrayItemKey += 1;
	return `array-item-${nextArrayItemKey}`;
}

export interface ArrayRendererProps {
	readonly node: LayoutNode;
	readonly form: FormApi;
	readonly fieldMap: Map<string, SchemaFieldInfo>;
	readonly onChange: (path: string, value: unknown) => void;
	readonly itemSchema?: Record<string, unknown>;
}

export function ArrayRenderer({ node, form, fieldMap, onChange, itemSchema }: ArrayRendererProps) {
	const field = node.path ? fieldMap.get(node.path) : undefined;
	const title = field?.metadata?.title ?? node.path ?? "Items";
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
			updateItems={updateItems}
			removeItem={removeItem}
			addItem={addItem}
		/>
	);
}

interface ArrayPanelProps extends ArrayItemRowsProps {
	readonly title: string;
	readonly addItem: () => void;
}

function ArrayPanel({
	title,
	items,
	itemKeys,
	itemSchema,
	node,
	fieldMap,
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
					updateItems={updateItems}
					removeItem={removeItem}
				/>
				<Button variant="outline" size="sm" onClick={addItem} className="self-start mt-1">
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
	readonly updateItems: (newItems: unknown[]) => void;
	readonly removeItem: (index: number) => void;
}

function ArrayItemRows({ items, itemKeys, itemSchema, node, fieldMap, updateItems, removeItem }: ArrayItemRowsProps) {
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
	readonly updateItems: (newItems: unknown[]) => void;
	readonly removeItem: (index: number) => void;
}

interface ArrayFieldEntry {
	readonly key: string;
	readonly label: string;
	readonly enumOptions: readonly FormbarEnumOption[] | undefined;
	readonly fieldType: string;
}

function ArrayItem({ item, index, items, itemSchema, node, fieldMap, updateItems, removeItem }: ArrayItemProps) {
	if (typeof item !== "object" || item === null) {
		return renderPrimitiveArrayItem(item, index, items, itemSchema, updateItems, removeItem);
	}

	const record = item as Record<string, unknown>;
	const fieldEntries = getArrayFieldEntries(node, itemSchema, fieldMap);

	return (
		<div className="flex items-start gap-2">
			<div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-md border border-border-muted p-3">
				{fieldEntries.map(({ key, label, enumOptions, fieldType }) => (
					<div key={key} className="flex flex-col gap-1">
						<Label className="text-xs text-muted-foreground">{label}</Label>
						{renderArrayItemField(key, record, fieldType, enumOptions, (newValue) => {
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
	updateItems: (newItems: unknown[]) => void,
	removeItem: (index: number) => void,
): React.ReactNode {
	const enumOptions = getSchemaEnumOptions(itemSchema);
	const updateItem = (newValue: unknown) => {
		const newItems = [...items];
		newItems[index] = newValue;
		updateItems(newItems);
	};

	return (
		<div className="flex items-center gap-2">
			{enumOptions ? (
				renderEnumSelect(enumOptions, item, updateItem)
			) : (
				<Input
					className="flex-1"
					value={String(item ?? "")}
					onChange={(e) => updateItem(e.target.value)}
					placeholder={`Item ${index + 1}`}
				/>
			)}
			<Button
				variant="ghost"
				size="sm"
				onClick={() => removeItem(index)}
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
				enumOptions: field?.metadata?.enum ? normalizeEnumOptions(field.metadata) : undefined,
				fieldType: field?.type ?? "string",
			};
		});
	}

	const properties = (itemSchema?.properties ?? {}) as Record<string, Record<string, unknown>>;
	return Object.entries(properties).map(([key, propSchema]) => ({
		key,
		label: (propSchema.title as string) ?? key,
		enumOptions: getSchemaEnumOptions(propSchema),
		fieldType: propSchema.type as string,
	}));
}

function renderArrayItemField(
	key: string,
	record: Record<string, unknown>,
	fieldType: string,
	enumOptions: readonly FormbarEnumOption[] | undefined,
	onChange: (value: unknown) => void,
): React.ReactNode {
	if (enumOptions) {
		return renderEnumSelect(enumOptions, record[key], onChange);
	}
	if (fieldType === "boolean") {
		return <Switch checked={Boolean(record[key])} onCheckedChange={onChange} />;
	}
	if (fieldType === "number" || fieldType === "integer") {
		return (
			<Input
				type="number"
				className="h-8 text-xs"
				value={String(record[key] ?? "")}
				onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
			/>
		);
	}
	return <Input className="h-8 text-xs" value={String(record[key] ?? "")} onChange={(e) => onChange(e.target.value)} />;
}

function getSchemaEnumOptions(schema: Record<string, unknown> | undefined): readonly FormbarEnumOption[] | undefined {
	if (!Array.isArray(schema?.enum)) return undefined;
	const formbar = schema["x-formbar"] as Record<string, unknown> | undefined;
	return normalizeEnumOptions({ enum: schema.enum, enumOptions: schema.enumOptions ?? formbar?.enumOptions });
}

function renderEnumSelect(
	options: readonly FormbarEnumOption[],
	value: unknown,
	onChange: (value: unknown) => void,
): React.ReactNode {
	const handleOptionChange = (optionKey: string) => {
		const optionValue = getEnumValueByKey(options, optionKey);
		if (optionValue !== undefined) onChange(optionValue);
	};

	return (
		<Select className="flex-1" value={getSelectedEnumOptionKey(options, value)} onValueChange={handleOptionChange}>
			<SelectTrigger className="h-8 text-xs">
				<SelectValue placeholder="Select..." />
			</SelectTrigger>
			<SelectContent>
				{options.map((option, index) => (
					<SelectItem
						key={getEnumOptionKey(index)}
						value={getEnumOptionKey(index)}
						disabled={option.disabled}
						title={option.description}
					>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
