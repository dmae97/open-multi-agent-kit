#!/usr/bin/env bun

import * as fs from "node:fs/promises";
import * as path from "node:path";

const repoRoot = path.join(import.meta.dir, "..");
const nativeDir = path.join(repoRoot, "packages", "natives", "native");
const expectedAddons = [
	"linux-x64-modern",
	"linux-x64-baseline",
	"linux-arm64",
	"darwin-x64-modern",
	"darwin-x64-baseline",
	"darwin-arm64",
	"win32-x64-modern",
	"win32-x64-baseline",
] as const;

async function main(): Promise<void> {
	const entries = await fs.readdir(nativeDir);

	console.log("Native addons downloaded:");
	for (const entry of entries.sort((a, b) => a.localeCompare(b))) {
		console.log(`  ${entry}`);
	}
	console.log();
	console.log(`Expected addons: ${expectedAddons.join(", ")}`);

	const missingAddons = expectedAddons.filter((platform) => !entries.includes(`pi_natives.${platform}.node`));
	if (missingAddons.length > 0) {
		for (const platform of missingAddons) {
			console.error(`MISSING pi_natives.${platform}.node`);
		}
		process.exit(1);
	}

	for (const platform of expectedAddons) {
		console.log(`OK pi_natives.${platform}.node`);
	}
}

await main();
