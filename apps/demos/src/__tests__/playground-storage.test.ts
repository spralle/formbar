import { describe, expect, it } from "vitest";
import { TOTAL_LIMIT_BYTES } from "../playground/contracts";
import { type StorageLike, discardDraft, draftKey, loadDraft, saveDraft } from "../playground/storage";

const sources = { schema: "{}", layout: "null", rules: "[]", initialData: "{}", initialUiState: "{}" };

class MemoryStorage implements StorageLike {
	readonly values = new Map<string, string>();
	getItem(key: string) {
		return this.values.get(key) ?? null;
	}
	setItem(key: string, value: string) {
		this.values.set(key, value);
	}
	removeItem(key: string) {
		this.values.delete(key);
	}
}

describe("playground storage", () => {
	it("round-trips drafts only for the matching version and preset", () => {
		const storage = new MemoryStorage();
		expect(saveDraft(storage, "one", sources)).toBe(true);
		expect(loadDraft(storage, "one")?.sources).toEqual(sources);
		expect(loadDraft(storage, "two")).toBeNull();
		storage.values.set(draftKey("one"), JSON.stringify({ version: 2, presetKey: "one", sources }));
		expect(loadDraft(storage, "one")).toBeNull();
	});

	it("guards corrupt and oversized storage", () => {
		const storage = new MemoryStorage();
		storage.values.set(draftKey("one"), "not-json");
		expect(loadDraft(storage, "one")).toBeNull();
		storage.values.set(draftKey("one"), "x".repeat(TOTAL_LIMIT_BYTES + 1));
		expect(loadDraft(storage, "one")).toBeNull();
		expect(saveDraft(storage, "one", { ...sources, schema: "x".repeat(TOTAL_LIMIT_BYTES) })).toBe(false);
	});

	it("contains quota and access exceptions for load, save, and discard", () => {
		const broken: StorageLike = {
			getItem: () => {
				throw new Error("denied");
			},
			setItem: () => {
				throw new Error("quota");
			},
			removeItem: () => {
				throw new Error("denied");
			},
		};
		expect(loadDraft(broken, "one")).toBeNull();
		expect(saveDraft(broken, "one", sources)).toBe(false);
		expect(discardDraft(broken, "one")).toBe(false);
	});
});
