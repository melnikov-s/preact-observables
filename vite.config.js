import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
	build: {
		minify: false,
		lib: {
			entry: resolve(__dirname, "src/index.ts"),
			name: "preact-observables",
			fileName: (format) => `preact-observables.${format}.js`,
		},
		rollupOptions: {},
	},
	test: {
		globals: true,
		setupFiles: ["./test/setup.ts"],
		include: [
			"**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"../nu-observables/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
		],
	},
	plugins: [dts()],
});
