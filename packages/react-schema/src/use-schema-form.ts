import type { FormApi, ValidatorFn } from "@formbar/core";
import type {
	FormbarOption,
	FormbarOptionTitleResolver,
	FormbarOptionWarning,
	LayoutNode,
	SchemaFieldInfo,
	SchemaFormResult,
	SchemaMetadata,
} from "@formbar/from-schema";
import { createSchemaForm } from "@formbar/from-schema";
import { type UseFormOptions, useForm, useFormSelector } from "@formbar/react";
import { useMemo } from "react";
import type { ResolvedFieldState } from "./resolve-field-state.js";
import { pruneHiddenFields, resolveFieldStates } from "./resolve-field-state.js";

export interface UseSchemaFormOptions<TData, TUi> extends Omit<UseFormOptions<TData, TUi>, "validators"> {
	readonly validators?: readonly ValidatorFn[];
	readonly layoutOverride?: LayoutNode;
	readonly resolveOptionTitle?: FormbarOptionTitleResolver;
}

export interface UseSchemaFormResult<TData, TUi> {
	readonly form: FormApi<TData, TUi>;
	readonly fields: readonly SchemaFieldInfo[];
	readonly layout: LayoutNode;
	readonly metadata: SchemaMetadata;
	readonly fieldStates: ReadonlyMap<string, ResolvedFieldState>;
	readonly optionsByPath: ReadonlyMap<string, readonly FormbarOption[]>;
	readonly warnings: readonly FormbarOptionWarning[];
}

/** Stable empty fallback — avoids creating a new object when no uiState exists */
const EMPTY_UI_STATE: Readonly<Record<string, unknown>> = Object.freeze({});

/** Shallow comparison for string-keyed records to stabilize uiState references */
function shallowEqualRecord(a: Readonly<Record<string, unknown>>, b: Readonly<Record<string, unknown>>): boolean {
	if (a === b) return true;
	const keysA = Object.keys(a);
	const keysB = Object.keys(b);
	if (keysA.length !== keysB.length) return false;
	for (const key of keysA) {
		if (a[key] !== b[key]) return false;
	}
	return true;
}

function getFormOptions<TData, TUi>(options: UseSchemaFormOptions<TData, TUi> | undefined): UseFormOptions<TData, TUi> {
	const {
		layoutOverride: _layoutOverride,
		resolveOptionTitle: _resolveOptionTitle,
		validators: _validators,
		...formOptions
	} = options ?? {};
	return formOptions;
}

/**
 * React hook that creates a schema-driven form from a Zod or JSON Schema definition.
 * Combines schema ingestion, form creation, and layout compilation in one call.
 *
 * @param schema - A Zod schema, JSON Schema object, or any Standard Schema v1 implementation.
 * @param options - Schema form options including layout middleware, validators, and form config.
 * @returns An object with `form` (FormApi), `layout` (LayoutNode tree), `fields` (field info), and `fieldStates`.
 *
 * @example
 * ```typescript
 * import { z } from "zod";
 *
 * function ProfileForm() {
 *   const { form, layout, fields } = useSchemaForm(
 *     z.object({
 *       name: z.string().min(1).describe("Full Name"),
 *       bio: z.string().optional().describe("Short bio"),
 *     }),
 *     { onSubmit: async ({ payload }) => { ... } },
 *   );
 *
 *   return <FormRenderer form={form} layout={layout} fields={fields} />;
 * }
 * ```
 */
export function useSchemaForm<TData, TUi>(
	schema: unknown,
	options?: UseSchemaFormOptions<TData, TUi>,
): UseSchemaFormResult<TData, TUi> {
	const prepared = usePreparedSchema(schema, options);
	const mergedInitialData = useMergedInitialData<TData>(prepared.defaults, options?.initialData);
	const form = useForm<TData, TUi>({
		...getFormOptions(options),
		schema,
		...(mergedInitialData === undefined ? {} : { initialData: mergedInitialData }),
		validators: prepared.validators,
	});
	const { fieldStates, layout } = useSchemaPresentation(form, prepared.fields, prepared.layout);
	return {
		form,
		fields: prepared.fields,
		layout,
		metadata: prepared.metadata,
		fieldStates,
		optionsByPath: prepared.optionsByPath,
		warnings: prepared.warnings,
	};
}

function usePreparedSchema<TData, TUi>(
	schema: unknown,
	options: UseSchemaFormOptions<TData, TUi> | undefined,
): SchemaFormResult {
	return useMemo(
		() =>
			createSchemaForm(schema, {
				layoutOverride: options?.layoutOverride,
				validators: options?.validators,
				resolveOptionTitle: options?.resolveOptionTitle,
			}),
		[schema, options?.layoutOverride, options?.validators, options?.resolveOptionTitle],
	);
}

function useMergedInitialData<TData>(
	defaults: Readonly<Record<string, unknown>>,
	initialData: TData | undefined,
): TData | undefined {
	return useMemo(() => {
		if (Object.keys(defaults).length === 0) return initialData;
		return { ...defaults, ...(initialData ?? {}) } as TData;
	}, [defaults, initialData]);
}

function useSchemaPresentation<TData, TUi>(
	form: FormApi<TData, TUi>,
	fields: readonly SchemaFieldInfo[],
	baseLayout: LayoutNode,
): { readonly fieldStates: ReadonlyMap<string, ResolvedFieldState>; readonly layout: LayoutNode } {
	const fieldPaths = useMemo(() => fields.map((field) => field.path), [fields]);
	const uiState = useFormSelector(
		form,
		(state) => (state.uiState ?? EMPTY_UI_STATE) as Readonly<Record<string, unknown>>,
		shallowEqualRecord,
	);
	const fieldStates = useMemo(() => resolveFieldStates(uiState, fieldPaths), [uiState, fieldPaths]);
	const layout = useMemo(
		() => pruneHiddenFields(baseLayout, fieldStates) ?? { ...baseLayout, children: [] },
		[baseLayout, fieldStates],
	);
	return { fieldStates, layout };
}
