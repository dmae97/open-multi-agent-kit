import { afterEach, describe, expect, it } from "bun:test";
import { getOpenAIStreamIdleTimeoutMs, getStreamFirstEventTimeoutMs } from "../src/utils/idle-iterator";

const originalFirstEventTimeout = Bun.env.PI_STREAM_FIRST_EVENT_TIMEOUT_MS;
const originalIdleTimeout = Bun.env.PI_OPENAI_STREAM_IDLE_TIMEOUT_MS;

afterEach(() => {
	if (originalFirstEventTimeout === undefined) {
		delete Bun.env.PI_STREAM_FIRST_EVENT_TIMEOUT_MS;
	} else {
		Bun.env.PI_STREAM_FIRST_EVENT_TIMEOUT_MS = originalFirstEventTimeout;
	}

	if (originalIdleTimeout === undefined) {
		delete Bun.env.PI_OPENAI_STREAM_IDLE_TIMEOUT_MS;
	} else {
		Bun.env.PI_OPENAI_STREAM_IDLE_TIMEOUT_MS = originalIdleTimeout;
	}
});

describe("stream first-event timeouts", () => {
	it("defaults to 45 seconds when unset", () => {
		delete Bun.env.PI_STREAM_FIRST_EVENT_TIMEOUT_MS;
		delete Bun.env.PI_OPENAI_STREAM_IDLE_TIMEOUT_MS;

		expect(getStreamFirstEventTimeoutMs()).toBe(45_000);
	});

	it("inherits a longer idle timeout by default", () => {
		delete Bun.env.PI_STREAM_FIRST_EVENT_TIMEOUT_MS;
		Bun.env.PI_OPENAI_STREAM_IDLE_TIMEOUT_MS = "60000";

		expect(getStreamFirstEventTimeoutMs(getOpenAIStreamIdleTimeoutMs())).toBe(60_000);
	});

	it("respects explicit overrides", () => {
		Bun.env.PI_STREAM_FIRST_EVENT_TIMEOUT_MS = "5000";
		Bun.env.PI_OPENAI_STREAM_IDLE_TIMEOUT_MS = "60000";

		expect(getStreamFirstEventTimeoutMs(getOpenAIStreamIdleTimeoutMs())).toBe(5_000);
	});
});
