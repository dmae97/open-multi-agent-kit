import { $env, $flag } from "@oh-my-pi/pi-utils";

export type EditMode = "replace" | "patch" | "hashline" | "chunk" | "vim";
export type EditToolName = "edit" | "vim";

export const DEFAULT_EDIT_MODE: EditMode = "hashline";

const EDIT_MODE_IDS = {
	chunk: "chunk",
	hashline: "hashline",
	patch: "patch",
	replace: "replace",
	vim: "vim",
} as const satisfies Record<string, EditMode>;

export const EDIT_MODES = Object.keys(EDIT_MODE_IDS) as EditMode[];

export function normalizeEditMode(mode?: string | null): EditMode | undefined {
	if (!mode) return undefined;
	return EDIT_MODE_IDS[mode as keyof typeof EDIT_MODE_IDS];
}

export interface EditModeSettingsLike {
	get(key: "edit.mode"): unknown;
	getEditVariantForModel?(model: string | undefined): EditMode | null;
}

export interface EditModeSessionLike {
	settings: EditModeSettingsLike;
	getActiveModelString?: () => string | undefined;
}

export function resolveEditMode(session: EditModeSessionLike): EditMode {
	const activeModel = session.getActiveModelString?.();
	const modelVariant = session.settings.getEditVariantForModel?.(activeModel);
	if (modelVariant) return modelVariant;

	const envMode = normalizeEditMode($env.PI_EDIT_VARIANT);
	if (envMode) return envMode;

	if (!$flag("PI_STRICT_EDIT_MODE")) {
		if (activeModel?.includes("spark")) return "replace";
		if (activeModel?.includes("nano")) return "replace";
		if (activeModel?.includes("mini")) return "replace";
		if (activeModel?.includes("haiku")) return "replace";
		if (activeModel?.includes("flash")) return "replace";
	}

	const settingsMode = normalizeEditMode(String(session.settings.get("edit.mode") ?? ""));
	return settingsMode ?? DEFAULT_EDIT_MODE;
}

export function resolveEditToolName(session: EditModeSessionLike): EditToolName {
	return resolveEditMode(session) === "vim" ? "vim" : "edit";
}

export function resolveInactiveEditToolName(session: EditModeSessionLike): EditToolName {
	return resolveEditToolName(session) === "edit" ? "vim" : "edit";
}

export function filterInactiveEditToolName(toolNames: Iterable<string>, session: EditModeSessionLike): string[] {
	const inactiveEditToolName = resolveInactiveEditToolName(session);
	return Array.from(toolNames).filter(name => name !== inactiveEditToolName);
}

export function normalizeToolNamesForEditMode(
	toolNames: Iterable<string> | undefined,
	session: EditModeSessionLike,
): string[] | undefined {
	if (!toolNames) return undefined;

	const normalized: string[] = [];
	const seen = new Set<string>();
	const activeEditToolName = resolveEditToolName(session);

	for (const rawName of toolNames) {
		const lowerName = rawName.toLowerCase();
		const nextName = lowerName === "edit" || lowerName === "vim" ? activeEditToolName : lowerName;
		if (seen.has(nextName)) continue;
		seen.add(nextName);
		normalized.push(nextName);
	}

	return normalized;
}
