import { chmod, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LiveServices } from "./adapters";
import { selectCandidates } from "./preflight";
import type { ReleasePlan, ReleaseReader } from "./types";
import { discoverWorkspaces } from "./workspaces";

export async function buildPlan(
	root: string,
	repository: string,
	releaseCommit: string,
	reader: ReleaseReader,
): Promise<ReleasePlan> {
	if (!/^[0-9a-f]{40}$/.test(releaseCommit)) throw new Error("GITHUB_SHA must be a full commit SHA");
	const workspaces = await discoverWorkspaces(root);
	const candidates = await selectCandidates(workspaces, releaseCommit, reader);
	return { schemaVersion: 1, repository, releaseCommit, candidates };
}

export async function savePlan(plan: ReleasePlan, path: string): Promise<void> {
	await writeFile(path, `${JSON.stringify(plan, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o400 });
	await chmod(path, 0o400);
}

async function main(): Promise<void> {
	const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
	const repository = process.env.GITHUB_REPOSITORY ?? "";
	const releaseCommit = process.env.GITHUB_SHA ?? "";
	const planPath = process.env.RELEASE_PLAN ?? join(process.env.RUNNER_TEMP ?? "/tmp", "formbar-release-plan.json");
	if (!repository) throw new Error("GITHUB_REPOSITORY is required");
	const plan = await buildPlan(root, repository, releaseCommit, new LiveServices(repository));
	await savePlan(plan, planPath);
	const writes = plan.candidates.reduce(
		(total, candidate) =>
			total + Number(candidate.tagAction === "create") + Number(candidate.releaseAction === "create"),
		0,
	);
	console.log(`Release plan: ${plan.candidates.length} candidate(s), ${writes} planned artifact write(s)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
