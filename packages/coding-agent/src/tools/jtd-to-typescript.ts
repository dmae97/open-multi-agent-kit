/**
 * Convert JSON Type Definition (JTD) to TypeScript interface notation.
 *
 * Produces human-readable TypeScript for embedding in system prompts,
 * helping models understand expected output structure.
 */

type JTDPrimitive =
	| "boolean"
	| "string"
	| "timestamp"
	| "float32"
	| "float64"
	| "int8"
	| "uint8"
	| "int16"
	| "uint16"
	| "int32"
	| "uint32";

interface JTDType {
	type: JTDPrimitive;
}

interface JTDEnum {
	enum: string[];
}

interface JTDElements {
	elements: JTDSchema;
}

interface JTDValues {
	values: JTDSchema;
}

interface JTDProperties {
	properties?: Record<string, JTDSchema>;
	optionalProperties?: Record<string, JTDSchema>;
}

interface JTDDiscriminator {
	discriminator: string;
	mapping: Record<string, JTDProperties>;
}

interface JTDRef {
	ref: string;
}

type JTDSchema = JTDType | JTDEnum | JTDElements | JTDValues | JTDProperties | JTDDiscriminator | JTDRef | object;

const primitiveMap: Record<JTDPrimitive, string> = {
	boolean: "boolean",
	string: "string",
	timestamp: "string",
	float32: "number",
	float64: "number",
	int8: "number",
	uint8: "number",
	int16: "number",
	uint16: "number",
	int32: "number",
	uint32: "number",
};

function isJTDType(schema: unknown): schema is JTDType {
	return typeof schema === "object" && schema !== null && "type" in schema;
}

function isJTDEnum(schema: unknown): schema is JTDEnum {
	return typeof schema === "object" && schema !== null && "enum" in schema && Array.isArray((schema as JTDEnum).enum);
}

function isJTDElements(schema: unknown): schema is JTDElements {
	return typeof schema === "object" && schema !== null && "elements" in schema;
}

function isJTDValues(schema: unknown): schema is JTDValues {
	return typeof schema === "object" && schema !== null && "values" in schema;
}

function isJTDProperties(schema: unknown): schema is JTDProperties {
	return typeof schema === "object" && schema !== null && ("properties" in schema || "optionalProperties" in schema);
}

function isJTDDiscriminator(schema: unknown): schema is JTDDiscriminator {
	return typeof schema === "object" && schema !== null && "discriminator" in schema && "mapping" in schema;
}

function isJTDRef(schema: unknown): schema is JTDRef {
	return typeof schema === "object" && schema !== null && "ref" in schema;
}

function convertToTypeScript(schema: unknown, inline = false): string {
	if (schema === null || schema === undefined || (typeof schema === "object" && Object.keys(schema).length === 0)) {
		return "unknown";
	}

	if (isJTDType(schema)) {
		const tsType = primitiveMap[schema.type as JTDPrimitive];
		return tsType ?? "unknown";
	}

	if (isJTDEnum(schema)) {
		return schema.enum.map(v => `"${v}"`).join(" | ");
	}

	if (isJTDElements(schema)) {
		const itemType = convertToTypeScript(schema.elements, true);
		if (itemType.includes("\n") || itemType.length > 40) {
			return `Array<${itemType}>`;
		}
		return `${itemType}[]`;
	}

	if (isJTDValues(schema)) {
		const valueType = convertToTypeScript(schema.values, true);
		return `Record<string, ${valueType}>`;
	}

	if (isJTDProperties(schema)) {
		const lines: string[] = [];
		lines.push("{");

		if (schema.properties) {
			for (const [key, value] of Object.entries(schema.properties)) {
				const propType = convertToTypeScript(value, true);
				const safeName = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
				lines.push(`  ${safeName}: ${propType};`);
			}
		}

		if (schema.optionalProperties) {
			for (const [key, value] of Object.entries(schema.optionalProperties)) {
				const propType = convertToTypeScript(value, true);
				const safeName = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
				lines.push(`  ${safeName}?: ${propType};`);
			}
		}

		lines.push("}");

		if (inline && lines.length <= 4) {
			// Compact single-line for small objects
			const props = lines.slice(1, -1).map(l => l.trim());
			if (props.join(" ").length < 60) {
				return `{ ${props.join(" ")} }`;
			}
		}

		return lines.join("\n");
	}

	if (isJTDDiscriminator(schema)) {
		const variants: string[] = [];
		for (const [tag, props] of Object.entries(schema.mapping)) {
			const propsType = convertToTypeScript(props, true);
			if (propsType === "{}") {
				variants.push(`{ ${schema.discriminator}: "${tag}" }`);
			} else {
				// Merge discriminator into props
				const inner = propsType.slice(1, -1).trim();
				variants.push(`{ ${schema.discriminator}: "${tag}"; ${inner} }`);
			}
		}
		return variants.join(" | ");
	}

	if (isJTDRef(schema)) {
		return schema.ref;
	}

	return "unknown";
}

/**
 * Convert JTD schema to TypeScript interface string.
 *
 * @example
 * ```ts
 * const schema = {
 *   properties: {
 *     name: { type: "string" },
 *     count: { type: "int32" }
 *   }
 * };
 * jtdToTypeScript(schema);
 * // Returns:
 * // {
 * //   name: string;
 * //   count: number;
 * // }
 * ```
 */
export function jtdToTypeScript(schema: unknown): string {
	return convertToTypeScript(schema, false);
}
