/** Open a URL or file path in the default browser/application. Best-effort, never throws. */
export function openPath(urlOrPath: string): void {
	let cmd: string[];
	switch (process.platform) {
		case "darwin":
			cmd = ["open", urlOrPath];
			break;
		case "win32":
			cmd = ["rundll32", "url.dll,FileProtocolHandler", urlOrPath];
			break;
		default:
			cmd = ["xdg-open", urlOrPath];
			break;
	}
	try {
		Bun.spawn(cmd, { stdout: "ignore", stderr: "ignore", windowsHide: true });
	} catch {
		// Best-effort: browser opening is non-critical
	}
}
