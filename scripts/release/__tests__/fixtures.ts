import type {
	Candidate,
	GithubReleaseState,
	NpmVersion,
	ReleasePlan,
	ReleaseReader,
	ReleaseWriter,
	TagState,
	WorkspaceRelease,
} from "../types";

export const sha = "a".repeat(40);

export const workspace: WorkspaceRelease = {
	name: "@scope/pkg",
	version: "1.2.3",
	directory: "packages/pkg",
	tag: "@scope/pkg@1.2.3",
	notes: "### Patch Changes\n\n- Fixed it.",
	prerelease: false,
};

export const candidate: Candidate = {
	...workspace,
	releaseCommit: sha,
	tagAction: "create",
	releaseAction: "create",
};

export const plan: ReleasePlan = {
	schemaVersion: 1,
	repository: "owner/repo",
	releaseCommit: sha,
	candidates: [candidate],
};

export class FakeServices implements ReleaseReader, ReleaseWriter {
	npm: NpmVersion = { exists: false };
	tags = new Map<string, TagState>();
	releases = new Map<string, GithubReleaseState>();
	events: string[] = [];

	npmVersion = async () => this.npm;
	tag = async (tag: string) => this.tags.get(tag) ?? { kind: "absent" as const };
	release = async (tag: string) => this.releases.get(tag) ?? { kind: "absent" as const };
	async preflightLocalTag(): Promise<void> {}

	async createLocalTag(item: Candidate): Promise<void> {
		this.events.push(`local:${item.tag}`);
	}

	async pushTagsAtomically(tags: string[]): Promise<void> {
		this.events.push(`push:${tags.join(",")}`);
		for (const tag of tags) {
			this.tags.set(tag, { kind: "annotated", target: sha, message: tag });
		}
	}

	async createRelease(item: Candidate): Promise<void> {
		this.events.push(`release:${item.tag}`);
		this.releases.set(item.tag, {
			kind: "present",
			name: `${item.name} ${item.version}`,
			body: item.notes,
			prerelease: item.prerelease,
		});
	}
}
