export type FormbarEnumValue = string | number | boolean | null;

export interface FormbarEnumOption {
	readonly value: FormbarEnumValue;
	readonly label: string;
	readonly disabled?: boolean;
	readonly description?: string;
}

interface EnumOptionsMetadata {
	readonly enum?: unknown;
	readonly enumOptions?: unknown;
}

interface EnumOptionInput {
	readonly value: FormbarEnumValue;
	readonly label?: unknown;
	readonly disabled?: unknown;
	readonly description?: unknown;
}

export function normalizeEnumOptions(metadata: EnumOptionsMetadata | null | undefined): FormbarEnumOption[] {
	const enumValues = Array.isArray(metadata?.enum) ? metadata.enum.filter(isEnumValue) : [];
	const optionInputs = Array.isArray(metadata?.enumOptions) ? metadata.enumOptions.filter(isEnumOptionInput) : [];

	return enumValues.map((value) => {
		const input = optionInputs.find((option) => enumValuesEqual(option.value, value));
		return toEnumOption(value, input);
	});
}

function isEnumValue(value: unknown): value is FormbarEnumValue {
	return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function isEnumOptionInput(option: unknown): option is EnumOptionInput {
	if (!option || typeof option !== "object") return false;
	return isEnumValue((option as { readonly value?: unknown }).value);
}

function enumValuesEqual(left: FormbarEnumValue, right: FormbarEnumValue): boolean {
	return (
		left === right ||
		(typeof left === "number" && typeof right === "number" && Number.isNaN(left) && Number.isNaN(right))
	);
}

function toEnumOption(value: FormbarEnumValue, input: EnumOptionInput | undefined): FormbarEnumOption {
	return {
		value,
		label: typeof input?.label === "string" ? input.label : String(value),
		...(typeof input?.disabled === "boolean" ? { disabled: input.disabled } : {}),
		...(typeof input?.description === "string" ? { description: input.description } : {}),
	};
}
