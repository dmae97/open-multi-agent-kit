export function sanitizeHostName(name: string): string {
	const sanitized = name.replace(/[^a-zA-Z0-9._-]+/g, "_");
	return sanitized.length > 0 ? sanitized : "remote";
}

export function buildSshTarget(username: string | undefined, host: string): string {
	return username ? `${username}@${host}` : host;
}
