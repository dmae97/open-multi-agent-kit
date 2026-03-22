import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Snowflake } from "@oh-my-pi/pi-utils";
import { isAutoresearchShCommand } from "../src/autoresearch/helpers";
import { reconstructStateFromJsonl } from "../src/autoresearch/state";

function makeTempDir(): string {
	const dir = path.join(os.tmpdir(), `pi-autoresearch-test-${Snowflake.next()}`);
	fs.mkdirSync(dir, { recursive: true });
	return dir;
}

describe("autoresearch state reconstruction", () => {
	const tempDirs: string[] = [];

	afterEach(() => {
		for (const dir of tempDirs.splice(0)) {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it("reconstructs the latest segment and current metric definitions from autoresearch.jsonl", () => {
		const dir = makeTempDir();
		tempDirs.push(dir);
		const jsonlPath = path.join(dir, "autoresearch.jsonl");
		fs.writeFileSync(
			jsonlPath,
			[
				JSON.stringify({
					type: "config",
					name: "First",
					metricName: "runtime_ms",
					metricUnit: "ms",
					bestDirection: "lower",
				}),
				JSON.stringify({
					commit: "aaaaaaa",
					metric: 100,
					metrics: { memory_mb: 32 },
					status: "keep",
					description: "baseline",
					timestamp: 1,
				}),
				JSON.stringify({
					commit: "bbbbbbb",
					metric: 90,
					metrics: { memory_mb: 30 },
					status: "keep",
					description: "improved",
					timestamp: 2,
				}),
				JSON.stringify({
					type: "config",
					name: "Second",
					metricName: "throughput",
					metricUnit: "",
					bestDirection: "higher",
				}),
				JSON.stringify({
					commit: "ccccccc",
					metric: 1200,
					metrics: { latency_ms: 15 },
					status: "keep",
					description: "new baseline",
					timestamp: 3,
				}),
				JSON.stringify({
					commit: "ddddddd",
					metric: 1320,
					metrics: { latency_ms: 18 },
					status: "discard",
					description: "regressed latency",
					timestamp: 4,
				}),
			].join("\n"),
		);

		const reconstructed = reconstructStateFromJsonl(dir);
		const state = reconstructed.state;

		expect(reconstructed.hasLog).toBe(true);
		expect(state.name).toBe("Second");
		expect(state.metricName).toBe("throughput");
		expect(state.bestDirection).toBe("higher");
		expect(state.currentSegment).toBe(1);
		expect(state.bestMetric).toBe(1200);
		expect(state.results).toHaveLength(4);
		expect(state.results.filter(result => result.segment === 1)).toHaveLength(2);
		expect(state.secondaryMetrics).toEqual([{ name: "latency_ms", unit: "ms" }]);
	});
});

describe("autoresearch command guard", () => {
	it("accepts autoresearch.sh through common wrappers", () => {
		expect(isAutoresearchShCommand("bash autoresearch.sh")).toBe(true);
		expect(isAutoresearchShCommand("FOO=bar time bash ./autoresearch.sh --quick")).toBe(true);
		expect(isAutoresearchShCommand("nice -n 10 /tmp/project/autoresearch.sh")).toBe(true);
	});

	it("rejects commands where autoresearch.sh is not the first real command", () => {
		expect(isAutoresearchShCommand("python script.py && ./autoresearch.sh")).toBe(false);
		expect(isAutoresearchShCommand("echo hi; autoresearch.sh")).toBe(false);
		expect(isAutoresearchShCommand("bash -lc 'autoresearch.sh'")).toBe(false);
	});
});
