export type FormbarOptionValue = string | number | boolean | null;

export interface FormbarOptionRecord {
	readonly value: FormbarOptionValue;
	readonly title?: string;
	readonly disabled?: boolean;
}

export interface FormbarOption {
	readonly value: unknown;
	readonly title: string;
	readonly disabled?: boolean;
}

export interface FormbarOptionTitleContext {
	readonly path: string;
	readonly index: number;
	readonly value: unknown;
	readonly literalTitle: string | undefined;
}

export type FormbarOptionTitleResolver = (context: FormbarOptionTitleContext) => string | undefined;

export type FormbarOptionWarningCode =
	| "FORMBAR_OPTIONS_NOT_ARRAY"
	| "FORMBAR_OPTION_MALFORMED"
	| "FORMBAR_OPTION_DUPLICATE"
	| "FORMBAR_OPTION_UNMATCHED";

export interface FormbarOptionWarning {
	readonly code: FormbarOptionWarningCode;
	readonly path: string;
	readonly index: number;
	readonly value: unknown;
	readonly message: string;
}

export interface FormbarOptionsMetadata {
	readonly enum?: unknown;
	readonly options?: unknown;
}

export interface NormalizeFormbarOptionsOptions {
	readonly path?: string;
	readonly resolveTitle?: FormbarOptionTitleResolver;
}

export interface FormbarOptionsResult {
	readonly options: readonly FormbarOption[];
	readonly warnings: readonly FormbarOptionWarning[];
}

const OPTION_RECORD_KEYS = new Set(["value", "title", "disabled"]);

export function normalizeFormbarOptions(
	metadata: FormbarOptionsMetadata | null | undefined,
	config: NormalizeFormbarOptionsOptions = {},
): FormbarOptionsResult {
	const path = config.path ?? "$";
	const enumValues = Array.isArray(metadata?.enum) ? metadata.enum : undefined;
	const warnings: FormbarOptionWarning[] = [];
	const records = parseOptionRecords(metadata?.options, enumValues, path, warnings);
	const values = enumValues ?? records.map((record) => record.value);

	return {
		options: values.map((value, index) => createOption(value, index, path, records, config.resolveTitle)),
		warnings,
	};
}

function parseOptionRecords(
	input: unknown,
	enumValues: readonly unknown[] | undefined,
	path: string,
	warnings: FormbarOptionWarning[],
): FormbarOptionRecord[] {
	if (input === undefined) return [];
	if (!Array.isArray(input)) {
		warnings.push(createWarning("FORMBAR_OPTIONS_NOT_ARRAY", path, -1, input));
		return [];
	}

	const records: FormbarOptionRecord[] = [];
	for (const [index, entry] of input.entries()) {
		const record = parseOptionRecord(entry);
		if (!record) {
			warnings.push(createWarning("FORMBAR_OPTION_MALFORMED", path, index, getEntryValue(entry)));
			continue;
		}
		if (records.some((existing) => optionValuesEqual(existing.value, record.value))) {
			warnings.push(createWarning("FORMBAR_OPTION_DUPLICATE", path, index, record.value));
			continue;
		}
		records.push(record);
		if (enumValues && !enumValues.some((value) => optionValuesEqual(value, record.value))) {
			warnings.push(createWarning("FORMBAR_OPTION_UNMATCHED", path, index, record.value));
		}
	}
	return records;
}

function parseOptionRecord(entry: unknown): FormbarOptionRecord | undefined {
	if (isOptionValue(entry)) return { value: entry };
	if (!isRecord(entry) || !Object.keys(entry).every((key) => OPTION_RECORD_KEYS.has(key))) return undefined;
	if (!isOptionValue(entry.value)) return undefined;
	if (entry.title !== undefined && typeof entry.title !== "string") return undefined;
	if (entry.disabled !== undefined && typeof entry.disabled !== "boolean") return undefined;
	return {
		value: entry.value,
		...(entry.title !== undefined ? { title: entry.title } : {}),
		...(entry.disabled !== undefined ? { disabled: entry.disabled } : {}),
	};
}

function createOption(
	value: unknown,
	index: number,
	path: string,
	records: readonly FormbarOptionRecord[],
	resolveTitle: FormbarOptionTitleResolver | undefined,
): FormbarOption {
	const record = isOptionValue(value)
		? records.find((candidate) => optionValuesEqual(candidate.value, value))
		: undefined;
	const resolvedTitle = resolveTitle?.({ path, index, value, literalTitle: record?.title });
	const title = typeof resolvedTitle === "string" ? resolvedTitle : (record?.title ?? String(value));
	return {
		value,
		title,
		...(record?.disabled !== undefined ? { disabled: record.disabled } : {}),
	};
}

function createWarning(
	code: FormbarOptionWarningCode,
	path: string,
	index: number,
	value: unknown,
): FormbarOptionWarning {
	const messages: Record<FormbarOptionWarningCode, string> = {
		FORMBAR_OPTIONS_NOT_ARRAY: `Field "${path}" options must be an array.`,
		FORMBAR_OPTION_MALFORMED: `Field "${path}" option at index ${index} is malformed.`,
		FORMBAR_OPTION_DUPLICATE: `Field "${path}" option at index ${index} duplicates an earlier value and was ignored.`,
		FORMBAR_OPTION_UNMATCHED: `Field "${path}" option at index ${index} does not exactly match an enum value and was ignored.`,
	};
	return { code, path, index, value, message: messages[code] };
}

function isOptionValue(value: unknown): value is FormbarOptionValue {
	return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getEntryValue(entry: unknown): unknown {
	return isRecord(entry) && "value" in entry ? entry.value : entry;
}

function optionValuesEqual(left: unknown, right: unknown): boolean {
	return isOptionValue(left) && isOptionValue(right) && Object.is(left, right);
}
