import { describe, expect, it } from "bun:test";
import { enforceStrictSchema } from "@oh-my-pi/pi-ai/utils/typebox-helpers";
import { Type } from "@sinclair/typebox";

describe("enforceStrictSchema", () => {
	it("converts optional properties to nullable schemas and requires all object keys", () => {
		const schema = Type.Object({
			requiredText: Type.String(),
			optionalCount: Type.Optional(Type.Number()),
		});

		const strict = enforceStrictSchema(schema as unknown as Record<string, unknown>);
		const properties = strict.properties as Record<string, Record<string, unknown>>;

		expect(strict.required).toEqual(["requiredText", "optionalCount"]);
		expect((properties.requiredText.type as string) === "string").toBe(true);
		const optionalVariants = (properties.optionalCount.anyOf as Array<{ type?: string }>).map(v => v.type);
		expect(optionalVariants).toEqual(["number", "null"]);
	});

	it("never emits undefined as a schema type", () => {
		const schema = Type.Object({
			questions: Type.Array(
				Type.Object({
					id: Type.String(),
					recommended: Type.Optional(Type.Number()),
				}),
			),
		});

		const strict = enforceStrictSchema(schema as unknown as Record<string, unknown>);
		const serialized = JSON.stringify(strict);

		expect(serialized.includes('"undefined"')).toBe(false);
		expect(serialized.includes('"null"')).toBe(true);
	});

	it("normalizes malformed object nodes that declare required keys without properties", () => {
		const schema = {
			type: "object",
			required: ["data"],
		} as Record<string, unknown>;

		const strict = enforceStrictSchema(schema);

		expect(strict.properties).toEqual({});
		expect(strict.required).toEqual([]);
		expect(strict.additionalProperties).toBe(false);
	});

	it("repairs malformed object branches nested under anyOf", () => {
		const schema = {
			type: "object",
			properties: {
				result: {
					anyOf: [
						{ type: "object", required: ["data"] },
						{ type: "object", properties: { error: { type: "string" } }, required: ["error"] },
					],
				},
			},
			required: ["result"],
		} as Record<string, unknown>;

		const strict = enforceStrictSchema(schema);
		const rootProps = strict.properties as Record<string, Record<string, unknown>>;
		const resultSchema = rootProps.result;
		const branches = resultSchema.anyOf as Array<Record<string, unknown>>;
		const malformedBranch = branches[0];
		const validBranch = branches[1];

		expect(malformedBranch.properties).toEqual({});
		expect(malformedBranch.required).toEqual([]);
		expect(malformedBranch.additionalProperties).toBe(false);
		expect(validBranch.required).toEqual(["error"]);
		expect(validBranch.additionalProperties).toBe(false);
	});
});
