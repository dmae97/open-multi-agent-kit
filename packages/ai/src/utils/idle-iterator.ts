import { $env } from "@oh-my-pi/pi-utils";

const DEFAULT_OPENAI_STREAM_IDLE_TIMEOUT_MS = 45_000;

function normalizeIdleTimeoutMs(value: string | undefined, fallback: number): number | undefined {
	if (value === undefined) return fallback;
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return fallback;
	if (parsed <= 0) return undefined;
	return Math.trunc(parsed);
}

/**
 * Returns the idle timeout used for OpenAI-family streaming transports.
 *
 * Set `PI_OPENAI_STREAM_IDLE_TIMEOUT_MS=0` to disable the watchdog.
 */
export function getOpenAIStreamIdleTimeoutMs(): number | undefined {
	return normalizeIdleTimeoutMs($env.PI_OPENAI_STREAM_IDLE_TIMEOUT_MS, DEFAULT_OPENAI_STREAM_IDLE_TIMEOUT_MS);
}

export interface IdleTimeoutIteratorOptions {
	idleTimeoutMs?: number;
	errorMessage: string;
	onIdle?: () => void;
}

/**
 * Yields items from an async iterable while enforcing a maximum idle gap between items.
 */
export async function* iterateWithIdleTimeout<T>(
	iterable: AsyncIterable<T>,
	options: IdleTimeoutIteratorOptions,
): AsyncGenerator<T> {
	if (options.idleTimeoutMs === undefined || options.idleTimeoutMs <= 0) {
		for await (const item of iterable) {
			yield item;
		}
		return;
	}

	const iterator = iterable[Symbol.asyncIterator]();

	while (true) {
		const nextResultPromise = iterator.next().then(
			result => ({ kind: "next" as const, result }),
			error => ({ kind: "error" as const, error }),
		);
		const { promise: timeoutPromise, resolve: resolveTimeout } = Promise.withResolvers<{
			kind: "timeout";
		}>();
		const timer = setTimeout(() => resolveTimeout({ kind: "timeout" }), options.idleTimeoutMs);

		try {
			const outcome = await Promise.race([nextResultPromise, timeoutPromise]);
			if (outcome.kind === "timeout") {
				options.onIdle?.();
				const returnPromise = iterator.return?.();
				if (returnPromise) {
					void returnPromise.catch(() => {});
				}
				throw new Error(options.errorMessage);
			}
			if (outcome.kind === "error") {
				throw outcome.error;
			}
			if (outcome.result.done) {
				return;
			}
			yield outcome.result.value;
		} finally {
			clearTimeout(timer);
		}
	}
}
