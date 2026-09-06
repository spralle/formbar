import { basicContactSchema } from "../demos/01-basic-contact";
import { userProfileLayout, userProfileSchema } from "../demos/02-user-profile";
import { nestedAddressSchema } from "../demos/03-nested-address";
import { settingsPanelLayout, settingsPanelSchema } from "../demos/04-settings-panel";
import { productEntryLayout, productEntrySchema } from "../demos/05-product-entry";
import { richValidationSchema } from "../demos/06-rich-validation";
import { arrayItemsSchema } from "../demos/08-array-items";
import { customLayoutLayout, customLayoutSchema } from "../demos/09-custom-layout";
import { multiSectionLayout, multiSectionSchema } from "../demos/10-multi-section-responsive";
import { searchFiltersLayout, searchFiltersSchema } from "../demos/11-search-filters";
import { surveyLayout, surveySchema } from "../demos/12-survey-questionnaire";
import { explicitSchema, minimalSchema } from "../demos/13-multi-schema-sources";
import { orderEntryLayout, orderEntrySchema } from "../demos/14-order-entry";
import { kitchenSinkData, kitchenSinkLayout, kitchenSinkSchema } from "../demos/15-kitchen-sink";
import {
	arbiterVisibilityData,
	arbiterVisibilityRules,
	arbiterVisibilitySchema,
	arbiterVisibilityUiState,
} from "../demos/18-arbiter-visibility";
import {
	arbiterCalculatedData,
	arbiterCalculatedRules,
	arbiterCalculatedSchema,
	arbiterCalculatedUiState,
} from "../demos/19-arbiter-calculated";
import {
	arbiterValidationData,
	arbiterValidationRules,
	arbiterValidationSchema,
	arbiterValidationUiState,
} from "../demos/20-arbiter-validation-gating";
import {
	arbiterSectionsData,
	arbiterSectionsRules,
	arbiterSectionsSchema,
	arbiterSectionsUiState,
} from "../demos/21-arbiter-dynamic-sections";
import { type DemoCompatibility, PLAYGROUND_DOCUMENT_VERSION, type PlaygroundDocument } from "./contracts";

const EMPTY = {};

function document(
	schema: object,
	layout: object | null = null,
	rules: readonly unknown[] = [],
	initialData: object = EMPTY,
	initialUiState: object = EMPTY,
): PlaygroundDocument {
	return {
		version: PLAYGROUND_DOCUMENT_VERSION,
		schema: schema as Record<string, unknown>,
		layout: layout as Record<string, unknown> | null,
		rules,
		initialData: initialData as Record<string, unknown>,
		initialUiState: initialUiState as Record<string, unknown>,
	};
}

function full(
	demoId: string,
	schema: object,
	layout: object | null = null,
	initialData: object = EMPTY,
): DemoCompatibility {
	return {
		demoId,
		support: "full",
		presets: [
			{
				key: `${demoId}:default`,
				demoId,
				variant: "default",
				label: "Default",
				support: "full",
				document: document(schema, layout, [], initialData),
			},
		],
	};
}

function partial(
	demoId: string,
	schema: object,
	rules: readonly unknown[],
	initialData: object,
	initialUiState: object,
	warning: string,
): DemoCompatibility {
	return {
		demoId,
		support: "partial",
		reason: warning,
		presets: [
			{
				key: `${demoId}:default`,
				demoId,
				variant: "default",
				label: "Generic runner",
				support: "partial",
				warning,
				document: document(schema, null, rules, initialData, initialUiState),
			},
		],
	};
}

export const compatibilityMatrix: readonly DemoCompatibility[] = [
	full("basic-contact", basicContactSchema),
	full("user-profile", userProfileSchema, userProfileLayout),
	full("nested-address", nestedAddressSchema),
	full("settings-panel", settingsPanelSchema, settingsPanelLayout),
	full("product-entry", productEntrySchema, productEntryLayout),
	full("rich-validation", richValidationSchema),
	{
		demoId: "conditional-fields",
		support: "unsupported",
		reason: "Uses bespoke conditional JSX not representable by the built-in generic layout nodes.",
		presets: [],
	},
	full("array-items", arrayItemsSchema),
	full("custom-layout", customLayoutSchema, customLayoutLayout),
	full("multi-section", multiSectionSchema, multiSectionLayout),
	full("search-filters", searchFiltersSchema, searchFiltersLayout),
	full("survey", surveySchema, surveyLayout),
	{
		demoId: "multi-schema",
		support: "full",
		presets: [
			{
				key: "multi-schema:minimal",
				demoId: "multi-schema",
				variant: "minimal",
				label: "Minimal",
				support: "full",
				document: document(minimalSchema),
			},
			{
				key: "multi-schema:explicit",
				demoId: "multi-schema",
				variant: "explicit",
				label: "Explicit",
				support: "full",
				document: document(explicitSchema),
			},
		],
	},
	full("order-entry", orderEntrySchema, orderEntryLayout),
	full("kitchen-sink", kitchenSinkSchema, kitchenSinkLayout, kitchenSinkData),
	{
		demoId: "custom-renderers",
		support: "unsupported",
		reason: "Depends on custom React renderers; user JSX is intentionally not executed in the playground.",
		presets: [],
	},
	{
		demoId: "custom-layout-types",
		support: "unsupported",
		reason: "Uses bespoke tabs and accordion layout nodes outside the generic runner's built-in node set.",
		presets: [],
	},
	partial(
		"arbiter-visibility",
		arbiterVisibilitySchema,
		arbiterVisibilityRules,
		arbiterVisibilityData,
		arbiterVisibilityUiState,
		"Rules and schema run live, but the demo's bespoke country/state JSX and option lists are not reproduced.",
	),
	partial(
		"arbiter-calculated",
		arbiterCalculatedSchema,
		arbiterCalculatedRules,
		arbiterCalculatedData,
		arbiterCalculatedUiState,
		"Rules run live, but bespoke pricing calculations and summary JSX are not reproduced.",
	),
	partial(
		"arbiter-validation-gating",
		arbiterValidationSchema,
		arbiterValidationRules,
		arbiterValidationData,
		arbiterValidationUiState,
		"Rules run live, but the bespoke submission button and submission flow are not reproduced.",
	),
	partial(
		"arbiter-dynamic-sections",
		arbiterSectionsSchema,
		arbiterSectionsRules,
		arbiterSectionsData,
		arbiterSectionsUiState,
		"Rules run live, but bespoke conditional section JSX and fields absent from the exported schema are not reproduced.",
	),
];

export function getCompatibility(demoId: string): DemoCompatibility {
	return compatibilityMatrix.find((entry) => entry.demoId === demoId) ?? compatibilityMatrix[0];
}

export function getPreset(demoId: string, variant?: string) {
	const compatibility = getCompatibility(demoId);
	return compatibility.presets.find((preset) => preset.variant === variant) ?? compatibility.presets[0];
}
