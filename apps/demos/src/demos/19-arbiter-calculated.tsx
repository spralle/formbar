import { createArbiterPlugin } from "@formbar/arbiter";
import { useForm } from "@formbar/react";
import { useMemo } from "react";
import { ArbiterStateInspector } from "../renderers/ArbiterStateInspector";
import { DemoShell } from "../renderers/DemoShell";
import { Badge, Card, CardContent, CardHeader, CardTitle, cn } from "../ui";

// NOTE: $ui entries are synced shallowly (top-level keys only).
// Use flat keys like '$ui.showField' rather than nested '$ui.section.field.visible'.

interface FormData {
	readonly quantity: number;
	readonly unitPrice: number;
}

interface UiState {
	readonly tier: string;
	readonly showBulkDiscount: boolean;
}

export const arbiterCalculatedRules = [
	{
		name: "smallOrder",
		when: { quantity: { $lt: 10 } },
		then: [{ $set: { "$ui.tier": "small", "$ui.showBulkDiscount": false } }],
	},
	{
		name: "bulkOrder",
		when: { quantity: { $gte: 10 } },
		then: [{ $set: { "$ui.tier": "bulk", "$ui.showBulkDiscount": true } }],
	},
] as const;

export const arbiterCalculatedSchema = {
	type: "object",
	properties: {
		quantity: { type: "number", title: "Quantity", minimum: 1 },
		unitPrice: { type: "number", title: "Unit Price" },
	},
};

export const arbiterCalculatedData = { quantity: 1, unitPrice: 25 };
export const arbiterCalculatedUiState = { tier: "small", showBulkDiscount: false };
const arbiterRules = arbiterCalculatedRules;
const schema = arbiterCalculatedSchema;
const inputClass = cn("rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground");

function useCalculatedForm() {
	const plugins = useMemo(() => [createArbiterPlugin({ rules: arbiterRules })], []);
	return useForm<FormData, UiState>({
		initialData: arbiterCalculatedData,
		initialUiState: arbiterCalculatedUiState,
		plugins,
	});
}

function OrderInputs({ form }: { readonly form: ReturnType<typeof useCalculatedForm> }) {
	const { data } = form.getState();
	return (
		<div className="grid grid-cols-2 gap-4">
			<label className="flex flex-col gap-1">
				<span className="text-sm font-medium text-foreground">Quantity</span>
				<input
					type="number"
					min={1}
					className={inputClass}
					value={data.quantity}
					onChange={(e) => form.setValue("quantity", Number(e.target.value) || 0)}
				/>
			</label>
			<label className="flex flex-col gap-1">
				<span className="text-sm font-medium text-foreground">Unit Price ($)</span>
				<input
					type="number"
					min={0}
					step={0.01}
					className={inputClass}
					value={data.unitPrice}
					onChange={(e) => form.setValue("unitPrice", Number(e.target.value) || 0)}
				/>
			</label>
		</div>
	);
}

function SummaryRow({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
	return (
		<div className="flex justify-between text-sm">
			<span className="text-muted-foreground">{label}</span>
			{children}
		</div>
	);
}

function PricingSummary({ form }: { readonly form: ReturnType<typeof useCalculatedForm> }) {
	const { data, uiState } = form.getState();
	const subtotal = data.quantity * data.unitPrice;
	const discount = uiState.showBulkDiscount ? subtotal * 0.1 : 0;
	const total = subtotal - discount;
	return (
		<div className="rounded-md border border-border p-4 flex flex-col gap-2">
			<SummaryRow label="Tier">
				<Badge variant={uiState.tier === "bulk" ? "default" : "secondary"}>{uiState.tier}</Badge>
			</SummaryRow>
			<SummaryRow label="Subtotal">
				<span className="text-foreground font-medium">${subtotal.toFixed(2)}</span>
			</SummaryRow>
			{uiState.showBulkDiscount && (
				<div className="flex justify-between text-sm text-green-600 animate-in fade-in-0 duration-200">
					<span>Bulk Discount (10%)</span>
					<span>-${discount.toFixed(2)}</span>
				</div>
			)}
			<div className="flex justify-between text-sm font-bold border-t border-border-muted pt-2 mt-1">
				<span className="text-foreground">Total</span>
				<span className="text-foreground">${total.toFixed(2)}</span>
			</div>
		</div>
	);
}

function CalculatedCard({ form }: { readonly form: ReturnType<typeof useCalculatedForm> }) {
	const { data, uiState } = form.getState();
	return (
		<Card className="border-border">
			<CardHeader>
				<CardTitle className="text-foreground">Order Form</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<OrderInputs form={form} />
				<PricingSummary form={form} />
				<ArbiterStateInspector data={data} uiState={uiState} />
			</CardContent>
		</Card>
	);
}

export function ArbiterCalculatedDemo() {
	const form = useCalculatedForm();
	return (
		<DemoShell
			title="Arbiter: Calculated Fields"
			description="Rules handle conditional logic (tier detection, discount eligibility) while derived arithmetic is computed in the render layer. This separates concerns: rules for conditions, code for math."
			motivation="Arbiter rules use $set for static values — they can't compute arithmetic. The pattern shown here uses rules for threshold-based conditional logic and standard code for calculations. This keeps rules simple and testable."
			features={["Arbiter Rules", "$ui Namespace", "Tier Detection", "Computed Values", "Separation of Concerns"]}
			schema={schema}
			codeBlocks={[{ title: "Arbiter Rules", code: arbiterRules as unknown as object, defaultOpen: true }]}
		>
			<CalculatedCard form={form} />
		</DemoShell>
	);
}
