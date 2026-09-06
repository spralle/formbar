import { type StorageLike, type StoredDraft, discardDraft } from "./storage";

type DraftRemovalAction = "discard" | "reset";

interface DraftRemovalResult {
	readonly offer: StoredDraft | null;
	readonly message: string;
}

const MESSAGES: Record<DraftRemovalAction, { readonly success: string; readonly failure: string }> = {
	discard: {
		success: "Saved draft discarded.",
		failure: "Saved draft could not be discarded. Recovery remains available.",
	},
	reset: {
		success: "Preset and live preview reset to a fresh session.",
		failure: "Preset reset, but its saved draft could not be removed. Recovery remains available.",
	},
};

export function removeRecoveryDraft(
	storage: StorageLike,
	presetKey: string,
	offer: StoredDraft | null,
	action: DraftRemovalAction,
): DraftRemovalResult {
	const removed = discardDraft(storage, presetKey);
	return {
		offer: removed ? null : offer,
		message: removed ? MESSAGES[action].success : MESSAGES[action].failure,
	};
}
