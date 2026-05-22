/**
 * `omk rail` — thin alias for cockpit --view rail
 */

import { cockpitCommand, type CockpitCommandOptions } from "./cockpit.js";

export type RailCommandOptions = Omit<CockpitCommandOptions, "view">;

export async function railCommand(options: RailCommandOptions = {}): Promise<void> {
  await cockpitCommand({ ...options, view: "rail" });
}
