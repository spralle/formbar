import { createForm } from "@formbar/core";
import type { LayoutNode, SchemaFieldInfo } from "@formbar/from-schema";
import type { ChangeEvent, ReactElement, ReactNode } from "react";
import { Children, createElement, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ArrayRenderer } from "../renderers/ArrayRenderer";
import { createRadioOptionId } from "../renderers/demo-control-ids";
import { isDemoFieldDisabled, isDemoSchemaDisabled } from "../renderers/demo-field-disabled";
import {
	getFormbarOptionByKey,
	getFormbarOptionKey,
	getSelectableFormbarOption,
	getSelectedFormbarOptionKey,
} from "../renderers/formbar-option-keys";
import { FormbarOptionsSelect, renderFormbarOptionsControl } from "../renderers/formbar-options-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Slider } from "../ui";

type NativeControlProps = {
	readonly children?: ReactNode;
	readonly className?: string;
	readonly onChange: (event: ChangeEvent<HTMLInputElement & HTMLSelectElement>) => void;
	readonly value?: number;
};

function getNativeProps(element: ReactElement): NativeControlProps {
	return element.props as NativeControlProps;
}

describe("demo control shims", () => {
	it("round-trips exact typed option values through opaque keys", () => {
		const options = [1, "1", true, null].map((value) => ({ value, title: String(value) }));

		for (const [index, option] of options.entries()) {
			const key = getFormbarOptionKey(index);
			expect(getSelectedFormbarOptionKey(options, option.value)).toBe(key);
			expect(getFormbarOptionByKey(options, key)?.value).toBe(option.value);
		}
	});

	it("uses prepared array options with stable, associated row control ids", () => {
		const form = createForm({ initialData: { rows: [{ role: "lead" }, { role: "lead" }] } });
		const node: LayoutNode = {
			type: "array",
			id: "layout-rows",
			path: "rows",
			children: [{ type: "field", id: "layout-rows-role", path: "rows.role" }],
		};
		const fields = new Map<string, SchemaFieldInfo>([
			["rows", { path: "rows", type: "array", required: false, metadata: { title: "Rows" } }],
			[
				"rows.role",
				{
					path: "rows.role",
					type: "enum",
					required: false,
					metadata: { title: "Role", enum: ["lead"], options: [{ value: "lead", title: "Raw title" }] },
				},
			],
		]);
		const markup = renderToStaticMarkup(
			createElement(ArrayRenderer, {
				node,
				form,
				fieldMap: fields,
				optionsByPath: new Map([["rows.role", [{ value: "lead", title: "Prepared title" }]]]),
				onChange: vi.fn(),
			}),
		);
		const controlIds = [...markup.matchAll(/<label[^>]*for="([^"]+)"[^>]*>Role<\/label>/g)].map((match) => match[1]);

		expect(markup).toContain("Prepared title");
		expect(markup).not.toContain("Raw title");
		expect(controlIds).toHaveLength(2);
		expect(new Set(controlIds)).toHaveLength(2);
		for (const controlId of controlIds) {
			expect(markup).toContain(`id="${controlId}"`);
			expect(markup).toContain(`aria-labelledby="${controlId}-label"`);
		}
	});

	it("keeps object-array ids unique when sanitized property names collide", () => {
		const form = createForm({
			initialData: {
				rows: [
					{ "a b": "one", "a-b": "two" },
					{ "a b": "x", "a-b": "y" },
				],
			},
		});
		const node: LayoutNode = {
			type: "array",
			id: "layout-rows",
			path: "rows",
			children: [
				{ type: "field", id: "layout-space", path: "rows.a b" },
				{ type: "field", id: "layout-dash", path: "rows.a-b" },
			],
		};
		const fields = new Map<string, SchemaFieldInfo>([
			["rows", { path: "rows", type: "array", required: false, metadata: { title: "Rows" } }],
			["rows.a b", { path: "rows.a b", type: "string", required: false, metadata: { title: "Space key" } }],
			["rows.a-b", { path: "rows.a-b", type: "string", required: false, metadata: { title: "Dash key" } }],
		]);
		const markup = renderToStaticMarkup(
			createElement(ArrayRenderer, { node, form, fieldMap: fields, optionsByPath: new Map(), onChange: vi.fn() }),
		);
		const labels = [...markup.matchAll(/<label[^>]*for="([^"]+)"[^>]*>(Space key|Dash key)<\/label>/g)];
		const controlIds = labels.map((match) => match[1]);

		expect(labels.map((match) => match[2])).toEqual(["Space key", "Dash key", "Space key", "Dash key"]);
		expect(controlIds).toHaveLength(4);
		expect(new Set(controlIds)).toHaveLength(4);
		for (const controlId of controlIds) expect(markup).toContain(`id="${controlId}"`);
	});

	it("does not fall back to unprepared primitive item options during render", () => {
		const form = createForm({ initialData: { tags: ["one"] } });
		const markup = renderToStaticMarkup(
			createElement(ArrayRenderer, {
				node: { type: "array", id: "layout-tags", path: "tags", children: [] },
				form,
				fieldMap: new Map([["tags", { path: "tags", type: "array", required: false, metadata: { title: "Tags" } }]]),
				optionsByPath: new Map(),
				onChange: vi.fn(),
				itemSchema: { type: "string", "x-formbar": { options: [{ value: "one", title: "Raw one" }] } },
			}),
		);

		expect(markup).not.toContain("Raw one");
		expect(markup).toMatch(/<input[^>]*id="/);
	});

	it("associates primitive array selects with the visible array label", () => {
		const form = createForm({ initialData: { tags: ["one", "one"] } });
		const markup = renderToStaticMarkup(
			createElement(ArrayRenderer, {
				node: { type: "array", id: "layout-tags", path: "tags", children: [] },
				form,
				fieldMap: new Map<string, SchemaFieldInfo>([
					["tags", { path: "tags", type: "array", required: false, metadata: { title: "Tags" } }],
				]),
				optionsByPath: new Map([["tags[]", [{ value: "one", title: "Prepared one" }]]]),
				onChange: vi.fn(),
				itemSchema: {
					type: "string",
					"x-formbar": { options: [{ value: "one", title: "Raw one" }], disabled: true },
				},
			}),
		);
		const labelId = markup.match(/<label[^>]*id="([^"]+)"[^>]*>Tags<\/label>/)?.[1];
		const selectIds = [...markup.matchAll(/<select[^>]*id="([^"]+)"[^>]*aria-labelledby="([^"]+)"/g)];

		expect(markup).toContain("Prepared one");
		expect(markup).not.toContain("Raw one");
		expect(labelId).toBeDefined();
		expect(selectIds).toHaveLength(2);
		expect(new Set(selectIds.map((match) => match[1]))).toHaveLength(2);
		expect(selectIds.every((match) => match[2] === labelId)).toBe(true);
		expect(markup.match(/<button[^>]*disabled=""[^>]*>×<\/button>/g)).toHaveLength(2);
	});

	it("retains a selected disabled value while guarding new UI selection", () => {
		const options = [
			{ value: "active", title: "Active" },
			{ value: "legacy", title: "Legacy", disabled: true },
		];

		expect(getSelectedFormbarOptionKey(options, "legacy")).toBe(getFormbarOptionKey(1));
		expect(getSelectableFormbarOption(options, getFormbarOptionKey(1), false)).toBeUndefined();
		expect(getSelectableFormbarOption(options, getFormbarOptionKey(0), true)).toBeUndefined();
		expect(getSelectableFormbarOption(options, getFormbarOptionKey(0), false)?.value).toBe("active");

		const markup = renderToStaticMarkup(
			renderFormbarOptionsControl("legacy", vi.fn(), options, false, false, {
				controlId: "state",
				labelId: "state-label",
				describedBy: undefined,
				invalid: false,
			}),
		);
		expect(markup).toMatch(/<input[^>]*disabled=""[^>]*checked=""[^>]*value="formbar-option-1"/);
		expect(markup).toContain("Legacy");
	});

	it("round-trips typed values through both radio and select controls", () => {
		const onRadioChange = vi.fn();
		const radioOptions = [1, "1"].map((value) => ({ value, title: String(value) }));
		const radio = renderFormbarOptionsControl("1", onRadioChange, radioOptions, false, false, {
			controlId: "typed-radio",
			labelId: "typed-radio-label",
			describedBy: undefined,
			invalid: false,
		}) as ReactElement<{ onValueChange: (value: string) => void; value: string }>;

		expect(radio.props.value).toBe(getFormbarOptionKey(1));
		radio.props.onValueChange(getFormbarOptionKey(0));
		expect(onRadioChange).toHaveBeenCalledWith(1);

		const onSelectChange = vi.fn();
		const selectOptions = [1, "1", true, false, null, "last"].map((value) => ({ value, title: String(value) }));
		const select = FormbarOptionsSelect({
			value: true,
			onChange: onSelectChange,
			options: selectOptions,
			fieldDisabled: false,
		}) as ReactElement<{ onValueChange: (value: string) => void; value: string }>;

		expect(select.props.value).toBe(getFormbarOptionKey(2));
		select.props.onValueChange(getFormbarOptionKey(0));
		expect(onSelectChange).toHaveBeenCalledWith(1);
	});

	it("combines schema, metadata, and resolved field disabled state", () => {
		const field = { path: "choice", type: "enum", required: false, metadata: {} } as const;
		const enabledState = { visible: true, readOnly: false, disabled: false };

		expect(isDemoFieldDisabled(field, enabledState)).toBe(false);
		expect(isDemoFieldDisabled(field, { ...enabledState, readOnly: true })).toBe(true);
		expect(isDemoFieldDisabled(field, { ...enabledState, disabled: true })).toBe(true);
		expect(isDemoFieldDisabled({ ...field, metadata: { disabled: true } }, enabledState)).toBe(true);
		expect(isDemoSchemaDisabled({ readOnly: true })).toBe(true);
		expect(isDemoSchemaDisabled({ "x-formbar": { disabled: true } })).toBe(true);
	});

	it("creates distinct radio ids when normalized values collide", () => {
		const firstId = createRadioOptionId("field", "a b", 0);
		const secondId = createRadioOptionId("field", "a-b", 1);

		expect(firstId).not.toBe(secondId);
		expect(new Set([firstId, secondId])).toHaveLength(2);
	});

	it("keeps radio ids stable when resolved titles change", () => {
		const a11y = {
			controlId: "scope",
			labelId: "scope-label",
			describedBy: undefined,
			invalid: false,
		};
		const renderIds = (titles: readonly string[]) => {
			const options = titles.map((title, value) => ({ value, title }));
			const markup = renderToStaticMarkup(renderFormbarOptionsControl(0, vi.fn(), options, false, false, a11y));
			return [...markup.matchAll(/<input[^>]*id="([^"]+)"/g)].map((match) => match[1]);
		};

		expect(renderIds(["First", "Second"])).toEqual(renderIds(["Uno", "Dos"]));
	});

	it("renders native select options and bridges change callbacks", () => {
		const onChange = vi.fn();
		const onValueChange = vi.fn();
		const select = Select({
			onChange,
			onValueChange,
			children: createElement(
				SelectTrigger,
				{ className: "trigger" },
				createElement(SelectValue, { placeholder: "Choose" }),
				createElement(SelectContent, null, createElement(SelectItem, { value: "alpha" }, "Alpha")),
			),
		});
		const props = getNativeProps(select);
		const options = Children.toArray(props.children);

		expect(select.type).toBe("select");
		expect(props.className).toContain("trigger");
		expect(options).toHaveLength(2);
		expect(options.every((option) => isValidElement(option) && ["option", SelectItem].includes(option.type))).toBe(
			true,
		);
		const markup = renderToStaticMarkup(select);
		expect(markup).not.toMatch(/<(div|span)/);

		const event = { currentTarget: { value: "alpha" } } as ChangeEvent<HTMLInputElement & HTMLSelectElement>;
		props.onChange(event);
		expect(onChange).toHaveBeenCalledWith(event);
		expect(onValueChange).toHaveBeenCalledWith("alpha");
	});

	it("keeps SelectValue non-rendering outside a select", () => {
		expect(SelectValue({ placeholder: "Choose" })).toBeNull();
	});

	it("leaves select border utilities free to override the base input border", () => {
		const select = Select({ className: "border-destructive" });
		const classes = getNativeProps(select).className?.split(" ");

		expect(classes).toContain("formbar-demo-select");
		expect(classes).toContain("border-destructive");
		expect(classes).not.toContain("border-input");
	});

	it("maps slider array values and native changes", () => {
		const onChange = vi.fn();
		const onValueChange = vi.fn();
		const slider = Slider({ value: [12], onChange, onValueChange });
		const props = getNativeProps(slider);

		expect(slider.type).toBe("input");
		expect(props.value).toBe(12);

		const event = { currentTarget: { valueAsNumber: 27 } } as ChangeEvent<HTMLInputElement & HTMLSelectElement>;
		props.onChange(event);
		expect(onChange).toHaveBeenCalledWith(event);
		expect(onValueChange).toHaveBeenCalledWith([27]);
	});
});
