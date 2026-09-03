import type { FormApi } from "@formbar/core";
import { type FormbarEnumOption, type SchemaFieldInfo, normalizeEnumOptions } from "@formbar/from-schema";
import type { ReactNode } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
	Badge,
	Input,
	Label,
	RadioGroup,
	RadioGroupItem,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Slider,
	Switch,
	Textarea,
	cn,
} from "../ui";
import { getEnumOptionKey, getEnumValueByKey, getSelectedEnumOptionKey } from "./enum-option-keys";

interface FieldMeta {
	readonly widget: string | undefined;
	readonly enumOptions: readonly FormbarEnumOption[] | undefined;
	readonly format: string | undefined;
	readonly min: number | undefined;
	readonly max: number | undefined;
	readonly minLength: number | undefined;
	readonly maxLength: number | undefined;
	readonly pattern: string | undefined;
	readonly title: string;
	readonly description: string | undefined;
}

function extractFieldMeta(field: SchemaFieldInfo): FieldMeta {
	const meta = field.metadata;
	return {
		widget: meta?.widget,
		enumOptions: Array.isArray(meta?.enum) ? normalizeEnumOptions(meta) : undefined,
		format: meta?.format,
		min: meta?.minimum,
		max: meta?.maximum,
		minLength: meta?.minLength,
		maxLength: meta?.maxLength,
		pattern: meta?.pattern,
		title: meta?.title ?? field.path,
		description: meta?.description,
	};
}

interface DemoFormFieldProps {
	readonly form: FormApi;
	readonly field: SchemaFieldInfo;
	readonly onChange: (path: string, value: unknown) => void;
}

interface FieldA11y {
	readonly controlId: string;
	readonly labelId: string;
	readonly descriptionId: string;
	readonly constraintsId: string;
	readonly errorId: string;
	readonly describedBy: string | undefined;
	readonly invalid: boolean;
}

function buildConstraints(field: SchemaFieldInfo, meta: FieldMeta): string[] {
	const constraints: string[] = [];
	if (field.required) constraints.push("Required");
	if (meta.minLength) constraints.push(`Min ${meta.minLength} chars`);
	if (meta.maxLength) constraints.push(`Max ${meta.maxLength} chars`);
	if (meta.pattern) constraints.push(`Pattern: ${meta.pattern}`);
	if (meta.min != null && meta.max != null && field.type !== "number" && field.type !== "integer")
		constraints.push(`${meta.min}–${meta.max}`);
	if (meta.format) constraints.push(meta.format);
	return constraints;
}

function toIdPart(value: string): string {
	return value.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "field";
}

function createFieldA11y(
	fieldPath: string,
	generatedId: string,
	hasDescription: boolean,
	hasError: boolean,
	hasConstraints: boolean,
): FieldA11y {
	const baseId = `demo-field-${toIdPart(fieldPath)}-${toIdPart(generatedId)}`;
	const descriptionId = `${baseId}-description`;
	const constraintsId = `${baseId}-constraints`;
	const errorId = `${baseId}-error`;
	const describedByIds = [hasDescription ? descriptionId : undefined, hasError ? errorId : undefined];
	if (!hasError && hasConstraints) describedByIds.push(constraintsId);
	return {
		controlId: baseId,
		labelId: `${baseId}-label`,
		descriptionId,
		constraintsId,
		errorId,
		describedBy: describedByIds.filter(Boolean).join(" ") || undefined,
		invalid: hasError,
	};
}

function isGroupedField(field: SchemaFieldInfo, enumOptions: readonly FormbarEnumOption[] | undefined): boolean {
	return field.type === "enum" && Boolean(enumOptions && enumOptions.length <= 5);
}

function getControlA11yProps(a11y: FieldA11y) {
	return {
		id: a11y.controlId,
		"aria-describedby": a11y.describedBy,
		"aria-invalid": a11y.invalid || undefined,
	} as const;
}

function useDemoFieldValue(
	form: FormApi,
	field: SchemaFieldInfo,
	onChange: (path: string, value: unknown) => void,
): readonly [unknown, (newValue: unknown) => void] {
	const fieldApiRef = useRef(form.field(field.path));
	const fieldApi = fieldApiRef.current;
	const [value, setValue] = useState<unknown>(() => fieldApi.get());

	useEffect(() => {
		return form.subscribe(() => {
			const storeValue = fieldApi.get();
			setValue((prev: unknown) => (Object.is(prev, storeValue) ? prev : storeValue));
		});
	}, [form, fieldApi]);

	const handleChange = useCallback(
		(newValue: unknown) => {
			fieldApi.set(newValue);
			onChange(field.path, newValue);
		},
		[fieldApi, field.path, onChange],
	);
	return [value, handleChange];
}

export function DemoFormField({ form, field, onChange }: DemoFormFieldProps) {
	const [value, handleChange] = useDemoFieldValue(form, field, onChange);
	const generatedId = useId();

	const meta = extractFieldMeta(field);
	const { enumOptions, title, description } = meta;

	const issues = form.getState().issues?.filter((i) => i.path.segments.join(".") === field.path) ?? [];
	const hasError = issues.length > 0;
	const constraints = buildConstraints(field, meta);
	const a11y = createFieldA11y(field.path, generatedId, Boolean(description), hasError, constraints.length > 0);
	const groupedField = isGroupedField(field, enumOptions);

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center gap-2">
				<Label
					id={a11y.labelId}
					htmlFor={groupedField ? undefined : a11y.controlId}
					className="text-sm font-medium text-foreground"
				>
					{title}
				</Label>
				{field.required && (
					<Badge variant="secondary" className="text-[10px] px-1 py-0">
						Required
					</Badge>
				)}
			</div>
			{description && (
				<p id={a11y.descriptionId} className="text-xs text-muted-foreground">
					{description}
				</p>
			)}
			<div>{renderControl(field, value, handleChange, meta, a11y, hasError)}</div>
			{hasError && (
				<p id={a11y.errorId} className="text-xs text-destructive">
					{issues[0]?.message}
				</p>
			)}
			{!hasError && constraints.length > 0 && (
				<p id={a11y.constraintsId} className="text-xs text-muted-foreground">
					{constraints.join(" · ")}
				</p>
			)}
		</div>
	);
}

function renderEnumControl(
	value: unknown,
	onChange: (v: unknown) => void,
	enumOptions: readonly FormbarEnumOption[],
	hasError: boolean,
	a11y: FieldA11y,
): ReactNode {
	const selectedKey = getSelectedEnumOptionKey(enumOptions, value);
	const handleOptionChange = (optionKey: string) => {
		const optionValue = getEnumValueByKey(enumOptions, optionKey);
		if (optionValue !== undefined) onChange(optionValue);
	};

	if (enumOptions.length <= 5) {
		return renderEnumRadioGroup(enumOptions, selectedKey, handleOptionChange, a11y);
	}
	return renderEnumSelect(enumOptions, selectedKey, handleOptionChange, hasError, a11y);
}

function renderEnumRadioGroup(
	enumOptions: readonly FormbarEnumOption[],
	selectedKey: string,
	onChange: (optionKey: string) => void,
	a11y: FieldA11y,
): ReactNode {
	return (
		<RadioGroup
			id={a11y.controlId}
			value={selectedKey}
			onValueChange={onChange}
			className="flex flex-col gap-2"
			aria-labelledby={a11y.labelId}
			aria-describedby={a11y.describedBy}
			aria-invalid={a11y.invalid || undefined}
		>
			{enumOptions.map((option, index) => renderEnumRadioOption(option, index, a11y.controlId))}
		</RadioGroup>
	);
}

function renderEnumRadioOption(option: FormbarEnumOption, index: number, controlId: string): ReactNode {
	const optionKey = getEnumOptionKey(index);
	const optionId = `${controlId}-${optionKey}`;
	return (
		<div key={optionKey} className="flex items-start gap-2">
			<RadioGroupItem value={optionKey} id={optionId} disabled={option.disabled} />
			<Label htmlFor={optionId} className="flex flex-col text-sm text-foreground">
				<span>{option.label}</span>
				{option.description && <span className="text-xs text-muted-foreground">{option.description}</span>}
			</Label>
		</div>
	);
}

function renderEnumSelect(
	enumOptions: readonly FormbarEnumOption[],
	selectedKey: string,
	onChange: (optionKey: string) => void,
	hasError: boolean,
	a11y: FieldA11y,
): ReactNode {
	const errorClass = hasError ? "border-destructive" : "";
	return (
		<Select {...getControlA11yProps(a11y)} value={selectedKey} onValueChange={onChange}>
			<SelectTrigger className={cn(errorClass)}>
				<SelectValue placeholder="Select..." />
			</SelectTrigger>
			<SelectContent>
				{enumOptions.map((option, index) => (
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

function renderStringControl(
	value: unknown,
	onChange: (v: unknown) => void,
	meta: FieldMeta,
	hasError: boolean,
	a11y: FieldA11y,
): ReactNode {
	const errorClass = hasError ? "border-destructive" : "";
	if (meta.widget === "textarea" || (meta.maxLength != null && meta.maxLength > 200)) {
		return (
			<Textarea
				{...getControlA11yProps(a11y)}
				value={(value as string) ?? ""}
				onChange={(e) => onChange(e.target.value)}
				className={cn(errorClass)}
				maxLength={meta.maxLength}
				rows={4}
			/>
		);
	}
	const inputType = meta.format === "email" ? "email" : meta.format === "uri" ? "url" : "text";
	return (
		<Input
			{...getControlA11yProps(a11y)}
			type={inputType}
			value={(value as string) ?? ""}
			onChange={(e) => onChange(e.target.value)}
			className={cn(errorClass)}
			minLength={meta.minLength}
			maxLength={meta.maxLength}
			pattern={meta.pattern}
		/>
	);
}

function renderNumberControl(
	field: SchemaFieldInfo,
	value: unknown,
	onChange: (v: unknown) => void,
	min: number | undefined,
	max: number | undefined,
	hasError: boolean,
	a11y: FieldA11y,
): ReactNode {
	if (min != null && max != null) {
		return (
			<div className="flex items-center gap-3">
				<Slider
					{...getControlA11yProps(a11y)}
					min={min}
					max={max}
					step={field.type === "integer" ? 1 : 0.1}
					value={[typeof value === "number" ? value : min]}
					onValueChange={([v]) => onChange(v)}
					className="flex-1"
				/>
				<span className="text-sm text-muted-foreground w-10 text-right">{typeof value === "number" ? value : min}</span>
			</div>
		);
	}
	const errorClass = hasError ? "border-destructive" : "";
	const step = field.type === "integer" ? 1 : "any";
	const parseValue = (raw: string) => {
		if (raw === "") return undefined;
		return field.type === "integer" ? Number.parseInt(raw, 10) : Number.parseFloat(raw);
	};
	return (
		<Input
			{...getControlA11yProps(a11y)}
			type="number"
			step={step}
			min={min}
			max={max}
			value={(value as string) ?? ""}
			onChange={(e) => onChange(parseValue(e.target.value))}
			className={cn(errorClass)}
		/>
	);
}

function renderBooleanControl(value: unknown, onChange: (v: unknown) => void, a11y: FieldA11y): ReactNode {
	return <Switch {...getControlA11yProps(a11y)} checked={Boolean(value)} onCheckedChange={onChange} />;
}

function renderControl(
	field: SchemaFieldInfo,
	value: unknown,
	onChange: (v: unknown) => void,
	meta: FieldMeta,
	a11y: FieldA11y,
	hasError: boolean,
): ReactNode {
	if (field.type === "enum" && meta.enumOptions) {
		return renderEnumControl(value, onChange, meta.enumOptions, hasError, a11y);
	}
	if (field.type === "boolean") {
		return renderBooleanControl(value, onChange, a11y);
	}
	if (field.type === "string") {
		return renderStringControl(value, onChange, meta, hasError, a11y);
	}
	if (field.type === "number" || field.type === "integer") {
		return renderNumberControl(field, value, onChange, meta.min, meta.max, hasError, a11y);
	}
	const errorClass = hasError ? "border-destructive" : "";
	return (
		<Input
			{...getControlA11yProps(a11y)}
			value={(value as string) ?? ""}
			onChange={(e) => onChange(e.target.value)}
			className={cn(errorClass)}
		/>
	);
}
