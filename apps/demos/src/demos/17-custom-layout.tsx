import type { FormbarOption, LayoutNode, SchemaFieldInfo } from "@formbar/from-schema";
import { isSectionNode } from "@formbar/from-schema";
import { useSchemaForm } from "@formbar/react-schema";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DemoFormField } from "../renderers/DemoFormField";
import { DemoShell } from "../renderers/DemoShell";
import type { DemoFormApi } from "../renderers/demo-form-api";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "../ui";

const schema = {
	type: "object",
	required: ["vesselName", "inspectorName"],
	properties: {
		vesselName: { type: "string", title: "Vessel Name" },
		inspectorName: { type: "string", title: "Inspector Name" },
		inspectionDate: { type: "string", title: "Inspection Date" },
		hullCondition: { type: "string", title: "Hull Condition", enum: ["Excellent", "Good", "Fair", "Poor", "Critical"] },
		hullNotes: { type: "string", title: "Hull Notes", "x-formbar": { widget: "textarea" } },
		engineStatus: {
			type: "string",
			title: "Engine Status",
			enum: ["Operational", "Needs Maintenance", "Out of Service"],
		},
		engineHours: { type: "integer", title: "Engine Hours", minimum: 0, maximum: 100000 },
		fuelLevel: { type: "integer", title: "Fuel Level (%)", minimum: 0, maximum: 100 },
		safetyEquipment: { type: "boolean", title: "Safety Equipment Present" },
		fireExtinguishers: { type: "boolean", title: "Fire Extinguishers Inspected" },
		lifeboats: { type: "boolean", title: "Lifeboats Operational" },
		overallScore: { type: "integer", title: "Overall Score", minimum: 1, maximum: 10 },
		recommendation: { type: "string", title: "Recommendation", enum: ["Approved", "Conditional", "Rejected"] },
		comments: { type: "string", title: "Comments", "x-formbar": { widget: "textarea" } },
	},
};

type LayoutMode = "sections" | "tabs" | "accordion";

// Shared field definitions per section to avoid repetition across layouts
const sectionDefs = [
	{
		id: "general",
		title: "General Information",
		tabTitle: "General",
		paths: ["vesselName", "inspectorName", "inspectionDate"],
	},
	{ id: "hull", title: "Hull Inspection", tabTitle: "Hull", paths: ["hullCondition", "hullNotes"] },
	{ id: "engine", title: "Engine & Fuel", tabTitle: "Engine", paths: ["engineStatus", "engineHours", "fuelLevel"] },
	{
		id: "safety",
		title: "Safety Equipment",
		tabTitle: "Safety",
		paths: ["safetyEquipment", "fireExtinguishers", "lifeboats"],
	},
	{ id: "summary", title: "Summary", tabTitle: "Summary", paths: ["overallScore", "recommendation", "comments"] },
] as const;

function buildFieldChildren(paths: readonly string[]): LayoutNode[] {
	return paths.map((p) => ({ type: "field" as const, id: `f-${p}`, path: p }));
}

function buildSections(titleKey: "title" | "tabTitle"): LayoutNode[] {
	return sectionDefs.map((s) => ({
		type: "section" as const,
		id: s.id,
		props: { title: s[titleKey] },
		children: buildFieldChildren(s.paths),
	}));
}

const sectionsLayout: LayoutNode = {
	type: "group",
	id: "root",
	children: buildSections("title"),
};

const tabsLayout: LayoutNode = {
	type: "tabs",
	id: "root",
	children: buildSections("tabTitle"),
};

const accordionLayout: LayoutNode = {
	type: "accordion",
	id: "root",
	children: buildSections("title"),
};

const layouts: Record<LayoutMode, LayoutNode> = {
	sections: sectionsLayout,
	tabs: tabsLayout,
	accordion: accordionLayout,
};

const RENDERER_CODE = `function renderCustomNode(node, form, fieldMap, optionsByPath, onChange) {
  if (node.type === 'field' && node.path) {
    const field = fieldMap.get(node.path);
    return <DemoFormField form={form} field={field} options={optionsByPath.get(field.path)} onChange={onChange} />;
  }

  if (node.type === 'section') {
    return (
      <div className="flex flex-col gap-3">
        <h3>{node.props?.title}</h3>
        <div className="grid grid-cols-2 gap-4">
          {node.children?.map(child => renderCustomNode(child, ...))}
        </div>
      </div>
    );
  }

  if (node.type === 'tabs') {
    return (
      <Tabs defaultValue={node.children?.[0]?.id}>
        <TabsList>
          {node.children?.map(s => (
            <TabsTrigger value={s.id}>{s.props?.title}</TabsTrigger>
          ))}
        </TabsList>
        {node.children?.map(child => (
          <TabsContent value={child.id}>
            {renderCustomNode(child, ...)}
          </TabsContent>
        ))}
      </Tabs>
    );
  }

  if (node.type === 'accordion') {
    return (
      <Accordion type="multiple">
        {node.children?.map(child => (
          <AccordionItem value={child.id}>
            <AccordionTrigger>{child.props?.title}</AccordionTrigger>
            <AccordionContent>
              {renderCustomNode(child, ...)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
  }

  // Fallback: stack children vertically
  return <div>{node.children?.map(child => renderCustomNode(child, ...))}</div>;
}`;

interface CustomLayoutRenderContext {
	readonly form: DemoFormApi;
	readonly fieldMap: Map<string, SchemaFieldInfo>;
	readonly optionsByPath: ReadonlyMap<string, readonly FormbarOption[]>;
	readonly onChange: (path: string, value: unknown) => void;
}

function renderCustomNode(node: LayoutNode, context: CustomLayoutRenderContext): React.ReactNode {
	if (node.type === "field" && node.path) {
		const field = context.fieldMap.get(node.path);
		if (!field) return null;
		return (
			<DemoFormField
				key={node.id}
				form={context.form}
				field={field}
				options={context.optionsByPath.get(field.path)}
				onChange={context.onChange}
			/>
		);
	}
	if (isSectionNode(node)) return renderCustomSection(node, context);
	if (node.type === "tabs") return renderCustomTabs(node, context);
	if (node.type === "accordion") return renderCustomAccordion(node, context);
	return (
		<div key={node.id} className="flex flex-col gap-4">
			{node.children?.map((child) => renderCustomNode(child, context))}
		</div>
	);
}

function renderCustomSection(node: LayoutNode, context: CustomLayoutRenderContext): React.ReactNode {
	const title = isSectionNode(node) ? node.props?.title : undefined;
	return (
		<div key={node.id} className="flex flex-col gap-3">
			{title && <h3 className="text-sm font-semibold text-foreground border-b border-border pb-1">{title}</h3>}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				{node.children?.map((child) => renderCustomNode(child, context))}
			</div>
		</div>
	);
}

function renderCustomTabs(node: LayoutNode, context: CustomLayoutRenderContext): React.ReactNode {
	return (
		<Tabs defaultValue={node.children?.[0]?.id}>
			<TabsList>
				{node.children?.map((section) => (
					<TabsTrigger key={section.id} value={section.id}>
						{(isSectionNode(section) ? section.props?.title : undefined) ?? section.id}
					</TabsTrigger>
				))}
			</TabsList>
			{node.children?.map((child) => (
				<TabsContent key={child.id} value={child.id} className="pt-4">
					{renderCustomNode(child, context)}
				</TabsContent>
			))}
		</Tabs>
	);
}

function renderCustomAccordion(node: LayoutNode, context: CustomLayoutRenderContext): React.ReactNode {
	return (
		<Accordion type="multiple" defaultValue={[node.children?.[0]?.id ?? ""]}>
			{node.children?.map((child) => (
				<AccordionItem key={child.id} value={child.id}>
					<AccordionTrigger>{(isSectionNode(child) ? child.props?.title : undefined) ?? child.id}</AccordionTrigger>
					<AccordionContent>{renderCustomNode(child, context)}</AccordionContent>
				</AccordionItem>
			))}
		</Accordion>
	);
}

interface CustomLayoutViewProps {
	readonly mode: LayoutMode;
	readonly activeLayout: LayoutNode;
	readonly renderContext: CustomLayoutRenderContext;
	readonly formData: Record<string, unknown>;
	readonly onModeChange: (mode: LayoutMode) => void;
}

function CustomLayoutView(props: CustomLayoutViewProps) {
	return (
		<DemoShell
			title="Custom Layout Types"
			description="The same vessel inspection schema rendered via three different LayoutNode JSON trees: sections (group), tabs, and accordion. The layout JSON drives the rendering — swap the tree, change the UX."
			motivation="Demonstrates that formbar's layout system is extensible via custom node types. Define layout as JSON data, then interpret it with a custom renderer. Teams can build domain-specific form chrome without modifying the core."
			features={[
				"LayoutNode JSON Trees",
				"Custom Node Types (tabs, accordion)",
				"Layout-Driven Rendering",
				"Mode Switching",
				"Same Schema, Different UX",
			]}
			schema={schema}
			layout={props.activeLayout}
			codeBlocks={[{ title: "Renderer (TSX)", code: RENDERER_CODE }]}
		>
			<div className="flex flex-col gap-4">
				<LayoutFormCard {...props} />
				<LayoutFormDataCard formData={props.formData} />
			</div>
		</DemoShell>
	);
}

function LayoutFormCard({ mode, activeLayout, renderContext, onModeChange }: CustomLayoutViewProps) {
	return (
		<Card className="border-border">
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="text-foreground">Vessel Inspection</CardTitle>
					<div className="flex gap-1">
						{(["sections", "tabs", "accordion"] as const).map((candidate) => (
							<Button
								key={candidate}
								variant={mode === candidate ? "default" : "outline"}
								size="sm"
								onClick={() => onModeChange(candidate)}
							>
								{candidate.charAt(0).toUpperCase() + candidate.slice(1)}
							</Button>
						))}
					</div>
				</div>
			</CardHeader>
			<CardContent>{renderCustomNode(activeLayout, renderContext)}</CardContent>
		</Card>
	);
}

function LayoutFormDataCard({ formData }: Pick<CustomLayoutViewProps, "formData">) {
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

export function CustomLayoutTypesDemo() {
	const { form, fields, optionsByPath } = useSchemaForm(schema, { initialData: {} as Record<string, unknown> });
	const [mode, setMode] = useState<LayoutMode>("sections");
	const [formData, setFormData] = useState<Record<string, unknown>>({});

	const fieldMap = useMemo(() => {
		const map = new Map<string, SchemaFieldInfo>();
		for (const f of fields) map.set(f.path, f);
		return map;
	}, [fields]);

	const activeLayout = layouts[mode];

	useEffect(() => {
		return form.subscribe(() => {
			setFormData({ ...(form.getState().data as Record<string, unknown>) });
		});
	}, [form]);

	const handleChange = useCallback((path: string, value: unknown) => {
		console.log("change", path, value);
	}, []);
	const renderContext = { form, fieldMap, optionsByPath, onChange: handleChange };

	return (
		<CustomLayoutView
			mode={mode}
			activeLayout={activeLayout}
			renderContext={renderContext}
			formData={formData}
			onModeChange={setMode}
		/>
	);
}
