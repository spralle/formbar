import { describe, expect, it } from "vitest";
import { settingsPanelSchema } from "../demos/04-settings-panel";

describe("Settings Panel labels", () => {
	it("uses the exact Time Zone title", () => {
		expect(settingsPanelSchema.properties.timezone.title).toBe("Time Zone");
	});
});
