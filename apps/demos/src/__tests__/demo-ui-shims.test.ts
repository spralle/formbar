import type { ChangeEvent, ReactElement, ReactNode } from "react";
import { Children, createElement, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createRadioOptionId } from "../renderers/DemoFormField";
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
	it("creates distinct radio ids when normalized values collide", () => {
		const firstId = createRadioOptionId("field", "a b", 0);
		const secondId = createRadioOptionId("field", "a-b", 1);

		expect(firstId).not.toBe(secondId);
		expect(new Set([firstId, secondId])).toHaveLength(2);
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
