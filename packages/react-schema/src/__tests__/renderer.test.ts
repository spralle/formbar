import { FormbarError } from "@formbar/core";
import { describe, expect, it } from "vitest";
import { RendererRegistry } from "../renderer-registry.js";

describe("RendererRegistry", () => {
	it("has built-in renderers for group, section, field, array", () => {
		const registry = new RendererRegistry();
		expect(registry.has("group")).toBe(true);
		expect(registry.has("section")).toBe(true);
		expect(registry.has("field")).toBe(true);
		expect(registry.has("array")).toBe(true);
	});

	it("returns false for unknown types", () => {
		const registry = new RendererRegistry();
		expect(registry.has("unknown-widget")).toBe(false);
	});

	it("get returns undefined for unknown types", () => {
		const registry = new RendererRegistry();
		expect(registry.get("unknown-widget")).toBeUndefined();
	});

	it("get returns component for built-in types", () => {
		const registry = new RendererRegistry();
		expect(registry.get("group")).toBeTypeOf("function");
		expect(registry.get("section")).toBeTypeOf("function");
		expect(registry.get("field")).toBeTypeOf("function");
		expect(registry.get("array")).toBeTypeOf("function");
	});

	it("resolve returns component for built-in types", () => {
		const registry = new RendererRegistry();
		expect(registry.resolve("group")).toBeTypeOf("function");
	});

	it("resolve throws FORMBAR_RENDERER_UNKNOWN_TYPE for unknown types", () => {
		const registry = new RendererRegistry();
		try {
			registry.resolve("map-picker");
			expect.unreachable("should have thrown");
		} catch (err) {
			expect(err).toBeInstanceOf(FormbarError);
			expect((err as FormbarError).code).toBe("FORMBAR_RENDERER_UNKNOWN_TYPE");
			expect((err as FormbarError).message).toContain("map-picker");
		}
	});

	it("register adds a custom renderer", () => {
		const registry = new RendererRegistry();
		const CustomComponent = () => null;
		registry.register({ type: "map-picker", component: CustomComponent });
		expect(registry.has("map-picker")).toBe(true);
		expect(registry.get("map-picker")).toBe(CustomComponent);
		expect(registry.resolve("map-picker")).toBe(CustomComponent);
	});

	it("register overrides a built-in renderer", () => {
		const registry = new RendererRegistry();
		const CustomGroup = () => null;
		registry.register({ type: "group", component: CustomGroup });
		expect(registry.resolve("group")).toBe(CustomGroup);
	});
});
