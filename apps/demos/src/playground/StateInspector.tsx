import type { DemoFormSnapshot } from "../renderers/DemoFormRoot";

interface StateInspectorProps {
	readonly snapshot: DemoFormSnapshot | null;
}

function InspectorBlock({ title, value }: { readonly title: string; readonly value: unknown }) {
	return (
		<details className="rounded-md border border-border-muted bg-surface-inset" open={title === "Live data"}>
			<summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-muted-foreground">{title}</summary>
			<pre className="max-h-48 overflow-auto border-t border-border-muted p-3 text-xs text-code-foreground">
				{JSON.stringify(value, null, 2)}
			</pre>
		</details>
	);
}

export function StateInspector({ snapshot }: StateInspectorProps) {
	if (!snapshot) return <p className="text-sm text-muted-foreground">Starting fresh form session…</p>;
	return (
		<section aria-label="Live form state" className="mt-4 grid gap-2 md:grid-cols-2">
			<InspectorBlock title="Live data" value={snapshot.state.data} />
			<InspectorBlock title="Live UI state" value={snapshot.state.uiState} />
			<InspectorBlock title="Issues" value={snapshot.state.issues} />
			<InspectorBlock title="Schema warnings" value={snapshot.warnings} />
			<InspectorBlock title="Schema metadata" value={snapshot.metadata} />
		</section>
	);
}
