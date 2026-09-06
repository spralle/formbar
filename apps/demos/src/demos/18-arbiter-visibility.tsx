import { createArbiterPlugin } from "@formbar/arbiter";
import { useForm } from "@formbar/react";
import { useMemo } from "react";
import { ArbiterStateInspector } from "../renderers/ArbiterStateInspector";
import { DemoShell } from "../renderers/DemoShell";
import { Card, CardContent, CardHeader, CardTitle, cn } from "../ui";

// NOTE: $ui entries are synced shallowly (top-level keys only).
// Use flat keys like '$ui.showField' rather than nested '$ui.section.field.visible'.

interface FormData {
	readonly country: string;
	readonly state: string;
	readonly province: string;
	readonly region: string;
}

interface UiState {
	readonly showState: boolean;
	readonly showProvince: boolean;
}

export const arbiterVisibilityRules = [
	{
		name: "showUSState",
		when: { country: "US" },
		then: [{ $set: { "$ui.showState": true, "$ui.showProvince": false } }],
	},
	{
		name: "showCAProvince",
		when: { country: "CA" },
		then: [{ $set: { "$ui.showState": false, "$ui.showProvince": true } }],
	},
	{
		name: "hideRegional",
		when: { country: { $nin: ["US", "CA"] } },
		then: [{ $set: { "$ui.showState": false, "$ui.showProvince": false } }],
	},
] as const;

export const arbiterVisibilitySchema = {
	type: "object",
	properties: {
		country: { type: "string", title: "Country", enum: ["US", "CA", "UK", "DE"] },
		state: { type: "string", title: "State" },
		province: { type: "string", title: "Province" },
		region: { type: "string", title: "Region" },
	},
};

export const arbiterVisibilityData = { country: "", state: "", province: "", region: "" };
export const arbiterVisibilityUiState = { showState: false, showProvince: false };
const arbiterRules = arbiterVisibilityRules;
const schema = arbiterVisibilitySchema;

const US_STATES = ["California", "New York", "Texas", "Florida"];
const CA_PROVINCES = ["Ontario", "Quebec", "British Columbia", "Alberta"];
const inputClass = cn("rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground");

function useVisibilityForm() {
	const plugins = useMemo(() => [createArbiterPlugin({ rules: arbiterRules })], []);
	return useForm<FormData, UiState>({
		initialData: arbiterVisibilityData,
		initialUiState: arbiterVisibilityUiState,
		plugins,
	});
}

function CountryField({ form }: { readonly form: ReturnType<typeof useVisibilityForm> }) {
	return (
		<label className="flex flex-col gap-1">
			<span className="text-sm font-medium text-foreground">Country</span>
			<select
				className={inputClass}
				value={form.getState().data.country}
				onChange={(e) => form.setValue("country", e.target.value)}
			>
				<option value="">Select country...</option>
				<option value="US">United States</option>
				<option value="CA">Canada</option>
				<option value="UK">United Kingdom</option>
				<option value="DE">Germany</option>
			</select>
		</label>
	);
}

function RegionalSelect(props: {
	readonly label: "State" | "Province";
	readonly value: string;
	readonly options: readonly string[];
	readonly onChange: (value: string) => void;
}) {
	return (
		<label className="flex flex-col gap-1 animate-in fade-in-0 duration-200">
			<span className="text-sm font-medium text-foreground">{props.label}</span>
			<select className={inputClass} value={props.value} onChange={(event) => props.onChange(event.target.value)}>
				<option value="">Select {props.label.toLowerCase()}...</option>
				{props.options.map((option) => (
					<option key={option} value={option}>
						{option}
					</option>
				))}
			</select>
		</label>
	);
}

function RegionalFields({ form }: { readonly form: ReturnType<typeof useVisibilityForm> }) {
	const { data, uiState } = form.getState();
	if (uiState.showState) {
		return (
			<RegionalSelect
				label="State"
				value={data.state}
				options={US_STATES}
				onChange={(value) => form.setValue("state", value)}
			/>
		);
	}
	if (uiState.showProvince) {
		return (
			<RegionalSelect
				label="Province"
				value={data.province}
				options={CA_PROVINCES}
				onChange={(value) => form.setValue("province", value)}
			/>
		);
	}
	if (!data.country) return null;
	return (
		<label className="flex flex-col gap-1 animate-in fade-in-0 duration-200">
			<span className="text-sm font-medium text-foreground">Region</span>
			<input
				className={inputClass}
				value={data.region}
				onChange={(e) => form.setValue("region", e.target.value)}
				placeholder="Enter region..."
			/>
		</label>
	);
}

function VisibilityCard({ form }: { readonly form: ReturnType<typeof useVisibilityForm> }) {
	const { data, uiState } = form.getState();
	return (
		<Card className="border-border">
			<CardHeader>
				<CardTitle className="text-foreground">Country Selector</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<CountryField form={form} />
				<RegionalFields form={form} />
				<ArbiterStateInspector data={data} uiState={uiState} dataClassName="mt-4" />
			</CardContent>
		</Card>
	);
}

export function ArbiterVisibilityDemo() {
	const form = useVisibilityForm();
	return (
		<DemoShell
			title="Arbiter: Conditional Visibility"
			description="Rules drive field visibility via $ui state. Selecting a country triggers arbiter rules that set $ui.showState or $ui.showProvince, replacing complex useEffect chains."
			motivation="Arbiter rules declaratively express visibility logic. Instead of imperative useEffect chains that grow tangled, rules are self-contained, testable, and composable."
			features={["Arbiter Rules", "$ui Namespace", "Conditional Visibility", "Declarative Logic"]}
			schema={schema}
			codeBlocks={[{ title: "Arbiter Rules", code: arbiterRules as unknown as object, defaultOpen: true }]}
		>
			<VisibilityCard form={form} />
		</DemoShell>
	);
}
