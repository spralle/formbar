import type { CreateFormOptions } from "@formbar/core";
import type { UseFormOptions } from "./use-form.js";

export function getCoreFormOptions<TData, TUi>(
	options: UseFormOptions<TData, TUi> | undefined,
): CreateFormOptions<TData, TUi> | undefined {
	if (options === undefined) return undefined;
	try {
		if (!Object.hasOwn(options, "autoFocusOnError")) return options;
		const { autoFocusOnError: _reactOption, ...coreDescriptors } = Object.getOwnPropertyDescriptors(options);
		return Object.create(Object.getPrototypeOf(options), coreDescriptors) as CreateFormOptions<TData, TUi>;
	} catch {
		// Option diagnostics must not make useForm less resilient than createForm.
		return options;
	}
}
