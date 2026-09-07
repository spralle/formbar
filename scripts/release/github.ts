import type { GithubReleaseState, TagState } from "./types";
import { expectBoolean, expectObject, expectString, readJsonResponse } from "./validation";

interface ApiObject {
	sha: string;
	type: string;
}

interface ReleaseSummary {
	tag: string;
	draft: boolean;
	name: string;
	body: string;
	prerelease: boolean;
}

function parseApiObject(value: unknown, context: string): ApiObject {
	const object = expectObject(value, context);
	return { sha: expectString(object.sha, `${context} sha`), type: expectString(object.type, `${context} type`) };
}

function parseRelease(value: unknown, index: number): ReleaseSummary {
	const release = expectObject(value, `GitHub release ${index}`);
	const name = release.name === null ? "" : expectString(release.name, `GitHub release ${index} name`);
	const body = release.body === null ? "" : expectString(release.body, `GitHub release ${index} body`);
	return {
		tag: expectString(release.tag_name, `GitHub release ${index} tag_name`),
		draft: expectBoolean(release.draft, `GitHub release ${index} draft`),
		name,
		body,
		prerelease: expectBoolean(release.prerelease, `GitHub release ${index} prerelease`),
	};
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
		const refContext = `GitHub ref response for ${tag}`;
		const ref = expectObject(await readJsonResponse(response, refContext), refContext);
		const refObject = parseApiObject(ref.object, `GitHub ref object for ${tag}`);
		if (refObject.type !== "tag") return { kind: "lightweight", target: refObject.sha };

		const tagResponse = await this.#request(`/git/tags/${refObject.sha}`);
		if (!tagResponse.ok) throw new Error(`GitHub annotated tag lookup failed (${tagResponse.status})`);
		const tagContext = `GitHub annotated tag response for ${tag}`;
		const tagData = expectObject(await readJsonResponse(tagResponse, tagContext), tagContext);
		const target = parseApiObject(tagData.object, `GitHub annotated tag target for ${tag}`);
		if (target.type !== "commit") return { kind: "lightweight", target: target.sha };
		return {
			kind: "annotated",
			target: target.sha,
			message: expectString(tagData.message, `GitHub tag message for ${tag}`),
		};
	}

	async release(tag: string): Promise<GithubReleaseState> {
		for (let page = 1; page <= 100; page += 1) {
			const response = await this.#request(`/releases?per_page=100&page=${page}`);
			if (!response.ok) throw new Error(`GitHub release discovery failed (${response.status})`);
			const decoded = await readJsonResponse(response, `GitHub release discovery page ${page}`);
			if (!Array.isArray(decoded)) throw new Error("GitHub release discovery response must be an array");
			const releases = decoded.map(parseRelease);
			const match = releases.find((release) => release.tag === tag);
			if (match)
				return {
					kind: match.draft ? "draft" : "present",
					name: match.name,
					body: match.body,
					prerelease: match.prerelease,
				};
			if (releases.length < 100) return { kind: "absent" };
		}
		throw new Error("GitHub release discovery exceeded 100 pages");
	}

	async createRelease(tag: string, name: string, body: string, prerelease: boolean, target: string): Promise<void> {
		const response = await this.#request("/releases", {
			method: "POST",
			body: JSON.stringify({ tag_name: tag, name, body, prerelease, target_commitish: target }),
		});
		if (!response.ok) throw new Error(`GitHub release creation failed (${response.status})`);
		parseRelease(await readJsonResponse(response, "GitHub release creation response"), 0);
	}
}
