import { defineConfig } from "rolldown";

export default defineConfig({
	input: "src/index.ts",
	output: {
		esModule: false,
		file: "dist/index.js",
		format: "cjs",
		sourcemap: true,
	},
});
