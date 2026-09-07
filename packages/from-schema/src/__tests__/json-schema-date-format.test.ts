import type { JsonSchema } from "@scheman/core";
import { describe, expect, test } from "vitest";
import { createJsonSchemaValidator } from "../adapters/json-schema-validator.js";

const schema: JsonSchema = {
	type: "object",
	properties: {
		date: { type: "string", format: "date" },
		dateTime: { type: "string", format: "date-time" },
		custom: { type: "string", format: "custom" },
	},
};

const validator = createJsonSchemaValidator(schema);
const validateDate = (date: string) => validator({ data: { date }, uiState: {}, stage: "submit" });

describe('JSON Schema format "date" validation', () => {
	test.each(["2026-09-07", "2024-02-29", "2000-02-29"])("accepts calendar date %s", (date) => {
		expect(validateDate(date)).toHaveLength(0);
	});

	test.each(["not-a-date", "2024-2-09", "2024-02-9", "2023-02-29", "1900-02-29", "2024-04-31", "2024-13-01"])(
		"rejects invalid or noncanonical date %s",
		(date) => {
			const issues = validateDate(date);
			expect(issues).toHaveLength(1);
			expect(issues[0]).toMatchObject({ code: "INVALID_FORMAT", path: { segments: ["date"] } });
		},
	);

	test("leaves date-time and unknown formats unchanged", () => {
		const issues = validator({
			data: { dateTime: "not-a-date-time", custom: "anything" },
			uiState: {},
			stage: "submit",
		});

		expect(issues).toHaveLength(0);
	});
});
