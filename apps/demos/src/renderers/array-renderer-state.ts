import type { LayoutNode } from "@formbar/from-schema";
import { useCallback, useState } from "react";
import type { DemoFormApi } from "./demo-form-api";

let nextArrayItemKey = 0;

function createArrayItemKey(): string {
	nextArrayItemKey += 1;
	return `array-item-${nextArrayItemKey}`;
}

export function useArrayItems(
	node: LayoutNode,
	form: DemoFormApi,
	onChange: (path: string, value: unknown) => void,
	itemSchema: Record<string, unknown> | undefined,
) {
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
		const hasChildren =
			node.children?.some((child) => child.type === "field" && child.path && !child.path.endsWith("[]")) ?? false;
		const isObjectItems = hasChildren || itemSchema?.type === "object";
		setItemKeys([...itemKeys, createArrayItemKey()]);
		updateItems([...items, isObjectItems ? {} : ""]);
	};
	const removeItem = (index: number) => {
		setItemKeys(itemKeys.filter((_, itemIndex) => itemIndex !== index));
		updateItems(items.filter((_, itemIndex) => itemIndex !== index));
	};
	return { items, itemKeys, updateItems, addItem, removeItem };
}
