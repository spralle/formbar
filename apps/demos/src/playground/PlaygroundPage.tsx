import { type Dispatch, type RefObject, type SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import type { DemoFormSnapshot } from "../renderers/DemoFormRoot";
import { Button } from "../ui";
import { PlaygroundRunner } from "./PlaygroundRunner";
import { PreviewErrorBoundary } from "./PreviewErrorBoundary";
import { SourceEditor } from "./SourceEditor";
import { StateInspector } from "./StateInspector";
import type { PlaygroundPreset, SourceKey } from "./contracts";
import { SOURCE_KEYS, formatJson, stringifyDocument } from "./document";
import { getCompatibility, getPreset } from "./presets";
import { applySources, createPlaygroundSession, resetLiveForm, resetSession, updateSource } from "./session";
import { type StoredDraft, discardDraft, loadDraft, saveDraft } from "./storage";

interface PlaygroundPageProps {
	readonly demoId: string;
	readonly variant?: string;
	readonly onClose: () => void;
	readonly onPresetChange: (variant: string) => void;
}

type Session = ReturnType<typeof createPlaygroundSession>;
type SessionSetter = Dispatch<SetStateAction<Session>>;
type SnapshotSetter = Dispatch<SetStateAction<DemoFormSnapshot | null>>;
const buttonClass = "border-border bg-secondary text-secondary-foreground hover:bg-accent";

function isDirty(preset: PlaygroundPreset, sources: Session["sources"]): boolean {
	const baseline = stringifyDocument(preset.document);
	return SOURCE_KEYS.some((key) => sources[key] !== baseline[key]);
}

function announce(
	message: string,
	setStatus: Dispatch<SetStateAction<string>>,
	ref: RefObject<HTMLOutputElement | null>,
) {
	setStatus(message);
	window.setTimeout(() => ref.current?.focus(), 0);
}

function downloadDocument(preset: PlaygroundPreset, document: PlaygroundPreset["document"]): void {
	const blob = new Blob([formatJson(document)], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const anchor = window.document.createElement("a");
	anchor.href = url;
	anchor.download = `formbar-${preset.demoId}-${preset.variant}.json`;
	anchor.click();
	URL.revokeObjectURL(url);
}

function applyAction(
	session: Session,
	setSession: SessionSetter,
	setSnapshot: SnapshotSetter,
	notify: (value: string) => void,
) {
	const next = applySources(session);
	setSession(next);
	if (next.revision === session.revision) {
		notify("Apply failed. Review source errors; the last preview is still running.");
		return;
	}
	setSnapshot(null);
	notify(`Applied all sources atomically. Preview revision ${next.revision}.`);
}

function formatAction(session: Session, active: SourceKey, setSession: SessionSetter, notify: (value: string) => void) {
	try {
		setSession(updateSource(session, active, formatJson(JSON.parse(session.sources[active]))));
		notify(`${active} formatted.`);
	} catch (error) {
		notify(`Cannot format ${active}: ${error instanceof Error ? error.message : "invalid JSON"}`);
	}
}

async function copyAction(source: string, active: SourceKey, notify: (value: string) => void) {
	try {
		await navigator.clipboard.writeText(source);
		notify(`${active} copied.`);
	} catch {
		notify("Clipboard access was unavailable.");
	}
}

function useDraftPersistence(preset: PlaygroundPreset, session: Session, dirty: boolean, offer: StoredDraft | null) {
	const [saveFailed, setSaveFailed] = useState(false);
	useEffect(() => {
		if (!dirty || offer) return;
		const timer = window.setTimeout(
			() => setSaveFailed(!saveDraft(window.localStorage, preset.key, session.sources)),
			500,
		);
		return () => window.clearTimeout(timer);
	}, [dirty, offer, preset.key, session.sources]);
	return saveFailed;
}

function usePlaygroundController(preset: PlaygroundPreset) {
	const [session, setSession] = useState(() => createPlaygroundSession(preset.document));
	const [active, setActive] = useState<SourceKey>("schema");
	const [snapshot, setSnapshot] = useState<DemoFormSnapshot | null>(null);
	const [status, setStatus] = useState("Preset loaded. Preview session is fresh.");
	const [offer, setOffer] = useState(() => loadDraft(window.localStorage, preset.key));
	const statusRef = useRef<HTMLOutputElement>(null);
	const baseline = useMemo(() => stringifyDocument(preset.document), [preset]);
	const dirty = isDirty(preset, session.sources);
	const saveFailed = useDraftPersistence(preset, session, dirty, offer);
	const notify = (message: string) => announce(message, setStatus, statusRef);
	const apply = () => applyAction(session, setSession, setSnapshot, notify);
	const resetPreset = () => {
		if (dirty && !window.confirm("Discard editor changes and reset this preset?")) return;
		setSession(resetSession(session, preset.document));
		setSnapshot(null);
		discardDraft(window.localStorage, preset.key);
		notify("Preset and live preview reset to a fresh session.");
	};
	const restore = () => {
		if (!offer) return;
		setSession({ ...session, sources: offer.sources, errors: {} });
		setOffer(null);
		notify("Draft restored to editors only. Apply when ready to update the preview.");
	};
	const discard = () => {
		discardDraft(window.localStorage, preset.key);
		setOffer(null);
		notify("Saved draft discarded.");
	};
	return {
		session,
		setSession,
		active,
		setActive,
		snapshot,
		setSnapshot,
		status,
		statusRef,
		baseline,
		saveFailed,
		offer,
		notify,
		apply,
		resetPreset,
		restore,
		discard,
	};
}

export function PlaygroundPage(props: PlaygroundPageProps) {
	const compatibility = getCompatibility(props.demoId);
	const preset = getPreset(props.demoId, props.variant);
	if (!preset) {
		return (
			<UnsupportedPlayground reason={compatibility.reason ?? "This demo is not compatible."} onClose={props.onClose} />
		);
	}
	return <SupportedPlayground key={preset.key} {...props} preset={preset} />;
}

function UnsupportedPlayground({ reason, onClose }: { readonly reason: string; readonly onClose: () => void }) {
	return (
		<main className="min-h-screen p-6 md:p-10">
			<Button className={buttonClass} onClick={onClose}>
				← Back to demo
			</Button>
			<section className="mx-auto mt-12 max-w-2xl rounded-lg border border-warning bg-warning-background p-6">
				<h1 className="text-xl font-bold">Playground unavailable</h1>
				<p className="mt-3 text-sm text-muted-foreground">{reason}</p>
			</section>
		</main>
	);
}

function DraftOffer(props: {
	readonly draft: StoredDraft;
	readonly onRestore: () => void;
	readonly onDiscard: () => void;
}) {
	return (
		<output className="flex flex-wrap items-center gap-2 border-b border-info bg-info-background px-4 py-2 text-sm">
			<span className="mr-auto">A saved draft from {new Date(props.draft.savedAt).toLocaleString()} is available.</span>
			<Button className={buttonClass} onClick={props.onRestore}>
				Restore draft
			</Button>
			<Button className={buttonClass} onClick={props.onDiscard}>
				Discard draft
			</Button>
		</output>
	);
}

function PlaygroundHeader(props: PlaygroundPageProps & { readonly preset: PlaygroundPreset }) {
	const variants = getCompatibility(props.preset.demoId).presets;
	return (
		<header className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-3">
			<Button className={buttonClass} onClick={props.onClose}>
				← Demo
			</Button>
			<div className="mr-auto">
				<h1 className="font-bold">JSON playground · {props.preset.demoId}</h1>
				<p className="text-xs text-muted-foreground">
					Private demos-app tool · document v{props.preset.document.version}
				</p>
			</div>
			{variants.length > 1 && (
				<label className="text-xs text-muted-foreground">
					Preset{" "}
					<select
						value={props.preset.variant}
						onChange={(event) => props.onPresetChange(event.target.value)}
						className="rounded border border-input bg-surface px-2 py-1 text-foreground"
					>
						{variants.map((item) => (
							<option key={item.key} value={item.variant}>
								{item.label}
							</option>
						))}
					</select>
				</label>
			)}
		</header>
	);
}

function PlaygroundToolbar(props: {
	readonly onApply: () => void;
	readonly onFormat: () => void;
	readonly onResetPreset: () => void;
	readonly onResetForm: () => void;
	readonly onCopy: () => void;
	readonly onDownload: () => void;
}) {
	return (
		<div className="flex flex-wrap gap-2 border-b border-border bg-card px-4 py-2">
			<Button className="border-primary bg-primary text-primary-foreground" onClick={props.onApply}>
				Apply <span className="opacity-70">⌘/Ctrl+Enter</span>
			</Button>
			<Button className={buttonClass} onClick={props.onFormat}>
				Format active
			</Button>
			<Button className={buttonClass} onClick={props.onResetPreset}>
				Reset preset
			</Button>
			<Button className={buttonClass} onClick={props.onResetForm}>
				Reset live form
			</Button>
			<Button className={buttonClass} onClick={props.onCopy}>
				Copy active
			</Button>
			<Button className={buttonClass} onClick={props.onDownload}>
				Download applied
			</Button>
		</div>
	);
}

function SupportedPlayground(props: PlaygroundPageProps & { readonly preset: PlaygroundPreset }) {
	const state = usePlaygroundController(props.preset);
	const resetForm = () => {
		state.setSnapshot(null);
		state.setSession(resetLiveForm(state.session));
		state.notify("Live form reset from the last successfully applied document.");
	};
	return (
		<main className="flex min-h-screen flex-col bg-background">
			<PlaygroundHeader {...props} />
			{props.preset.warning && (
				<p className="border-b border-warning bg-warning-background px-4 py-2 text-sm text-warning">
					Partial preview: {props.preset.warning}
				</p>
			)}
			{state.offer && <DraftOffer draft={state.offer} onRestore={state.restore} onDiscard={state.discard} />}
			<PlaygroundToolbar
				onApply={state.apply}
				onFormat={() => formatAction(state.session, state.active, state.setSession, state.notify)}
				onResetPreset={state.resetPreset}
				onResetForm={resetForm}
				onCopy={() => copyAction(state.session.sources[state.active], state.active, state.notify)}
				onDownload={() => downloadDocument(props.preset, state.session.applied)}
			/>
			<output ref={state.statusRef} aria-live="polite" tabIndex={-1} className="sr-only">
				{state.saveFailed ? "Draft could not be saved." : state.status}
			</output>
			<PlaygroundWorkspace state={state} />
		</main>
	);
}

function PlaygroundWorkspace({ state }: { readonly state: ReturnType<typeof usePlaygroundController> }) {
	return (
		<div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-2">
			<section
				aria-label="JSON editors"
				className="flex min-h-[32rem] min-w-0 flex-col border-b border-border xl:border-b-0 xl:border-r"
			>
				<SourceEditor
					active={state.active}
					sources={state.session.sources}
					baseline={state.baseline}
					errors={state.session.errors}
					onActiveChange={state.setActive}
					onChange={(value) => state.setSession(updateSource(state.session, state.active, value))}
					onApply={state.apply}
				/>
			</section>
			<section aria-label="Live preview" className="min-w-0 overflow-auto p-4">
				<PreviewErrorBoundary key={`boundary-${state.session.revision}`}>
					<PlaygroundRunner
						key={`runner-${state.session.revision}`}
						document={state.session.applied}
						onSnapshot={state.setSnapshot}
					/>
				</PreviewErrorBoundary>
				<StateInspector snapshot={state.snapshot} />
			</section>
		</div>
	);
}
