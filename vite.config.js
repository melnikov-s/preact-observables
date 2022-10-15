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
		rollupOptions: {
			external: ['@preact/signals-core', 'preact', 'nu-observables']
		},
		
	},
	test: {
		globals: true,
		setupFiles: ["./test/setup.ts"],
		include: [
			"./test/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
			"./node_modules/nu-observables/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
		],
		exclude: [],
		environment: 'jsdom'
	},
	plugins: [dts()],
});
