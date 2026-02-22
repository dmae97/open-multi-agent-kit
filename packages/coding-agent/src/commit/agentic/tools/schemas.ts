import { Type } from "@sinclair/typebox";

export const commitTypeSchema = Type.Union([
	Type.Literal("feat"),
	Type.Literal("fix"),
	Type.Literal("refactor"),
	Type.Literal("perf"),
	Type.Literal("docs"),
	Type.Literal("test"),
	Type.Literal("build"),
	Type.Literal("ci"),
	Type.Literal("chore"),
	Type.Literal("style"),
	Type.Literal("revert"),
]);

export const detailSchema = Type.Object({
	text: Type.String(),
	changelog_category: Type.Optional(
		Type.Union([
			Type.Literal("Added"),
			Type.Literal("Changed"),
			Type.Literal("Fixed"),
			Type.Literal("Deprecated"),
			Type.Literal("Removed"),
			Type.Literal("Security"),
			Type.Literal("Breaking Changes"),
		]),
	),
	user_visible: Type.Optional(Type.Boolean()),
});
