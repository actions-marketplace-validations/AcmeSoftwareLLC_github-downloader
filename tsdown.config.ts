import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["./src/index.ts"],
	outputOptions: {
		file: "dist/index.js",
		dir: undefined,
		format: "es",
		sourcemap: true,
		esModule: true,
	},
});
