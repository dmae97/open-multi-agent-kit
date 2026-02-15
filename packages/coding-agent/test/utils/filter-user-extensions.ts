import * as path from "node:path";
import { getAgentDir } from "@oh-my-pi/pi-utils/dirs";

export function filterUserExtensions<T extends { path: string }>(extensions: T[]): T[] {
	const userExtensionsDir = path.join(getAgentDir(), "extensions");
	return extensions.filter(ext => !ext.path.startsWith(userExtensionsDir));
}
