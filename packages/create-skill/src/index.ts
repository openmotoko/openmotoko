#!/usr/bin/env node
import { checkbox, input, select } from "@inquirer/prompts";
import chalk from "chalk";
import { scaffoldSkill } from "./scaffold.js";

async function main() {
	console.log(chalk.cyan("\n  OpenMotoko Skill Creator\n"));

	const nameArg = process.argv[2];

	const name =
		nameArg ??
		(await input({
			message: "Skill name:",
			validate: (v) => v.length > 0 || "Name is required",
		}));

	const id = name
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, "-")
		.replace(/-+/g, "-");

	const description = await input({
		message: "Description:",
		default: "A custom OpenMotoko skill",
	});

	const author = await input({
		message: "Author:",
		default: "Community",
	});

	const template = await select({
		message: "Template:",
		choices: [
			{ name: "Basic (minimal skill)", value: "basic" },
			{ name: "With Network (HTTP requests)", value: "with-network" },
			{ name: "With Browser (headless browsing)", value: "with-browser" },
		],
	});

	const capabilities = await checkbox({
		message: "Additional capabilities:",
		choices: [
			{ name: "Network access", value: "network" },
			{ name: "Filesystem access", value: "filesystem" },
			{ name: "Shell execution", value: "shell" },
		],
	});

	const targetDir = await input({
		message: "Output directory:",
		default: `./${id}`,
	});

	await scaffoldSkill({
		id,
		name,
		description,
		author,
		template: template as "basic" | "with-network" | "with-browser",
		capabilities: capabilities as string[],
		targetDir,
	});

	console.log(chalk.green(`\n  Skill "${name}" created at ${targetDir}\n`));
	console.log(chalk.dim("  Next steps:"));
	console.log(chalk.dim(`    cd ${targetDir}`));
	console.log(chalk.dim("    npm install"));
	console.log(chalk.dim("    npm run build"));
	console.log(chalk.dim(""));
}

main().catch((err) => {
	console.error(chalk.red("Error:"), err instanceof Error ? err.message : err);
	process.exit(1);
});
