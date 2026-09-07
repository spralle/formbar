import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractVersionNotes, isPrerelease } from "../changelog";
import { discoverWorkspaces } from "../workspaces";

async function fixture(packages: Record<string, object>): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "release-workspaces-"));
	await mkdir(join(root, ".changeset"));
	await mkdir(join(root, "packages"));
	await writeFile(join(root, "package.json"), JSON.stringify({ workspaces: ["packages/*"] }));
	await writeFile(join(root, ".changeset/config.json"), JSON.stringify({ ignore: ["@scope/ignored"] }));
	for (const [directory, manifest] of Object.entries(packages)) {
		await mkdir(join(root, "packages", directory));
		await writeFile(join(root, "packages", directory, "package.json"), JSON.stringify(manifest));
		await writeFile(join(root, "packages", directory, "CHANGELOG.md"), "# package\n\n## 1.0.0-beta.1\n\nBeta notes\n");
	}
	return root;
}

describe("release metadata", () => {
	it("extracts only the deterministic requested CHANGELOG section", () => {
		const markdown = "# pkg\r\n\r\n## 2.0.0\r\n\r\nNew notes\r\n\r\n## 1.0.0\r\n\r\nOld notes\r\n";
		expect(extractVersionNotes(markdown, "2.0.0")).toBe("New notes");
		expect(() => extractVersionNotes(markdown, "3.0.0")).toThrow("missing");
	});

	it("derives prerelease state from semver prerelease syntax", () => {
		expect(isPrerelease("1.0.0-beta.1+build")).toBe(true);
		expect(isPrerelease("1.0.0+build")).toBe(false);
	});

	it("discovers scoped publishable workspaces while filtering private and ignored ones", async () => {
		const root = await fixture({
			public: { name: "@scope/public", version: "1.0.0-beta.1" },
			private: { name: "@scope/private", version: "1.0.0-beta.1", private: true },
			ignored: { name: "@scope/ignored", version: "1.0.0-beta.1" },
		});
		const releases = await discoverWorkspaces(root);
		expect(releases).toMatchObject([{ name: "@scope/public", tag: "@scope/public@1.0.0-beta.1", prerelease: true }]);
	});

	it("fails closed for the prohibited 0.2.1 version", async () => {
		const root = await fixture({ prohibited: { name: "@scope/prohibited", version: "0.2.1" } });
		await expect(discoverWorkspaces(root)).rejects.toThrow("Refusing prohibited historical version");
	});

	it("rejects malformed workspace manifest fields", async () => {
		const root = await fixture({ malformed: { name: "@scope/malformed", version: "1.0.0-beta.1", private: "no" } });
		await expect(discoverWorkspaces(root)).rejects.toThrow("private must be boolean");
	});
});
