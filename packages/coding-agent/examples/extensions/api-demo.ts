/**
 * API Demo Extension
 *
 * Demonstrates using ExtensionAPI's logger, typebox, and pi module access.
 * These features are now exposed directly on the ExtensionAPI, matching
 * the CustomToolAPI interface.
 */
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	// 1. Access TypeBox directly from pi.typebox (no separate import needed)
	const { Type } = pi.typebox;

	// 2. Access the logger for debugging
	pi.logger.debug("API demo extension loaded");

	// 3. Register a tool that uses all three API features
	// Import StringEnum from typebox helpers
	const { StringEnum } = pi.pi;

	pi.registerTool({
		name: "api_demo",
		label: "API Demo",
		description: "Demonstrates ExtensionAPI capabilities: logger, typebox, and pi module access",
		parameters: Type.Object({
			message: Type.String({ description: "Test message" }),
			logLevel: Type.Optional(
				StringEnum(["error", "warn", "debug"], {
					description: "Log level to use",
					default: "debug",
				}),
			),
		}),

		async execute(_toolCallId, params, _onUpdate, ctx, _signal) {
			const { message, logLevel = "debug" } = params as { message: string; logLevel?: "error" | "warn" | "debug" };

			// Use logger at specified level
			pi.logger[logLevel]("API demo tool executed", { message, logLevel });

			// Access pi module utilities
			const { logger: piLogger } = pi.pi;
			piLogger.debug("Accessed pi module from extension", { sessionFile: ctx.sessionManager.getSessionFile() });

			// Get session information
			const sessionInfo = `Session: ${ctx.sessionManager.getSessionFile()}`;
			const modelInfo = ctx.model ? `Model: ${ctx.model.id}` : "Model: none";

			return {
				content: [
					{
						type: "text",
						text: [
							`API Demo Tool executed successfully!`,
							``,
							`Message: ${message}`,
							`Log Level: ${logLevel}`,
							``,
							`Features demonstrated:`,
							`1. ✓ Logger access via pi.logger`,
							`2. ✓ TypeBox access via pi.typebox`,
							`3. ✓ Pi module access via pi.pi`,
							``,
							`Context:`,
							`- ${sessionInfo}`,
							`- ${modelInfo}`,
							`- CWD: ${ctx.cwd}`,
						].join("\n"),
					},
				],
				details: {
					message,
					logLevel,
					sessionFile: ctx.sessionManager.getSessionFile(),
					modelId: ctx.model?.id,
				},
			};
		},
	});

	// Demonstrate event handling with logger
	pi.on("session_start", async () => {
		pi.logger.debug("Session started", { extension: "api-demo" });
	});

	pi.on("agent_start", async () => {
		pi.logger.debug("Agent started", { extension: "api-demo" });
	});
}
