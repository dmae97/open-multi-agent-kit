import type { Command } from "commander";

export function registerProviderCommands(program: Command): void {
  const provider = program.command("provider").description("Provider routing and availability utilities");
  provider
    .command("doctor [provider]")
    .description("Check provider availability without exposing credentials")
    .option("--json", "Output JSON")
    .option("--soft", "Do not set a failing exit code when unavailable")
    .action(async (target, options) => {
      const { providerDoctorCommand } = await import("../commands/provider.js");
      await providerDoctorCommand(target, options);
    });
  const deepseekProvider = provider.command("deepseek").description("Manage DeepSeek opportunistic workers");
  deepseekProvider
    .command("enable")
    .description("Enable DeepSeek opportunistic read-only workers")
    .option("--json", "Output JSON")
    .action(async (options) => {
      const { providerDeepSeekEnableCommand } = await import("../commands/provider.js");
      await providerDeepSeekEnableCommand(options);
    });
  deepseekProvider
    .command("disable [reason]")
    .description("Disable DeepSeek workers and force Kimi-only fallback")
    .option("--json", "Output JSON")
    .action(async (reason, options) => {
      const { providerDeepSeekDisableCommand } = await import("../commands/provider.js");
      await providerDeepSeekDisableCommand(reason, options);
    });
  deepseekProvider
    .command("set")
    .description("Save DeepSeek API key via masked prompt, stdin, or --from-env")
    .option("--from-env <name>", "Read API key from an environment variable")
    .option("--json", "Output JSON")
    .action(async (options) => {
      const { providerDeepSeekSetCommand } = await import("../commands/provider.js");
      await providerDeepSeekSetCommand(options);
    });

  const deepseek = program.command("deepseek").description("Manage official DeepSeek API access and OMK provider routing");
  deepseek
    .command("api")
    .alias("set")
    .description("Set the official DeepSeek API key via masked prompt, stdin, or --from-env")
    .option("--from-env <name>", "Read API key from an environment variable")
    .option("--json", "Output JSON")
    .action(async (options) => {
      const { providerDeepSeekApiCommand } = await import("../commands/provider.js");
      await providerDeepSeekApiCommand(options);
    });
  deepseek
    .command("enable")
    .description("Enable DeepSeek opportunistic read-only/advisory workers")
    .option("--json", "Output JSON")
    .action(async (options) => {
      const { providerDeepSeekEnableCommand } = await import("../commands/provider.js");
      await providerDeepSeekEnableCommand(options);
    });
  deepseek
    .command("disable [reason]")
    .description("Disable DeepSeek workers and force Kimi-only fallback")
    .option("--json", "Output JSON")
    .action(async (reason, options) => {
      const { providerDeepSeekDisableCommand } = await import("../commands/provider.js");
      await providerDeepSeekDisableCommand(reason, options);
    });
  deepseek
    .command("doctor")
    .alias("status")
    .description("Check DeepSeek API key, enabled state, and balance without exposing credentials")
    .option("--json", "Output JSON")
    .option("--soft", "Do not set a failing exit code when unavailable")
    .action(async (options) => {
      const { providerDoctorCommand } = await import("../commands/provider.js");
      await providerDoctorCommand("deepseek", options);
    });

  program
    .command("deepseekset")
    .description("Alias: save DeepSeek API key via masked prompt, stdin, or --from-env")
    .option("--from-env <name>", "Read API key from an environment variable")
    .option("--json", "Output JSON")
    .action(async (options) => {
      const { providerDeepSeekSetCommand } = await import("../commands/provider.js");
      await providerDeepSeekSetCommand(options);
    });
}
