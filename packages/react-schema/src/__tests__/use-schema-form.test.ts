import { useForm } from "@formbar/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSchemaForm } from "../use-schema-form.js";

vi.mock("react", () => ({
	useMemo: <T>(factory: () => T): T => factory(),
}));

vi.mock("@formbar/react", () => ({
	useForm: vi.fn(),
	useFormSelector: vi.fn(() => ({})),
}));

const schemaWithoutDefaults = {
	type: "object",
	properties: {
		name: { type: "string" },
	},
};

const schemaWithDefaults = {
	type: "object",
	properties: {
		name: { type: "string", default: "schema name" },
		role: { type: "string", default: "viewer" },
	},
};

interface FormData {
	readonly name?: string;
	readonly role?: string;
}

describe("useSchemaForm initial data", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("omits initialData when neither the schema nor caller supplies it", () => {
		useSchemaForm<FormData, Record<string, unknown>>(schemaWithoutDefaults);

		expect(useForm).toHaveBeenCalledOnce();
		expect(vi.mocked(useForm).mock.calls[0]?.[0]).not.toHaveProperty("initialData");
	});

	it("passes caller initialData when the schema has no defaults", () => {
		const initialData = { name: "caller name" };

		useSchemaForm<FormData, Record<string, unknown>>(schemaWithoutDefaults, { initialData });

		expect(vi.mocked(useForm).mock.calls[0]?.[0]).toHaveProperty("initialData", initialData);
	});

	it("fills missing caller data from schema defaults while preserving caller precedence", () => {
		useSchemaForm<FormData, Record<string, unknown>>(schemaWithDefaults, {
			initialData: { name: "caller name" },
		});

		expect(vi.mocked(useForm).mock.calls[0]?.[0]).toHaveProperty("initialData", {
			name: "caller name",
			role: "viewer",
		});
	});
});
