export interface AppRoute {
	readonly mode: "demo" | "playground";
	readonly demoId: string;
	readonly preset?: string;
}

export function readRoute(url: URL, demoIds: readonly string[]): AppRoute {
	const requestedDemo = url.searchParams.get("demo");
	const demoId = requestedDemo && demoIds.includes(requestedDemo) ? requestedDemo : (demoIds[0] ?? "");
	const mode = url.searchParams.get("mode") === "playground" ? "playground" : "demo";
	const preset = url.searchParams.get("preset") || undefined;
	return { mode, demoId, ...(preset ? { preset } : {}) };
}

export function routeUrl(current: URL, route: AppRoute): URL {
	const next = new URL(current.href);
	next.searchParams.set("mode", route.mode);
	next.searchParams.set("demo", route.demoId);
	if (route.preset) next.searchParams.set("preset", route.preset);
	else next.searchParams.delete("preset");
	return next;
}
