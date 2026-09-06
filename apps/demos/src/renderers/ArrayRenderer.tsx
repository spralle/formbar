import type { FormApi } from "@formbar/core";
import type { FormbarOption, LayoutNode, SchemaFieldInfo } from "@formbar/from-schema";
import type { ResolvedFieldState } from "@formbar/react-schema";
import React, { type ReactNode, useId, useMemo } from "react";
import { Badge, Button, Input, Label, Switch } from "../ui";
import {
	type ArrayFieldEntry,
	getArrayFieldEntries,
	getSchemaFormbarOptions,
	toRenderableOptions,
} from "./array-renderer-options";
import { useArrayItems } from "./array-renderer-state";
import { toIdPart } from "./demo-control-ids";
import { isDemoFieldDisabled, isDemoSchemaDisabled } from "./demo-field-disabled";
import { FormbarOptionsSelect } from "./formbar-options-control";

export { getSchemaFormbarOptions } from "./array-renderer-options";

export interface ArrayRendererProps {
	readonly node: LayoutNode;
	readonly form: FormApi;
	readonly fieldMap: Map<string, SchemaFieldInfo>;
	readonly optionsByPath: ReadonlyMap<string, readonly FormbarOption[]>;
	readonly fieldStates?: ReadonlyMap<string, ResolvedFieldState>;
	readonly onChange: (path: string, value: unknown) => void;
	readonly itemSchema?: Record<string, unknown>;
}

export function ArrayRenderer({
	node,
	form,
	fieldMap,
	optionsByPath,
	fieldStates,
	onChange,
	itemSchema,
}: ArrayRendererProps) {
	const field = node.path ? fieldMap.get(node.path) : undefined;
	const title = field?.metadata?.title ?? node.path ?? "Items";
	const disabled = isDemoFieldDisabled(field, node.path ? fieldStates?.get(node.path) : undefined);
	const { arrayId, primitiveOptions, fieldEntries } = useArrayPresentation(
		node,
		itemSchema,
		fieldMap,
		optionsByPath,
		fieldStates,
		disabled,
	);
	const { items, itemKeys, updateItems, addItem, removeItem } = useArrayItems(node, form, onChange, itemSchema);

	return (
		<ArrayPanel
			arrayId={arrayId}
			title={title}
			items={items}
			itemKeys={itemKeys}
			itemSchema={itemSchema}
			fieldEntries={fieldEntries}
			primitiveOptions={primitiveOptions}
			disabled={disabled}
			updateItems={updateItems}
			removeItem={removeItem}
			addItem={addItem}
		/>
	);
}

function useArrayPresentation(
	node: LayoutNode,
	itemSchema: Record<string, unknown> | undefined,
	fieldMap: Map<string, SchemaFieldInfo>,
	optionsByPath: ReadonlyMap<string, readonly FormbarOption[]>,
	fieldStates: ReadonlyMap<string, ResolvedFieldState> | undefined,
	disabled: boolean,
) {
	const generatedId = useId();
	const arrayId = `demo-array-${toIdPart(node.path ?? node.id)}-${toIdPart(generatedId)}`;
	const primitiveOptions = useMemo(() => {
		const path = node.path ? `${node.path}[]` : "";
		const prepared = path && optionsByPath.has(path) ? optionsByPath.get(path) : getSchemaFormbarOptions(itemSchema);
		return toRenderableOptions(prepared);
	}, [itemSchema, node.path, optionsByPath]);
	const fieldEntries = useMemo(
		() => getArrayFieldEntries(node, itemSchema, fieldMap, optionsByPath, fieldStates, disabled),
		[node, itemSchema, fieldMap, optionsByPath, fieldStates, disabled],
	);
	return { arrayId, primitiveOptions, fieldEntries };
}

interface ArrayPanelProps extends ArrayItemRowsProps {
	readonly arrayId: string;
	readonly title: string;
	readonly addItem: () => void;
	readonly disabled: boolean;
}

function ArrayPanel({
	arrayId,
	title,
	items,
	itemKeys,
	itemSchema,
	fieldEntries,
	primitiveOptions,
	disabled,
	updateItems,
	removeItem,
	addItem,
}: ArrayPanelProps) {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<Label id={`${arrayId}-label`} className="text-sm font-semibold text-foreground">
					{title}
				</Label>
				<Badge variant="secondary" className="text-xs">
					{items.length} items
				</Badge>
			</div>
			<div className="flex flex-col gap-2 rounded-md border border-border-muted p-3">
				{items.length === 0 && <p className="text-xs text-muted-foreground italic">No items yet</p>}
				<ArrayItemRows
					arrayId={arrayId}
					items={items}
					itemKeys={itemKeys}
					itemSchema={itemSchema}
					fieldEntries={fieldEntries}
					primitiveOptions={primitiveOptions}
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
	readonly arrayId: string;
	readonly items: unknown[];
	readonly itemKeys: string[];
	readonly itemSchema?: Record<string, unknown>;
	readonly fieldEntries: readonly ArrayFieldEntry[];
	readonly primitiveOptions: readonly FormbarOption[] | undefined;
	readonly disabled: boolean;
	readonly updateItems: (newItems: unknown[]) => void;
	readonly removeItem: (index: number) => void;
}

function ArrayItemRows({
	arrayId,
	items,
	itemKeys,
	itemSchema,
	fieldEntries,
	primitiveOptions,
	disabled,
	updateItems,
	removeItem,
}: ArrayItemRowsProps) {
	return (
		<>
			{items.map((item, index) => (
				<ArrayItem
					key={itemKeys[index]}
					arrayId={arrayId}
					itemKey={itemKeys[index] ?? `item-${index}`}
					item={item}
					index={index}
					items={items}
					itemSchema={itemSchema}
					fieldEntries={fieldEntries}
					primitiveOptions={primitiveOptions}
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
	readonly arrayId: string;
	readonly itemKey: string;
	readonly index: number;
	readonly items: unknown[];
	readonly itemSchema?: Record<string, unknown>;
	readonly fieldEntries: readonly ArrayFieldEntry[];
	readonly primitiveOptions: readonly FormbarOption[] | undefined;
	readonly disabled: boolean;
	readonly updateItems: (newItems: unknown[]) => void;
	readonly removeItem: (index: number) => void;
}

function ArrayItem(props: ArrayItemProps) {
	const { arrayId, itemKey, item, index, items, itemSchema, disabled, updateItems, removeItem, primitiveOptions } =
		props;
	if (typeof item !== "object" || item === null) {
		return renderPrimitiveArrayItem({
			arrayId,
			itemKey,
			item,
			index,
			items,
			itemSchema,
			options: primitiveOptions,
			fieldDisabled: disabled,
			updateItems,
			removeItem,
		});
	}
	return renderObjectArrayItem({ ...props, item });
}

function renderObjectArrayItem(props: ArrayItemProps & { readonly item: object }): ReactNode {
	const { arrayId, itemKey, item, index, items, disabled, updateItems, removeItem, fieldEntries } = props;
	const record = item as Record<string, unknown>;
	return (
		<div className="flex items-start gap-2">
			<div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-md border border-border-muted p-3">
				{fieldEntries.map(({ key, label, options, fieldType, disabled }) => (
					<div key={key} className="flex flex-col gap-1">
						<Label
							id={`${createArrayControlId(arrayId, itemKey, key)}-label`}
							htmlFor={createArrayControlId(arrayId, itemKey, key)}
							className="text-xs text-muted-foreground"
						>
							{label}
						</Label>
						{renderArrayItemField(key, record, fieldType, options, disabled, arrayId, itemKey, (newValue) => {
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

interface PrimitiveArrayItemProps {
	readonly arrayId: string;
	readonly itemKey: string;
	readonly item: unknown;
	readonly index: number;
	readonly items: unknown[];
	readonly itemSchema: Record<string, unknown> | undefined;
	readonly options: readonly FormbarOption[] | undefined;
	readonly fieldDisabled: boolean;
	readonly updateItems: (newItems: unknown[]) => void;
	readonly removeItem: (index: number) => void;
}

function renderPrimitiveArrayItem(props: PrimitiveArrayItemProps): ReactNode {
	const disabled = props.fieldDisabled || isDemoSchemaDisabled(props.itemSchema);
	const controlId = createArrayControlId(props.arrayId, props.itemKey, "item");
	const updateItem = (newValue: unknown) => {
		const newItems = [...props.items];
		newItems[props.index] = newValue;
		props.updateItems(newItems);
	};

	return (
		<div className="flex items-center gap-2">
			{props.options ? (
				<FormbarOptionsSelect
					options={props.options}
					value={props.item}
					onChange={updateItem}
					fieldDisabled={disabled}
					a11y={{ controlId, labelId: `${props.arrayId}-label`, describedBy: undefined, invalid: false }}
					className="flex-1"
					triggerClassName="h-8 text-xs"
				/>
			) : (
				<Input
					id={controlId}
					aria-labelledby={`${props.arrayId}-label`}
					className="flex-1"
					value={String(props.item ?? "")}
					onChange={(e) => updateItem(e.target.value)}
					placeholder={`Item ${props.index + 1}`}
					disabled={disabled}
				/>
			)}
			<Button
				variant="ghost"
				size="sm"
				onClick={() => props.removeItem(props.index)}
				disabled={disabled}
				className="text-destructive shrink-0 h-8 w-8 p-0"
			>
				×
			</Button>
		</div>
	);
}

function renderArrayItemField(
	key: string,
	record: Record<string, unknown>,
	fieldType: string,
	options: readonly FormbarOption[] | undefined,
	disabled: boolean,
	arrayId: string,
	itemKey: string,
	onChange: (value: unknown) => void,
): ReactNode {
	const controlId = createArrayControlId(arrayId, itemKey, key);
	if (options) {
		return (
			<FormbarOptionsSelect
				options={options}
				value={record[key]}
				onChange={onChange}
				fieldDisabled={disabled}
				a11y={{ controlId, labelId: `${controlId}-label`, describedBy: undefined, invalid: false }}
				className="flex-1"
				triggerClassName="h-8 text-xs"
			/>
		);
	}
	if (fieldType === "boolean") {
		return <Switch id={controlId} checked={Boolean(record[key])} onCheckedChange={onChange} disabled={disabled} />;
	}
	if (fieldType === "number" || fieldType === "integer") {
		return (
			<Input
				id={controlId}
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
			id={controlId}
			className="h-8 text-xs"
			value={String(record[key] ?? "")}
			onChange={(e) => onChange(e.target.value)}
			disabled={disabled}
		/>
	);
}

function createArrayControlId(arrayId: string, itemKey: string, fieldKey: string): string {
	return `${arrayId}-${toIdPart(itemKey)}-${toIdPart(fieldKey)}`;
}
