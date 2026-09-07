import { afterEach, describe, expect, it, vi } from "vitest";
import { GithubApi } from "../github";

const release = (tag: string, draft = false) => ({
	tag_name: tag,
	draft,
	name: `${tag} name`,
	body: "notes",
	prerelease: false,
});

describe("GitHub release discovery", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("paginates authenticated release listings and represents draft matches", async () => {
		const page = Array.from({ length: 100 }, (_, index) => release(`other-${index}`));
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(new Response(JSON.stringify(page), { status: 200 }))
			.mockResolvedValueOnce(new Response(JSON.stringify([release("@scope/pkg@1.2.3", true)]), { status: 200 }));
		vi.stubGlobal("fetch", fetch);

		await expect(new GithubApi("owner/repo", "test-token").release("@scope/pkg@1.2.3")).resolves.toMatchObject({
			kind: "draft",
		});
		expect(fetch).toHaveBeenCalledTimes(2);
		expect(fetch.mock.calls[1]?.[0]).toContain("page=2");
		expect(fetch.mock.calls[0]?.[1]?.headers).toMatchObject({ Authorization: "Bearer test-token" });
	});

	it("preserves compatible published release discovery", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response(JSON.stringify([release("@scope/pkg@1.2.3")]), { status: 200 })),
		);
		await expect(new GithubApi("owner/repo", "test-token").release("@scope/pkg@1.2.3")).resolves.toMatchObject({
			kind: "present",
			body: "notes",
		});
	});

	it("fails closed on malformed release discovery responses", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ releases: [] }), { status: 200 })));
		await expect(new GithubApi("owner/repo", "test-token").release("@scope/pkg@1.2.3")).rejects.toThrow(
			"must be an array",
		);
	});
});
