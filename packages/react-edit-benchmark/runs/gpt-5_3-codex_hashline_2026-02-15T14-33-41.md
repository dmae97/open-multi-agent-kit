# Edit Benchmark Report

## Configuration

| Setting | Value |
|---------|-------|
| Date | 2026-02-15T14:28:30.625Z |
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
| Successful Runs | 52 |
| **Task Success Rate** | **86.7% (52/60)** |
| Verified Rate | 86.7% (52/60) |
| Edit Tool Usage Rate | 100.0% (60/60) |
| **Edit Success Rate** | **100.0%** |
| Timeout Runs | 0 |
| Mutation Intent Match Rate | 86.7% |
| Patch Failure Rate | 0.0% (0/63) |
| Tasks All Passing | 52 |
| Tasks Flaky/Failing | 8 |

### Tool Calls

| Tool | Total | Avg/Run |
|------|-------|---------|
| Read | 173 | 2.9 |
| Edit | 63 | 1.1 |
| Write | 0 | 0.0 |
| **Tool Input Chars** | 17,767 | 296 |

### Tokens & Time

| Metric | Total | Avg/Run |
|--------|-------|---------|
| Input Tokens | 641,452 | 10,691 |
| Output Tokens | 79,450 | 1,324 |
| Total Tokens | 2,557,190 | 42,620 |
| Duration | 2204.3s | 36.7s |
| **Avg Indent Score** | — | **2.28** |

### Hashline Edit Subtypes

| Operation | Count | % |
|-----------|-------|---|
| set_line | 63 | 87.5% |
| replace_lines | 2 | 2.8% |
| insert_after | 7 | 9.7% |
| replace | 0 | 0.0% |
| **Total** | **72** | 100% |

## Task Results

| Task | File | Success | Edit Hit | R/E/W | Tokens (In/Out) | Time | Indent |
|------|------|---------|----------|-------|-----------------|------|--------|
| Access Remove Optional Chain 001 | registerDevToolsEventLogger.js | 1/1 ✅ | 100.0% | 2/1/0 | 7,780/530 | 17.8s | 1.00 |
| Access Remove Optional Chain 002 | TimelineContext.js | 1/1 ✅ | 100.0% | 3/1/0 | 10,213/412 | 19.4s | 1.29 |
| Access Remove Optional Chain 003 | astUtils.js | 1/1 ✅ | 100.0% | 3/1/0 | 11,022/707 | 13.5s | 4.85 |
| Call Swap Call Args 001 | testHelpers.js | 1/1 ✅ | 100.0% | 2/1/0 | 6,251/272 | 7.0s | 1.33 |
| Call Swap Call Args 002 | FlamegraphChartBuilder.js | 1/1 ✅ | 100.0% | 2/1/0 | 7,930/357 | 11.5s | 3.79 |
| Call Swap Call Args 003 | SyntheticEvent.js | 1/1 ✅ | 100.0% | 3/1/0 | 9,483/360 | 21.1s | 3.76 |
| Duplicate Duplicate Line Flip 001 | index.js | 1/1 ✅ | 100.0% | 2/1/0 | 6,436/220 | 5.5s | 0.00 |
| Duplicate Duplicate Line Flip 002 | ActivityList.js | 1/1 ✅ | 100.0% | 3/1/0 | 13,925/270 | 7.9s | 3.61 |
| Duplicate Duplicate Line Flip 003 | SyntheticEvent.js | 1/1 ✅ | 100.0% | 2/1/0 | 28,220/1,307 | 37.2s | 1.02 |
| Identifier Identifier Multi Edit 001 | TabBar.js | 1/1 ✅ | 100.0% | 2/1/0 | 8,488/677 | 15.2s | 3.33 |
| Identifier Identifier Multi Edit 002 | EventPluginRegistry.js | 1/1 ✅ | 100.0% | 2/1/0 | 6,250/1,239 | 34.0s | 3.94 |
| Identifier Identifier Multi Edit 003 | ReactPerformanceTrackProperties.js | 1/1 ✅ | 100.0% | 5/2/0 | 12,171/1,560 | 44.2s | 9.95 |
| Import Swap Named Imports 001 | CommitFlamegraphListItem.js | 1/1 ✅ | 100.0% | 2/1/0 | 7,337/469 | 10.9s | 2.86 |
| Import Swap Named Imports 002 | ReactDOMTextarea.js | 1/1 ✅ | 100.0% | 4/1/0 | 4,850/772 | 23.8s | 2.41 |
| Import Swap Named Imports 003 | StyleEditor.js | 1/1 ✅ | 100.0% | 7/1/0 | 9,482/4,980 | 119.5s | 1.31 |
| Literal Flip Boolean 001 | testHelpers.js | 1/1 ✅ | 100.0% | 2/1/0 | 6,141/231 | 7.4s | 1.33 |
| Literal Flip Boolean 002 | ReactNoopFlightServer.js | 1/1 ✅ | 100.0% | 4/1/0 | 4,374/818 | 28.3s | 1.11 |
| Literal Flip Boolean 003 | ReactFlightDOMClientEdge.js | 1/1 ✅ | 100.0% | 6/1/0 | 21,036/552 | 16.5s | 3.58 |
| Literal Off By One 001 | githubAPI.js | 1/1 ✅ | 100.0% | 2/1/0 | 12,065/239 | 6.1s | 0.67 |
| Literal Off By One 002 | code-path.js | 1/1 ✅ | 100.0% | 3/1/0 | 12,931/3,506 | 64.0s | 3.50 |
| Literal Off By One 003 | InspectedElement.js | 1/1 ✅ | 100.0% | 2/1/0 | 14,587/341 | 9.4s | 3.60 |
| Operator Remove Negation 001 | ReactDOMClient.js | 0/1 ❌ | 100.0% | 5/2/0 | 9,075/3,715 | 69.7s | 1.08 |
| Operator Remove Negation 002 | NativeEventsView.js | 1/1 ✅ | 100.0% | 4/1/0 | 16,075/2,289 | 159.9s | 3.03 |
| Operator Remove Negation 003 | ReactFlightUnbundledReferences.js | 0/1 ❌ | 100.0% | 1/1/0 | 1,435/7,319 | 147.8s | 2.00 |
| Operator Swap Arithmetic 001 | fallbackEvalContext.js | 1/1 ✅ | 100.0% | 3/1/0 | 11,809/381 | 13.2s | 0.00 |
| Operator Swap Arithmetic 002 | CSSShorthandProperty.js | 1/1 ✅ | 100.0% | 3/1/0 | 15,322/599 | 19.5s | 2.88 |
| Operator Swap Arithmetic 003 | hooks.js | 0/1 ❌ | 100.0% | 4/1/0 | 10,988/4,588 | 117.4s | 2.25 |
| Operator Swap Comparison 001 | index.js | 1/1 ✅ | 100.0% | 2/1/0 | 12,581/242 | 8.4s | 0.00 |
| Operator Swap Comparison 002 | ReactFlightDOMServerBrowser.js | 1/1 ✅ | 100.0% | 3/1/0 | 13,739/388 | 11.1s | 1.57 |
| Operator Swap Comparison 003 | ReactFlightDOMServerNode.js | 1/1 ✅ | 100.0% | 4/1/0 | 11,165/1,401 | 40.3s | 1.95 |
| Operator Swap Equality 001 | readInputData.js | 1/1 ✅ | 100.0% | 2/1/0 | 11,539/236 | 9.3s | 0.00 |
| Operator Swap Equality 002 | editor.js | 1/1 ✅ | 100.0% | 2/1/0 | 15,817/300 | 11.3s | 0.00 |
| Operator Swap Equality 003 | hooks.js | 1/1 ✅ | 100.0% | 2/1/0 | 5,973/434 | 16.1s | 2.25 |
| Operator Swap Increment Decrement 001 | ReactFlightDOMClientNode.js | 1/1 ✅ | 100.0% | 3/1/0 | 6,573/287 | 9.9s | 1.52 |
| Operator Swap Increment Decrement 002 | ReactFlightDOMClientNode.js | 1/1 ✅ | 100.0% | 3/1/0 | 7,363/310 | 12.7s | 1.92 |
| Operator Swap Increment Decrement 003 | loadSourceAndMetadata.js | 1/1 ✅ | 100.0% | 3/1/0 | 13,663/275 | 7.6s | 3.72 |
| Operator Swap Logical 001 | profiling.js | 1/1 ✅ | 100.0% | 2/1/0 | 6,308/283 | 6.8s | 0.00 |
| Operator Swap Logical 002 | SourceMapMetadataConsumer.js | 1/1 ✅ | 100.0% | 2/1/0 | 9,169/901 | 25.0s | 3.14 |
| Operator Swap Logical 003 | DevToolsFiberComponentStack.js | 1/1 ✅ | 100.0% | 3/1/0 | 5,357/443 | 12.6s | 4.13 |
| Operator Swap Nullish 001 | getBatchRange.js | 1/1 ✅ | 100.0% | 2/1/0 | 3,106/355 | 17.5s | 1.33 |
| Operator Swap Nullish 002 | EnterLeaveEventPlugin.js | 1/1 ✅ | 100.0% | 2/1/0 | 12,622/914 | 23.5s | 1.56 |
| Operator Swap Nullish 003 | backend.js | 0/1 ❌ | 100.0% | 2/1/0 | 15,551/1,107 | 21.2s | 3.15 |
| Regex Swap Regex Quantifier 001 | githubAPI.js | 1/1 ✅ | 100.0% | 2/1/0 | 8,484/265 | 7.4s | 0.67 |
| Regex Swap Regex Quantifier 002 | ReactFlightStackConfigV8.js | 1/1 ✅ | 100.0% | 3/1/0 | 14,799/4,207 | 108.2s | 3.06 |
| Regex Swap Regex Quantifier 003 | utils.js | 1/1 ✅ | 100.0% | 6/1/0 | 30,650/894 | 22.7s | 2.00 |
| Structural Delete Statement 001 | UnsupportedVersionDialog.js | 1/1 ✅ | 100.0% | 3/1/0 | 18,109/350 | 9.6s | 6.22 |
| Structural Delete Statement 002 | getComponentNameFromFiber.js | 1/1 ✅ | 100.0% | 3/1/0 | 9,919/855 | 26.2s | 0.62 |
| Structural Delete Statement 003 | simulateBrowserEventDispatch.js | 1/1 ✅ | 100.0% | 3/1/0 | 10,010/467 | 11.1s | 4.46 |
| Structural Remove Early Return 001 | InspectedElementStateTree.js | 1/1 ✅ | 100.0% | 4/1/0 | 8,125/746 | 18.0s | 0.36 |
| Structural Remove Early Return 002 | useCommitFilteringAndNavigation.js | 1/1 ✅ | 100.0% | 5/1/0 | 10,957/1,407 | 39.5s | 3.73 |
| Structural Remove Early Return 003 | ReactFiberAsyncAction.js | 0/1 ❌ | 100.0% | 3/1/0 | 5,497/1,565 | 26.9s | 1.46 |
| Structural Swap Adjacent Lines 001 | ReactServerConsoleConfigPlain.js | 1/1 ✅ | 100.0% | 2/1/0 | 11,464/257 | 7.8s | 1.00 |
| Structural Swap Adjacent Lines 002 | ReactNoopFlightServer.js | 1/1 ✅ | 100.0% | 3/1/0 | 4,051/1,710 | 49.1s | 1.11 |
| Structural Swap Adjacent Lines 003 | backend.js | 0/1 ❌ | 100.0% | 2/2/0 | 21,332/12,770 | 309.8s | 3.15 |
| Structural Swap If Else 001 | importFile.js | 0/1 ❌ | 100.0% | 3/1/0 | 6,378/384 | 11.7s | 0.00 |
| Structural Swap If Else 002 | ReactNativeFiberInspector.js | 0/1 ❌ | 100.0% | 2/1/0 | 13,839/1,185 | 23.7s | 3.18 |
| Structural Swap If Else 003 | ReactDOMFizzStaticNode.js | 1/1 ✅ | 100.0% | 3/1/0 | 2,942/4,976 | 223.5s | 1.88 |
| Unicode Unicode Hyphen 001 | Rectangle.js | 1/1 ✅ | 100.0% | 2/1/0 | 8,422/236 | 6.4s | 3.00 |
| Unicode Unicode Hyphen 002 | UnsupportedBridgeProtocolDialog.js | 1/1 ✅ | 100.0% | 2/1/0 | 12,359/258 | 7.1s | 3.83 |
| Unicode Unicode Hyphen 003 | ReactTypes.js | 1/1 ✅ | 100.0% | 2/1/0 | 7,913/332 | 14.3s | 1.24 |

## Category Summary

| Category | Runs | Verified | Edit Used | Success | Min/Avg/Max Difficulty |
|----------|------|----------|-----------|---------|------------------------|
| access | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 7 / 8.7 / 10 |
| call | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 6 / 7.7 / 10 |
| duplicate | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 7 / 9.7 / 12 |
| identifier | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 6 / 9.3 / 14 |
| import | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 2 / 4.7 / 6 |
| literal | 6 | 100.0% (6/6) | 100.0% (6/6) | 100.0% (6/6) | 4 / 6.2 / 9 |
| operator | 21 | 81.0% (17/21) | 100.0% (21/21) | 81.0% (17/21) | 1 / 6.5 / 13 |
| regex | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 6 / 7.3 / 8 |
| structural | 12 | 66.7% (8/12) | 100.0% (12/12) | 66.7% (8/12) | 4 / 7.6 / 15 |
| unicode | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 1 / 3.0 / 6 |

## Mutation Summary

| Mutation | Category | Runs | Verified | Edit Used | Success |
|----------|----------|------|----------|-----------|---------|
| delete-statement | structural | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| duplicate-line-flip | duplicate | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| flip-boolean | literal | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| identifier-multi-edit | identifier | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| off-by-one | literal | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| remove-early-return | structural | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| remove-negation | operator | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| remove-optional-chain | access | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| swap-adjacent-lines | structural | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| swap-arithmetic | operator | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| swap-call-args | call | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
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
| 6-8 | 24 | 91.7% (22/24) | 100.0% (24/24) | 91.7% (22/24) |
| 9+ | 18 | 77.8% (14/18) | 100.0% (18/18) | 77.8% (14/18) |

## Failed Tasks (0% passing)

### Operator Remove Negation 001 (ReactDOMClient.js) — 0/1

**All runs failed with same error:** File mismatch for ReactDOMClient.js

**Sample agent response (run 1):**
```
Applied the line-anchored fix in `ReactDOMClient.js` at line 57 by removing the stray logical negation, then re-read the region to verify only the intended line is changed:

```js
if (foundDevTools && canUseDOM && window.top === window.self) {
```
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
Fixed `ReactFlightUnbundledReferences.js` with a single-token change to remove the accidental negation in the null check:

- Changed:
  - `if (thisBind != null) {`
- To:
  - `if (thisBind == null) {`

I re-read the edited region to confirm only that intended line was modified.
```

**Diff (expected vs actual):**
```diff
@@ -64 @@
   if (this.$$typeof === SERVER_REFERENCE_TAG) {
     if (__DEV__) {
       const thisBind = arguments[0];
-      if (thisBind != null) {
+      if (thisBind == null) {
         console.error(
           'Cannot bind "this" of a Server Action. Pass null or undefined as the first argument to .bind().',
         );
@@ -247 @@
         // Use a cached value
         return target.then;
       }
-      if (!target.$$async) {
+      if (target.$$async) {
         // If this module is expected to return a Promise (such as an AsyncModule) then
         // we should resolve that with a client reference that unwraps the Promise on
         // the client.
```

### Operator Swap Arithmetic 003 (hooks.js) — 0/1

**All runs failed with same error:** File mismatch for hooks.js

**Sample agent response (run 1):**
```
Fixed the overflow check in `useIsOverflowing` by correcting the swapped operator:

- `container.clientWidth <= totalChildWidth`
- → `container.clientWidth < totalChildWidth`
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
Fixed `backend.js` by changing the swapped operator on the resolver fallback:

- `resolveRNStyle || hook.resolveRNStyle`
- → `resolveRNStyle ?? hook.resolveRNStyle`

Confirmed by re-reading the changed region; only that intended line was modified.
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

### Structural Remove Early Return 003 (ReactFiberAsyncAction.js) — 0/1

**All runs failed with same error:** File mismatch for ReactFiberAsyncAction.js

**Sample agent response (run 1):**
```
Applied a minimal fix in `ReactFiberAsyncAction.js` by restoring the missing guard clause in `releaseIsomorphicIndicator`:

```js
if (pendingEntangledRoots === 0) {
  return;
}
```

I re-read the changed region to confirm only this targeted mutation was made.
```

**Diff (expected vs actual):**
```diff
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
@@ -217 @@
 }
 
 function releaseIsomorphicIndicator() {
+  if (pendingEntangledRoots === 0) {
+    return;
+  }
   if (--pendingEntangledRoots === 0) {
     stopIsomorphicDefaultIndicator();
   }
```

### Structural Swap Adjacent Lines 003 (backend.js) — 0/1

**All runs failed with same error:** File mismatch for backend.js

**Sample agent response (run 1):**
```
Fixed `backend.js` by swapping the order of the two adjacent statements in `connectWithCustomMessagingProtocol()` so `nativeStyleResolver` is computed before calling `initBackend()`.

Verified by re-reading the edited region (lines ~406–415) to ensure only that ordering changed.
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
@@ -376 @@
     hook.emit('shutdown');
   });
 
-  const unsubscribeBackend = initBackend(hook, agent, window, isReloadAndProfileSupported);
-
   const nativeStyleResolver: ResolveNativeStyle | void = resolveRNStyle || hook.resolveRNStyle;
 
   const nativeStyleResolver: ResolveNativeStyle | void = resolveRNStyle || hook.resolveRNStyle;
 
+  const unsubscribeBackend = initBackend(hook, agent, window, isReloadAndProfileSupported);
+
   if (nativeStyleResolver != null) {
     const validAttributes =
       nativeStyleEditorValidAttributes || hook.nativeStyleEditorValidAttributes || null;
```

### Structural Swap If Else 001 (importFile.js) — 0/1

**All runs failed with same error:** File mismatch for importFile.js

**Sample agent response (run 1):**
```
Done. I made the minimum change in `importFile.js` at the buggy branch:

- Negated the condition at line 34:
  - `if (error instanceof InvalidProfileError) {`
  - → `if (!(error instanceof InvalidProfileError)) {`

No other files or lines were modified.
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
Implemented the single intended fix in `ReactNativeFiberInspector.js` within `getInspectorDataForViewTag`:

- Negated the condition from `if (__DEV__)` to `if (!__DEV__)`.
- Left branch bodies and formatting unchanged.

Confirmed by re-reading the changed region; only that one line was modified.
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
