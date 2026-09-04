// TODO: Replace with proper UI components. These are minimal shims for demo purposes.
import type {
	ChangeEvent,
	DetailsHTMLAttributes,
	HTMLAttributes,
	InputHTMLAttributes,
	LabelHTMLAttributes,
	OptionHTMLAttributes,
	ReactNode,
	SelectHTMLAttributes,
} from "react";
import { Children, Fragment, createContext, createElement, forwardRef, isValidElement, useContext, useId } from "react";

export function cn(...classes: (string | undefined | null | false)[]): string {
	return classes.filter(Boolean).join(" ");
}

export function Card({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return createElement("div", { className: cn("border rounded-lg shadow-sm", className), ...props }, children);
}

export function CardHeader({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return createElement("div", { className: cn("p-4 pb-2", className), ...props }, children);
}

export function CardTitle({ children, className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
	return createElement("h3", { className: cn("text-lg font-semibold", className), ...props }, children);
}

export function CardContent({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return createElement("div", { className: cn("p-4 pt-0", className), ...props }, children);
}

export function Badge({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) {
	return createElement(
		"span",
		{
			className: cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", className),
			...props,
		},
		children,
	);
}

export function ScrollArea({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return createElement("div", { className: cn("overflow-auto", className), ...props }, children);
}

export function Label({ children, className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
	return createElement("label", { className: cn("text-sm font-medium", className), ...props }, children);
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
	({ className, ...props }, ref) =>
		createElement("input", { ref, className: cn("border rounded px-3 py-2 text-sm w-full", className), ...props }),
);
Input.displayName = "Input";

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & {
	onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
	onValueChange?: (value: string) => void;
};

type SelectChildProps = {
	readonly children?: ReactNode;
	readonly className?: string;
	readonly placeholder?: string;
};

function getSelectTriggerClass(children: ReactNode): string | undefined {
	for (const child of Children.toArray(children)) {
		if (!isValidElement<SelectChildProps>(child)) continue;
		if (child.type === SelectTrigger) return child.props.className;
		const childClass = getSelectTriggerClass(child.props.children);
		if (childClass) return childClass;
	}
}

function getSelectOptions(children: ReactNode): ReactNode[] {
	return Children.toArray(children).flatMap((child) => {
		if (!isValidElement<SelectChildProps>(child)) return [];
		if (child.type === SelectValue && child.props.placeholder) {
			return createElement("option", { key: "__placeholder", value: "", disabled: true }, child.props.placeholder);
		}
		if (child.type === SelectItem || child.type === "option") return child;
		return getSelectOptions(child.props.children);
	});
}

export function Select({ children, className, onChange, onValueChange, ...props }: SelectProps) {
	return createElement(
		"select",
		{
			className: cn("border rounded px-3 py-2 text-sm", getSelectTriggerClass(children), className),
			onChange: (event: ChangeEvent<HTMLSelectElement>) => {
				onChange?.(event);
				onValueChange?.(event.currentTarget.value);
			},
			...props,
		},
		getSelectOptions(children),
	);
}

export function SelectTrigger({ children }: HTMLAttributes<HTMLDivElement>) {
	return createElement(Fragment, null, children);
}

export function SelectContent({ children }: HTMLAttributes<HTMLDivElement>) {
	return createElement(Fragment, null, children);
}

export function SelectItem({ children, value, ...props }: OptionHTMLAttributes<HTMLOptionElement> & { value: string }) {
	return createElement("option", { value, ...props }, children);
}

export function SelectValue(_props: { placeholder?: string }) {
	return null;
}

export function Textarea({ className, ...props }: HTMLAttributes<HTMLTextAreaElement>) {
	return createElement("textarea", { className: cn("border rounded px-3 py-2 text-sm w-full", className), ...props });
}

export function Checkbox({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
	return createElement("input", { type: "checkbox", className, ...props });
}

type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "checked" | "onChange" | "type"> & {
	checked?: boolean;
	onCheckedChange?: (checked: boolean) => void;
};

export function Switch({ checked, className, onCheckedChange, ...props }: SwitchProps) {
	return createElement("input", {
		role: "switch",
		type: "checkbox",
		checked,
		className: cn("h-4 w-8", className),
		onChange: (event: ChangeEvent<HTMLInputElement>) => onCheckedChange?.(event.currentTarget.checked),
		...props,
	});
}

type RadioGroupContextValue = {
	readonly name: string;
	readonly value: string | undefined;
	readonly onValueChange: ((value: string) => void) | undefined;
};

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

type RadioGroupProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
	value?: string;
	onValueChange?: (value: string) => void;
	name?: string;
};

export function RadioGroup({ children, className, name, onValueChange, value, ...props }: RadioGroupProps) {
	const generatedName = useId();
	const contextValue = { name: name ?? generatedName, value, onValueChange };
	return createElement(
		RadioGroupContext.Provider,
		{ value: contextValue },
		createElement("div", { role: "radiogroup", className, ...props }, children),
	);
}

type RadioGroupItemProps = Omit<InputHTMLAttributes<HTMLInputElement>, "checked" | "onChange" | "type"> & {
	value: string;
};

export function RadioGroupItem({ className, value, ...props }: RadioGroupItemProps) {
	const group = useContext(RadioGroupContext);
	return createElement("input", {
		type: "radio",
		name: group?.name,
		value,
		checked: group ? group.value === value : undefined,
		className,
		onChange: (event: ChangeEvent<HTMLInputElement>) => {
			if (event.currentTarget.checked) group?.onValueChange?.(value);
		},
		...props,
	});
}

type SliderProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "type" | "value"> & {
	onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
	onValueChange?: (value: number[]) => void;
	value?: number[];
};

export function Slider({ className, onChange, onValueChange, value, ...props }: SliderProps) {
	return createElement("input", {
		type: "range",
		className,
		value: value?.[0],
		onChange: (event: ChangeEvent<HTMLInputElement>) => {
			onChange?.(event);
			onValueChange?.([event.currentTarget.valueAsNumber]);
		},
		...props,
	});
}

export function Progress({ value, className, ...props }: HTMLAttributes<HTMLDivElement> & { value?: number }) {
	return createElement(
		"div",
		{ className: cn("h-2 bg-gray-200 rounded", className), ...props },
		createElement("div", { className: "h-full bg-blue-500 rounded", style: { width: `${value ?? 0}%` } }),
	);
}

export function Button({
	children,
	className,
	...props
}: HTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string; disabled?: boolean }) {
	return createElement(
		"button",
		{ type: "button", className: cn("px-4 py-2 rounded text-sm font-medium border", className), ...props },
		children,
	);
}

export function Tabs({
	children,
	className,
	...props
}: HTMLAttributes<HTMLDivElement> & { defaultValue?: string; value?: string; onValueChange?: (v: string) => void }) {
	return createElement("div", { className, ...props }, children);
}

export function TabsList({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return createElement("div", { className: cn("flex gap-1 border-b", className), ...props }, children);
}

export function TabsTrigger({
	children,
	className,
	value,
	...props
}: HTMLAttributes<HTMLButtonElement> & { value: string }) {
	return createElement(
		"button",
		{ type: "button", className: cn("px-3 py-1.5 text-sm", className), ...props },
		children,
	);
}

export function TabsContent({
	children,
	className,
	value,
	...props
}: HTMLAttributes<HTMLDivElement> & { value: string }) {
	return createElement("div", { className, ...props }, children);
}

type AccordionContextValue = {
	readonly defaultOpenValues: readonly string[];
};

const AccordionContext = createContext<AccordionContextValue>({ defaultOpenValues: [] });

type AccordionProps = HTMLAttributes<HTMLDivElement> & {
	type?: "single" | "multiple";
	defaultValue?: string | string[];
	value?: string | string[];
};

function normalizeAccordionValue(value: string | string[] | undefined): string[] {
	if (Array.isArray(value)) return value;
	return value ? [value] : [];
}

export function Accordion({ children, className, defaultValue, value, ...props }: AccordionProps) {
	const defaultOpenValues = normalizeAccordionValue(value ?? defaultValue);
	return createElement(
		AccordionContext.Provider,
		{ value: { defaultOpenValues } },
		createElement("div", { className: cn("flex flex-col gap-2", className), ...props }, children),
	);
}

export function AccordionItem({ children, className, value, ...props }: DetailsHTMLAttributes<HTMLDetailsElement>) {
	const { defaultOpenValues } = useContext(AccordionContext);
	const itemValue = typeof value === "string" ? value : undefined;
	return createElement(
		"details",
		{ open: itemValue ? defaultOpenValues.includes(itemValue) : undefined, className, ...props },
		children,
	);
}

export function AccordionTrigger({ children, className, ...props }: HTMLAttributes<HTMLElement>) {
	return createElement(
		"summary",
		{ className: cn("cursor-pointer text-sm font-semibold", className), ...props },
		children,
	);
}

export function AccordionContent({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return createElement("div", { className: cn("pt-3", className), ...props }, children);
}
