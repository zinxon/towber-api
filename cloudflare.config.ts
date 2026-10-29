import { bindings, defineConfig } from "cf/config";

/**
 * Secrets stay in `.dev.vars` for local; set production secrets in the
 * Cloudflare dashboard or via `cf workers secrets`.
 * @see https://developers.cloudflare.com/workers/configuration/secrets/
 *
 * Former `preview_bucket_name: "towber-dev"` has no cf equivalent.
 * `cf dev` uses a local R2 simulation by default. For a remote bucket
 * during local work, set `remote: true` and point `name` at `towber-dev`
 * (or pass `--mode` with a dedicated branch).
 */
export default defineConfig({
	worker: {
		name: "towber-api",
		compatibilityDate: "2025-02-04",
		compatibilityFlags: ["nodejs_compat_v2"],
		entrypoint: "src/index.ts",
		observability: {
			logs: {
				enabled: true,
			},
		},
		env: {
			BUCKET: bindings.r2({
				name: "towber",
			}),
		},
	},
});
