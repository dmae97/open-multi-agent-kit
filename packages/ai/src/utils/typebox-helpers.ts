import { type TUnsafe, Type } from "@sinclair/typebox";

/**
 * Creates a string enum schema compatible with Google's API and other providers
 * that don't support anyOf/const patterns.
 *
 * @example
 * const OperationSchema = StringEnum(["add", "subtract", "multiply", "divide"], {
 *   description: "The operation to perform"
 * });
 *
 * type Operation = Static<typeof OperationSchema>; // "add" | "subtract" | "multiply" | "divide"
 */
export function StringEnum<const T extends readonly string[]>(
	values: T,
	options?: { description?: string; default?: T[number] },
): TUnsafe<T[number]> {
	return Type.Unsafe<T[number]>({
		type: "string",
		enum: values as unknown as string[],
		...(options?.description && { description: options.description }),
		...(options?.default && { default: options.default }),
	});
}

export const NO_STRICT = Bun.env.PI_NO_STRICT === "1";

/**
 * Recursively enforces JSON Schema constraints required by OpenAI/Codex strict mode:
 *   - `additionalProperties: false` on every object node
 *   - every key in `properties` present in `required`
 *
 * Properties absent from the original `required` array were TypeBox-optional.
 * They are made nullable (`anyOf: [T, { type: "null" }]`) so the model can
 * signal omission by outputting null rather than omitting the key entirely.
 */
export function enforceStrictSchema(schema: Record<string, unknown>): Record<string, unknown> {
	const result = { ...schema };
	if (result.type === "object") {
		result.additionalProperties = false;
		const propertiesValue = result.properties;
		const props =
			propertiesValue != null && typeof propertiesValue === "object" && !Array.isArray(propertiesValue)
				? (propertiesValue as Record<string, unknown>)
				: {};
		const originalRequired = new Set(
			Array.isArray(result.required)
				? result.required.filter((value): value is string => typeof value === "string")
				: [],
		);
		const strictProperties = Object.fromEntries(
			Object.entries(props).map(([key, value]) => {
				const processed =
					value != null && typeof value === "object" && !Array.isArray(value)
						? enforceStrictSchema(value as Record<string, unknown>)
						: value;
				// Optional property — wrap as nullable so strict mode accepts it
				if (!originalRequired.has(key)) {
					return [key, { anyOf: [processed, { type: "null" }] }];
				}
				return [key, processed];
			}),
		);
		result.properties = strictProperties;
		result.required = Object.keys(strictProperties);
	}
	if (result.items != null && typeof result.items === "object" && !Array.isArray(result.items)) {
		result.items = enforceStrictSchema(result.items as Record<string, unknown>);
	}
	for (const key of ["anyOf", "allOf", "oneOf"] as const) {
		if (Array.isArray(result[key])) {
			result[key] = (result[key] as unknown[]).map(entry =>
				entry != null && typeof entry === "object" && !Array.isArray(entry)
					? enforceStrictSchema(entry as Record<string, unknown>)
					: entry,
			);
		}
	}
	return result;
}
