import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { extractVersionNotes, isPrerelease } from "./changelog";
import type { WorkspaceRelease } from "./types";
import { expectObject, optionalString, optionalStringArray } from "./validation";

interface Manifest {
	name?: string;
	version?: string;
	private?: boolean;
	workspaces?: string[];
	ignore?: string[];
}

async function readJson(path: string): Promise<Manifest> {
	let decoded: unknown;
	try {
		decoded = JSON.parse(await readFile(path, "utf8"));
	} catch {
		throw new Error(`${path} is not valid JSON`);
	}
	const value = expectObject(decoded, path);
	if (value.private !== undefined && typeof value.private !== "boolean")
		throw new Error(`${path} private must be boolean`);
	const name = optionalString(value.name, `${path} name`);
	const version = optionalString(value.version, `${path} version`);
	const workspaces = optionalStringArray(value.workspaces, `${path} workspaces`);
	const ignore = optionalStringArray(value.ignore, `${path} ignore`);
	return {
		...(name === undefined ? {} : { name }),
		...(version === undefined ? {} : { version }),
		...(value.private === undefined ? {} : { private: value.private as boolean }),
		...(workspaces === undefined ? {} : { workspaces }),
		...(ignore === undefined ? {} : { ignore }),
	};
}

async function expandPattern(root: string, pattern: string): Promise<string[]> {
	if (!pattern.endsWith("/*")) throw new Error(`Unsupported workspace pattern: ${pattern}`);
	const parent = join(root, pattern.slice(0, -2));
	const entries = await readdir(parent, { withFileTypes: true });
	return entries.filter((entry) => entry.isDirectory()).map((entry) => join(parent, entry.name));
}

function validateManifest(
	manifest: Manifest,
	directory: string,
): asserts manifest is Manifest & { name: string; version: string } {
	if (!manifest.name || !manifest.version) throw new Error(`Publishable workspace ${directory} needs name and version`);
	if (!manifest.name.startsWith("@") || !manifest.name.includes("/")) {
		throw new Error(`Release package must use a scoped name: ${manifest.name}`);
	}
	if (manifest.version === "0.2.1") throw new Error(`Refusing prohibited historical version ${manifest.name}@0.2.1`);
}

export async function discoverWorkspaces(root: string): Promise<WorkspaceRelease[]> {
	const rootManifest = await readJson(join(root, "package.json"));
	const patterns = rootManifest.workspaces;
	if (!patterns || patterns.length === 0) throw new Error("Root package.json must define workspaces");
	const ignored = new Set((await readJson(join(root, ".changeset/config.json"))).ignore ?? []);
	const directories = (await Promise.all(patterns.map((pattern) => expandPattern(root, pattern)))).flat();
	const releases: WorkspaceRelease[] = [];

	for (const directory of directories) {
		const manifest = await readJson(join(directory, "package.json"));
		if (manifest.private || (manifest.name && ignored.has(manifest.name))) continue;
		validateManifest(manifest, directory);
		const notes = extractVersionNotes(await readFile(join(directory, "CHANGELOG.md"), "utf8"), manifest.version);
		releases.push({
			name: manifest.name,
			version: manifest.version,
			directory: relative(root, directory),
			tag: `${manifest.name}@${manifest.version}`,
			notes,
			prerelease: isPrerelease(manifest.version),
		});
	}
	return releases.sort((left, right) => left.name.localeCompare(right.name));
}
