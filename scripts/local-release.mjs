#!/usr/bin/env node

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const packages = [
	{ directory: "packages/ai", name: "@earendil-works/pi-ai" },
	{ directory: "packages/tui", name: "@earendil-works/pi-tui" },
	{ directory: "packages/agent", name: "@earendil-works/pi-agent-core" },
	{ directory: "packages/coding-agent", name: "@earendil-works/pi-coding-agent" },
];

function printUsage() {
	console.log(`Usage: node scripts/local-release.mjs [options]

Builds and packs the publishable packages, then installs the tarballs into an
isolated directory outside the repository for local release testing.

Options:
  --out <dir>          Output directory. Defaults to a new directory under ${tmpdir()}
  --force              Remove --out first if it already exists
  --skip-check         Do not run npm run check before building
  --skip-install       Only create tarballs; do not create isolated installs
  --skip-bun-install   Do not create the isolated Bun install
  --help               Show this help
`);
}

function parseArgs() {
	const options = { force: false, outDir: undefined, skipBunInstall: false, skipCheck: false, skipInstall: false };
	const args = process.argv.slice(2);

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--help") {
			printUsage();
			process.exit(0);
		}
		if (arg === "--force") {
			options.force = true;
			continue;
		}
		if (arg === "--skip-check") {
			options.skipCheck = true;
			continue;
		}
		if (arg === "--skip-install") {
			options.skipInstall = true;
			continue;
		}
		if (arg === "--skip-bun-install") {
			options.skipBunInstall = true;
			continue;
		}
		if (arg === "--out") {
			const value = args[++i];
			if (!value) {
				throw new Error("--out requires a directory");
			}
			options.outDir = value;
			continue;
		}
		throw new Error(`Unknown option: ${arg}`);
	}

	return options;
}

function run(command, args, options = {}) {
	console.log(`$ ${[command, ...args].join(" ")}`);
	const result = spawnSync(command, args, {
		cwd: options.cwd,
		encoding: "utf8",
		stdio: options.capture ? ["inherit", "pipe", "inherit"] : "inherit",
	});

	if (result.status !== 0) {
		throw new Error(`Command failed: ${[command, ...args].join(" ")}`);
	}

	return result.stdout ?? "";
}

function readPackageJson(directory) {
	return JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
}

function commandExists(command) {
	return spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
}

function isInsidePath(child, parent) {
	const relativePath = relative(parent, child);
	return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}

function prepareOutputDirectory(options, repoRoot) {
	if (!options.outDir) {
		return mkdtempSync(join(tmpdir(), "pi-local-release-"));
	}

	const outDir = resolve(options.outDir);

	if (isInsidePath(outDir, repoRoot)) {
		throw new Error(`Output directory must be outside the repository: ${outDir}`);
	}

	if (existsSync(outDir)) {
		if (!options.force) {
			throw new Error(`Output directory already exists. Use --force to replace it: ${outDir}`);
		}
		rmSync(outDir, { force: true, recursive: true });
	}

	mkdirSync(outDir, { recursive: true });
	return outDir;
}

function fileSpecifier(fromDirectory, file) {
	const relativePath = relative(fromDirectory, file).replaceAll("\\", "/");
	return `file:${relativePath.startsWith(".") ? relativePath : `./${relativePath}`}`;
}

function packPackage(pkg, tarballDirectory) {
	const packageJson = readPackageJson(pkg.directory);
	if (packageJson.name !== pkg.name) {
		throw new Error(`${pkg.directory}/package.json has name ${packageJson.name}, expected ${pkg.name}`);
	}

	const output = run("npm", ["pack", "--json", "--pack-destination", tarballDirectory], {
		capture: true,
		cwd: pkg.directory,
	});
	const packed = JSON.parse(output)[0];
	return join(tarballDirectory, packed.filename);
}

const options = parseArgs();
const repoRoot = process.cwd();
const rootPackageJson = readPackageJson(repoRoot);

if (rootPackageJson.name !== "pi-monorepo") {
	throw new Error("Run this script from the repository root");
}

const outDir = prepareOutputDirectory(options, repoRoot);
const tarballDirectory = join(outDir, "tarballs");
const nodeInstallDirectory = join(outDir, "node");
const bunInstallDirectory = join(outDir, "bun");
mkdirSync(tarballDirectory, { recursive: true });

if (!options.skipCheck) {
	run("npm", ["run", "check"], { cwd: repoRoot });
}

for (const pkg of packages) {
	run("npm", ["run", "clean"], { cwd: pkg.directory });
	run("npm", ["run", "build"], { cwd: pkg.directory });
}

const tarballs = new Map();
for (const pkg of packages) {
	const tarball = packPackage(pkg, tarballDirectory);
	tarballs.set(pkg.name, tarball);
}

if (!options.skipInstall) {
	mkdirSync(nodeInstallDirectory, { recursive: true });
	const dependencies = Object.fromEntries(
		packages.map((pkg) => [pkg.name, fileSpecifier(nodeInstallDirectory, tarballs.get(pkg.name))]),
	);
	const installPackageJson = `${JSON.stringify({ private: true, dependencies }, undefined, "\t")}\n`;
	writeFileSync(join(nodeInstallDirectory, "package.json"), installPackageJson);

	run("npm", ["install", "--omit=dev", "--ignore-scripts"], { cwd: nodeInstallDirectory });
	symlinkSync(join("node_modules", ".bin", "pi"), join(nodeInstallDirectory, "pi"));

	if (!options.skipBunInstall) {
		if (!commandExists("bun")) {
			throw new Error("Bun is required for the isolated Bun install. Use --skip-bun-install to skip it.");
		}
		mkdirSync(bunInstallDirectory, { recursive: true });
		const bunDependencies = Object.fromEntries(
			packages.map((pkg) => [pkg.name, fileSpecifier(bunInstallDirectory, tarballs.get(pkg.name))]),
		);
		writeFileSync(join(bunInstallDirectory, "package.json"), `${JSON.stringify({ private: true, dependencies: bunDependencies }, undefined, "\t")}\n`);
		run("bun", ["install", "--production", "--ignore-scripts"], { cwd: bunInstallDirectory });
		symlinkSync(join("node_modules", ".bin", "pi"), join(bunInstallDirectory, "pi"));
	}
}

console.log("\nLocal release artifacts created:");
console.log(`  ${outDir}`);
console.log("\nTarballs:");
for (const tarball of tarballs.values()) {
	console.log(`  ${tarball}`);
}

if (!options.skipInstall) {
	console.log("\nIsolated npm install:");
	console.log(`  ${nodeInstallDirectory}`);
	console.log("\nRun the locally packed npm CLI from outside the repository:");
	console.log(`  ${join(nodeInstallDirectory, "pi")} --help`);

	if (!options.skipBunInstall) {
		console.log("\nIsolated Bun install:");
		console.log(`  ${bunInstallDirectory}`);
		console.log("\nRun the locally packed Bun CLI from outside the repository:");
		console.log(`  ${join(bunInstallDirectory, "pi")} --help`);
	}
}
