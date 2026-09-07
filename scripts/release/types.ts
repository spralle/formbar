export interface WorkspaceRelease {
	name: string;
	version: string;
	directory: string;
	tag: string;
	notes: string;
	prerelease: boolean;
}

export interface Candidate extends WorkspaceRelease {
	releaseCommit: string;
	tagAction: "create" | "none";
	releaseAction: "create" | "none";
}

export interface ReleasePlan {
	schemaVersion: 1;
	repository: string;
	releaseCommit: string;
	candidates: Candidate[];
}

export interface NpmVersion {
	exists: boolean;
	gitHead?: string;
}

export type TagState =
	| { kind: "absent" }
	| { kind: "annotated"; target: string; message: string }
	| { kind: "lightweight"; target: string };

export type GithubReleaseState =
	| { kind: "absent" }
	| { kind: "draft"; name: string; body: string; prerelease: boolean }
	| { kind: "present"; name: string; body: string; prerelease: boolean };

export interface ReleaseReader {
	npmVersion(name: string, version: string): Promise<NpmVersion>;
	tag(tag: string): Promise<TagState>;
	release(tag: string): Promise<GithubReleaseState>;
}

export interface ReleaseWriter {
	preflightLocalTag(candidate: Candidate): Promise<void>;
	createLocalTag(candidate: Candidate): Promise<void>;
	pushTagsAtomically(tags: string[]): Promise<void>;
	createRelease(candidate: Candidate): Promise<void>;
}
