import { createArbiterPlugin } from "@formbar/arbiter";
import { useForm } from "@formbar/react";
import { useMemo } from "react";
import { ArbiterStateInspector } from "../renderers/ArbiterStateInspector";
import { DemoShell } from "../renderers/DemoShell";
import { Card, CardContent, CardHeader, CardTitle, cn } from "../ui";

// NOTE: $ui entries are synced shallowly (top-level keys only).
// Use flat keys like '$ui.showField' rather than nested '$ui.section.field.visible'.

interface FormData {
	readonly coverageType: string;
	readonly make: string;
	readonly model: string;
	readonly year: number;
	readonly address: string;
	readonly sqft: number;
	readonly yearBuilt: number;
	readonly age: number;
	readonly smoker: boolean;
	readonly conditions: string;
}

interface UiState {
	readonly showAutoSection: boolean;
	readonly showHomeSection: boolean;
	readonly showLifeSection: boolean;
}

export const arbiterSectionsRules = [
	{
		name: "autoSection",
		when: { coverageType: "auto" },
		then: [{ $set: { "$ui.showAutoSection": true, "$ui.showHomeSection": false, "$ui.showLifeSection": false } }],
	},
	{
		name: "homeSection",
		when: { coverageType: "home" },
		then: [{ $set: { "$ui.showAutoSection": false, "$ui.showHomeSection": true, "$ui.showLifeSection": false } }],
	},
	{
		name: "lifeSection",
		when: { coverageType: "life" },
		then: [{ $set: { "$ui.showAutoSection": false, "$ui.showHomeSection": false, "$ui.showLifeSection": true } }],
	},
	{
		name: "noSection",
		when: { coverageType: { $nin: ["auto", "home", "life"] } },
		then: [{ $set: { "$ui.showAutoSection": false, "$ui.showHomeSection": false, "$ui.showLifeSection": false } }],
	},
] as const;

export const arbiterSectionsSchema = {
	type: "object",
	properties: {
		coverageType: { type: "string", title: "Coverage Type", enum: ["auto", "home", "life"] },
	},
};

export const arbiterSectionsData = {
	coverageType: "",
	make: "",
	model: "",
	year: 0,
	address: "",
	sqft: 0,
	yearBuilt: 0,
	age: 0,
	smoker: false,
	conditions: "",
};
export const arbiterSectionsUiState = { showAutoSection: false, showHomeSection: false, showLifeSection: false };
const arbiterRules = arbiterSectionsRules;
const schema = arbiterSectionsSchema;

const inputClass = cn("rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground w-full");

function SectionWrapper({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-3 animate-in fade-in-0 slide-in-from-top-1 duration-200 border-t border-border-muted pt-4">
			<h3 className="text-sm font-semibold text-foreground">{title}</h3>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
		</div>
	);
}

function useSectionsForm() {
	const plugins = useMemo(() => [createArbiterPlugin({ rules: arbiterRules })], []);
	return useForm<FormData, UiState>({
		initialData: arbiterSectionsData,
		initialUiState: arbiterSectionsUiState,
		plugins,
	});
}

function TextInput(props: {
	readonly label: string;
	readonly value: string;
	readonly onChange: (value: string) => void;
	readonly wide?: boolean;
	readonly placeholder?: string;
}) {
	return (
		<label className={cn("flex flex-col gap-1", props.wide && "sm:col-span-2")}>
			<span className="text-xs text-muted-foreground">{props.label}</span>
			<input
				className={inputClass}
				value={props.value}
				onChange={(event) => props.onChange(event.target.value)}
				placeholder={props.placeholder}
			/>
		</label>
	);
}

function NumberInput(props: {
	readonly label: string;
	readonly value: number;
	readonly onChange: (value: number) => void;
}) {
	return (
		<label className="flex flex-col gap-1">
			<span className="text-xs text-muted-foreground">{props.label}</span>
			<input
				type="number"
				className={inputClass}
				value={props.value || ""}
				onChange={(event) => props.onChange(Number(event.target.value) || 0)}
			/>
		</label>
	);
}

function CoverageTypeField({ form }: { readonly form: ReturnType<typeof useSectionsForm> }) {
	return (
		<label className="flex flex-col gap-1">
			<span className="text-sm font-medium text-foreground">Coverage Type</span>
			<select
				className={inputClass}
				value={form.getState().data.coverageType}
				onChange={(e) => form.setValue("coverageType", e.target.value)}
			>
				<option value="">Select coverage...</option>
				<option value="auto">Auto</option>
				<option value="home">Home</option>
				<option value="life">Life</option>
			</select>
		</label>
	);
}

function VehicleSection({ form }: { readonly form: ReturnType<typeof useSectionsForm> }) {
	const { data } = form.getState();
	return (
		<SectionWrapper title="Vehicle Information">
			<TextInput label="Make" value={data.make} onChange={(value) => form.setValue("make", value)} />
			<TextInput label="Model" value={data.model} onChange={(value) => form.setValue("model", value)} />
			<NumberInput label="Year" value={data.year} onChange={(value) => form.setValue("year", value)} />
		</SectionWrapper>
	);
}

function PropertySection({ form }: { readonly form: ReturnType<typeof useSectionsForm> }) {
	const { data } = form.getState();
	return (
		<SectionWrapper title="Property Information">
			<TextInput label="Address" value={data.address} onChange={(value) => form.setValue("address", value)} wide />
			<NumberInput label="Square Footage" value={data.sqft} onChange={(value) => form.setValue("sqft", value)} />
			<NumberInput label="Year Built" value={data.yearBuilt} onChange={(value) => form.setValue("yearBuilt", value)} />
		</SectionWrapper>
	);
}

function HealthSection({ form }: { readonly form: ReturnType<typeof useSectionsForm> }) {
	const { data } = form.getState();
	return (
		<SectionWrapper title="Health Information">
			<NumberInput label="Age" value={data.age} onChange={(value) => form.setValue("age", value)} />
			<label className="flex items-center gap-2">
				<input
					type="checkbox"
					checked={data.smoker}
					onChange={(e) => form.setValue("smoker", e.target.checked)}
					className="rounded border-border"
				/>
				<span className="text-xs text-muted-foreground">Smoker</span>
			</label>
			<TextInput
				label="Pre-existing Conditions"
				value={data.conditions}
				onChange={(value) => form.setValue("conditions", value)}
				placeholder="None, or describe..."
				wide
			/>
		</SectionWrapper>
	);
}

function DynamicSections({ form }: { readonly form: ReturnType<typeof useSectionsForm> }) {
	const { uiState } = form.getState();
	return (
		<>
			{uiState.showAutoSection && <VehicleSection form={form} />}
			{uiState.showHomeSection && <PropertySection form={form} />}
			{uiState.showLifeSection && <HealthSection form={form} />}
		</>
	);
}

function SectionsCard({ form }: { readonly form: ReturnType<typeof useSectionsForm> }) {
	const { data, uiState } = form.getState();
	return (
		<Card className="border-border">
			<CardHeader>
				<CardTitle className="text-foreground">Insurance Quote</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<CoverageTypeField form={form} />
				<DynamicSections form={form} />
				<ArbiterStateInspector data={data} uiState={uiState} dataClassName="mt-2" />
			</CardContent>
		</Card>
	);
}

export function ArbiterDynamicSectionsDemo() {
	const form = useSectionsForm();
	return (
		<DemoShell
			title="Arbiter: Dynamic Sections"
			description="An insurance quote form where selecting a coverage type reveals type-specific sections. Rules control which section is visible via $ui flags."
			motivation="Multi-section forms with mutually exclusive sections are common in enterprise apps. Arbiter rules make the visibility logic explicit and centralized — adding a new coverage type means adding one rule, not threading state through multiple components."
			features={["Arbiter Rules", "$ui Namespace", "Dynamic Sections", "Mutual Exclusion", "Insurance Form"]}
			schema={schema}
			codeBlocks={[{ title: "Arbiter Rules", code: arbiterRules as unknown as object, defaultOpen: true }]}
		>
			<SectionsCard form={form} />
		</DemoShell>
	);
}
