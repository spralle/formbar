import type { FormbarOption } from "@formbar/from-schema";
import React, { type ReactNode } from "react";
import {
	Label,
	RadioGroup,
	RadioGroupItem,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	cn,
} from "../ui";
import { createRadioOptionId } from "./demo-control-ids";
import { getFormbarOptionKey, getSelectableFormbarOption, getSelectedFormbarOptionKey } from "./formbar-option-keys";

export interface OptionsControlA11y {
	readonly controlId: string;
	readonly labelId: string;
	readonly describedBy: string | undefined;
	readonly invalid: boolean;
}

interface FormbarOptionsSelectProps {
	readonly value: unknown;
	readonly onChange: (value: unknown) => void;
	readonly options: readonly FormbarOption[];
	readonly fieldDisabled: boolean;
	readonly className?: string;
	readonly triggerClassName?: string;
	readonly a11y?: OptionsControlA11y;
}

export function renderFormbarOptionsControl(
	value: unknown,
	onChange: (value: unknown) => void,
	options: readonly FormbarOption[],
	fieldDisabled: boolean,
	hasError: boolean,
	a11y: OptionsControlA11y,
): ReactNode {
	const selectedKey = getSelectedFormbarOptionKey(options, value);
	const handleOptionChange = (optionKey: string) => {
		const option = getSelectableFormbarOption(options, optionKey, fieldDisabled);
		if (option) onChange(option.value);
	};

	if (options.length <= 5) {
		return renderOptionRadioGroup(options, selectedKey, handleOptionChange, fieldDisabled, a11y);
	}
	return (
		<FormbarOptionsSelect
			value={value}
			onChange={onChange}
			options={options}
			fieldDisabled={fieldDisabled}
			triggerClassName={cn(hasError && "border-destructive")}
			a11y={a11y}
		/>
	);
}

function renderOptionRadioGroup(
	options: readonly FormbarOption[],
	selectedKey: string,
	onChange: (optionKey: string) => void,
	fieldDisabled: boolean,
	a11y: OptionsControlA11y,
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
			aria-disabled={fieldDisabled || undefined}
		>
			{options.map((option, index) => renderOptionRadio(option, index, a11y.controlId, fieldDisabled))}
		</RadioGroup>
	);
}

function renderOptionRadio(option: FormbarOption, index: number, controlId: string, fieldDisabled: boolean): ReactNode {
	const optionKey = getFormbarOptionKey(index);
	const optionId = createRadioOptionId(controlId, optionKey, index);
	return (
		<div key={optionKey} className="flex items-center gap-2">
			<RadioGroupItem value={optionKey} id={optionId} disabled={fieldDisabled || option.disabled} />
			<Label htmlFor={optionId} className="text-sm text-foreground">
				{option.title}
			</Label>
		</div>
	);
}

export function FormbarOptionsSelect({
	value,
	onChange,
	options,
	fieldDisabled,
	className,
	triggerClassName,
	a11y,
}: FormbarOptionsSelectProps): ReactNode {
	const selectedKey = getSelectedFormbarOptionKey(options, value);
	const handleOptionChange = (optionKey: string) => {
		const option = getSelectableFormbarOption(options, optionKey, fieldDisabled);
		if (option) onChange(option.value);
	};
	return (
		<Select
			id={a11y?.controlId}
			aria-labelledby={a11y?.labelId}
			aria-describedby={a11y?.describedBy}
			aria-invalid={a11y?.invalid || undefined}
			value={selectedKey}
			onValueChange={handleOptionChange}
			disabled={fieldDisabled}
			className={className}
		>
			<SelectTrigger className={triggerClassName}>
				<SelectValue placeholder="Select..." />
			</SelectTrigger>
			<SelectContent>
				{options.map((option, index) => (
					<SelectItem key={getFormbarOptionKey(index)} value={getFormbarOptionKey(index)} disabled={option.disabled}>
						{option.title}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
