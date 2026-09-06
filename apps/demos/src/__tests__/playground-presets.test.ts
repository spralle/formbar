import { describe, expect, it } from "vitest";
import { demos } from "../demos";
import { parseDocument, stringifyDocument } from "../playground/document";
import { compatibilityMatrix } from "../playground/presets";

const expected = [
	["basic-contact", "basic", "BasicContactDemo"],
	["user-profile", "basic", "UserProfileDemo"],
	["nested-address", "basic", "NestedAddressDemo"],
	["settings-panel", "basic", "SettingsPanelDemo"],
	["product-entry", "basic", "ProductEntryDemo"],
	["rich-validation", "intermediate", "RichValidationDemo"],
	["conditional-fields", "intermediate", "ConditionalFieldsDemo"],
	["array-items", "intermediate", "ArrayItemsDemo"],
	["custom-layout", "intermediate", "CustomLayoutDemo"],
	["multi-section", "intermediate", "MultiSectionResponsiveDemo"],
	["search-filters", "advanced", "SearchFiltersDemo"],
	["survey", "advanced", "SurveyQuestionnaireDemo"],
	["multi-schema", "advanced", "MultiSchemaSourcesDemo"],
	["order-entry", "advanced", "OrderEntryDemo"],
	["kitchen-sink", "advanced", "KitchenSinkDemo"],
	["custom-renderers", "advanced", "CustomRenderersDemo"],
	["custom-layout-types", "advanced", "CustomLayoutTypesDemo"],
	["arbiter-visibility", "advanced", "ArbiterVisibilityDemo"],
	["arbiter-calculated", "advanced", "ArbiterCalculatedDemo"],
	["arbiter-validation-gating", "advanced", "ArbiterValidationGatingDemo"],
	["arbiter-dynamic-sections", "advanced", "ArbiterDynamicSectionsDemo"],
];

describe("playground presets", () => {
	it("preserves the exact demo registration order, categories, and components", () => {
		expect(demos.map((demo) => [demo.id, demo.category, demo.component.name])).toEqual(expected);
	});

	it("defines the required compatibility matrix", () => {
		expect(compatibilityMatrix.map(({ demoId, support }) => [demoId, support])).toEqual(
			expected.map(([id], index) => [
				id,
				[6, 15, 16].includes(index) ? "unsupported" : index >= 17 ? "partial" : "full",
			]),
		);
		expect(compatibilityMatrix[12].presets.map((preset) => preset.variant)).toEqual(["minimal", "explicit"]);
		expect(compatibilityMatrix.filter((entry) => entry.support === "unsupported").every((entry) => entry.reason)).toBe(
			true,
		);
		expect(compatibilityMatrix.filter((entry) => entry.support === "partial").every((entry) => entry.reason)).toBe(
			true,
		);
	});

	it("parses and preflights every available preset", () => {
		for (const compatibility of compatibilityMatrix) {
			for (const preset of compatibility.presets) {
				expect(parseDocument(stringifyDocument(preset.document)), preset.key).toEqual({
					ok: true,
					document: preset.document,
				});
			}
		}
	});
});
