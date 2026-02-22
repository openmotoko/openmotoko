import {
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { getTemplatePath } from "./templates.js";

interface ScaffoldOptions {
	id: string;
	name: string;
	description: string;
	author: string;
	template: "basic" | "with-network" | "with-browser";
	capabilities: string[];
	targetDir: string;
}

export async function scaffoldSkill(options: ScaffoldOptions): Promise<void> {
	const targetDir = resolve(process.cwd(), options.targetDir);

	if (existsSync(targetDir)) {
		const entries = readFileSync(targetDir, { encoding: null }).length;
		if (entries > 0) {
			throw new Error(
				`Directory "${options.targetDir}" already exists and is not empty`,
			);
		}
	}

	mkdirSync(targetDir, { recursive: true });

	const templateDir = getTemplatePath(options.template);
	copyTemplateFiles(templateDir, targetDir, options);
	writePackageJson(targetDir, options);
	writeTsConfig(targetDir);
}

function copyTemplateFiles(
	templateDir: string,
	targetDir: string,
	options: ScaffoldOptions,
): void {
	const files = ["manifest.json", "index.ts"];

	for (const file of files) {
		const srcPath = join(templateDir, file);
		if (!existsSync(srcPath)) continue;

		let content = readFileSync(srcPath, "utf-8");
		content = content.replace(/\{\{SKILL_ID\}\}/g, options.id);
		content = content.replace(/\{\{SKILL_NAME\}\}/g, options.name);
		content = content.replace(/\{\{SKILL_DESCRIPTION\}\}/g, options.description);
		content = content.replace(/\{\{SKILL_AUTHOR\}\}/g, options.author);

		const destPath = join(
			targetDir,
			file === "index.ts" ? "src/index.ts" : file,
		);
		const destDir = dirname(destPath);
		if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
		writeFileSync(destPath, content, "utf-8");
	}

	if (options.capabilities.length > 0) {
		patchManifestCapabilities(
			join(targetDir, "manifest.json"),
			options.capabilities,
		);
	}
}

function patchManifestCapabilities(
	manifestPath: string,
	capabilities: string[],
): void {
	if (!existsSync(manifestPath)) return;
	const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

	for (const cap of capabilities) {
		if (cap === "network") manifest.capabilities.network = true;
		if (cap === "filesystem")
			manifest.capabilities.filesystem = { enabled: true, paths: ["*"] };
		if (cap === "shell") manifest.capabilities.shell = true;
	}

	writeFileSync(
		manifestPath,
		`${JSON.stringify(manifest, null, 2)}\n`,
		"utf-8",
	);
}

function writePackageJson(targetDir: string, options: ScaffoldOptions): void {
	const pkg = {
		name: `openmotoko-skill-${options.id}`,
		version: "0.1.0",
		type: "module",
		main: "dist/index.js",
		scripts: {
			build: "tsc -b",
			dev: "tsc -b --watch",
		},
		dependencies: {
			"@openmotoko/skill-sdk": "^0.1.0",
		},
		devDependencies: {
			typescript: "^5.8.3",
			"@types/node": "^22.13.4",
		},
	};
	writeFileSync(
		join(targetDir, "package.json"),
		`${JSON.stringify(pkg, null, 2)}\n`,
		"utf-8",
	);
}

function writeTsConfig(targetDir: string): void {
	const config = {
		compilerOptions: {
			target: "ES2022",
			module: "Node16",
			moduleResolution: "Node16",
			strict: true,
			skipLibCheck: true,
			esModuleInterop: true,
			resolveJsonModule: true,
			declaration: true,
			outDir: "dist",
			rootDir: "src",
		},
		include: ["src"],
	};
	writeFileSync(
		join(targetDir, "tsconfig.json"),
		`${JSON.stringify(config, null, 2)}\n`,
		"utf-8",
	);
}
