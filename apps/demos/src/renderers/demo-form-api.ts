import type { FormApi } from "@formbar/core";

// biome-ignore lint/suspicious/noExplicitAny: Demo renderers intentionally accept every FormApi specialization.
export type DemoFormApi = FormApi<any, any>;
