import { describe, expect, it } from "vitest";
import { removeRecoveryDraft } from "../playground/draft-recovery";
import type { StorageLike, StoredDraft } from "../playground/storage";

const offer: StoredDraft = {
	version: 1,
	presetKey: "demo:default",
	savedAt: 1,
	sources: { schema: "{}", layout: "null", rules: "[]", initialData: "{}", initialUiState: "{}" },
};

function storageThatFailsRemoval(): StorageLike {
	return {
		getItem: () => null,
		setItem: () => undefined,
		removeItem: () => {
			throw new Error("denied");
		},
	};
}

describe("playground draft recovery actions", () => {
	it.each(["discard", "reset"] as const)(
		"preserves recovery and reports failure when %s cannot remove storage",
		(action) => {
			const result = removeRecoveryDraft(storageThatFailsRemoval(), offer.presetKey, offer, action);
			expect(result.offer).toBe(offer);
			expect(result.message).toContain("could not");
			expect(result.message).toContain("Recovery remains available");
		},
	);

	it.each(["discard", "reset"] as const)("clears recovery only after successful %s storage removal", (action) => {
		const storage: StorageLike = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
		const result = removeRecoveryDraft(storage, offer.presetKey, offer, action);
		expect(result.offer).toBeNull();
		expect(result.message).not.toContain("could not");
	});
});
