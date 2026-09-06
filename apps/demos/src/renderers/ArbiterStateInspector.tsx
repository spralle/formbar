import { cn } from "../ui";

interface ArbiterStateInspectorProps {
	readonly data: unknown;
	readonly uiState: unknown;
	readonly dataClassName?: string;
}

function JsonState({
	title,
	value,
	className,
}: { readonly title: string; readonly value: unknown; readonly className?: string }) {
	return (
		<div className={cn("rounded-md bg-surface-inset border border-border-muted p-3", className)}>
			<p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
			<pre className="text-xs text-code-foreground font-mono">{JSON.stringify(value, null, 2)}</pre>
		</div>
	);
}

export function ArbiterStateInspector({ data, uiState, dataClassName }: ArbiterStateInspectorProps) {
	return (
		<>
			<JsonState title="Form Data" value={data} className={dataClassName} />
			<JsonState title="UI State" value={uiState} />
		</>
	);
}
