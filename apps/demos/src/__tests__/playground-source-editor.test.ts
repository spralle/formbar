import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SourceEditor } from "../playground/SourceEditor";
import { SOURCE_KEYS, type SourceKey } from "../playground/contracts";

const sources = Object.fromEntries(SOURCE_KEYS.map((key) => [key, `${key} source`])) as Record<SourceKey, string>;

function renderEditor(active: SourceKey): string {
	return renderToStaticMarkup(
		createElement(SourceEditor, {
			active,
			sources,
			baseline: sources,
			errors: {},
			onActiveChange: vi.fn(),
			onChange: vi.fn(),
			onApply: vi.fn(),
		}),
	);
}

function openingTags(markup: string, role: "tab" | "tabpanel"): string[] {
	return [...markup.matchAll(new RegExp(`<[^>]+role="${role}"[^>]*>`, "g"))].map(([tag]) => tag);
}

describe("playground source editor tabs", () => {
	it.each(SOURCE_KEYS)("associates every tab and persistent panel when %s is active", (active) => {
		const markup = renderEditor(active);
		const tabs = openingTags(markup, "tab");
		const panels = openingTags(markup, "tabpanel");

		expect(tabs).toHaveLength(SOURCE_KEYS.length);
		expect(panels).toHaveLength(SOURCE_KEYS.length);
		for (const key of SOURCE_KEYS) {
			expect(tabs).toContainEqual(expect.stringContaining(`id="source-tab-${key}"`));
			expect(tabs).toContainEqual(expect.stringContaining(`aria-controls="source-panel-${key}"`));
			expect(panels).toContainEqual(expect.stringContaining(`id="source-panel-${key}"`));
			expect(panels).toContainEqual(expect.stringContaining(`aria-labelledby="source-tab-${key}"`));
		}
	});

	it.each(SOURCE_KEYS)("exposes only the %s editor and uses roving tab selection", (active) => {
		const markup = renderEditor(active);
		const tabs = openingTags(markup, "tab");
		const panels = openingTags(markup, "tabpanel");

		expect(tabs.filter((tag) => tag.includes('aria-selected="true"'))).toHaveLength(1);
		expect(tabs.filter((tag) => tag.includes('tabindex="0"'))).toHaveLength(1);
		expect(tabs.find((tag) => tag.includes(`id="source-tab-${active}"`))).toContain('aria-selected="true"');
		expect(tabs.find((tag) => tag.includes(`id="source-tab-${active}"`))).toContain('tabindex="0"');
		expect(panels.filter((tag) => tag.includes("hidden"))).toHaveLength(SOURCE_KEYS.length - 1);
		expect(panels.find((tag) => tag.includes(`id="source-panel-${active}"`))).not.toContain("hidden");
		expect(markup.match(/<textarea/g)).toHaveLength(1);
		expect(markup).toContain(`<textarea id="source-${active}"`);
	});
});
