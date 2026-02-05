export class GitError extends Error {
	constructor(
		readonly command: string,
		readonly stderr: string,
	) {
		super(`${command} failed: ${stderr || "unknown error"}`);
		this.name = "GitError";
	}
}
