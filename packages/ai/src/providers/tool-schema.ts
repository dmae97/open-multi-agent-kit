import type { Tool } from "../types.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Provider APIs validate JSON Schema more strictly than TypeScript callers do.
 * Some tool sources serialize optional/no-argument schemas with `required: null`,
 * but JSON Schema and OpenAI function tools require `required` to be an array when
 * present. Absence already means no required fields, so drop nullish `required`
 * keys while preserving valid arrays and other schema content.
 */
export function normalizeToolParameters(parameters: Tool["parameters"]): Record<string, unknown> {
	const normalize = (value: unknown): unknown => {
		if (Array.isArray(value)) {
			return value.map((item) => normalize(item));
		}
		if (!isRecord(value)) {
			return value;
		}

		const result: Record<string, unknown> = {};
		for (const [key, child] of Object.entries(value)) {
			if (key === "required" && child == null) {
				continue;
			}
			result[key] = normalize(child);
		}
		return result;
	};

	const normalized = normalize(parameters);
	if (isRecord(normalized)) {
		return normalized;
	}
	return { type: "object", properties: {} };
}
