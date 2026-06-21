import { describe, expect, it } from "vitest";
import { createMonotonicReadIdFactory, createReadAnchorRegistry } from "../src/core/read-anchor-registry.ts";
import { createReadAnchor, type ReadAnchor } from "../src/core/read-anchors.ts";
import { createReadContentCache } from "../src/core/read-content-cache.ts";

function makeAnchor(path: string, content: string, readId: string, offset = 1, limit?: number): ReadAnchor {
	return createReadAnchor({ path, content, readId, offset, limit });
}

describe("createMonotonicReadIdFactory", () => {
	it("produces unique, monotonically increasing ids", () => {
		const factory = createMonotonicReadIdFactory();
		const ids: string[] = [];
		for (let i = 0; i < 5; i += 1) {
			ids.push(factory());
		}
		expect(new Set(ids).size).toBe(ids.length);
		for (let i = 1; i < ids.length; i += 1) {
			expect(ids[i] > ids[i - 1]).toBe(true);
		}
	});

	it("starts ids with the read-anchor prefix", () => {
		const factory = createMonotonicReadIdFactory();
		expect(factory().startsWith("ra-")).toBe(true);
	});
});

describe("ReadAnchorRegistry", () => {
	it("registers an anchor and retrieves it by readId", () => {
		const registry = createReadAnchorRegistry();
		const anchor = makeAnchor("a.ts", "hello", "r1");
		registry.register(anchor, "hello");
		const entry = registry.get("r1");
		expect(entry).toBeDefined();
		expect(entry!.anchor.readId).toBe("r1");
		expect(entry!.content).toBe("hello");
	});

	it("returns undefined for unknown readId", () => {
		const registry = createReadAnchorRegistry();
		expect(registry.get("missing")).toBeUndefined();
	});

	it("returns anchors for a path newest-first by registration time", () => {
		const registry = createReadAnchorRegistry();
		const a1 = makeAnchor("p.ts", "v1", "r1");
		const a2 = makeAnchor("p.ts", "v2", "r2");
		const a3 = makeAnchor("p.ts", "v3", "r3");
		registry.register(a1, "v1");
		registry.register(a2, "v2");
		registry.register(a3, "v3");
		expect(registry.getByPath("p.ts").map((a) => a.readId)).toEqual(["r3", "r2", "r1"]);
	});

	it("returns an empty array for unknown path", () => {
		const registry = createReadAnchorRegistry();
		expect(registry.getByPath("missing.ts")).toEqual([]);
	});

	it("supports most-recent anchor lookup for a path", () => {
		const registry = createReadAnchorRegistry();
		registry.register(makeAnchor("p.ts", "old", "old-id"), "old");
		registry.register(makeAnchor("p.ts", "new", "new-id"), "new");
		const mostRecent = registry.getByPath("p.ts")[0];
		expect(mostRecent?.readId).toBe("new-id");
	});

	it("invalidates all anchors for a path", () => {
		const registry = createReadAnchorRegistry();
		registry.register(makeAnchor("p.ts", "v1", "r1"), "v1");
		registry.register(makeAnchor("p.ts", "v2", "r2"), "v2");
		registry.register(makeAnchor("other.ts", "v", "r3"), "v");
		registry.invalidatePath("p.ts");
		expect(registry.get("r1")).toBeUndefined();
		expect(registry.get("r2")).toBeUndefined();
		expect(registry.get("r3")).toBeDefined();
		expect(registry.getByPath("p.ts")).toEqual([]);
	});

	it("clears all anchors", () => {
		const registry = createReadAnchorRegistry();
		registry.register(makeAnchor("a.ts", "x", "r1"), "x");
		registry.register(makeAnchor("b.ts", "y", "r2"), "y");
		registry.clear();
		expect(registry.get("r1")).toBeUndefined();
		expect(registry.get("r2")).toBeUndefined();
		expect(registry.size).toBe(0);
	});

	it("evicts oldest entries deterministically when max size is exceeded", () => {
		const registry = createReadAnchorRegistry(3);
		registry.register(makeAnchor("a.ts", "1", "r1"), "1");
		registry.register(makeAnchor("b.ts", "2", "r2"), "2");
		registry.register(makeAnchor("c.ts", "3", "r3"), "3");
		// Access r1 to make it newer than r2.
		registry.get("r1");
		registry.register(makeAnchor("d.ts", "4", "r4"), "4");
		expect(registry.size).toBe(3);
		expect(registry.get("r1")).toBeDefined();
		expect(registry.get("r2")).toBeUndefined();
		expect(registry.get("r3")).toBeDefined();
		expect(registry.get("r4")).toBeDefined();
	});

	it("updates LRU order on get", () => {
		const registry = createReadAnchorRegistry(2);
		registry.register(makeAnchor("a.ts", "1", "r1"), "1");
		registry.register(makeAnchor("b.ts", "2", "r2"), "2");
		registry.get("r1");
		registry.register(makeAnchor("c.ts", "3", "r3"), "3");
		expect(registry.get("r1")).toBeDefined();
		expect(registry.get("r2")).toBeUndefined();
	});

	it("does not leak entries across paths in getByPath", () => {
		const registry = createReadAnchorRegistry();
		registry.register(makeAnchor("a.ts", "x", "r1"), "x");
		registry.register(makeAnchor("b.ts", "y", "r2"), "y");
		expect(registry.getByPath("a.ts").map((a) => a.readId)).toEqual(["r1"]);
		expect(registry.getByPath("b.ts").map((a) => a.readId)).toEqual(["r2"]);
	});
});

describe("ReadContentCache", () => {
	it("stores and retrieves normalized content by file hash", () => {
		const cache = createReadContentCache();
		cache.set("h1", "content", "p.ts");
		expect(cache.get("h1")).toBe("content");
	});

	it("returns undefined for unknown hash", () => {
		const cache = createReadContentCache();
		expect(cache.get("missing")).toBeUndefined();
	});

	it("invalidates all entries for a path", () => {
		const cache = createReadContentCache();
		cache.set("h1", "v1", "p.ts");
		cache.set("h2", "v2", "p.ts");
		cache.set("h3", "v3", "other.ts");
		cache.invalidatePath("p.ts");
		expect(cache.get("h1")).toBeUndefined();
		expect(cache.get("h2")).toBeUndefined();
		expect(cache.get("h3")).toBe("v3");
	});

	it("evicts oldest entries deterministically when max size is exceeded", () => {
		const cache = createReadContentCache(2);
		cache.set("h1", "v1", "a.ts");
		cache.set("h2", "v2", "b.ts");
		cache.get("h1");
		cache.set("h3", "v3", "c.ts");
		expect(cache.size).toBe(2);
		expect(cache.get("h1")).toBe("v1");
		expect(cache.get("h2")).toBeUndefined();
		expect(cache.get("h3")).toBe("v3");
	});

	it("clears all entries", () => {
		const cache = createReadContentCache();
		cache.set("h1", "v1", "a.ts");
		cache.set("h2", "v2", "b.ts");
		cache.clear();
		expect(cache.get("h1")).toBeUndefined();
		expect(cache.get("h2")).toBeUndefined();
		expect(cache.size).toBe(0);
	});
});
