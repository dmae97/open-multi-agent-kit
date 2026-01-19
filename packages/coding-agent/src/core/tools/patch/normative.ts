/**
 * Normalize applied patch output into a canonical edit tool payload.
 */

import { generateUnifiedDiffString } from "./diff";
import { normalizeToLF, stripBom } from "./normalize";
import type { PatchInput } from "./types";

export interface NormativePatchOptions {
	path: string;
	rename?: string;
	oldContent: string;
	newContent: string;
	contextLines?: number;
	anchor?: string | string[];
}

/** Normative patch input is the MongoDB-style update variant */

function applyAnchors(diff: string, anchors: string[] | undefined): string {
	if (!anchors || anchors.length === 0) {
		return diff;
	}
	const lines = diff.split("\n");
	let anchorIndex = 0;
	for (let i = 0; i < lines.length; i++) {
		if (!lines[i].startsWith("@@")) continue;
		const anchor = anchors[anchorIndex];
		if (anchor !== undefined) {
			lines[i] = anchor.trim().length === 0 ? "@@" : `@@ ${anchor}`;
			anchorIndex++;
		}
	}
	return lines.join("\n");
}

export function buildNormativeUpdateInput(options: NormativePatchOptions): PatchInput {
	const normalizedOld = normalizeToLF(stripBom(options.oldContent).text);
	const normalizedNew = normalizeToLF(stripBom(options.newContent).text);
	const diffResult = generateUnifiedDiffString(normalizedOld, normalizedNew, options.contextLines ?? 3);
	const anchors = typeof options.anchor === "string" ? [options.anchor] : options.anchor;
	const diff = applyAnchors(diffResult.diff, anchors);
	return {
		path: options.path,
		op: "update",
		rename: options.rename,
		diff,
	};
}
