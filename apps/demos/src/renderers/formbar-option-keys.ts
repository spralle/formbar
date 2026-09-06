import { type FormbarOption, structuralEqual } from "@formbar/from-schema";

const OPTION_KEY_PREFIX = "formbar-option-";

export function getFormbarOptionKey(index: number): string {
	return `${OPTION_KEY_PREFIX}${index}`;
}

export function getSelectedFormbarOptionKey(options: readonly FormbarOption[], value: unknown): string {
	const selectedIndex = options.findIndex((option) => optionValuesEqual(option.value, value));
	return selectedIndex >= 0 ? getFormbarOptionKey(selectedIndex) : "";
}

export function getFormbarOptionByKey(options: readonly FormbarOption[], key: string): FormbarOption | undefined {
	if (!key.startsWith(OPTION_KEY_PREFIX)) return undefined;
	const rawIndex = key.slice(OPTION_KEY_PREFIX.length);
	if (!/^\d+$/.test(rawIndex)) return undefined;
	return options[Number(rawIndex)];
}

export function getSelectableFormbarOption(
	options: readonly FormbarOption[],
	key: string,
	fieldDisabled: boolean,
): FormbarOption | undefined {
	const option = getFormbarOptionByKey(options, key);
	return !fieldDisabled && !option?.disabled ? option : undefined;
}

function optionValuesEqual(left: unknown, right: unknown): boolean {
	if (isPrimitive(left) || isPrimitive(right)) return Object.is(left, right);
	return structuralEqual(left, right);
}

function isPrimitive(value: unknown): boolean {
	return value === null || (typeof value !== "object" && typeof value !== "function");
}
