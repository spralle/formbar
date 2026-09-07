import { createForm } from "@formbar/core";
import { extractFromJsonSchema } from "@formbar/from-schema";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { orderEntrySchema } from "../demos/14-order-entry";
import { DemoFormField } from "../renderers/DemoFormField";

describe("order entry date fields", () => {
	test.each(["orderDate", "deliveryDate"])("renders %s as a native date input without changing its value", (path) => {
		const field = extractFromJsonSchema(orderEntrySchema).fields.find((candidate) => candidate.path === path);
		expect(field).toMatchObject({ type: "date", metadata: { format: "date" } });
		if (!field) throw new Error(`Missing extracted field: ${path}`);

		const form = createForm({ initialData: { [path]: "2024-02-29" } });
		const markup = renderToStaticMarkup(createElement(DemoFormField, { form, field, onChange: vi.fn() }));

		expect(markup).toMatch(/<input[^>]*type="date"/);
		expect(markup).toMatch(/<input[^>]*value="2024-02-29"/);
		expect(form.field(path).get()).toBe("2024-02-29");
	});

	test("maps date metadata to a native date input for string fields", () => {
		const form = createForm({ initialData: { date: "2026-09-07" } });
		const markup = renderToStaticMarkup(
			createElement(DemoFormField, {
				form,
				field: { path: "date", type: "string", required: false, metadata: { format: "date" } },
				onChange: vi.fn(),
			}),
		);

		expect(markup).toMatch(/<input[^>]*type="date"/);
		expect(markup).toMatch(/<input[^>]*value="2026-09-07"/);
	});
});
