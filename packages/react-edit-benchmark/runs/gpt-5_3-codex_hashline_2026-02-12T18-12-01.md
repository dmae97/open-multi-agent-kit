# Edit Benchmark Report

## Configuration

| Setting | Value |
|---------|-------|
| Date | 2026-02-12T18:09:14.825Z |
| Model | openai-codex/openai-codex/gpt-5.3-codex |
| Thinking Level | default |
| Runs per task | 1 |
| Edit Variant | hashline |
| Edit Fuzzy | auto |
| Edit Fuzzy Threshold | auto |
| Guided Mode | no |
| Max Attempts | 1 |
| No-op Retry Limit | 2 |
| Mutation Scope Window | 20 |
| Require Edit Tool | no |
| Require Read Tool | no |
| No-Edit Baseline | no |

## Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 60 |
| Total Runs | 60 |
| Successful Runs | 50 |
| **Task Success Rate** | **83.3% (50/60)** |
| Verified Rate | 83.3% (50/60) |
| Edit Tool Usage Rate | 100.0% (60/60) |
| **Edit Success Rate** | **98.4%** |
| Timeout Runs | 0 |
| Mutation Intent Match Rate | 83.3% |
| Patch Failure Rate | 1.6% (1/62) |
| Tasks All Passing | 50 |
| Tasks Flaky/Failing | 10 |

### Tool Calls

| Tool | Total | Avg/Run |
|------|-------|---------|
| Read | 136 | 2.3 |
| Edit | 62 | 1.0 |
| Write | 0 | 0.0 |
| **Tool Input Chars** | 14,156 | 236 |

### Tokens & Time

| Metric | Total | Avg/Run |
|--------|-------|---------|
| Input Tokens | 745,938 | 12,432 |
| Output Tokens | 45,514 | 759 |
| Total Tokens | 2,563,100 | 42,718 |
| Duration | 1199.0s | 20.0s |
| **Avg Indent Score** | — | **2.28** |

### Hashline Edit Subtypes

| Operation | Count | % |
|-----------|-------|---|
| set_line | 60 | 84.5% |
| replace_lines | 3 | 4.2% |
| insert_after | 7 | 9.9% |
| replace | 1 | 1.4% |
| **Total** | **71** | 100% |

## Task Results

| Task | File | Success | Edit Hit | R/E/W | Tokens (In/Out) | Time | Indent |
|------|------|---------|----------|-------|-----------------|------|--------|
| Access Remove Optional Chain 001 | registerDevToolsEventLogger.js | 1/1 ✅ | 100.0% | 2/1/0 | 9,599/472 | 11.5s | 1.00 |
| Access Remove Optional Chain 002 | TimelineContext.js | 1/1 ✅ | 100.0% | 2/1/0 | 24,652/290 | 8.1s | 1.29 |
| Access Remove Optional Chain 003 | astUtils.js | 1/1 ✅ | 100.0% | 1/1/0 | 15,829/345 | 14.8s | 4.85 |
| Call Swap Call Args 001 | testHelpers.js | 1/1 ✅ | 100.0% | 1/1/0 | 8,339/250 | 6.0s | 1.33 |
| Call Swap Call Args 002 | FlamegraphChartBuilder.js | 0/1 ❌ | 100.0% | 2/1/0 | 3,475/394 | 14.9s | 3.79 |
| Call Swap Call Args 003 | SyntheticEvent.js | 1/1 ✅ | 100.0% | 2/1/0 | 22,723/344 | 10.8s | 3.76 |
| Duplicate Duplicate Line Flip 001 | index.js | 1/1 ✅ | 100.0% | 1/1/0 | 8,516/225 | 6.7s | 0.00 |
| Duplicate Duplicate Line Flip 002 | ActivityList.js | 1/1 ✅ | 100.0% | 2/1/0 | 10,873/303 | 7.3s | 3.61 |
| Duplicate Duplicate Line Flip 003 | SyntheticEvent.js | 1/1 ✅ | 100.0% | 3/1/0 | 30,297/489 | 13.1s | 1.02 |
| Identifier Identifier Multi Edit 001 | TabBar.js | 1/1 ✅ | 100.0% | 3/1/0 | 19,950/546 | 14.5s | 3.33 |
| Identifier Identifier Multi Edit 002 | EventPluginRegistry.js | 1/1 ✅ | 100.0% | 3/1/0 | 11,623/781 | 18.6s | 3.94 |
| Identifier Identifier Multi Edit 003 | ReactPerformanceTrackProperties.js | 1/1 ✅ | 100.0% | 3/1/0 | 28,080/556 | 11.7s | 9.95 |
| Import Swap Named Imports 001 | CommitFlamegraphListItem.js | 1/1 ✅ | 100.0% | 2/1/0 | 3,071/437 | 12.5s | 2.86 |
| Import Swap Named Imports 002 | ReactDOMTextarea.js | 1/1 ✅ | 100.0% | 4/1/0 | 9,917/932 | 22.6s | 2.41 |
| Import Swap Named Imports 003 | StyleEditor.js | 1/1 ✅ | 100.0% | 5/1/0 | 23,681/1,052 | 28.8s | 1.31 |
| Literal Flip Boolean 001 | testHelpers.js | 1/1 ✅ | 100.0% | 1/1/0 | 1,499/282 | 9.6s | 1.33 |
| Literal Flip Boolean 002 | ReactNoopFlightServer.js | 1/1 ✅ | 100.0% | 2/1/0 | 9,208/498 | 12.0s | 1.11 |
| Literal Flip Boolean 003 | ReactFlightDOMClientEdge.js | 1/1 ✅ | 100.0% | 3/1/0 | 18,211/530 | 15.3s | 3.58 |
| Literal Off By One 001 | githubAPI.js | 1/1 ✅ | 100.0% | 1/1/0 | 8,642/219 | 4.8s | 0.67 |
| Literal Off By One 002 | code-path.js | 1/1 ✅ | 100.0% | 1/1/0 | 10,318/616 | 12.5s | 3.50 |
| Literal Off By One 003 | InspectedElement.js | 1/1 ✅ | 100.0% | 4/1/0 | 7,121/725 | 17.8s | 3.60 |
| Operator Remove Negation 001 | ReactDOMClient.js | 0/1 ❌ | 0.0% | 2/1/0 | 8,891/1,928 | 35.8s | 1.08 |
| Operator Remove Negation 002 | NativeEventsView.js | 1/1 ✅ | 100.0% | 3/1/0 | 18,638/2,751 | 53.6s | 3.03 |
| Operator Remove Negation 003 | ReactFlightUnbundledReferences.js | 0/1 ❌ | 100.0% | 4/1/0 | 20,004/3,570 | 76.8s | 2.00 |
| Operator Swap Arithmetic 001 | fallbackEvalContext.js | 1/1 ✅ | 100.0% | 2/1/0 | 9,723/342 | 12.0s | 0.00 |
| Operator Swap Arithmetic 002 | CSSShorthandProperty.js | 1/1 ✅ | 100.0% | 3/1/0 | 20,169/463 | 16.0s | 2.88 |
| Operator Swap Arithmetic 003 | hooks.js | 0/1 ❌ | 100.0% | 2/1/0 | 12,464/1,183 | 26.5s | 2.25 |
| Operator Swap Comparison 001 | index.js | 1/1 ✅ | 100.0% | 1/1/0 | 2,428/217 | 5.4s | 0.00 |
| Operator Swap Comparison 002 | ReactFlightDOMServerBrowser.js | 1/1 ✅ | 100.0% | 3/1/0 | 11,083/412 | 12.9s | 1.57 |
| Operator Swap Comparison 003 | ReactFlightDOMServerNode.js | 1/1 ✅ | 100.0% | 2/1/0 | 31,038/350 | 12.9s | 1.95 |
| Operator Swap Equality 001 | readInputData.js | 1/1 ✅ | 100.0% | 2/1/0 | 8,532/266 | 8.3s | 0.00 |
| Operator Swap Equality 002 | editor.js | 1/1 ✅ | 100.0% | 1/1/0 | 10,190/205 | 9.4s | 0.00 |
| Operator Swap Equality 003 | hooks.js | 1/1 ✅ | 100.0% | 1/1/0 | 12,266/280 | 10.9s | 2.25 |
| Operator Swap Increment Decrement 001 | ReactFlightDOMClientNode.js | 1/1 ✅ | 100.0% | 1/1/0 | 9,243/256 | 11.4s | 1.52 |
| Operator Swap Increment Decrement 002 | ReactFlightDOMClientNode.js | 1/1 ✅ | 100.0% | 2/1/0 | 18,479/289 | 11.7s | 1.92 |
| Operator Swap Increment Decrement 003 | loadSourceAndMetadata.js | 1/1 ✅ | 100.0% | 3/1/0 | 7,795/259 | 7.8s | 3.72 |
| Operator Swap Logical 001 | profiling.js | 1/1 ✅ | 100.0% | 1/1/0 | 1,605/300 | 9.5s | 0.00 |
| Operator Swap Logical 002 | SourceMapMetadataConsumer.js | 1/1 ✅ | 100.0% | 2/1/0 | 2,856/490 | 11.7s | 3.14 |
| Operator Swap Logical 003 | DevToolsFiberComponentStack.js | 1/1 ✅ | 100.0% | 3/1/0 | 11,028/644 | 16.6s | 4.13 |
| Operator Swap Nullish 001 | getBatchRange.js | 1/1 ✅ | 100.0% | 2/1/0 | 8,596/335 | 8.9s | 1.33 |
| Operator Swap Nullish 002 | EnterLeaveEventPlugin.js | 1/1 ✅ | 100.0% | 3/1/0 | 10,383/372 | 10.3s | 1.56 |
| Operator Swap Nullish 003 | backend.js | 0/1 ❌ | 100.0% | 2/1/0 | 20,067/912 | 22.1s | 3.15 |
| Regex Swap Regex Quantifier 001 | githubAPI.js | 1/1 ✅ | 100.0% | 1/1/0 | 8,341/505 | 10.3s | 0.67 |
| Regex Swap Regex Quantifier 002 | ReactFlightStackConfigV8.js | 1/1 ✅ | 100.0% | 2/1/0 | 23,168/1,558 | 37.6s | 3.06 |
| Regex Swap Regex Quantifier 003 | utils.js | 1/1 ✅ | 100.0% | 2/1/0 | 10,944/1,488 | 27.5s | 2.00 |
| Structural Delete Statement 001 | UnsupportedVersionDialog.js | 1/1 ✅ | 100.0% | 3/1/0 | 3,120/290 | 8.3s | 6.22 |
| Structural Delete Statement 002 | getComponentNameFromFiber.js | 1/1 ✅ | 100.0% | 4/1/0 | 12,236/446 | 12.7s | 0.62 |
| Structural Delete Statement 003 | simulateBrowserEventDispatch.js | 1/1 ✅ | 100.0% | 1/1/0 | 924/939 | 129.4s | 4.46 |
| Structural Remove Early Return 001 | InspectedElementStateTree.js | 0/1 ❌ | 100.0% | 2/1/0 | 17,390/647 | 14.9s | 0.36 |
| Structural Remove Early Return 002 | useCommitFilteringAndNavigation.js | 1/1 ✅ | 100.0% | 3/1/0 | 5,971/640 | 25.8s | 3.73 |
| Structural Remove Early Return 003 | ReactFiberAsyncAction.js | 0/1 ❌ | 100.0% | 3/1/0 | 12,060/620 | 19.2s | 1.46 |
| Structural Swap Adjacent Lines 001 | ReactServerConsoleConfigPlain.js | 1/1 ✅ | 100.0% | 1/1/0 | 3,232/270 | 8.7s | 1.00 |
| Structural Swap Adjacent Lines 002 | ReactNoopFlightServer.js | 1/1 ✅ | 100.0% | 3/1/0 | 5,667/874 | 17.5s | 1.11 |
| Structural Swap Adjacent Lines 003 | backend.js | 0/1 ❌ | 100.0% | 5/3/0 | 33,929/6,662 | 114.6s | 3.15 |
| Structural Swap If Else 001 | importFile.js | 0/1 ❌ | 100.0% | 3/1/0 | 8,853/838 | 24.8s | 0.00 |
| Structural Swap If Else 002 | ReactNativeFiberInspector.js | 0/1 ❌ | 100.0% | 1/1/0 | 3,982/1,120 | 21.0s | 3.18 |
| Structural Swap If Else 003 | ReactDOMFizzStaticNode.js | 1/1 ✅ | 100.0% | 2/1/0 | 19,888/1,674 | 33.9s | 1.88 |
| Unicode Unicode Hyphen 001 | Rectangle.js | 1/1 ✅ | 100.0% | 2/1/0 | 3,408/231 | 7.1s | 3.00 |
| Unicode Unicode Hyphen 002 | UnsupportedBridgeProtocolDialog.js | 1/1 ✅ | 100.0% | 3/1/0 | 19,112/309 | 11.7s | 3.83 |
| Unicode Unicode Hyphen 003 | ReactTypes.js | 1/1 ✅ | 100.0% | 2/1/0 | 12,611/293 | 9.1s | 1.24 |

## Category Summary

| Category | Runs | Verified | Edit Used | Success | Min/Avg/Max Difficulty |
|----------|------|----------|-----------|---------|------------------------|
| access | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 7 / 8.7 / 10 |
| call | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) | 6 / 7.7 / 10 |
| duplicate | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 7 / 9.7 / 12 |
| identifier | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 6 / 9.3 / 14 |
| import | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 2 / 4.7 / 6 |
| literal | 6 | 100.0% (6/6) | 100.0% (6/6) | 100.0% (6/6) | 4 / 6.2 / 9 |
| operator | 21 | 81.0% (17/21) | 100.0% (21/21) | 81.0% (17/21) | 1 / 6.5 / 13 |
| regex | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 6 / 7.3 / 8 |
| structural | 12 | 58.3% (7/12) | 100.0% (12/12) | 58.3% (7/12) | 4 / 7.6 / 15 |
| unicode | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 1 / 3.0 / 6 |

## Mutation Summary

| Mutation | Category | Runs | Verified | Edit Used | Success |
|----------|----------|------|----------|-----------|---------|
| delete-statement | structural | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| duplicate-line-flip | duplicate | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| flip-boolean | literal | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| identifier-multi-edit | identifier | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| off-by-one | literal | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| remove-early-return | structural | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| remove-negation | operator | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| remove-optional-chain | access | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| swap-adjacent-lines | structural | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| swap-arithmetic | operator | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| swap-call-args | call | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| swap-comparison | operator | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| swap-equality | operator | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| swap-if-else | structural | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| swap-increment-decrement | operator | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| swap-logical | operator | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| swap-named-imports | import | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| swap-nullish | operator | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| swap-regex-quantifier | regex | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| unicode-hyphen | unicode | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |

## Difficulty Summary

| Difficulty Score | Runs | Verified | Edit Used | Success |
|------------------|------|----------|-----------|---------|
| 0-2 | 6 | 83.3% (5/6) | 100.0% (6/6) | 83.3% (5/6) |
| 3-5 | 12 | 91.7% (11/12) | 100.0% (12/12) | 91.7% (11/12) |
| 6-8 | 24 | 83.3% (20/24) | 100.0% (24/24) | 83.3% (20/24) |
| 9+ | 18 | 77.8% (14/18) | 100.0% (18/18) | 77.8% (14/18) |

## Edit Tool Errors

Failures where the edit tool returned an error or failed to apply the patch.

### Operator Remove Negation 001 (ReactDOMClient.js)

#### Run 1

##### Attempt 1

- Path: ReactDOMClient.js
- Operation: —

**Tool error**

```
No changes made to ReactDOMClient.js. The edits produced identical content.
```

**Patch args**

```diff
{
  "path": "ReactDOMClient.js",
  "edits": [
    {
      "replace": {
        "old_text": "  if (!foundDevTools && canUseDOM && window.top === window.self) {",
        "new_text": "  if (foundDevTools && canUseDOM && window.top === window.self) {"
      }
    }
  ]
}
```

## Failed Tasks (0% passing)

### Call Swap Call Args 002 (FlamegraphChartBuilder.js) — 0/1

**All runs failed with same error:** File mismatch for FlamegraphChartBuilder.js

**Sample agent response (run 1):**
```
Updated `FlamegraphChartBuilder.js` with the minimal fix in `getChartData`:

- Swapped the two arguments in the `profilerStore.getCommitData(...)` call to:
  - `getCommitData(commitIndex, rootID)`

No other files or code paths were changed.
```

**Diff (expected vs actual):**
```diff
@@ -45 @@
   profilerStore: ProfilerStore,
   rootID: number,
 }): ChartData {
-  const commitDatum = profilerStore.getCommitData(rootID, commitIndex);
+  const commitDatum = profilerStore.getCommitData(commitIndex, rootID);
 
   const { fiberActualDurations, fiberSelfDurations } = commitDatum;
   const { nodes } = commitTree;
@@ -64 @@
 
   // Generate flame graph structure using tree base durations.
   const walkTree = (id: number, rightOffset: number, currentDepth: number): ChartNode => {
-    idToDepthMap.set(id, currentDepth);
+    idToDepthMap.set(currentDepth, id);
 
     const node = nodes.get(id);
     if (node == null) {
```

### Operator Remove Negation 001 (ReactDOMClient.js) — 0/1

**All runs failed with same error:** File mismatch for ReactDOMClient.js

**Sample agent response (run 1):**
```
I checked `ReactDOMClient.js` and inspected line 57.

That line is already:

```js
if (foundDevTools && canUseDOM && window.top === window.self) {
```

There is no stray logical negation (`!`) present there to remove, so no code change was applied.
```

**Diff (expected vs actual):**
```diff
@@ -49 @@
 const foundDevTools = injectIntoDevTools();
 
 if (__DEV__) {
-  if (!foundDevTools && canUseDOM && window.top === window.self) {
+  if (foundDevTools && canUseDOM && window.top === window.self) {
     // If we're in Chrome or Firefox, provide a download link if not installed.
     if (
       (navigator.userAgent.indexOf('Chrome') > -1 && navigator.userAgent.indexOf('Edge') === -1) ||
```

### Operator Remove Negation 003 (ReactFlightUnbundledReferences.js) — 0/1

**All runs failed with same error:** File mismatch for ReactFlightUnbundledReferences.js

**Sample agent response (run 1):**
```
Fixed in `ReactFlightUnbundledReferences.js` with a single-line change:

- Changed:
  - `if (!cachedReference) {`
- To:
  - `if (cachedReference === undefined) {`

This removes the accidental negation-based falsy check and only treats truly uncached references as missing. No other files or code paths were modified.
```

**Diff (expected vs actual):**
```diff
@@ -247 @@
         // Use a cached value
         return target.then;
       }
-      if (!target.$$async) {
+      if (target.$$async) {
         // If this module is expected to return a Promise (such as an AsyncModule) then
         // we should resolve that with a client reference that unwraps the Promise on
         // the client.
@@ -288 @@
     );
   }
   let cachedReference = target[name];
-  if (!cachedReference) {
+  if (cachedReference === undefined) {
     const reference: ClientReference<any> = registerClientReferenceImpl(
       (function () {
         throw new Error(
```

### Operator Swap Arithmetic 003 (hooks.js) — 0/1

**All runs failed with same error:** File mismatch for hooks.js

**Sample agent response (run 1):**
```
Fixed `hooks.js` with a single-token change:

- `setIsOverflowing(container.clientWidth <= totalChildWidth);`
- → `setIsOverflowing(container.clientWidth < totalChildWidth);`

No other files or code paths were modified.
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

### Operator Swap Nullish 003 (backend.js) — 0/1

**All runs failed with same error:** File mismatch for backend.js

**Sample agent response (run 1):**
```
Fixed `backend.js` by changing the swapped operator at the custom messaging path:

- `resolveRNStyle || hook.resolveRNStyle`
- → `resolveRNStyle ?? hook.resolveRNStyle`

No other files or code paths were modified.
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

### Structural Remove Early Return 001 (InspectedElementStateTree.js) — 0/1

**All runs failed with same error:** File mismatch for InspectedElementStateTree.js

**Sample agent response (run 1):**
```
Implemented the minimal fix in `InspectedElementStateTree.js` by restoring the missing 3-line guard clause near line 39:

```js
if (state == null) {
  return null;
}
```

No other files were changed.
```

**Diff (expected vs actual):**
```diff
@@ -36 @@
   store,
 }: Props): React.Node {
   const { state, type } = inspectedElement;
-  if (state == null) {
-    return null;
-  }
 
   // HostSingleton and HostHoistable may have state that we don't want to expose to users
   const isHostComponent = type === ElementTypeHostComponent;
 
   // HostSingleton and HostHoistable may have state that we don't want to expose to users
   const isHostComponent = type === ElementTypeHostComponent;
+  if (state == null) {
+    return null;
+  }
   const entries = Object.entries(state);
   const isEmpty = entries.length === 0;
   if (isEmpty || isHostComponent) {
```

### Structural Remove Early Return 003 (ReactFiberAsyncAction.js) — 0/1

**All runs failed with same error:** File mismatch for ReactFiberAsyncAction.js

**Sample agent response (run 1):**
```
Implemented the minimal fix in `ReactFiberAsyncAction.js` by restoring the missing early-return guard in `pingEngtangledActionScope`:

```js
if (currentEntangledListeners === null) {
  return;
}
```

Inserted at the top of `pingEngtangledActionScope`, before decrementing `currentEntangledPendingCount`.

No other files were changed.
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

### Structural Swap Adjacent Lines 003 (backend.js) — 0/1

**All runs failed with same error:** File mismatch for backend.js

**Sample agent response (run 1):**
```
Fixed `backend.js` by swapping the two adjacent statements in `handleClose()` so retry is scheduled before bridge shutdown notification.

I only changed that one location and kept structure/formatting intact otherwise.

I did not run tests in this environment, so runtime verification is still pending.
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
@@ -256 @@
       debug('WebSocket.onclose');
     }
 
+    scheduleRetry();
     if (bridge !== null) {
       bridge.emit('shutdown');
     }
     if (bridge !== null) {
       bridge.emit('shutdown');
     }
-
-    scheduleRetry();
   }
 
   function handleFailed() {
```

### Structural Swap If Else 001 (importFile.js) — 0/1

**All runs failed with same error:** File mismatch for importFile.js

**Sample agent response (run 1):**
```
Fixed `importFile.js` with the minimum change at the buggy branch:

- Negated the condition at line 34:
  - `if (error instanceof InvalidProfileError) {`
  - → `if (!(error instanceof InvalidProfileError)) {`

No other files or code paths were changed.
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
       return {
-        status: 'INVALID_PROFILE_ERROR',
+        status: 'UNEXPECTED_ERROR',
         error,
       };
     } else {
@@ -38 @@
       };
     } else {
       return {
-        status: 'UNEXPECTED_ERROR',
+        status: 'INVALID_PROFILE_ERROR',
         error,
       };
     }
```

### Structural Swap If Else 002 (ReactNativeFiberInspector.js) — 0/1

**All runs failed with same error:** File mismatch for ReactNativeFiberInspector.js

**Sample agent response (run 1):**
```
Implemented the minimal fix in `ReactNativeFiberInspector.js` inside `getInspectorDataForViewTag`:

- Changed the condition from `if (__DEV__)` to `if (!__DEV__)`.

No other files or code paths were modified.
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
