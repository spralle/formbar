import { describe, expect, it } from "vitest";
import { applyPlan, validatePlan } from "../apply";
import { FakeServices, candidate, plan, sha } from "./fixtures";

describe("release application", () => {
	it("creates annotated tags, atomically pushes, then creates releases", async () => {
		const services = new FakeServices();
		services.npm = { exists: true, gitHead: sha };
		await applyPlan(plan, services, services);
		expect(services.events).toEqual([`local:${candidate.tag}`, `push:${candidate.tag}`, `release:${candidate.tag}`]);
	});

	it("does no writes in dry-run or when any preflight artifact conflicts", async () => {
		const dryRun = new FakeServices();
		dryRun.npm = { exists: true, gitHead: sha };
		await applyPlan(plan, dryRun, dryRun, { dryRun: true });
		expect(dryRun.events).toEqual([]);

		const conflict = new FakeServices();
		conflict.npm = { exists: true, gitHead: sha };
		conflict.tags.set(candidate.tag, { kind: "lightweight", target: sha });
		await expect(applyPlan(plan, conflict, conflict)).rejects.toThrow("lightweight");
		expect(conflict.events).toEqual([]);
	});

	it("preflights every local tag before creating any tag", async () => {
		const services = new FakeServices();
		services.npm = { exists: true, gitHead: sha };
		services.preflightLocalTag = async () => {
			throw new Error("conflicting local tag");
		};
		await expect(applyPlan(plan, services, services)).rejects.toThrow("conflicting local tag");
		expect(services.events).toEqual([]);
	});

	it("recovers idempotently after tags or releases already exist", async () => {
		const services = new FakeServices();
		services.npm = { exists: true, gitHead: sha };
		services.tags.set(candidate.tag, { kind: "annotated", target: sha, message: candidate.tag });
		await applyPlan(plan, services, services);
		expect(services.events).toEqual(["push:", `release:${candidate.tag}`]);
		services.events = [];
		await applyPlan(plan, services, services);
		expect(services.events).toEqual(["push:"]);
	});

	it("bounds npm propagation retries and refuses conflicting gitHead", async () => {
		const services = new FakeServices();
		await expect(applyPlan(plan, services, services, { attempts: 2, wait: async () => {} })).rejects.toThrow(
			"did not propagate",
		);
		expect(services.events).toEqual([]);
		services.npm = { exists: true, gitHead: "b".repeat(40) };
		await expect(applyPlan(plan, services, services)).rejects.toThrow("conflicting gitHead");
	});

	it("refuses a forged 0.2.1 plan without an override", () => {
		expect(() =>
			validatePlan(
				{ ...plan, candidates: [{ ...candidate, version: "0.2.1", tag: "@scope/pkg@0.2.1" }] },
				"owner/repo",
				sha,
			),
		).toThrow("Refusing prohibited");
	});
});
