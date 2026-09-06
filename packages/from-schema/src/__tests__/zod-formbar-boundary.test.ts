import { describe, expect, test } from "vitest";
import { z as z3Min } from "zod3-min";
import { z as z4Current } from "zod4-current";
import { createSchemaForm } from "../create-schema-form.js";

const options = [{ label: "Enabled", value: "enabled" }];

describe("Formbar metadata with supported Zod versions", () => {
	test("elevates metadata from the minimum supported Zod 3.24", () => {
		const field = z3Min.enum(["enabled", "disabled"]);
		(field._def as z3Min.ZodTypeDef & { metadata?: unknown }).metadata = {
			formbar: { widget: "radio", options },
		};

		const result = createSchemaForm(z3Min.object({ state: field }));

		expect(result.fields[0]).toMatchObject({
			path: "state",
			metadata: { widget: "radio", options },
		});
	});

	test("elevates metadata from the current supported Zod 4", () => {
		const schema = z4Current.object({
			state: z4Current.enum(["enabled", "disabled"]).meta({
				formbar: { widget: "radio", options },
			}),
		});

		const result = createSchemaForm(schema);

		expect(result.fields[0]).toMatchObject({
			path: "state",
			metadata: { widget: "radio", options },
		});
	});
});
