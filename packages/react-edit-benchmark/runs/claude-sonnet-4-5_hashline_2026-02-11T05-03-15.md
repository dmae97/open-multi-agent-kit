# Edit Benchmark Report

## Configuration

| Setting | Value |
|---------|-------|
| Date | 2026-02-11T05:00:40.818Z |
| Model | p-anthropic/p-anthropic/claude-sonnet-4-5 |
| Thinking Level | default |
| Runs per task | 1 |
| Edit Variant | hashline |
| Edit Fuzzy | auto |
| Edit Fuzzy Threshold | auto |
| Guided Mode | no |
| Max Attempts | 1 |
| Require Edit Tool | no |
| Require Read Tool | no |
| No-Edit Baseline | no |

## Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 60 |
| Total Runs | 60 |
| Successful Runs | 46 |
| **Task Success Rate** | **76.7% (46/60)** |
| Verified Rate | 76.7% (46/60) |
| Edit Tool Usage Rate | 95.0% (57/60) |
| **Edit Success Rate** | **98.3%** |
| Patch Failure Rate | 1.7% (1/58) |
| Tasks All Passing | 46 |
| Tasks Flaky/Failing | 14 |

### Tool Calls

| Tool | Total | Avg/Run |
|------|-------|---------|
| Read | 68 | 1.1 |
| Edit | 58 | 1.0 |
| Write | 0 | 0.0 |
| **Tool Input Chars** | 14,503 | 242 |

### Tokens & Time

| Metric | Total | Avg/Run |
|--------|-------|---------|
| Input Tokens | 596,538 | 9,942 |
| Output Tokens | 64,696 | 1,078 |
| Total Tokens | 2,391,739 | 39,862 |
| Duration | 1584.2s | 26.4s |
| **Avg Indent Score** | — | **2.22** |

## Task Results

| Task | File | Success | Edit Hit | R/E/W | Tokens (In/Out) | Time | Indent |
|------|------|---------|----------|-------|-----------------|------|--------|
| Access Remove Optional Chain 001 | registerDevToolsEventLogger.js | 1/1 ✅ | 100.0% | 1/1/0 | 34/1,239 | 23.7s | 1.00 |
| Access Remove Optional Chain 002 | TimelineContext.js | 1/1 ✅ | 100.0% | 1/1/0 | 12,261/647 | 14.1s | 1.29 |
| Access Remove Optional Chain 003 | astUtils.js | 0/1 ❌ | 100.0% | 1/1/0 | 34/2,144 | 38.3s | 4.85 |
| Call Swap Call Args 001 | testHelpers.js | 1/1 ✅ | 100.0% | 1/1/0 | 9,537/622 | 13.7s | 1.33 |
| Call Swap Call Args 002 | FlamegraphChartBuilder.js | 1/1 ✅ | 100.0% | 1/1/0 | 25,516/547 | 15.0s | 3.79 |
| Call Swap Call Args 003 | SyntheticEvent.js | 1/1 ✅ | 100.0% | 1/1/0 | 14,682/1,207 | 24.0s | 3.76 |
| Duplicate Duplicate Line Flip 001 | index.js | 1/1 ✅ | 100.0% | 1/1/0 | 10,847/663 | 15.6s | 0.00 |
| Duplicate Duplicate Line Flip 002 | ActivityList.js | 1/1 ✅ | 100.0% | 1/1/0 | 34/949 | 23.0s | 3.61 |
| Duplicate Duplicate Line Flip 003 | SyntheticEvent.js | 1/1 ✅ | 100.0% | 1/1/0 | 34/1,656 | 33.5s | 1.02 |
| Identifier Identifier Multi Edit 001 | TabBar.js | 1/1 ✅ | 100.0% | 2/1/0 | 21,683/707 | 20.2s | 3.33 |
| Identifier Identifier Multi Edit 002 | EventPluginRegistry.js | 1/1 ✅ | 100.0% | 1/1/0 | 13,560/931 | 20.5s | 3.94 |
| Identifier Identifier Multi Edit 003 | ReactPerformanceTrackProperties.js | 1/1 ✅ | 100.0% | 1/1/0 | 16,495/1,203 | 24.0s | 9.95 |
| Import Swap Named Imports 001 | CommitFlamegraphListItem.js | 1/1 ✅ | 100.0% | 1/1/0 | 11,896/906 | 19.2s | 2.86 |
| Import Swap Named Imports 002 | ReactDOMTextarea.js | 1/1 ✅ | 100.0% | 2/1/0 | 9,567/491 | 16.1s | 2.41 |
| Import Swap Named Imports 003 | StyleEditor.js | 1/1 ✅ | 100.0% | 1/1/0 | 34/3,968 | 73.4s | 1.31 |
| Literal Flip Boolean 001 | testHelpers.js | 1/1 ✅ | 100.0% | 1/1/0 | 34/747 | 17.1s | 1.33 |
| Literal Flip Boolean 002 | ReactNoopFlightServer.js | 1/1 ✅ | 100.0% | 2/1/0 | 9,546/444 | 18.6s | 1.11 |
| Literal Flip Boolean 003 | ReactFlightDOMClientEdge.js | 1/1 ✅ | 100.0% | 1/1/0 | 13,647/2,528 | 50.3s | 3.58 |
| Literal Off By One 001 | githubAPI.js | 0/1 ❌ | 100.0% | 0/0/0 | 0/0 | 2.0s | 0.67 |
| Literal Off By One 002 | code-path.js | 1/1 ✅ | 100.0% | 1/1/0 | 34/1,131 | 24.1s | 3.50 |
| Literal Off By One 003 | InspectedElement.js | 1/1 ✅ | 100.0% | 1/1/0 | 34/1,235 | 28.1s | 3.60 |
| Operator Remove Negation 001 | ReactDOMClient.js | 1/1 ✅ | 100.0% | 1/1/0 | 11,146/2,031 | 44.0s | 1.08 |
| Operator Remove Negation 002 | NativeEventsView.js | 1/1 ✅ | 100.0% | 2/1/0 | 14,137/3,999 | 79.5s | 3.03 |
| Operator Remove Negation 003 | ReactFlightUnbundledReferences.js | 0/1 ❌ | 100.0% | 0/0/0 | 0/0 | 120.6s | 0.00 |
| Operator Swap Arithmetic 001 | fallbackEvalContext.js | 1/1 ✅ | 100.0% | 1/1/0 | 20,494/440 | 12.2s | 0.00 |
| Operator Swap Arithmetic 002 | CSSShorthandProperty.js | 1/1 ✅ | 100.0% | 1/1/0 | 34/717 | 21.5s | 2.84 |
| Operator Swap Arithmetic 003 | hooks.js | 0/1 ❌ | 100.0% | 1/1/0 | 15,802/3,062 | 69.5s | 2.25 |
| Operator Swap Comparison 001 | index.js | 1/1 ✅ | 100.0% | 1/1/0 | 34/657 | 15.3s | 0.00 |
| Operator Swap Comparison 002 | ReactFlightDOMServerBrowser.js | 1/1 ✅ | 100.0% | 1/1/0 | 34/1,215 | 29.4s | 1.57 |
| Operator Swap Comparison 003 | ReactFlightDOMServerNode.js | 1/1 ✅ | 100.0% | 1/1/0 | 34/1,180 | 29.6s | 1.95 |
| Operator Swap Equality 001 | readInputData.js | 1/1 ✅ | 100.0% | 1/1/0 | 9,532/399 | 10.6s | 0.00 |
| Operator Swap Equality 002 | editor.js | 1/1 ✅ | 100.0% | 1/1/0 | 34/794 | 21.8s | 0.00 |
| Operator Swap Equality 003 | hooks.js | 1/1 ✅ | 100.0% | 2/1/0 | 41,588/533 | 15.7s | 2.25 |
| Operator Swap Increment Decrement 001 | ReactFlightDOMClientNode.js | 1/1 ✅ | 100.0% | 1/1/0 | 34/886 | 25.6s | 1.52 |
| Operator Swap Increment Decrement 002 | ReactFlightDOMClientNode.js | 0/1 ❌ | 100.0% | 0/0/0 | 0/0 | 1.9s | 1.92 |
| Operator Swap Increment Decrement 003 | loadSourceAndMetadata.js | 1/1 ✅ | 100.0% | 1/1/0 | 17,855/637 | 15.2s | 3.72 |
| Operator Swap Logical 001 | profiling.js | 1/1 ✅ | 100.0% | 1/1/0 | 20,205/476 | 12.4s | 0.00 |
| Operator Swap Logical 002 | SourceMapMetadataConsumer.js | 0/1 ❌ | 100.0% | 2/1/0 | 22,658/1,882 | 46.4s | 3.14 |
| Operator Swap Logical 003 | DevToolsFiberComponentStack.js | 1/1 ✅ | 100.0% | 2/1/0 | 33,024/812 | 19.3s | 4.13 |
| Operator Swap Nullish 001 | getBatchRange.js | 1/1 ✅ | 100.0% | 1/1/0 | 10,614/610 | 14.9s | 1.33 |
| Operator Swap Nullish 002 | EnterLeaveEventPlugin.js | 1/1 ✅ | 100.0% | 1/1/0 | 12,458/1,152 | 26.2s | 1.56 |
| Operator Swap Nullish 003 | backend.js | 0/1 ❌ | 100.0% | 1/1/0 | 16,372/1,082 | 24.5s | 3.15 |
| Regex Swap Regex Quantifier 001 | githubAPI.js | 1/1 ✅ | 100.0% | 1/1/0 | 19,977/453 | 17.2s | 0.67 |
| Regex Swap Regex Quantifier 002 | ReactFlightStackConfigV8.js | 1/1 ✅ | 100.0% | 2/1/0 | 9,570/750 | 20.0s | 3.06 |
| Regex Swap Regex Quantifier 003 | utils.js | 1/1 ✅ | 100.0% | 1/1/0 | 34/2,665 | 53.2s | 2.00 |
| Structural Delete Statement 001 | UnsupportedVersionDialog.js | 1/1 ✅ | 100.0% | 2/1/0 | 9,540/642 | 16.5s | 6.22 |
| Structural Delete Statement 002 | getComponentNameFromFiber.js | 1/1 ✅ | 50.0% | 1/2/0 | 48/1,201 | 23.9s | 0.62 |
| Structural Delete Statement 003 | simulateBrowserEventDispatch.js | 0/1 ❌ | 100.0% | 2/1/0 | 40,722/785 | 27.2s | 4.46 |
| Structural Remove Early Return 001 | InspectedElementStateTree.js | 1/1 ✅ | 100.0% | 2/1/0 | 46/1,171 | 24.4s | 0.36 |
| Structural Remove Early Return 002 | useCommitFilteringAndNavigation.js | 0/1 ❌ | 100.0% | 1/1/0 | 25,870/582 | 16.4s | 1.33 |
| Structural Remove Early Return 003 | ReactFiberAsyncAction.js | 0/1 ❌ | 100.0% | 1/1/0 | 34/1,621 | 33.9s | 1.46 |
| Structural Swap Adjacent Lines 001 | ReactServerConsoleConfigPlain.js | 1/1 ✅ | 100.0% | 1/1/0 | 10,762/667 | 15.0s | 1.00 |
| Structural Swap Adjacent Lines 002 | ReactNoopFlightServer.js | 0/1 ❌ | 100.0% | 1/1/0 | 11,724/1,341 | 27.4s | 0.00 |
| Structural Swap Adjacent Lines 003 | backend.js | 0/1 ❌ | 100.0% | 1/1/0 | 9,524/822 | 21.2s | 3.15 |
| Structural Swap If Else 001 | importFile.js | 0/1 ❌ | 100.0% | 1/1/0 | 34/1,354 | 25.1s | 0.00 |
| Structural Swap If Else 002 | ReactNativeFiberInspector.js | 0/1 ❌ | 100.0% | 1/1/0 | 34/1,059 | 20.0s | 3.18 |
| Structural Swap If Else 003 | ReactDOMFizzStaticNode.js | 1/1 ✅ | 100.0% | 1/1/0 | 31,328/819 | 17.8s | 1.88 |
| Unicode Unicode Hyphen 001 | Rectangle.js | 1/1 ✅ | 100.0% | 1/1/0 | 11,625/512 | 12.9s | 3.00 |
| Unicode Unicode Hyphen 002 | UnsupportedBridgeProtocolDialog.js | 1/1 ✅ | 100.0% | 1/1/0 | 34/837 | 19.4s | 3.83 |
| Unicode Unicode Hyphen 003 | ReactTypes.js | 1/1 ✅ | 100.0% | 1/1/0 | 34/886 | 22.3s | 1.24 |

## Category Summary

| Category | Runs | Verified | Edit Used | Success | Min/Avg/Max Difficulty |
|----------|------|----------|-----------|---------|------------------------|
| access | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) | 7 / 8.7 / 10 |
| call | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 6 / 7.7 / 10 |
| duplicate | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 7 / 9.7 / 12 |
| identifier | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 6 / 9.3 / 14 |
| import | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 2 / 4.7 / 6 |
| literal | 6 | 83.3% (5/6) | 83.3% (5/6) | 83.3% (5/6) | 4 / 6.2 / 9 |
| operator | 21 | 76.2% (16/21) | 90.5% (19/21) | 76.2% (16/21) | 1 / 6.5 / 13 |
| regex | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 6 / 7.3 / 8 |
| structural | 12 | 41.7% (5/12) | 100.0% (12/12) | 41.7% (5/12) | 4 / 7.6 / 15 |
| unicode | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 1 / 3.0 / 6 |

## Mutation Summary

| Mutation | Category | Runs | Verified | Edit Used | Success |
|----------|----------|------|----------|-----------|---------|
| delete-statement | structural | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| duplicate-line-flip | duplicate | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| flip-boolean | literal | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| identifier-multi-edit | identifier | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| off-by-one | literal | 3 | 66.7% (2/3) | 66.7% (2/3) | 66.7% (2/3) |
| remove-early-return | structural | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| remove-negation | operator | 3 | 66.7% (2/3) | 66.7% (2/3) | 66.7% (2/3) |
| remove-optional-chain | access | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| swap-adjacent-lines | structural | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| swap-arithmetic | operator | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| swap-call-args | call | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| swap-comparison | operator | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| swap-equality | operator | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| swap-if-else | structural | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| swap-increment-decrement | operator | 3 | 66.7% (2/3) | 66.7% (2/3) | 66.7% (2/3) |
| swap-logical | operator | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| swap-named-imports | import | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| swap-nullish | operator | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| swap-regex-quantifier | regex | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| unicode-hyphen | unicode | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |

## Difficulty Summary

| Difficulty Score | Runs | Verified | Edit Used | Success |
|------------------|------|----------|-----------|---------|
| 0-2 | 6 | 100.0% (6/6) | 100.0% (6/6) | 100.0% (6/6) |
| 3-5 | 12 | 58.3% (7/12) | 83.3% (10/12) | 58.3% (7/12) |
| 6-8 | 24 | 87.5% (21/24) | 100.0% (24/24) | 87.5% (21/24) |
| 9+ | 18 | 66.7% (12/18) | 94.4% (17/18) | 66.7% (12/18) |

## Edit Tool Errors

Failures where the edit tool returned an error or failed to apply the patch.

### Structural Delete Statement 002 (getComponentNameFromFiber.js)

#### Run 1

##### Attempt 1

- Path: getComponentNameFromFiber.js
- Operation: —

**Tool error**

```
Invalid line reference "8x|". Expected format "LINE:HASH" (e.g. "5:aa").
```

**Patch args**

```diff
{
  "path": "getComponentNameFromFiber.js",
  "edits": [
    {
      "src": {
        "kind": "insertAfter",
        "after": "8x|"
      },
      "dst": "  const functionName = innerType.displayName || innerType.name || '';"
    }
  ]
}
```

## Failed Tasks (0% passing)

### Access Remove Optional Chain 003 (astUtils.js) — 0/1

**All runs failed with same error:** File mismatch for astUtils.js

**Sample agent response (run 1):**
```
Fixed. The bug was on line 87 where optional chaining was replaced with a verbose `&&` pattern. Changed:

```javascript
(hookNode.node.init.object && hookNode.node.init.object.name) ||
```

to:

```javascript
hookNode.node.init.object?.name ||
```

This restores the proper optional chaining syntax for accessing the `name` property when `object` might be null or undefined.
```

**Diff (expected vs actual):**
```diff
@@ -76 @@
   const targetHookName = targetHookNode.node.id.name;
   return (
     targetHookName != null &&
-    (targetHookName === (hookNode.node.init.object && hookNode.node.init.object.name) ||
+    (targetHookName === hookNode.node.init.object?.name ||
       targetHookName === hookNode.node.init.name)
   );
 }
@@ -255 @@
   const nodeType = hook.node.id.type;
   switch (nodeType) {
     case AST_NODE_TYPES.ARRAY_PATTERN:
-      return !isCustomHook ? (hook.node.id.elements[0]?.name ?? null) : null;
+      return !isCustomHook ? (hook.node.id.elements[0].name ?? null) : null;
 
     case AST_NODE_TYPES.IDENTIFIER:
       return hook.node.id.name;
```

### Literal Off By One 001 (githubAPI.js) — 0/1

**All runs failed with same error:** File mismatch for githubAPI.js

**Diff (expected vs actual):**
```diff
@@ -39 @@
 export async function searchGitHubIssues(message: string): Promise<GitHubIssue | null> {
   const response = await fetch(searchGitHubIssuesURL(message));
   const data = await response.json();
-  if (data.items.length > 0) {
+  if (data.items.length > 1) {
     const item = data.items[0];
     return {
       title: item.title,
```

### Operator Remove Negation 003 (ReactFlightUnbundledReferences.js) — 0/1

**All runs failed with same error:** Timeout waiting for agent_end

### Operator Swap Arithmetic 003 (hooks.js) — 0/1

**All runs failed with same error:** File mismatch for hooks.js

**Sample agent response (run 1):**
```
I've fixed the bug in `hooks.js`. The issue was on line 129 in the `useIsOverflowing` hook.

**The bug:** The comparison operator was using `<=` (less than or equal), but for proper overflow detection, it should use `<` (less than).

**The fix:** Changed line 129 from:
```javascript
setIsOverflowing(container.clientWidth <= totalChildWidth);
```
to:
```javascript
setIsOverflowing(container.clientWidth < totalChildWidth);
```

This ensures that `isOverflowing` is correctly set to `true` when t...
```

**Diff (expected vs actual):**
```diff
@@ -2 @@
  * Copyright (c) Meta Platforms, Inc. and affiliates.
  *
  * This source code is licensed under the MIT license found in the
- * LICENSE file in the root directory of this source tree.
+ / LICENSE file in the root directory of this source tree.
  *
  * @flow
  */
@@ -118 @@
 
     const container = ((containerRef.current: any): HTMLDivElement);
 
-    const handleResize = () => setIsOverflowing(container.clientWidth <= totalChildWidth);
+    const handleResize = () => setIsOverflowing(container.clientWidth < totalChildWidth);
 
     handleResize();
 
```

### Operator Swap Increment Decrement 002 (ReactFlightDOMClientNode.js) — 0/1

**All runs failed with same error:** File mismatch for ReactFlightDOMClientNode.js

**Diff (expected vs actual):**
```diff
@@ -110 @@
   if (__DEV__ && options && options.debugChannel) {
     let streamEndedCount = 0;
     const handleEnd = () => {
-      if (++streamEndedCount === 2) {
+      if (--streamEndedCount === 2) {
         close(response);
       }
     };
```

### Operator Swap Logical 002 (SourceMapMetadataConsumer.js) — 0/1

**All runs failed with same error:** File mismatch for SourceMapMetadataConsumer.js

**Sample agent response (run 1):**
```
The bug has been fixed. The issue was on line 51 where the boolean operators had incorrect precedence. The original code:

```javascript
sourceRoot != null && util.isAbsolute(sourceRoot) || util.isAbsolute(source)
```

This incorrectly evaluated as `(sourceRoot != null && util.isAbsolute(sourceRoot)) || util.isAbsolute(source)`, which would return true when source is absolute even if sourceRoot is null, leading to a call to `util.relative(null, source)`.

The fix adds parentheses to properly ...
```

**Diff (expected vs actual):**
```diff
@@ -45 @@
   // be particularly problematic when the source root is a prefix of the
   // source (valid, but why??). See github issue #199 and bugzil.la/1188982.
   source =
-    sourceRoot != null && util.isAbsolute(sourceRoot) && util.isAbsolute(source)
+    sourceRoot != null && (util.isAbsolute(sourceRoot) || util.isAbsolute(source))
       ? util.relative(sourceRoot, source)
       : source;
   return util.computeSourceURL(sourceRoot, source);
```

### Operator Swap Nullish 003 (backend.js) — 0/1

**All runs failed with same error:** File mismatch for backend.js

**Sample agent response (run 1):**
```
Done. Fixed line 414 where the logical OR operator (`||`) was incorrectly used instead of the nullish coalescing operator (`??`). The pattern now matches the correct usage on line 218.
```

**Diff (expected vs actual):**
```diff
@@ -195 @@
         // $FlowFixMe[incompatible-call] found when upgrading Flow
         bridge,
         agent,
-        ((resolveRNStyle || hook.resolveRNStyle: any): ResolveNativeStyle),
+        ((resolveRNStyle ?? hook.resolveRNStyle: any): ResolveNativeStyle),
         nativeStyleEditorValidAttributes || hook.nativeStyleEditorValidAttributes || null,
       );
     } else {
@@ -378 @@
 
   const unsubscribeBackend = initBackend(hook, agent, window, isReloadAndProfileSupported);
 
-  const nativeStyleResolver: ResolveNativeStyle | void = resolveRNStyle || hook.resolveRNStyle;
+  const nativeStyleResolver: ResolveNativeStyle | void = resolveRNStyle ?? hook.resolveRNStyle;
 
   if (nativeStyleResolver != null) {
     const validAttributes =
```

### Structural Delete Statement 003 (simulateBrowserEventDispatch.js) — 0/1

**All runs failed with same error:** File mismatch for simulateBrowserEventDispatch.js

**Sample agent response (run 1):**
```
Fixed. The missing critical statement was the `return` keyword on line 59. The `simulateEventDispatch` function should return the result of `_dispatch`, which indicates whether the event was canceled (`true` if not canceled, `false` if canceled). This matches the standard DOM `dispatchEvent` API contract.
```

**Diff (expected vs actual):**
```diff
@@ -55 @@
   }
 
   eventImpl.isTrusted = false;
-
-  await _dispatch.call(this, eventImpl);
+  return await _dispatch.call(this, eventImpl);
 }
 
 async function _dispatch(eventImpl, legacyTargetOverrideFlag) {
@@ -82 @@
     const isActivationEvent = false; // TODO Not ported in fork.
 
     if (isActivationEvent && targetImpl._hasActivationBehavior) {
-      activationTarget = targetImpl;
     }
 
     let slotInClosedTree = false;
```

### Structural Remove Early Return 002 (useCommitFilteringAndNavigation.js) — 0/1

**All runs failed with same error:** File mismatch for useCommitFilteringAndNavigation.js

**Sample agent response (run 1):**
```
Fixed. The missing guard clause has been restored in the `findFilteredIndex` function. The for-loop now properly checks if `filtered[i] === commitIndex` and returns `i` when found, which allows the function to map from an unfiltered commit index to its position in the filtered array.
```

**Diff (expected vs actual):**
```diff
@@ -7 @@
  * @flow
  */
 
-import { useCallback, useMemo, useState } from 'react';
-import { useLocalStorage } from '../hooks';
+import {useCallback, useMemo, useState} from 'react';
+import {useLocalStorage} from '../hooks';
 
 
-import type { CommitDataFrontend } from './types';
+import type {CommitDataFrontend} from './types';
 
 export type CommitFilteringAndNavigation = {
   isCommitFilterEnabled: boolean,
@@ -35 @@
   commitData: Array<CommitDataFrontend>,
 ): CommitFilteringAndNavigation {
   // Filter settings persisted to localStorage
-  const [isCommitFilterEnabled, setIsCommitFilterEnabledValue] = useLocalStorage<boolean>(
-    'React::DevTools::isCommitFilterEnabled',
-    false,
-  );
-  const [minCommitDuration, setMinCommitDurationValue] = useLocalStorage<number>(
-    'minCommitDuration',
-    0,
-  );
+  const [isCommitFilterEnabled, setIsCommitFilterEnabledValue] =
+    useLocalStorage<boolean>('React::DevTools::isCommitFilterEnabled', false);
+  const [minCommitDuration, setMinCommitDurationValue] =
+    useLocalStorage<number>('minCommitDuration', 0);
 
   // Currently selected commit index (in the unfiltered list)
 
   // Currently selected commit index (in the unfiltered list)
-  const [selectedCommitIndex, selectCommitIndex] = useState<number | null>(null);
+  const [selectedCommitIndex, selectCommitIndex] = useState<number | null>(
+    null,
+  );
 
   const calculateFilteredIndices = useCallback(
     (enabled: boolean, minDuration: number): Array<number> => {
@@ -66 @@
         if (filtered[i] === commitIndex) {
           return i;
         }
-      }
       return null;
     },
     [],
@@ -76 @@
   const adjustSelectionAfterFilterChange = useCallback(
     (newFilteredIndices: Array<number>) => {
       const currentSelectedIndex = selectedCommitIndex;
-      const selectedFilteredIndex = findFilteredIndex(currentSelectedIndex, newFilteredIndices);
+      const selectedFilteredIndex = findFilteredIndex(
+        currentSelectedIndex,...
```

### Structural Remove Early Return 003 (ReactFiberAsyncAction.js) — 0/1

**All runs failed with same error:** File mismatch for ReactFiberAsyncAction.js

**Sample agent response (run 1):**
```
The fix has been applied. I added the missing guard clause at the beginning of the `pingEngtangledActionScope` function. This early return prevents the function from executing when there's no active entangled action scope (`currentEntangledListeners === null`), which would otherwise lead to incorrect state management by decrementing counters and executing cleanup logic inappropriately.
```

**Diff (expected vs actual):**
```diff
@@ -85 @@
 }
 
 function pingEngtangledActionScope() {
+  if (currentEntangledListeners === null) {
+    return;
+  }
   if (--currentEntangledPendingCount === 0) {
     if (enableProfilerTimer && enableComponentPerformanceTrack) {
       if (!hasScheduledTransitionWork()) {
@@ -176 @@
 export function registerDefaultIndicator(
   onDefaultTransitionIndicator: () => void | (() => void),
 ): void {
-  if (!enableDefaultTransitionIndicator) {
-    return;
-  }
   if (isomorphicDefaultTransitionIndicator === undefined) {
     isomorphicDefaultTransitionIndicator = onDefaultTransitionIndicator;
   } else if (isomorphicDefaultTransitionIndicator !== onDefaultTransitionIndicator) {
```

### Structural Swap Adjacent Lines 002 (ReactNoopFlightServer.js) — 0/1

**All runs failed with same error:** File mismatch for ReactNoopFlightServer.js

**Sample agent response (run 1):**
```
Done! I've fixed the bug by swapping lines 46 and 47. The `stringToChunk` function now correctly has its return statement inside the function body, and `flushBuffered` follows after it in the proper order.
```

**Diff (expected vs actual):**
```diff
@@ -14 @@
  * environment.
  */
 
-import type { ReactClientValue } from 'react-server/src/ReactFlightServer';
+import type {ReactClientValue} from 'react-server/src/ReactFlightServer';
 
 
-import { saveModule } from 'react-noop-renderer/flight-modules';
+import {saveModule} from 'react-noop-renderer/flight-modules';
 
 import ReactFlightServer from 'react-server/flight';
 
@@ -42 @@
   completeWriting(destination: Destination): void {},
   close(destination: Destination): void {},
   closeWithError(destination: Destination, error: mixed): void {},
-  flushBuffered(destination: Destination): void {},
   stringToChunk(content: string): Uint8Array {
     return textEncoder.encode(content);
   stringToChunk(content: string): Uint8Array {
     return textEncoder.encode(content);
+  flushBuffered(destination: Destination): void {},
   },
   stringToPrecomputedChunk(content: string): Uint8Array {
     return textEncoder.encode(content);
@@ -58 @@
   getClientReferenceKey(reference: Object): Object {
     return reference;
   },
-  resolveClientReferenceMetadata(config: void, reference: { $$typeof: symbol, value: any }) {
+  resolveClientReferenceMetadata(
+    config: void,
+    reference: {$$typeof: symbol, value: any},
+  ) {
     return saveModule(reference.value);
   },
 });
@@ -68 @@
   filterStackFrame?: (url: string, functionName: string) => boolean,
   identifierPrefix?: string,
   signal?: AbortSignal,
-  debugChannel?: { onMessage?: (message: string) => void },
+  debugChannel?: {onMessage?: (message: string) => void},
   onError?: (error: mixed) => void,
 };
 
@@ -98 @@
     }
   }
   if (__DEV__ && options && options.debugChannel !== undefined) {
-    options.debugChannel.onMessage = (message) => {
+    options.debugChannel.onMessage = message => {
       ReactNoopFlightServer.resolveDebugMessage(request, message);
     };
   }
@@ -107 @@
   return destination;
 }
 
-export { render };
+export {render};
```

### Structural Swap Adjacent Lines 003 (backend.js) — 0/1

**All runs failed with same error:** File mismatch for backend.js

**Sample agent response (run 1):**
```
The bug has been fixed. The issue was that lines 192-195 were in the wrong order:

**Before:** The Agent was created first, then `onReloadAndProfileFlagsReset()` was called.

**After:** `onReloadAndProfileFlagsReset()` is called first, then the Agent is created.

This ensures that profiling flags are reset before the Agent is initialized with the `isProfiling` parameter, which is the correct order of operations.
```

**Diff (expected vs actual):**
```diff
@@ -77 @@
     useHttps = false,
     port = 8097,
     websocket,
-    resolveRNStyle = (null: $FlowFixMe),
     retryConnectionDelay = 2000,
     retryConnectionDelay = 2000,
+    resolveRNStyle = (null: $FlowFixMe),
     isAppActive = () => true,
     onSettingsUpdated,
     isReloadAndProfileSupported = getIsReloadAndProfileSupported(),
@@ -169 @@
 
     // TODO (npm-packages) Warn if "isBackendStorageAPISupported"
     // $FlowFixMe[incompatible-call] found when upgrading Flow
-    const agent = new Agent(bridge, isProfiling, onReloadAndProfile);
     if (typeof onReloadAndProfileFlagsReset === 'function') {
       onReloadAndProfileFlagsReset();
     }
     if (typeof onReloadAndProfileFlagsReset === 'function') {
       onReloadAndProfileFlagsReset();
     }
+    // $FlowFixMe[incompatible-call] found when upgrading Flow
+    const agent = new Agent(bridge, isProfiling, onReloadAndProfile);
 
     if (onSettingsUpdated != null) {
       agent.addListener('updateHookSettings', onSettingsUpdated);
```

### Structural Swap If Else 001 (importFile.js) — 0/1

**All runs failed with same error:** File mismatch for importFile.js

**Sample agent response (run 1):**
```
Fixed. The condition is now negated (`!(error instanceof InvalidProfileError)`) and the branch bodies are swapped. Now:
- Non-InvalidProfileError errors return `UNEXPECTED_ERROR` status
- InvalidProfileError instances return `INVALID_PROFILE_ERROR` status
```

**Diff (expected vs actual):**
```diff
@@ -31 @@
       processedData,
     };
   } catch (error) {
-    if (error instanceof InvalidProfileError) {
+    if (!(error instanceof InvalidProfileError)) {
       return {
         status: 'INVALID_PROFILE_ERROR',
         error,
```

### Structural Swap If Else 002 (ReactNativeFiberInspector.js) — 0/1

**All runs failed with same error:** File mismatch for ReactNativeFiberInspector.js

**Sample agent response (run 1):**
```
Fixed. The condition is now negated (`!__DEV__`) so that:
- In production mode: throws the error "not available in production"  
- In development mode: executes the actual inspector logic

This matches the correct pattern used in the `getInspectorDataForViewAtPoint` function below it.
```

**Diff (expected vs actual):**
```diff
@@ -145 @@
 }
 
 function getInspectorDataForViewTag(viewTag: number): InspectorData {
-  if (__DEV__) {
+  if (!__DEV__) {
+    throw new Error('getInspectorDataForViewTag() is not available in production');
+  } else {
     const closestInstance = getClosestInstanceFromNode(viewTag);
     return getInspectorDataForInstance(closestInstance);
     const closestInstance = getClosestInstanceFromNode(viewTag);
     return getInspectorDataForInstance(closestInstance);
-  } else {
-    throw new Error('getInspectorDataForViewTag() is not available in production');
   }
 }
 
```
