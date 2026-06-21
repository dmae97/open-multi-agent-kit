import { existsSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import {
	type Adoption,
	type GateVerdict,
	type PathCompatibility,
	validateExactNpmVersion,
	validateGitRef,
} from "./package-procurement.ts";

export type GalleryResourceType = "extension" | "skill" | "prompt" | "theme";
export type GalleryManifestKey = "omk" | "pi";
export type GalleryInstallSourceKind = "npm" | "git" | "local";
export type GalleryInstallTrust = "code-execution" | "declarative";
export type GalleryPreviewKind = "video" | "image" | "generated-theme";
export type ExtensionCapabilityBadge = "tools" | "commands" | "hooks" | "provider" | "ui" | "compaction";

export interface NormalizedGalleryManifest {
	manifestKey: GalleryManifestKey;
	extensions: string[];
	skills: string[];
	prompts: string[];
	themes: string[];
	video: string | undefined;
	image: string | undefined;
	description: string | undefined;
}

export interface GalleryTypedEntry {
	resourceTypes: readonly GalleryResourceType[];
}

export interface GalleryPreviewInput {
	video?: string;
	image?: string;
	resourceTypes: readonly GalleryResourceType[];
	themeName?: string;
}

export interface GalleryPreviewSelection {
	kind: GalleryPreviewKind;
	url?: string;
	marker?: string;
}

export type GalleryInstallSource =
	| { kind: "npm"; name: string; version?: string }
	| { kind: "git"; repo: string; ref?: string }
	| { kind: "local"; path: string };

export interface GalleryInstallOptions {
	local?: boolean;
}

export interface GalleryInstallSpec {
	kind: GalleryInstallSourceKind;
	source: string;
	installCommand: string;
	tryEphemeralCommand: string;
	trust: GalleryInstallTrust;
}

export type GalleryEntryIdentity =
	| { kind: "npm"; name: string }
	| { kind: "git"; repo: string; ref?: string }
	| { kind: "local"; path: string };

export interface GalleryEntryWithIdentity {
	identity: GalleryEntryIdentity;
}

const RESOURCE_ORDER: readonly GalleryResourceType[] = ["extension", "skill", "prompt", "theme"];
const CAPABILITY_ORDER: readonly ExtensionCapabilityBadge[] = [
	"tools",
	"commands",
	"hooks",
	"provider",
	"ui",
	"compaction",
];
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp"] as const;

const FACET_ALIASES: Readonly<Record<string, GalleryResourceType>> = {
	extension: "extension",
	extensions: "extension",
	skill: "skill",
	skills: "skill",
	prompt: "prompt",
	prompts: "prompt",
	theme: "theme",
	themes: "theme",
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value
		.filter((item): item is string => typeof item === "string")
		.map((item) => item.trim())
		.filter(Boolean);
}

function toOptionalString(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function readManifestRecord(pkgJson: unknown): { key: GalleryManifestKey; manifest: Record<string, unknown> } | null {
	if (!isRecord(pkgJson)) return null;
	if (isRecord(pkgJson.omk)) return { key: "omk", manifest: pkgJson.omk };
	if (isRecord(pkgJson.pi)) return { key: "pi", manifest: pkgJson.pi };
	return null;
}

export function normalizeGalleryManifest(pkgJson: unknown): NormalizedGalleryManifest | null {
	const source = readManifestRecord(pkgJson);
	if (!source) return null;

	return {
		manifestKey: source.key,
		extensions: toStringArray(source.manifest.extensions),
		skills: toStringArray(source.manifest.skills),
		prompts: toStringArray(source.manifest.prompts),
		themes: toStringArray(source.manifest.themes),
		video: toOptionalString(source.manifest.video),
		image: toOptionalString(source.manifest.image),
		description: toOptionalString(source.manifest.description),
	};
}

export function hasGalleryKeyword(pkgJson: unknown): boolean {
	if (!isRecord(pkgJson) || !Array.isArray(pkgJson.keywords)) return false;
	return pkgJson.keywords.some((keyword) => keyword === "omk-package" || keyword === "pi-package");
}

function hasManifestResources(manifest: NormalizedGalleryManifest | null, type: GalleryResourceType): boolean {
	if (!manifest) return false;
	if (type === "extension") return manifest.extensions.length > 0;
	if (type === "skill") return manifest.skills.length > 0;
	if (type === "prompt") return manifest.prompts.length > 0;
	return manifest.themes.length > 0;
}

export function resolveGalleryTypeFacet(facet: string | undefined): GalleryResourceType | undefined {
	if (!facet) return undefined;
	return FACET_ALIASES[facet.trim().toLowerCase()];
}

export function classifyGalleryResourceTypes(
	manifest: NormalizedGalleryManifest | null,
	conventionDirs: readonly string[] = [],
): GalleryResourceType[] {
	const types = new Set<GalleryResourceType>();
	for (const type of RESOURCE_ORDER) {
		if (hasManifestResources(manifest, type)) types.add(type);
	}
	for (const dir of conventionDirs) {
		const firstSegment = dir.trim().replace(/\\/g, "/").split("/").filter(Boolean)[0];
		const type = resolveGalleryTypeFacet(firstSegment);
		if (type) types.add(type);
	}
	return RESOURCE_ORDER.filter((type) => types.has(type));
}

export function filterGalleryEntriesByType<T extends GalleryTypedEntry>(
	entries: readonly T[],
	facet: string | undefined,
): T[] {
	if (facet === undefined) return [...entries];
	const type = resolveGalleryTypeFacet(facet);
	if (!type) return [];
	return entries.filter((entry) => entry.resourceTypes.includes(type));
}

function parseAllowedGalleryUrl(url: string | undefined): URL | null {
	if (!url) return null;
	if (/[\s\u0000-\u001f\u007f]/.test(url)) return null;
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== "https:") return null;
		if (parsed.username || parsed.password) return null;
		if (parsed.port) return null;
		return parsed;
	} catch {
		return null;
	}
}

export function isValidGalleryVideoUrl(url: string | undefined): boolean {
	const parsed = parseAllowedGalleryUrl(url);
	return parsed ? parsed.pathname.toLowerCase().endsWith(".mp4") : false;
}

export function isValidGalleryImageUrl(url: string | undefined): boolean {
	const parsed = parseAllowedGalleryUrl(url);
	return parsed ? IMAGE_EXTENSIONS.some((extension) => parsed.pathname.toLowerCase().endsWith(extension)) : false;
}

export function selectGalleryPreview(input: GalleryPreviewInput): GalleryPreviewSelection | null {
	if (isValidGalleryVideoUrl(input.video)) return { kind: "video", url: input.video };
	if (isValidGalleryImageUrl(input.image)) return { kind: "image", url: input.image };
	if (input.resourceTypes.includes("theme")) {
		const marker = input.themeName?.trim() || "theme";
		return { kind: "generated-theme", marker };
	}
	return null;
}

function isPathInsideRoot(root: string, candidate: string): boolean {
	const rel = relative(root, candidate);
	return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

function realpathIfPossible(path: string): string {
	try {
		return realpathSync(path);
	} catch {
		return resolve(path);
	}
}

export function isPathInsideRootByRealpath(packageRoot: string, candidatePath: string): boolean {
	const root = resolve(packageRoot);
	const candidate = resolve(candidatePath);
	if (!isPathInsideRoot(root, candidate)) return false;
	if (!existsSync(candidate)) return true;
	return isPathInsideRoot(realpathIfPossible(root), realpathIfPossible(candidate));
}

export function resolveManifestEntryInsideRoot(
	packageRoot: string,
	entry: string,
	baseDir = packageRoot,
): string | undefined {
	const trimmed = entry.trim();
	if (!trimmed || isAbsolute(trimmed)) return undefined;
	const root = resolve(packageRoot);
	const base = resolve(baseDir);
	if (!isPathInsideRootByRealpath(root, base)) return undefined;
	const candidate = resolve(base, trimmed);
	if (!isPathInsideRootByRealpath(root, candidate)) return undefined;
	return (relative(root, candidate) || ".").replace(/\\/g, "/");
}

export function filterManifestEntriesInsideRoot(packageRoot: string, entries: readonly string[]): string[] {
	const safeEntries: string[] = [];
	for (const entry of entries) {
		const safeEntry = resolveManifestEntryInsideRoot(packageRoot, entry);
		if (safeEntry && safeEntry !== ".") {
			safeEntries.push(safeEntry);
		}
	}
	return safeEntries;
}

function requireNonEmpty(value: string, label: string): string {
	const trimmed = value.trim();
	if (!trimmed) throw new Error(`${label} must not be empty`);
	return trimmed;
}

function buildGallerySource(source: GalleryInstallSource): { kind: GalleryInstallSourceKind; source: string } {
	if (source.kind === "npm") {
		const name = requireNonEmpty(source.name, "npm package name");
		const versionVerdict = validateExactNpmVersion(source.version);
		if (!versionVerdict.ok) {
			throw new Error(
				`Gallery npm installs require an exact pinned version for ${name}. ${versionVerdict.message}.`,
			);
		}
		return { kind: "npm", source: `npm:${name}@${versionVerdict.version}` };
	}
	if (source.kind === "git") {
		const repo = requireNonEmpty(source.repo, "git repository").replace(/^git:/, "");
		const refVerdict = validateGitRef(source.ref);
		if (!refVerdict.ok) {
			throw new Error(`Gallery git installs require a full commit SHA for ${repo}. ${refVerdict.message}.`);
		}
		return { kind: "git", source: `git:${repo}@${refVerdict.commit}` };
	}
	return { kind: "local", source: requireNonEmpty(source.path, "local path") };
}

export function buildGalleryInstallSpec(
	input: GalleryInstallSource,
	hasExtension: boolean,
	options: GalleryInstallOptions = {},
): GalleryInstallSpec {
	const source = buildGallerySource(input);
	const localFlag = options.local ? " -l" : "";
	return {
		kind: source.kind,
		source: source.source,
		installCommand: `omk install ${source.source}${localFlag}`,
		tryEphemeralCommand: `omk -e ${source.source}`,
		trust: hasExtension ? "code-execution" : "declarative",
	};
}

function stripComments(sourceText: string, stripStrings: boolean): string {
	let output = "";
	let index = 0;
	while (index < sourceText.length) {
		const current = sourceText[index];
		const next = sourceText[index + 1];
		if (current === "/" && next === "/") {
			index += 2;
			while (index < sourceText.length && sourceText[index] !== "\n") index += 1;
			output += "\n";
			index += 1;
			continue;
		}
		if (current === "/" && next === "*") {
			index += 2;
			while (index < sourceText.length && !(sourceText[index] === "*" && sourceText[index + 1] === "/")) index += 1;
			index += 2;
			output += " ";
			continue;
		}
		if (stripStrings && (current === '"' || current === "'" || current === "`")) {
			const quote = current;
			index += 1;
			while (index < sourceText.length) {
				if (sourceText[index] === "\\") {
					index += 2;
					continue;
				}
				if (sourceText[index] === quote) {
					index += 1;
					break;
				}
				index += 1;
			}
			output += " ";
			continue;
		}
		output += current;
		index += 1;
	}
	return output;
}

function capabilityOrder(badge: ExtensionCapabilityBadge): number {
	return CAPABILITY_ORDER.indexOf(badge);
}

export function inferExtensionCapabilityBadges(sourceText: string): ExtensionCapabilityBadge[] {
	const withoutComments = stripComments(sourceText, false);
	const code = stripComments(sourceText, true);
	const badges = new Set<ExtensionCapabilityBadge>();

	if (/\bomk\s*\.\s*registerTool\s*\(/.test(code)) badges.add("tools");
	if (/\bomk\s*\.\s*registerCommand\s*\(/.test(code)) badges.add("commands");
	if (/\bomk\s*\.\s*on\s*\(/.test(code) || /\bregisterHook\s*\(/.test(code)) badges.add("hooks");
	if (/\bomk\s*\.\s*registerProvider\s*\(/.test(code)) badges.add("provider");
	if (
		/\bomk\s*\.\s*(registerShortcut|registerFlag|registerMessageRenderer|registerComponent|setFooter)\s*\(/.test(code)
	) {
		badges.add("ui");
	}
	if (/\bomk\s*\.\s*on\s*\(\s*(["'`])(?:session_before_compact|session_compact|context)\1/.test(withoutComments)) {
		badges.add("hooks");
		badges.add("compaction");
	}

	return [...badges].sort((left, right) => capabilityOrder(left) - capabilityOrder(right));
}

function identityKey(identity: GalleryEntryIdentity): string {
	if (identity.kind === "npm") return `npm:${identity.name.trim().toLowerCase()}`;
	if (identity.kind === "git") {
		const repo = identity.repo
			.trim()
			.replace(/^git:/, "")
			.replace(/\.git$/i, "")
			.toLowerCase();
		return `git:${repo}`;
	}
	return `local:${resolve(identity.path)}`;
}

export function dedupeGalleryEntries<T extends GalleryEntryWithIdentity>(entries: readonly T[]): T[] {
	const seen = new Set<string>();
	const result: T[] = [];
	for (const entry of entries) {
		const key = identityKey(entry.identity);
		if (seen.has(key)) continue;
		seen.add(key);
		result.push(entry);
	}
	return result;
}

/**
 * Procurement-derived safe-gate outcome for an unpromoted (ephemeral trial) gallery install.
 *
 * Closes G9: gallery trust is derived from capability scan and procurement verdicts, not
 * from manifest claims. A trial is "admitted" only when the source is exact-pinned, carries
 * no hard-block capability (credential reads, host sockets), and passed explicit license,
 * lifecycle, and path-compatibility gates. Procurement rejection reasons are surfaced
 * verbatim so callers can show why an unpromoted trial would be blocked.
 */
export type GalleryTrialGateOutcome = "admitted" | "blocked";

export interface GalleryTrialGateStatus {
	readonly outcome: GalleryTrialGateOutcome;
	readonly identity: string;
	readonly adoption: Adoption;
	readonly pinned: boolean;
	readonly reasons: readonly string[];
}

/**
 * Structural subset of a procurement review consumed by the trial gate. The full procurement
 * review (`ProcurementReview`) satisfies this shape, so callers may pass `procureCandidate(...)`
 * output directly; tests can construct focused reviews without the full procurement input.
 */
export interface GalleryTrialGateReview {
	readonly pinned: boolean;
	readonly capabilities: readonly string[];
	readonly adoption: Adoption;
	readonly rejectedReasons: readonly string[];
	readonly licenseVerdict?: GateVerdict;
	readonly lifecycleVerdict?: GateVerdict;
	readonly pathCompatibility?: PathCompatibility;
	readonly candidate?: { readonly expectedResources?: readonly string[] };
}

const TRIAL_HARD_BLOCK_CAPABILITIES: ReadonlySet<string> = new Set(["credential-read", "host-socket"]);
const CODE_EXECUTION_RESOURCES: ReadonlySet<string> = new Set(["extension", "tool"]);
const CODE_EXECUTION_CAPABILITIES: ReadonlySet<string> = new Set([
	"browser-control",
	"child-process",
	"credential-read",
	"filesystem-write",
	"host-socket",
	"network",
]);

function pushUniqueReason(reasons: string[], reason: string): void {
	if (!reasons.includes(reason)) reasons.push(reason);
}

/**
 * Classify whether a candidate package may be safely admitted to an unpromoted (ephemeral,
 * sandboxed, `--ignore-scripts`) trial. Pure and deterministic: identical inputs always
 * produce identical output, and no I/O is performed.
 */
export function assessGalleryTrialGate(
	identity: GalleryEntryIdentity,
	review: GalleryTrialGateReview,
): GalleryTrialGateStatus {
	const hardBlocks = review.capabilities.filter((capability) => TRIAL_HARD_BLOCK_CAPABILITIES.has(capability));
	const reasons: string[] = [];
	if (!review.pinned) pushUniqueReason(reasons, "exact-pin-required");
	if (hardBlocks.length > 0) pushUniqueReason(reasons, `capability-hard-block: ${hardBlocks.join(",")}`);
	if (review.licenseVerdict === "reject") pushUniqueReason(reasons, "license-blocked");
	if (review.lifecycleVerdict === "reject") pushUniqueReason(reasons, "lifecycle-scripts-blocked");
	if (review.pathCompatibility === "pi-hardcoded") pushUniqueReason(reasons, "pi-hardcoded-paths");
	if (review.adoption === "reject") {
		for (const reason of review.rejectedReasons) pushUniqueReason(reasons, reason);
	}

	const blocked =
		!review.pinned ||
		hardBlocks.length > 0 ||
		review.licenseVerdict === "reject" ||
		review.lifecycleVerdict === "reject" ||
		review.pathCompatibility === "pi-hardcoded" ||
		review.adoption === "reject";

	return {
		outcome: blocked ? "blocked" : "admitted",
		identity: identityKey(identity),
		adoption: review.adoption,
		pinned: review.pinned,
		reasons,
	};
}

export function deriveGalleryInstallTrustFromReview(review: GalleryTrialGateReview): GalleryInstallTrust {
	const expectedResources = review.candidate?.expectedResources ?? [];
	if (expectedResources.some((resource) => CODE_EXECUTION_RESOURCES.has(resource))) return "code-execution";
	if (review.capabilities.some((capability) => CODE_EXECUTION_CAPABILITIES.has(capability))) return "code-execution";
	return "declarative";
}

export function buildGalleryInstallSpecFromReview(
	input: GalleryInstallSource,
	review: GalleryTrialGateReview,
	options: GalleryInstallOptions = {},
): GalleryInstallSpec {
	const spec = buildGalleryInstallSpec(input, false, options);
	const gate = assessGalleryTrialGate(galleryIdentityFromInstallSource(input), review);
	if (gate.outcome === "blocked") {
		throw new Error(`Gallery trial blocked for ${gate.identity}: ${gate.reasons.join(", ")}`);
	}
	return { ...spec, trust: deriveGalleryInstallTrustFromReview(review) };
}

function galleryIdentityFromInstallSource(input: GalleryInstallSource): GalleryEntryIdentity {
	if (input.kind === "npm") return { kind: "npm", name: input.name };
	if (input.kind === "git") return { kind: "git", repo: input.repo, ref: input.ref };
	return { kind: "local", path: input.path };
}
