import { spawnSync } from "node:child_process";
import { GithubApi } from "./github";
import type { Candidate, NpmVersion, ReleaseReader, ReleaseWriter } from "./types";

export async function npmVersion(name: string, version: string): Promise<NpmVersion> {
	const encoded = encodeURIComponent(name);
	const response = await fetch(`https://registry.npmjs.org/${encoded}/${encodeURIComponent(version)}`);
	if (response.status === 404) return { exists: false };
	if (!response.ok) throw new Error(`npm lookup failed for ${name}@${version} (${response.status})`);
	const metadata = (await response.json()) as { gitHead?: string };
	return metadata.gitHead ? { exists: true, gitHead: metadata.gitHead } : { exists: true };
}

function git(args: string[]): void {
	const result = spawnSync("git", args, { stdio: "inherit" });
	if (result.status !== 0) throw new Error(`git ${args[0]} failed`);
}

function gitOutput(args: string[]): string | undefined {
	const result = spawnSync("git", args, { encoding: "utf8" });
	if (result.status !== 0) return undefined;
	return result.stdout.trim();
}

function validateLocalTag(candidate: Candidate): boolean {
	const ref = `refs/tags/${candidate.tag}`;
	if (!gitOutput(["rev-parse", "--verify", ref])) return false;
	if (gitOutput(["cat-file", "-t", ref]) !== "tag") throw new Error(`${candidate.tag} is a local lightweight tag`);
	if (gitOutput(["rev-parse", `${ref}^{commit}`]) !== candidate.releaseCommit) {
		throw new Error(`${candidate.tag} local tag targets a conflicting commit`);
	}
	return true;
}

export class LiveServices implements ReleaseReader, ReleaseWriter {
	readonly #github: GithubApi;

	constructor(repository: string) {
		this.#github = new GithubApi(repository);
	}

	npmVersion = npmVersion;
	tag = (tag: string) => this.#github.tag(tag);
	release = (tag: string) => this.#github.release(tag);
	async preflightLocalTag(candidate: Candidate): Promise<void> {
		validateLocalTag(candidate);
	}

	async createLocalTag(candidate: Candidate): Promise<void> {
		if (validateLocalTag(candidate)) return;
		git(["tag", "-a", candidate.tag, candidate.releaseCommit, "-m", candidate.tag]);
	}

	async pushTagsAtomically(tags: string[]): Promise<void> {
		if (tags.length > 0) git(["push", "--atomic", "origin", ...tags.map((tag) => `refs/tags/${tag}`)]);
	}

	async createRelease(candidate: Candidate): Promise<void> {
		await this.#github.createRelease(
			candidate.tag,
			`${candidate.name} ${candidate.version}`,
			candidate.notes,
			candidate.prerelease,
			candidate.releaseCommit,
		);
	}
}
