/**
 * Grafana Pyroscope continuous profiling integration.
 *
 * Sends CPU and heap profiles to a Pyroscope server for continuous profiling.
 * Enable via settings or environment variables:
 *   - PYROSCOPE_URL (required to enable)
 *   - PYROSCOPE_APP_NAME (defaults to APP_NAME)
 *   - PYROSCOPE_BASIC_AUTH_USER
 *   - PYROSCOPE_BASIC_AUTH_PASSWORD
 *   - PYROSCOPE_TENANT_ID
 *   - PYROSCOPE_FLUSH_INTERVAL_MS (default: 60000)
 *
 * @see https://grafana.com/docs/pyroscope/latest/configure-client/language-sdks/nodejs/
 */
import * as os from "node:os";
import { getEnv, logger } from "@oh-my-pi/pi-utils";
import { APP_NAME, VERSION } from "../config";

interface PyroscopeClient {
	init(config: Record<string, unknown>): void;
	start(): void;
	stop(): Promise<void>;
	setLabels(labels: Record<string, string | number>): void;
	getLabels(): Record<string, string | number>;
}

let client: PyroscopeClient | null = null;
let isStarted = false;

export interface PyroscopeInitOptions {
	/** Pyroscope server URL (e.g., http://localhost:4040 or Grafana Cloud URL) */
	serverAddress?: string;
	/** Application name label */
	appName?: string;
	/** Basic auth username (e.g., Grafana Cloud stack user ID) */
	basicAuthUser?: string;
	/** Basic auth password (e.g., Grafana Cloud API key) */
	basicAuthPassword?: string;
	/** Tenant ID for multi-tenant Pyroscope servers */
	tenantID?: string;
	/** Flush interval in milliseconds (default: 60000) */
	flushIntervalMs?: number;
	/** Additional static tags */
	tags?: Record<string, string | number>;
	/** Enable CPU/wall profiling (default: true) */
	enableWall?: boolean;
	/** Enable heap profiling (default: true) */
	enableHeap?: boolean;
}

/**
 * Initialize and start Pyroscope profiling.
 *
 * Should be called early in startup, before heavy work begins.
 * Does nothing if serverAddress is not configured.
 *
 * @returns true if Pyroscope was started, false otherwise
 */
export async function initPyroscope(options: PyroscopeInitOptions = {}): Promise<boolean> {
	if (isStarted) {
		logger.debug("Pyroscope: already started");
		return true;
	}

	const serverAddress = options.serverAddress || getEnv("PYROSCOPE_URL");

	if (!serverAddress) {
		logger.debug("Pyroscope: no server address configured, skipping");
		return false;
	}

	const appName = options.appName || getEnv("PYROSCOPE_APP_NAME") || APP_NAME;
	const basicAuthUser = options.basicAuthUser || getEnv("PYROSCOPE_BASIC_AUTH_USER");
	const basicAuthPassword = options.basicAuthPassword || getEnv("PYROSCOPE_BASIC_AUTH_PASSWORD");
	const tenantID = options.tenantID || getEnv("PYROSCOPE_TENANT_ID");
	const flushIntervalMs = options.flushIntervalMs ?? 60000;

	const tags: Record<string, string | number> = {
		version: VERSION,
		hostname: os.hostname(),
		pid: process.pid,
		...(options.tags || {}),
	};

	try {
		const mod = await import("@pyroscope/nodejs");
		client = mod.default as unknown as PyroscopeClient;

		client.init({
			serverAddress,
			appName,
			basicAuthUser,
			basicAuthPassword,
			tenantID,
			flushIntervalMs,
			tags,
		});

		client.start();
		isStarted = true;

		logger.debug("Pyroscope: profiling started", {
			serverAddress: serverAddress.replace(/\/\/[^:]+:[^@]+@/, "//***:***@"),
			appName,
			flushIntervalMs,
		});

		return true;
	} catch (err) {
		logger.warn("Pyroscope: failed to initialize", {
			error: err instanceof Error ? err.message : String(err),
		});
		return false;
	}
}

/**
 * Stop Pyroscope profiling and flush remaining data.
 *
 * Call during graceful shutdown.
 */
export async function stopPyroscope(): Promise<void> {
	if (!isStarted || !client) {
		return;
	}

	try {
		await client.stop();
		isStarted = false;
		logger.debug("Pyroscope: profiling stopped");
	} catch (err) {
		logger.warn("Pyroscope: error during stop", {
			error: err instanceof Error ? err.message : String(err),
		});
	}
}

/**
 * Set dynamic labels for the current profiling context.
 *
 * Use for request-scoped labels like session ID, model name, etc.
 */
export function setPyroscopeLabels(labels: Record<string, string | number>): void {
	if (!isStarted || !client) {
		return;
	}

	try {
		client.setLabels(labels);
	} catch (err) {
		logger.debug("Pyroscope: failed to set labels", {
			error: err instanceof Error ? err.message : String(err),
		});
	}
}

/**
 * Get current labels.
 */
export function getPyroscopeLabels(): Record<string, string | number> {
	if (!isStarted || !client) {
		return {};
	}

	try {
		return client.getLabels();
	} catch {
		return {};
	}
}

/**
 * Check if Pyroscope profiling is active.
 */
export function isPyroscopeActive(): boolean {
	return isStarted;
}
