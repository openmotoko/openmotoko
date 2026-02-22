import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getTemplatePath(template: string): string {
	const candidates = [
		resolve(__dirname, "..", "..", "skill-sdk", "templates", template),
		resolve(
			__dirname,
			"..",
			"node_modules",
			"@openmotoko",
			"skill-sdk",
			"templates",
			template,
		),
		resolve(
			__dirname,
			"..",
			"..",
			"..",
			"packages",
			"skill-sdk",
			"templates",
			template,
		),
	];

	for (const candidate of candidates) {
		if (existsSync(candidate)) return candidate;
	}

	throw new Error(
		`Template "${template}" not found. Searched: ${candidates.join(", ")}`,
	);
}

export const AVAILABLE_TEMPLATES = [
	"basic",
	"with-network",
	"with-browser",
] as const;
export type TemplateName = (typeof AVAILABLE_TEMPLATES)[number];
