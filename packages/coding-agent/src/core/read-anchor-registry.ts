import type { ReadAnchor } from "./read-anchors.ts";

export interface ReadAnchorRegistryEntry {
	readonly anchor: ReadAnchor;
	readonly content: string;
}

export interface ReadAnchorRegistry {
	/** Store an anchor and the newline-normalized full-file content it was derived from. */
	register(anchor: ReadAnchor, normalizedContent: string): void;
	/** Look up a registered anchor and its stored content by readId. */
	get(readId: string): ReadAnchorRegistryEntry | undefined;
	/** Return all registered anchors for a path, newest first by registration time. */
	getByPath(path: string): ReadAnchor[];
	/** Evict every entry associated with a path. */
	invalidatePath(path: string): void;
	/** Evict every entry. */
	clear(): void;
	/** Number of currently stored anchors. */
	readonly size: number;
}

interface Entry extends ReadAnchorRegistryEntry {
	/** Monotonic registration order; determines "newest first" for path queries. */
	readonly registeredAt: number;
	/** Monotonic last-access counter; drives deterministic LRU eviction. */
	lastAccess: number;
}

const DEFAULT_MAX_REGISTRY_ENTRIES = 1000;

/** Create a factory that yields deterministic, sortable, unique read ids. */
export function createMonotonicReadIdFactory(): () => string {
	let counter = 0;
	return () => {
		counter += 1;
		return `ra-${counter.toString(36).padStart(12, "0")}`;
	};
}

/**
 * Create a per-session registry that maps read ids to anchors and supports
 * path-indexed invalidation and deterministic LRU eviction.
 */
export function createReadAnchorRegistry(maxEntries = DEFAULT_MAX_REGISTRY_ENTRIES): ReadAnchorRegistry {
	let accessCounter = 0;
	const byId = new Map<string, Entry>();
	const byPath = new Map<string, Set<string>>();

	function touch(entry: Entry): Entry {
		accessCounter += 1;
		return { ...entry, lastAccess: accessCounter };
	}

	function evictIfNeeded(): void {
		if (byId.size <= maxEntries) return;
		let oldest: Entry | undefined;
		for (const entry of byId.values()) {
			if (oldest === undefined || entry.lastAccess < oldest.lastAccess) {
				oldest = entry;
			}
		}
		if (oldest === undefined) return;
		byId.delete(oldest.anchor.readId);
		const pathSet = byPath.get(oldest.anchor.path);
		if (pathSet) {
			pathSet.delete(oldest.anchor.readId);
			if (pathSet.size === 0) {
				byPath.delete(oldest.anchor.path);
			}
		}
	}

	return {
		register(anchor, normalizedContent) {
			accessCounter += 1;
			const entry: Entry = {
				anchor,
				content: normalizedContent,
				registeredAt: accessCounter,
				lastAccess: accessCounter,
			};
			byId.set(anchor.readId, entry);
			let pathSet = byPath.get(anchor.path);
			if (!pathSet) {
				pathSet = new Set<string>();
				byPath.set(anchor.path, pathSet);
			}
			pathSet.add(anchor.readId);
			evictIfNeeded();
		},
		get(readId) {
			const entry = byId.get(readId);
			if (entry === undefined) return undefined;
			const touched = touch(entry);
			byId.set(readId, touched);
			return { anchor: touched.anchor, content: touched.content };
		},
		getByPath(path) {
			const pathSet = byPath.get(path);
			if (pathSet === undefined) return [];
			const anchors: ReadAnchor[] = [];
			for (const readId of pathSet) {
				const entry = byId.get(readId);
				if (entry === undefined) continue;
				const touched = touch(entry);
				byId.set(readId, touched);
				anchors.push(touched.anchor);
			}
			anchors.sort((a, b) => byId.get(b.readId)!.registeredAt - byId.get(a.readId)!.registeredAt);
			return anchors;
		},
		invalidatePath(path) {
			const pathSet = byPath.get(path);
			if (pathSet === undefined) return;
			for (const readId of pathSet) {
				byId.delete(readId);
			}
			byPath.delete(path);
		},
		clear() {
			byId.clear();
			byPath.clear();
			accessCounter = 0;
		},
		get size() {
			return byId.size;
		},
	};
}
