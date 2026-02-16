/** Add global flag while preserving user-provided flags. */
function enforceGlobalFlag(flags: string): string {
	return flags.includes("g") ? flags : `${flags}g`;
}

/** Compile a secret regex entry with global scanning enabled by default. */
export function compileSecretRegex(pattern: string, flags?: string): RegExp {
	return new RegExp(pattern, enforceGlobalFlag(flags ?? ""));
}
