// TODO: Replace with proper UI components. These are minimal shims for demo purposes.
import type { HTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";
import { createElement, forwardRef } from "react";

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

export function Select({
	children,
	className,
	...props
}: HTMLAttributes<HTMLSelectElement> & { value?: string; onValueChange?: (v: string) => void }) {
	return createElement("select", { className: cn("border rounded px-3 py-2 text-sm", className), ...props }, children);
}

export function SelectTrigger({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return createElement("div", { className, ...props }, children);
}

export function SelectContent({ children, ...props }: HTMLAttributes<HTMLDivElement>) {
	return createElement("div", props, children);
}

export function SelectItem({ children, value, ...props }: HTMLAttributes<HTMLOptionElement> & { value: string }) {
	return createElement("option", { value, ...props }, children);
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
	return createElement("span", null, placeholder);
}

export function Textarea({ className, ...props }: HTMLAttributes<HTMLTextAreaElement>) {
	return createElement("textarea", { className: cn("border rounded px-3 py-2 text-sm w-full", className), ...props });
}

export function Checkbox({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
	return createElement("input", { type: "checkbox", className, ...props });
}

export function Slider({
	className,
	...props
}: HTMLAttributes<HTMLInputElement> & {
	value?: number[];
	onValueChange?: (v: number[]) => void;
	min?: number;
	max?: number;
	step?: number;
}) {
	return createElement("input", { type: "range", className, ...props });
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
}: HTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string; type?: string; disabled?: boolean }) {
	return createElement(
		"button",
		{ className: cn("px-4 py-2 rounded text-sm font-medium border", className), ...props },
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
	return createElement("button", { className: cn("px-3 py-1.5 text-sm", className), ...props }, children);
}

export function TabsContent({
	children,
	className,
	value,
	...props
}: HTMLAttributes<HTMLDivElement> & { value: string }) {
	return createElement("div", { className, ...props }, children);
}
