import type { Subprocess } from "bun";
import { killProcessTree } from "../../utils/shell";
import { logger } from "../logger";
import { OutputSink, pumpStream } from "../streaming-output";
import { DEFAULT_MAX_BYTES } from "../tools/truncate";
import { ScopeSignal } from "../utils";
import { buildRemoteCommand, ensureConnection, ensureHostInfo, type SSHConnectionTarget } from "./connection-manager";
import { hasSshfs, mountRemote } from "./sshfs-mount";

export interface SSHExecutorOptions {
	/** Timeout in milliseconds */
	timeout?: number;
	/** Callback for streaming output chunks (already sanitized) */
	onChunk?: (chunk: string) => void;
	/** AbortSignal for cancellation */
	signal?: AbortSignal;
	/** Remote path to mount when sshfs is available */
	remotePath?: string;
	/** Wrap commands in a POSIX shell for compat mode */
	compatEnabled?: boolean;
}

export interface SSHResult {
	/** Combined stdout + stderr output (sanitized, possibly truncated) */
	output: string;
	/** Process exit code (undefined if killed/cancelled) */
	exitCode: number | undefined;
	/** Whether the command was cancelled via signal */
	cancelled: boolean;
	/** Whether the output was truncated */
	truncated: boolean;
	/** Path to temp file containing full output (if output exceeded truncation threshold) */
	fullOutputPath?: string;
}

function quoteForCompatShell(command: string): string {
	if (command.length === 0) {
		return "''";
	}
	const escaped = command.replace(/'/g, "'\\''");
	return `'${escaped}'`;
}

function buildCompatCommand(shell: "bash" | "sh", command: string): string {
	return `${shell} -c ${quoteForCompatShell(command)}`;
}

export async function executeSSH(
	host: SSHConnectionTarget,
	command: string,
	options?: SSHExecutorOptions,
): Promise<SSHResult> {
	await ensureConnection(host);
	if (hasSshfs()) {
		try {
			await mountRemote(host, options?.remotePath ?? "/");
		} catch (err) {
			logger.warn("SSHFS mount failed", { host: host.name, error: String(err) });
		}
	}

	using signal = new ScopeSignal(options);

	let resolvedCommand = command;
	if (options?.compatEnabled) {
		const info = await ensureHostInfo(host);
		if (info.compatShell) {
			resolvedCommand = buildCompatCommand(info.compatShell, command);
		} else {
			logger.warn("SSH compat enabled without detected compat shell", { host: host.name });
		}
	}
	const child: Subprocess = Bun.spawn(["ssh", ...buildRemoteCommand(host, resolvedCommand)], {
		stdin: "ignore",
		stdout: "pipe",
		stderr: "pipe",
	});

	signal.catch(() => {
		killProcessTree(child.pid);
	});

	const sink = new OutputSink(DEFAULT_MAX_BYTES, DEFAULT_MAX_BYTES * 2, options?.onChunk);

	const writer = sink.getWriter();
	try {
		await Promise.all([
			pumpStream(child.stdout as ReadableStream<Uint8Array>, writer),
			pumpStream(child.stderr as ReadableStream<Uint8Array>, writer),
		]);
	} finally {
		await writer.close();
	}

	const exitCode = await child.exited;
	const cancelled = exitCode === null || (exitCode !== 0 && (options?.signal?.aborted ?? false));

	if (signal.timedOut()) {
		const secs = Math.round(options!.timeout! / 1000);
		return {
			exitCode: undefined,
			cancelled: true,
			...sink.dump(`SSH command timed out after ${secs} seconds`),
		};
	}

	return {
		exitCode: cancelled ? undefined : exitCode,
		cancelled,
		...sink.dump(),
	};
}
