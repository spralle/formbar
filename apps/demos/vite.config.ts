import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@formbar/core": new URL("../../packages/core/src/index.ts", import.meta.url).pathname,
			"@formbar/from-schema": new URL("../../packages/from-schema/src/index.ts", import.meta.url).pathname,
			"@formbar/react": new URL("../../packages/react/src/index.ts", import.meta.url).pathname,
		},
	},
	server: {
		port: 5174,
		host: "127.0.0.1",
	},
});
