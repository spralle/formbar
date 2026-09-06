import { createArbiterPlugin } from "@formbar/arbiter";
import { useForm } from "@formbar/react";
import { useMemo, useState } from "react";
import { ArbiterStateInspector } from "../renderers/ArbiterStateInspector";
import { DemoShell } from "../renderers/DemoShell";
import { Card, CardContent, CardHeader, CardTitle, cn } from "../ui";

// NOTE: $ui entries are synced shallowly (top-level keys only).
// Use flat keys like '$ui.showField' rather than nested '$ui.section.field.visible'.

interface FormData {
	readonly name: string;
	readonly email: string;
	readonly age: number;
	readonly agreeToTerms: boolean;
}

interface UiState {
	readonly canSubmit: boolean;
}

export const arbiterValidationRules = [
	{
		name: "canSubmit",
		when: { agreeToTerms: true },
		then: [{ $set: { "$ui.canSubmit": true } }],
	},
	{
		name: "cannotSubmit",
		when: { agreeToTerms: { $ne: true } },
		then: [{ $set: { "$ui.canSubmit": false } }],
	},
] as const;

export const arbiterValidationSchema = {
	type: "object",
	properties: {
		name: { type: "string", title: "Full Name" },
		email: { type: "string", title: "Email", format: "email" },
		age: { type: "number", title: "Age", minimum: 18 },
		agreeToTerms: { type: "boolean", title: "I agree to the Terms of Service" },
	},
};

export const arbiterValidationData = { name: "", email: "", age: 0, agreeToTerms: false };
export const arbiterValidationUiState = { canSubmit: false };
const arbiterRules = arbiterValidationRules;
const schema = arbiterValidationSchema;
const inputClass = cn("rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground");

function useValidationForm() {
	const plugins = useMemo(() => [createArbiterPlugin({ rules: arbiterRules })], []);
	return useForm<FormData, UiState>({
		initialData: arbiterValidationData,
		initialUiState: arbiterValidationUiState,
		plugins,
	});
}

function IdentityFields({ form }: { readonly form: ReturnType<typeof useValidationForm> }) {
	const { data } = form.getState();
	return (
		<>
			<label className="flex flex-col gap-1">
				<span className="text-sm font-medium text-foreground">Full Name</span>
				<input className={inputClass} value={data.name} onChange={(e) => form.setValue("name", e.target.value)} />
			</label>
			<label className="flex flex-col gap-1">
				<span className="text-sm font-medium text-foreground">Email</span>
				<input
					type="email"
					className={inputClass}
					value={data.email}
					onChange={(e) => form.setValue("email", e.target.value)}
				/>
			</label>
			<label className="flex flex-col gap-1">
				<span className="text-sm font-medium text-foreground">Age</span>
				<input
					type="number"
					min={0}
					className={inputClass}
					value={data.age || ""}
					onChange={(e) => form.setValue("age", Number(e.target.value) || 0)}
				/>
			</label>
		</>
	);
}

function TermsField({ form }: { readonly form: ReturnType<typeof useValidationForm> }) {
	return (
		<label className="flex items-center gap-2 cursor-pointer">
			<input
				type="checkbox"
				checked={form.getState().data.agreeToTerms}
				onChange={(e) => form.setValue("agreeToTerms", e.target.checked)}
				className="rounded border-border"
			/>
			<span className="text-sm text-foreground">I agree to the Terms of Service</span>
		</label>
	);
}

function SubmitControl(props: {
	readonly canSubmit: boolean;
	readonly submitted: boolean;
	readonly onSubmit: () => void;
}) {
	return (
		<>
			<button
				type="button"
				disabled={!props.canSubmit}
				onClick={props.onSubmit}
				className={cn(
					"rounded-md px-4 py-2 text-sm font-medium transition-colors",
					props.canSubmit
						? "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
						: "bg-muted text-muted-foreground cursor-not-allowed",
				)}
			>
				{props.canSubmit ? "Submit" : "Accept terms to continue"}
			</button>
			{props.submitted && (
				<p className="text-sm text-green-600 font-medium animate-in fade-in-0 duration-200">
					✓ Form submitted successfully!
				</p>
			)}
		</>
	);
}

function SignupCard({ form }: { readonly form: ReturnType<typeof useValidationForm> }) {
	const { data, uiState } = form.getState();
	const [submitted, setSubmitted] = useState(false);
	return (
		<Card className="border-border">
			<CardHeader>
				<CardTitle className="text-foreground">Signup Form</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<IdentityFields form={form} />
				<TermsField form={form} />
				<SubmitControl canSubmit={uiState.canSubmit} submitted={submitted} onSubmit={() => setSubmitted(true)} />
				<ArbiterStateInspector data={data} uiState={uiState} />
			</CardContent>
		</Card>
	);
}

export function ArbiterValidationGatingDemo() {
	const form = useValidationForm();
	return (
		<DemoShell
			title="Arbiter: Validation Gating"
			description="Rules control whether the submit button is enabled via $ui.canSubmit. The 'agree to terms' checkbox drives the rule, gating form submission declaratively."
			motivation="Instead of scattering disabled-state logic across event handlers, a single rule declares the invariant: 'submit is allowed when terms are accepted.' This is auditable, testable, and trivial to extend with more conditions."
			features={["Arbiter Rules", "$ui Namespace", "Submit Gating", "Declarative Validation"]}
			schema={schema}
			codeBlocks={[{ title: "Arbiter Rules", code: arbiterRules as unknown as object, defaultOpen: true }]}
		>
			<SignupCard form={form} />
		</DemoShell>
	);
}
