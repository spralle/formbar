export const PLAYGROUND_DOCUMENT_VERSION = 1 as const;
export const SOURCE_LIMIT_BYTES = 200_000;
export const TOTAL_LIMIT_BYTES = 500_000;

export const SOURCE_KEYS = ["schema", "layout", "rules", "initialData", "initialUiState"] as const;
export type SourceKey = (typeof SOURCE_KEYS)[number];

export interface PlaygroundDocument {
	readonly version: typeof PLAYGROUND_DOCUMENT_VERSION;
	readonly schema: Record<string, unknown>;
	readonly layout: Record<string, unknown> | null;
	readonly rules: readonly unknown[];
	readonly initialData: Record<string, unknown>;
	readonly initialUiState: Record<string, unknown>;
}

export type PlaygroundSources = Record<SourceKey, string>;
export type SourceErrors = Partial<Record<SourceKey, string>>;

export interface PlaygroundPreset {
	readonly key: string;
	readonly demoId: string;
	readonly variant: string;
	readonly label: string;
	readonly support: "full" | "partial";
	readonly warning?: string;
	readonly document: PlaygroundDocument;
}

export interface DemoCompatibility {
	readonly demoId: string;
	readonly support: "full" | "partial" | "unsupported";
	readonly reason?: string;
	readonly presets: readonly PlaygroundPreset[];
}
