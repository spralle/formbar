import type { GithubReleaseState, TagState } from "./types";

interface ApiObject {
	sha: string;
	type: string;
}

export class GithubApi {
	readonly #repository: string;
	readonly #token: string;

	constructor(repository: string, token = process.env.GITHUB_TOKEN ?? "") {
		if (!token) throw new Error("GITHUB_TOKEN is required");
		this.#repository = repository;
		this.#token = token;
	}

	async #request(path: string, init?: RequestInit): Promise<Response> {
		return fetch(`https://api.github.com/repos/${this.#repository}${path}`, {
			...init,
			headers: {
				Accept: "application/vnd.github+json",
				Authorization: `Bearer ${this.#token}`,
				"X-GitHub-Api-Version": "2022-11-28",
				"Content-Type": "application/json",
			},
		});
	}

	async tag(tag: string): Promise<TagState> {
		const response = await this.#request(`/git/ref/tags/${encodeURIComponent(tag)}`);
		if (response.status === 404) return { kind: "absent" };
		if (!response.ok) throw new Error(`GitHub tag lookup failed (${response.status})`);
		const ref = (await response.json()) as { object: ApiObject };
		if (ref.object.type !== "tag") return { kind: "lightweight", target: ref.object.sha };

		const tagResponse = await this.#request(`/git/tags/${ref.object.sha}`);
		if (!tagResponse.ok) throw new Error(`GitHub annotated tag lookup failed (${tagResponse.status})`);
		const object = (await tagResponse.json()) as { object: ApiObject; message: string };
		if (object.object.type !== "commit") return { kind: "lightweight", target: object.object.sha };
		return { kind: "annotated", target: object.object.sha, message: object.message };
	}

	async release(tag: string): Promise<GithubReleaseState> {
		const response = await this.#request(`/releases/tags/${encodeURIComponent(tag)}`);
		if (response.status === 404) return { kind: "absent" };
		if (!response.ok) throw new Error(`GitHub release lookup failed (${response.status})`);
		const release = (await response.json()) as { name: string | null; body: string | null; prerelease: boolean };
		return { kind: "present", name: release.name ?? "", body: release.body ?? "", prerelease: release.prerelease };
	}

	async createRelease(tag: string, name: string, body: string, prerelease: boolean, target: string): Promise<void> {
		const response = await this.#request("/releases", {
			method: "POST",
			body: JSON.stringify({ tag_name: tag, name, body, prerelease, target_commitish: target }),
		});
		if (!response.ok) throw new Error(`GitHub release creation failed (${response.status})`);
	}
}
