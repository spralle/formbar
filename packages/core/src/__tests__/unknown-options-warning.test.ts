import { describe, expect, test, vi } from "vitest";
import { createForm } from "../create-form.js";
import { warnUnknownCreateFormOptions } from "../unknown-options-warning.js";

describe("unknown createForm option warnings", () => {
	test("does not warn for known options", () => {
		const warn = vi.fn();
		warnUnknownCreateFormOptions(
			{
				asyncValidators: [],
				clock: () => "now",
				fieldDefaults: {},
				idGenerator: () => "id",
				initialData: {},
				initialUiState: {},
				middleware: [],
				onSubmit: async () => ({ ok: true }),
				plugins: [],
				schema: {},
				stateStrategy: {},
				timeouts: {},
				transforms: [],
				uiStateSchema: {},
				validators: [],
			},
			{ nodeEnv: "development" },
			warn,
		);

		expect(warn).not.toHaveBeenCalled();
	});

	test("aggregates own enumerable unknown string keys in sorted order without values", () => {
		const warn = vi.fn();
		const inherited = { inheritedSecret: "do not log" };
		const options = Object.assign(Object.create(inherited), { zebra: "secret-z", alpha: "secret-a" });
		Object.defineProperty(options, "hiddenSecret", { enumerable: false, value: "do not log" });
		options[Symbol("symbolSecret")] = "do not log";

		warnUnknownCreateFormOptions(options, { nodeEnv: "test" }, warn);

		expect(warn).toHaveBeenCalledOnce();
		expect(warn).toHaveBeenCalledWith("[Formbar] Unknown createForm option(s): alpha, zebra.");
		expect(warn.mock.calls.flat().join(" ")).not.toContain("secret");
	});

	test("gives arbiterRules a targeted migration warning", () => {
		const warn = vi.fn();
		warnUnknownCreateFormOptions({ arbiterRules: ["private rule"] }, { nodeEnv: "development" }, warn);

		expect(warn).toHaveBeenCalledOnce();
		expect(warn).toHaveBeenCalledWith(
			'[Formbar] The "arbiterRules" option is no longer supported. Use plugins: [createArbiterPlugin({ rules })] from "@formbar/arbiter" instead.',
		);
		expect(warn.mock.calls.flat().join(" ")).not.toContain("private rule");
	});

	test.each([undefined, {}, { nodeEnv: undefined }, { nodeEnv: 1 }, { nodeEnv: "production" }])(
		"suppresses warnings for a missing, unusable, or production environment",
		(environment) => {
			const warn = vi.fn();
			warnUnknownCreateFormOptions({ unknown: true }, environment, warn);
			expect(warn).not.toHaveBeenCalled();
		},
	);

	test("contains hostile enumeration and warning sinks", () => {
		const hostileOptions = new Proxy(
			{},
			{
				ownKeys: () => {
					throw new Error("no keys");
				},
			},
		);
		expect(() => warnUnknownCreateFormOptions(hostileOptions, { nodeEnv: "test" }, vi.fn())).not.toThrow();
		expect(() =>
			warnUnknownCreateFormOptions({ unknown: true }, { nodeEnv: "test" }, () => {
				throw new Error("no sink");
			}),
		).not.toThrow();
	});

	test("does not let hostile option enumeration break createForm", () => {
		const options = new Proxy(
			{ initialData: { name: "Ada" } },
			{
				ownKeys: () => {
					throw new Error("no keys");
				},
			},
		);

		const form = createForm(options);
		expect(form.getState().data).toEqual({ name: "Ada" });
		form.dispose();
	});
});
