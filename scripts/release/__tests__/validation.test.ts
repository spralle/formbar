import { afterEach, describe, expect, it, vi } from "vitest";
import { npmVersion } from "../adapters";
import { parseReleasePlan } from "../validation";
import { plan } from "./fixtures";

describe("release boundary validation", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("accepts a complete saved plan and rejects unsafe candidate shapes", () => {
		expect(parseReleasePlan(plan)).toEqual(plan);
		expect(() => parseReleasePlan({ ...plan, candidates: [{ ...plan.candidates[0], prerelease: "false" }] })).toThrow(
			"prerelease must be a boolean",
		);
	});

	it("validates npm metadata without trusting external JSON", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ gitHead: 123 }), { status: 200 })));
		await expect(npmVersion("@scope/pkg", "1.2.3")).rejects.toThrow("npm gitHead");
	});
});
