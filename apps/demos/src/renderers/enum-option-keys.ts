import type { FormbarEnumOption } from "@formbar/from-schema";

export function getEnumOptionKey(index: number): string {
	return `enum-option-${index}`;
}

export function getSelectedEnumOptionKey(options: readonly FormbarEnumOption[], value: unknown): string {
	const selectedIndex = options.findIndex((option) => enumValuesEqual(option.value, value));
	return selectedIndex >= 0 ? getEnumOptionKey(selectedIndex) : "";
}

export function getEnumValueByKey(
	options: readonly FormbarEnumOption[],
	key: string,
): FormbarEnumOption["value"] | undefined {
	const index = Number.parseInt(key.replace("enum-option-", ""), 10);
	return Number.isInteger(index) ? options[index]?.value : undefined;
}

function enumValuesEqual(left: FormbarEnumOption["value"], right: unknown): boolean {
	return (
		left === right ||
		(typeof left === "number" && typeof right === "number" && Number.isNaN(left) && Number.isNaN(right))
	);
}
