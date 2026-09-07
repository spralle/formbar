import { createForm } from "@formbar/core";
import { describe, expect, test, vi } from "vitest";
import { getCoreFormOptions } from "../core-form-options.js";

type TrapName = "getOwnPropertyDescriptor" | "ownKeys" | "getPrototypeOf";

function createHostileOptions(trapName: TrapName) {
	return new Proxy(
		{ autoFocusOnError: false, initialData: { name: "Ada" } },
		{
			[trapName]: () => {
				throw new Error(`${trapName} blocked`);
			},
		},
	);
}

describe("getCoreFormOptions", () => {
	test("returns the same reference when autoFocusOnError is absent or inherited", () => {
		const options = { initialData: { name: "Ada" }, unknownOption: true };
		const inherited = Object.create({ autoFocusOnError: false }) as typeof options;

		expect(getCoreFormOptions(options)).toBe(options);
		expect(getCoreFormOptions(inherited)).toBe(inherited);
		expect(getCoreFormOptions(undefined)).toBeUndefined();
	});

	test("removes an own autoFocusOnError without mutating or dropping other keys", () => {
		const symbolKey = Symbol("unknown");
		const options = {
			autoFocusOnError: false,
			initialData: { name: "Ada" },
			unknownOption: "preserved",
			[symbolKey]: "also preserved",
		};

		const coreOptions = getCoreFormOptions(options) as typeof options;

		expect(coreOptions).not.toBe(options);
		expect(Object.hasOwn(coreOptions, "autoFocusOnError")).toBe(false);
		expect(coreOptions.initialData).toBe(options.initialData);
		expect(coreOptions.unknownOption).toBe("preserved");
		expect(coreOptions[symbolKey]).toBe("also preserved");
		expect(options.autoFocusOnError).toBe(false);
	});

	test.each<TrapName>(["getOwnPropertyDescriptor", "ownKeys", "getPrototypeOf"])(
		"forwards the original options when the %s trap throws",
		(trapName) => {
			const options = createHostileOptions(trapName);

			expect(getCoreFormOptions(options)).toBe(options);
		},
	);

	test.each<TrapName>(["getOwnPropertyDescriptor", "ownKeys", "getPrototypeOf"])(
		"does not block form creation when the %s trap throws",
		(trapName) => {
			const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
			const options = createHostileOptions(trapName);

			try {
				expect(() => createForm(getCoreFormOptions(options))).not.toThrow();
			} finally {
				warn.mockRestore();
			}
		},
	);
});
