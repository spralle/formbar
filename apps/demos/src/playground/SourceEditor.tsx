import { type KeyboardEvent, useRef } from "react";
import type { PlaygroundSources, SourceErrors, SourceKey } from "./contracts";

const SOURCE_LABELS: Record<SourceKey, string> = {
	schema: "Schema",
	layout: "Layout",
	rules: "Rules",
	initialData: "Initial Data",
	initialUiState: "UI State",
};

interface SourceEditorProps {
	readonly active: SourceKey;
	readonly sources: PlaygroundSources;
	readonly baseline: PlaygroundSources;
	readonly errors: SourceErrors;
	readonly onActiveChange: (key: SourceKey) => void;
	readonly onChange: (value: string) => void;
	readonly onApply: () => void;
}

const SOURCE_KEYS = Object.keys(SOURCE_LABELS) as SourceKey[];

function nextTab(current: SourceKey, direction: number): SourceKey {
	const currentIndex = SOURCE_KEYS.indexOf(current);
	return SOURCE_KEYS[(currentIndex + direction + SOURCE_KEYS.length) % SOURCE_KEYS.length];
}

export function SourceEditor(props: SourceEditorProps) {
	const { active, sources, baseline, errors, onActiveChange, onChange, onApply } = props;
	const tabRefs = useRef<Partial<Record<SourceKey, HTMLButtonElement>>>({});
	const handleTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
		if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
		event.preventDefault();
		const next = nextTab(active, event.key === "ArrowRight" ? 1 : -1);
		onActiveChange(next);
		window.setTimeout(() => tabRefs.current[next]?.focus(), 0);
	};
	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div role="tablist" aria-label="Document sources" className="flex flex-wrap border-b border-border">
				{SOURCE_KEYS.map((key) => {
					const dirty = sources[key] !== baseline[key];
					return (
						<button
							key={key}
							ref={(element) => {
								if (element) tabRefs.current[key] = element;
							}}
							type="button"
							role="tab"
							aria-selected={active === key}
							aria-controls={`source-panel-${key}`}
							tabIndex={active === key ? 0 : -1}
							onKeyDown={handleTabKey}
							onClick={() => onActiveChange(key)}
							className={`px-3 py-2 text-xs font-medium ${active === key ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
						>
							{SOURCE_LABELS[key]} {dirty ? "●" : ""} {errors[key] ? "⚠" : ""}
						</button>
					);
				})}
			</div>
			<div id={`source-panel-${active}`} role="tabpanel" className="flex min-h-0 flex-1 flex-col p-3">
				<label htmlFor={`source-${active}`} className="mb-2 text-xs font-semibold text-muted-foreground">
					{SOURCE_LABELS[active]} — strict JSON
				</label>
				<textarea
					id={`source-${active}`}
					value={sources[active]}
					onChange={(event) => onChange(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
							event.preventDefault();
							onApply();
						}
					}}
					spellCheck={false}
					aria-invalid={Boolean(errors[active])}
					aria-describedby={errors[active] ? `source-error-${active}` : undefined}
					className="min-h-80 flex-1 resize-y rounded-md border border-input bg-surface-inset p-3 font-mono text-xs text-code-foreground outline-none focus:ring-2 focus:ring-ring"
				/>
				{errors[active] && (
					<p id={`source-error-${active}`} role="alert" tabIndex={-1} className="mt-2 text-xs text-destructive">
						{errors[active]}
					</p>
				)}
			</div>
		</div>
	);
}
