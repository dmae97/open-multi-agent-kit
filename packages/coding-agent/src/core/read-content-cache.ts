export interface ReadContentCache {
	/** Retrieve newline-normalized content by its file SHA-256. */
	get(fileSha256: string): string | undefined;
	/**
	 * Store newline-normalized content keyed by file SHA-256. The path is
	 * recorded so all hashes for a path can be evicted together when the file
	 * is edited.
	 */
	set(fileSha256: string, normalizedContent: string, path: string): void;
	/** Evict every cached hash that originated from the given path. */
	invalidatePath(path: string): void;
	/** Evict every entry. */
	clear(): void;
	/** Number of currently stored entries. */
	readonly size: number;
}

interface CacheEntry {
	readonly fileSha256: string;
	readonly content: string;
	readonly path: string;
	/** Monotonic last-access counter; drives deterministic LRU eviction. */
	lastAccess: number;
}

const DEFAULT_MAX_CACHE_ENTRIES = 64;

/**
 * Create a per-session content cache that avoids repeated disk reads and
 * newline-normalization for files whose bytes have not changed.
 */
export function createReadContentCache(maxEntries = DEFAULT_MAX_CACHE_ENTRIES): ReadContentCache {
	let accessCounter = 0;
	const byHash = new Map<string, CacheEntry>();
	const byPath = new Map<string, Set<string>>();

	function touch(entry: CacheEntry): CacheEntry {
		accessCounter += 1;
		return { ...entry, lastAccess: accessCounter };
	}

	function evictIfNeeded(): void {
		if (byHash.size <= maxEntries) return;
		let oldest: CacheEntry | undefined;
		for (const entry of byHash.values()) {
			if (oldest === undefined || entry.lastAccess < oldest.lastAccess) {
				oldest = entry;
			}
		}
		if (oldest === undefined) return;
		byHash.delete(oldest.fileSha256);
		const pathSet = byPath.get(oldest.path);
		if (pathSet) {
			pathSet.delete(oldest.fileSha256);
			if (pathSet.size === 0) {
				byPath.delete(oldest.path);
			}
		}
	}

	return {
		get(fileSha256) {
			const entry = byHash.get(fileSha256);
			if (entry === undefined) return undefined;
			const touched = touch(entry);
			byHash.set(fileSha256, touched);
			return touched.content;
		},
		set(fileSha256, normalizedContent, path) {
			accessCounter += 1;
			const entry: CacheEntry = {
				fileSha256,
				content: normalizedContent,
				path,
				lastAccess: accessCounter,
			};
			byHash.set(fileSha256, entry);
			let pathSet = byPath.get(path);
			if (!pathSet) {
				pathSet = new Set<string>();
				byPath.set(path, pathSet);
			}
			pathSet.add(fileSha256);
			evictIfNeeded();
		},
		invalidatePath(path) {
			const pathSet = byPath.get(path);
			if (pathSet === undefined) return;
			for (const fileSha256 of pathSet) {
				byHash.delete(fileSha256);
			}
			byPath.delete(path);
		},
		clear() {
			byHash.clear();
			byPath.clear();
			accessCounter = 0;
		},
		get size() {
			return byHash.size;
		},
	};
}
