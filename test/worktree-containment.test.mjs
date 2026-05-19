import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { getWorktreesRoot, removeWorktreeDirectory, resolveSafeWorktreePath, validateWorktreeId } from "../dist/util/worktree.js";

async function withProjectRoot(fn) {
  const root = await mkdtemp(join(tmpdir(), "omk-worktree-safe-"));
  const previous = process.env.OMK_PROJECT_ROOT;
  process.env.OMK_PROJECT_ROOT = root;
  try {
    return await fn(root);
  } finally {
    if (previous === undefined) delete process.env.OMK_PROJECT_ROOT;
    else process.env.OMK_PROJECT_ROOT = previous;
    await rm(root, { recursive: true, force: true });
  }
}

test("validateWorktreeId rejects traversal and path-like ids", () => {
  assert.equal(validateWorktreeId("node-01_ABC", "nodeId"), "node-01_ABC");
  for (const value of ["..", ".", "../node", "node/child", "node\\child", "/abs", "", "bad id"]) {
    assert.throws(() => validateWorktreeId(value, "nodeId"), /Invalid nodeId/);
  }
});

test("resolveSafeWorktreePath confines candidates below .omk/worktrees", async () => {
  await withProjectRoot(async () => {
    const worktreesRoot = getWorktreesRoot();
    assert.equal(await resolveSafeWorktreePath(join(worktreesRoot, "run", "node")), join(worktreesRoot, "run", "node"));
    await assert.rejects(resolveSafeWorktreePath(join(worktreesRoot, "..", "outside")), /escapes/);
    await assert.rejects(resolveSafeWorktreePath(worktreesRoot), /escapes/);
  });
});

test("removeWorktreeDirectory refuses symlink paths under worktrees", async () => {
  await withProjectRoot(async (projectRoot) => {
    const worktreesRoot = getWorktreesRoot();
    const outside = join(projectRoot, "outside");
    const link = join(worktreesRoot, "run", "node");
    await mkdir(join(worktreesRoot, "run"), { recursive: true });
    await mkdir(outside, { recursive: true });
    await symlink(outside, link, "dir");

    await assert.rejects(removeWorktreeDirectory(link), /symlink|outside/);
  });
});
