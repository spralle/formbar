import { describe, expect, test } from "vitest";
import { createSchemaForm } from "../create-schema-form.js";

const applicators = ["allOf", "anyOf", "oneOf", "if", "then", "else"] as const;

describe("JSON Schema option source scope", () => {
	test.each(applicators)("excludes options and warnings reached through %s", (applicator) => {
		const result = createSchemaForm(createApplicatorSchema(applicator));

		expect([...result.optionsByPath]).toEqual([
			["direct", [{ value: "direct", title: "Direct" }]],
			["nested.directRef", [{ value: "referenced", title: "Referenced" }]],
			["tags[]", [{ value: "referenced", title: "Referenced" }]],
		]);
		expect(result.warnings).toEqual([]);
		expect([...result.optionsByPath.keys()].some((path) => path.startsWith("branch"))).toBe(false);
	});
});

function createApplicatorSchema(applicator: (typeof applicators)[number]) {
	const branchReference = { $ref: "#/$defs/BranchSources" };
	return {
		type: "object",
		$defs: {
			ReferencedChoice: {
				type: "string",
				enum: ["referenced"],
				"x-formbar": { options: [{ value: "referenced", title: "Referenced" }] },
			},
			BranchSources: {
				type: "object",
				properties: {
					direct: {
						type: "string",
						enum: ["branch-override"],
						"x-formbar": { options: [{ value: "missing", title: "Branch override" }] },
					},
					branchEnum: { type: "string", enum: ["branch"] },
					branchConst: {
						type: "string",
						const: "fixed",
						"x-formbar": { options: ["fixed", "fixed"] },
					},
					branchOptions: { type: "string", "x-formbar": { options: "invalid" } },
					branchReference: { $ref: "#/$defs/ReferencedChoice" },
				},
			},
		},
		properties: {
			direct: {
				type: "string",
				enum: ["direct"],
				"x-formbar": { options: [{ value: "direct", title: "Direct" }] },
			},
			nested: {
				type: "object",
				properties: { directRef: { $ref: "#/$defs/ReferencedChoice" } },
			},
			tags: { type: "array", items: { $ref: "#/$defs/ReferencedChoice" } },
		},
		...(isArrayApplicator(applicator) ? { [applicator]: [branchReference] } : { [applicator]: branchReference }),
	};
}

function isArrayApplicator(applicator: (typeof applicators)[number]): applicator is "allOf" | "anyOf" | "oneOf" {
	return applicator === "allOf" || applicator === "anyOf" || applicator === "oneOf";
}
