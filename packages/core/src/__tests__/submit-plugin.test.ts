import { describe, expect, it, vi } from "vitest";
import { createForm } from "../create-form.js";
import type { FormPlugin } from "../plugin-types.js";

describe("submit plugin gating", () => {
	it("passes typed data and UI state to beforeSubmit and blocks on returned issues", async () => {
		type Data = { email: string };
		type Ui = { confirmed: boolean };
		const contexts: Array<{ email: string; confirmed: boolean }> = [];
		const plugin: FormPlugin<Data, Ui> = {
			id: "confirmation-gate",
			beforeSubmit: ({ data, uiState }) => {
				contexts.push({ email: data.email, confirmed: uiState.confirmed });
				return [
					{
						code: "CONFIRMATION_REQUIRED",
						message: "Confirm before submitting",
						severity: "error",
						path: { namespace: "ui", segments: ["confirmed"] },
						source: { origin: "submit", validatorId: "confirmation-gate" },
					},
				];
			},
		};
		const onSubmit = vi.fn().mockResolvedValue({ ok: true, submitId: "submitted" });
		const form = createForm<Data, Ui>({
			initialData: { email: "user@example.com" },
			initialUiState: { confirmed: false },
			plugins: [plugin],
			onSubmit,
		});

		const result = await form.submit();

		expect(contexts).toEqual([{ email: "user@example.com", confirmed: false }]);
		expect(result).toMatchObject({ ok: false, message: "Validation failed" });
		expect(form.getState().issues).toContainEqual(expect.objectContaining({ code: "CONFIRMATION_REQUIRED" }));
		expect(onSubmit).not.toHaveBeenCalled();
	});
});
