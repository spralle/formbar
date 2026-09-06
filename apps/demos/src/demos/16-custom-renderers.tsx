import type { FormApi } from "@formbar/core";
import type { FormbarOption, SchemaFieldInfo } from "@formbar/from-schema";
import { useSchemaForm } from "@formbar/react-schema";
import { useCallback, useEffect, useState } from "react";
import { DemoFormField } from "../renderers/DemoFormField";
import { DemoShell } from "../renderers/DemoShell";
import { Card, CardContent, CardHeader, CardTitle, Checkbox, Label, Progress, Slider, cn } from "../ui";

const schema = {
	type: "object",
	properties: {
		productName: { type: "string", title: "Product Name" },
		qualityRating: {
			type: "integer",
			title: "Quality Rating",
			minimum: 0,
			maximum: 5,
			"x-formbar": { widget: "rating" },
			description: "Click stars to rate",
		},
		userSatisfaction: {
			type: "integer",
			title: "User Satisfaction",
			minimum: 0,
			maximum: 5,
			"x-formbar": { widget: "rating" },
		},
		brandColor: {
			type: "string",
			title: "Brand Color",
			pattern: "^#[0-9a-fA-F]{6}$",
			"x-formbar": {
				widget: "color",
				options: ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"],
			},
			description: "Pick a brand color",
		},
		accentColor: {
			type: "string",
			title: "Accent Color",
			pattern: "^#[0-9a-fA-F]{6}$",
			"x-formbar": {
				widget: "color",
				options: ["#1E293B", "#334155", "#475569", "#64748B", "#94A3B8", "#CBD5E1", "#E2E8F0", "#F8FAFC"],
			},
		},
		tags: {
			type: "string",
			title: "Tags",
			"x-formbar": {
				widget: "checkbox-group",
				options: ["Performance", "Usability", "Design", "Reliability", "Security"],
			},
			description: "Select all that apply",
		},
		completionRate: {
			type: "integer",
			title: "Completion Rate",
			minimum: 0,
			maximum: 100,
			"x-formbar": { widget: "progress" },
			description: "Project completion percentage",
		},
		notes: { type: "string", title: "Notes", "x-formbar": { widget: "textarea" } },
	},
};

function StarRating({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
	return (
		<div className="flex gap-1">
			{Array.from({ length: max }, (_, i) => i + 1).map((rating) => (
				<button
					key={rating}
					type="button"
					onClick={() => onChange(rating)}
					className={cn(
						"text-xl transition-colors cursor-pointer",
						rating <= value ? "text-warning" : "text-muted-foreground/30",
					)}
				>
					★
				</button>
			))}
			<span className="text-sm text-muted-foreground ml-2">
				{value}/{max}
			</span>
		</div>
	);
}

/**
 * Color swatches use inline backgroundColor because these are DATA values
 * from the schema options, not theme/design tokens.
 */
function ColorPicker({
	value,
	options,
	onChange,
}: {
	value: string;
	options: string[];
	onChange: (v: string) => void;
}) {
	return (
		<div className="flex gap-2 flex-wrap">
			{options.map((color) => (
				<button
					key={color}
					type="button"
					onClick={() => onChange(color)}
					className={cn(
						"w-8 h-8 rounded-full border-2 transition-all",
						value === color ? "border-foreground scale-110" : "border-transparent",
					)}
					style={{ backgroundColor: color }}
				/>
			))}
			{value && <span className="text-xs text-muted-foreground self-center ml-2">{value}</span>}
		</div>
	);
}

function CheckboxGroup({
	value,
	options,
	onChange,
}: {
	value: string;
	options: string[];
	onChange: (v: string) => void;
}) {
	const selected = value ? value.split(",").filter(Boolean) : [];
	const setOptionChecked = (opt: string, checked: boolean) => {
		const withoutOption = selected.filter((item) => item !== opt);
		const next = checked ? [...withoutOption, opt] : withoutOption;
		onChange(next.join(","));
	};
	return (
		<div className="flex flex-col gap-2">
			{options.map((opt) => (
				<div key={opt} className="flex items-center gap-2">
					<Checkbox
						checked={selected.includes(opt)}
						onCheckedChange={(checked) => setOptionChecked(opt, checked)}
						id={`cb-${opt}`}
					/>
					<Label htmlFor={`cb-${opt}`} className="text-sm text-foreground">
						{opt}
					</Label>
				</div>
			))}
		</div>
	);
}

function ProgressField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
	return (
		<div className="flex flex-col gap-2">
			<Progress value={value} className="h-2" />
			<div className="flex items-center gap-2">
				<Slider min={0} max={100} step={1} value={[value]} onValueChange={([v]) => onChange(v)} className="flex-1" />
				<span className="text-sm text-muted-foreground w-10 text-right">{value}%</span>
			</div>
		</div>
	);
}

interface CustomFieldProps {
	readonly form: FormApi;
	readonly field: SchemaFieldInfo;
	readonly preparedOptions: readonly FormbarOption[] | undefined;
	readonly onChange: (path: string, value: unknown) => void;
}

function CustomField({ form, field, preparedOptions, onChange }: CustomFieldProps) {
	const widget = field.metadata?.widget;
	const options = preparedOptions?.flatMap((option) => (typeof option.value === "string" ? [option.value] : []));

	const getData = useCallback(() => form.getState().data as Record<string, unknown>, [form]);
	const [value, setValue] = useState<unknown>(getData()[field.path]);

	useEffect(() => {
		return form.subscribe(() => {
			setValue(getData()[field.path]);
		});
	}, [form, field.path, getData]);

	const handleChange = useCallback(
		(v: unknown) => {
			form.setValue(field.path, v);
			onChange(field.path, v);
		},
		[form, field.path, onChange],
	);

	const title = field.metadata?.title ?? field.path;
	const description = field.metadata?.description;

	if (!widget || widget === "textarea") {
		return <DemoFormField form={form} field={field} options={preparedOptions} onChange={onChange} />;
	}

	return (
		<div className="flex flex-col gap-1.5">
			<Label className="text-sm font-medium text-foreground">{title}</Label>
			{description && <p className="text-xs text-muted-foreground">{description}</p>}
			{widget === "rating" && <StarRating value={Number(value) || 0} max={5} onChange={handleChange} />}
			{widget === "color" && options && (
				<ColorPicker value={String(value ?? "")} options={options} onChange={(v) => handleChange(v)} />
			)}
			{widget === "checkbox-group" && options && (
				<CheckboxGroup value={String(value ?? "")} options={options} onChange={(v) => handleChange(v)} />
			)}
			{widget === "progress" && <ProgressField value={Number(value) || 0} onChange={handleChange} />}
		</div>
	);
}

interface CustomRenderersViewProps {
	readonly form: FormApi;
	readonly fields: readonly SchemaFieldInfo[];
	readonly optionsByPath: ReadonlyMap<string, readonly FormbarOption[]>;
	readonly formData: Record<string, unknown>;
	readonly onChange: (path: string, value: unknown) => void;
}

function CustomRenderersView({ form, fields, optionsByPath, formData, onChange }: CustomRenderersViewProps) {
	return (
		<DemoShell
			title="Custom Renderers"
			description="Demonstrates custom field renderers using x-formbar metadata extensions. Star ratings, color pickers, checkbox groups, and progress bars — all driven by schema metadata."
			motivation="Shows the extensibility story: star ratings, color pickers, checkbox groups, and progress bars via custom renderer functions. Proves developers aren't locked into built-in widgets — they can plug in any React component."
			features={[
				"Custom Widgets",
				"x-formbar Metadata",
				"Star Rating",
				"Color Picker",
				"Checkbox Group",
				"Progress Bar",
				"Extensible Renderers",
			]}
			schema={schema}
		>
			<div className="flex flex-col gap-4">
				<CustomFieldsCard {...{ form, fields, optionsByPath, onChange }} />
				<FormDataCard formData={formData} />
			</div>
		</DemoShell>
	);
}

function CustomFieldsCard({ form, fields, optionsByPath, onChange }: Omit<CustomRenderersViewProps, "formData">) {
	return (
		<Card className="border-border">
			<CardHeader>
				<CardTitle className="text-foreground">Custom Widget Form</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="flex flex-col gap-5">
					{fields.map((field) => (
						<CustomField
							key={field.path}
							form={form}
							field={field}
							preparedOptions={optionsByPath.get(field.path)}
							onChange={onChange}
						/>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function FormDataCard({ formData }: Pick<CustomRenderersViewProps, "formData">) {
	return (
		<Card className="border-border">
			<CardHeader className="pb-2">
				<CardTitle className="text-sm text-foreground">Form Data (JSON)</CardTitle>
			</CardHeader>
			<CardContent>
				<pre className="rounded-md bg-surface-inset p-3 text-xs text-code-foreground overflow-auto max-h-48 border border-border-muted font-mono">
					{JSON.stringify(formData, null, 2)}
				</pre>
			</CardContent>
		</Card>
	);
}

export function CustomRenderersDemo() {
	const { form, fields, optionsByPath } = useSchemaForm(schema, {
		initialData: {
			qualityRating: 0,
			userSatisfaction: 0,
			brandColor: "",
			accentColor: "",
			completionRate: 0,
			tags: "",
			notes: "",
			productName: "",
		} as Record<string, unknown>,
	});
	const [formData, setFormData] = useState<Record<string, unknown>>({});

	useEffect(() => {
		return form.subscribe(() => {
			setFormData({ ...(form.getState().data as Record<string, unknown>) });
		});
	}, [form]);

	const handleChange = useCallback((path: string, value: unknown) => {
		console.log("change", path, value);
	}, []);

	return <CustomRenderersView {...{ form, fields, optionsByPath, formData, onChange: handleChange }} />;
}
