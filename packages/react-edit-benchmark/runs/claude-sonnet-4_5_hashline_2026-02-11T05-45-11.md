# Edit Benchmark Report

## Configuration

| Setting | Value |
|---------|-------|
| Date | 2026-02-11T05:42:15.917Z |
| Model | openrouter/openrouter/anthropic/claude-sonnet-4.5 |
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
| Successful Runs | 47 |
| **Task Success Rate** | **78.3% (47/60)** |
| Verified Rate | 78.3% (47/60) |
| Edit Tool Usage Rate | 98.3% (59/60) |
| **Edit Success Rate** | **100.0%** |
| Patch Failure Rate | 0.0% (0/59) |
| Tasks All Passing | 47 |
| Tasks Flaky/Failing | 13 |

### Tool Calls

| Tool | Total | Avg/Run |
|------|-------|---------|
| Read | 61 | 1.0 |
| Edit | 59 | 1.0 |
| Write | 0 | 0.0 |
| **Tool Input Chars** | 12,678 | 211 |

### Tokens & Time

| Metric | Total | Avg/Run |
|--------|-------|---------|
| Input Tokens | 1,637,856 | 27,298 |
| Output Tokens | 44,198 | 737 |
| Total Tokens | 2,114,156 | 35,236 |
| Duration | 1203.5s | 20.1s |
| **Avg Indent Score** | — | **2.16** |

### Hashline Edit Subtypes

| Operation | Count | % |
|-----------|-------|---|
| replaceLine | 55 | 83.3% |
| replaceLines | 6 | 9.1% |
| insertAfter | 5 | 7.6% |
| insertBefore | 0 | 0.0% |
| substr | 0 | 0.0% |
| **Total** | **66** | 100% |

## Task Results

| Task | File | Success | Edit Hit | R/E/W | Tokens (In/Out) | Time | Indent |
|------|------|---------|----------|-------|-----------------|------|--------|
| Access Remove Optional Chain 001 | registerDevToolsEventLogger.js | 0/1 ❌ | 100.0% | 1/1/0 | 21,732/964 | 23.2s | 1.00 |
| Access Remove Optional Chain 002 | TimelineContext.js | 1/1 ✅ | 100.0% | 1/1/0 | 32,981/717 | 18.2s | 1.29 |
| Access Remove Optional Chain 003 | astUtils.js | 0/1 ❌ | 100.0% | 1/1/0 | 39,785/843 | 20.8s | 0.00 |
| Call Swap Call Args 001 | testHelpers.js | 1/1 ✅ | 100.0% | 1/1/0 | 19,842/577 | 13.4s | 1.33 |
| Call Swap Call Args 002 | FlamegraphChartBuilder.js | 1/1 ✅ | 100.0% | 1/1/0 | 24,651/642 | 15.5s | 3.79 |
| Call Swap Call Args 003 | SyntheticEvent.js | 1/1 ✅ | 100.0% | 1/1/0 | 37,913/938 | 23.0s | 3.76 |
| Duplicate Duplicate Line Flip 001 | index.js | 1/1 ✅ | 100.0% | 1/1/0 | 20,766/550 | 13.1s | 0.00 |
| Duplicate Duplicate Line Flip 002 | ActivityList.js | 1/1 ✅ | 100.0% | 1/1/0 | 26,295/569 | 15.6s | 3.61 |
| Duplicate Duplicate Line Flip 003 | SyntheticEvent.js | 1/1 ✅ | 100.0% | 1/1/0 | 37,753/885 | 20.5s | 1.02 |
| Identifier Identifier Multi Edit 001 | TabBar.js | 1/1 ✅ | 100.0% | 1/1/0 | 22,789/1,001 | 21.5s | 3.33 |
| Identifier Identifier Multi Edit 002 | EventPluginRegistry.js | 1/1 ✅ | 100.0% | 1/1/0 | 35,795/843 | 17.9s | 3.94 |
| Identifier Identifier Multi Edit 003 | ReactPerformanceTrackProperties.js | 1/1 ✅ | 100.0% | 1/1/0 | 32,046/888 | 19.8s | 9.95 |
| Import Swap Named Imports 001 | CommitFlamegraphListItem.js | 1/1 ✅ | 100.0% | 1/1/0 | 32,087/654 | 18.3s | 2.86 |
| Import Swap Named Imports 002 | ReactDOMTextarea.js | 1/1 ✅ | 100.0% | 1/1/0 | 33,382/489 | 15.0s | 2.41 |
| Import Swap Named Imports 003 | StyleEditor.js | 0/1 ❌ | 100.0% | 1/1/0 | 28,280/2,053 | 42.2s | 1.31 |
| Literal Flip Boolean 001 | testHelpers.js | 1/1 ✅ | 100.0% | 1/1/0 | 19,832/584 | 13.4s | 1.33 |
| Literal Flip Boolean 002 | ReactNoopFlightServer.js | 1/1 ✅ | 100.0% | 1/1/0 | 22,234/625 | 15.3s | 1.11 |
| Literal Flip Boolean 003 | ReactFlightDOMClientEdge.js | 1/1 ✅ | 100.0% | 1/1/0 | 25,824/675 | 16.8s | 3.58 |
| Literal Off By One 001 | githubAPI.js | 1/1 ✅ | 100.0% | 1/1/0 | 20,226/516 | 13.4s | 0.67 |
| Literal Off By One 002 | code-path.js | 1/1 ✅ | 100.0% | 1/1/0 | 25,351/781 | 18.3s | 3.50 |
| Literal Off By One 003 | InspectedElement.js | 1/1 ✅ | 100.0% | 1/1/0 | 28,699/719 | 19.1s | 3.60 |
| Operator Remove Negation 001 | ReactDOMClient.js | 1/1 ✅ | 100.0% | 1/1/0 | 21,331/543 | 14.4s | 1.08 |
| Operator Remove Negation 002 | NativeEventsView.js | 1/1 ✅ | 100.0% | 1/1/0 | 26,189/578 | 15.8s | 3.03 |
| Operator Remove Negation 003 | ReactFlightUnbundledReferences.js | 0/1 ❌ | 100.0% | 0/0/0 | 0/0 | 120.5s | 0.00 |
| Operator Swap Arithmetic 001 | fallbackEvalContext.js | 1/1 ✅ | 100.0% | 1/1/0 | 19,707/473 | 11.7s | 0.00 |
| Operator Swap Arithmetic 002 | CSSShorthandProperty.js | 1/1 ✅ | 100.0% | 2/1/0 | 36,719/750 | 22.2s | 2.88 |
| Operator Swap Arithmetic 003 | hooks.js | 0/1 ❌ | 100.0% | 1/1/0 | 31,332/1,205 | 30.0s | 2.25 |
| Operator Swap Comparison 001 | index.js | 1/1 ✅ | 100.0% | 1/1/0 | 20,741/468 | 13.2s | 0.00 |
| Operator Swap Comparison 002 | ReactFlightDOMServerBrowser.js | 1/1 ✅ | 100.0% | 1/1/0 | 26,281/713 | 17.1s | 1.57 |
| Operator Swap Comparison 003 | ReactFlightDOMServerNode.js | 1/1 ✅ | 100.0% | 1/1/0 | 39,210/702 | 18.8s | 1.95 |
| Operator Swap Equality 001 | readInputData.js | 1/1 ✅ | 100.0% | 1/1/0 | 28,890/513 | 13.6s | 0.00 |
| Operator Swap Equality 002 | editor.js | 1/1 ✅ | 100.0% | 1/1/0 | 24,599/505 | 13.7s | 0.00 |
| Operator Swap Equality 003 | hooks.js | 1/1 ✅ | 100.0% | 1/1/0 | 30,824/632 | 18.7s | 2.25 |
| Operator Swap Increment Decrement 001 | ReactFlightDOMClientNode.js | 1/1 ✅ | 100.0% | 1/1/0 | 31,696/660 | 16.5s | 1.52 |
| Operator Swap Increment Decrement 002 | ReactFlightDOMClientNode.js | 1/1 ✅ | 100.0% | 1/1/0 | 22,771/638 | 15.9s | 1.92 |
| Operator Swap Increment Decrement 003 | loadSourceAndMetadata.js | 1/1 ✅ | 100.0% | 1/1/0 | 34,835/619 | 15.0s | 3.72 |
| Operator Swap Logical 001 | profiling.js | 1/1 ✅ | 100.0% | 1/1/0 | 20,049/493 | 12.5s | 0.00 |
| Operator Swap Logical 002 | SourceMapMetadataConsumer.js | 1/1 ✅ | 100.0% | 1/1/0 | 25,944/1,016 | 24.9s | 3.14 |
| Operator Swap Logical 003 | DevToolsFiberComponentStack.js | 1/1 ✅ | 100.0% | 2/1/0 | 26,187/910 | 21.4s | 4.13 |
| Operator Swap Nullish 001 | getBatchRange.js | 1/1 ✅ | 100.0% | 1/1/0 | 20,267/527 | 13.3s | 1.33 |
| Operator Swap Nullish 002 | EnterLeaveEventPlugin.js | 1/1 ✅ | 100.0% | 1/1/0 | 33,978/913 | 25.1s | 1.56 |
| Operator Swap Nullish 003 | backend.js | 0/1 ❌ | 100.0% | 1/1/0 | 31,547/589 | 14.9s | 3.15 |
| Regex Swap Regex Quantifier 001 | githubAPI.js | 1/1 ✅ | 100.0% | 1/1/0 | 20,301/593 | 14.7s | 0.67 |
| Regex Swap Regex Quantifier 002 | ReactFlightStackConfigV8.js | 1/1 ✅ | 100.0% | 1/1/0 | 27,073/880 | 19.7s | 3.06 |
| Regex Swap Regex Quantifier 003 | utils.js | 1/1 ✅ | 100.0% | 1/1/0 | 35,736/836 | 21.7s | 2.00 |
| Structural Delete Statement 001 | UnsupportedVersionDialog.js | 0/1 ❌ | 100.0% | 1/1/0 | 21,007/550 | 14.1s | 6.22 |
| Structural Delete Statement 002 | getComponentNameFromFiber.js | 1/1 ✅ | 100.0% | 1/1/0 | 24,019/612 | 15.2s | 0.62 |
| Structural Delete Statement 003 | simulateBrowserEventDispatch.js | 0/1 ❌ | 100.0% | 1/1/0 | 39,046/732 | 21.9s | 4.46 |
| Structural Remove Early Return 001 | InspectedElementStateTree.js | 1/1 ✅ | 100.0% | 1/1/0 | 21,511/754 | 17.3s | 0.36 |
| Structural Remove Early Return 002 | useCommitFilteringAndNavigation.js | 0/1 ❌ | 100.0% | 1/1/0 | 24,804/601 | 19.1s | 3.73 |
| Structural Remove Early Return 003 | ReactFiberAsyncAction.js | 0/1 ❌ | 100.0% | 1/1/0 | 27,151/1,037 | 23.4s | 1.46 |
| Structural Swap Adjacent Lines 001 | ReactServerConsoleConfigPlain.js | 1/1 ✅ | 100.0% | 1/1/0 | 20,514/579 | 12.6s | 1.00 |
| Structural Swap Adjacent Lines 002 | ReactNoopFlightServer.js | 1/1 ✅ | 100.0% | 1/1/0 | 31,435/627 | 15.9s | 1.11 |
| Structural Swap Adjacent Lines 003 | backend.js | 0/1 ❌ | 100.0% | 1/1/0 | 33,462/2,679 | 49.0s | 0.50 |
| Structural Swap If Else 001 | importFile.js | 0/1 ❌ | 100.0% | 1/1/0 | 29,366/727 | 17.4s | 0.00 |
| Structural Swap If Else 002 | ReactNativeFiberInspector.js | 0/1 ❌ | 100.0% | 1/1/0 | 26,514/652 | 15.8s | 3.18 |
| Structural Swap If Else 003 | ReactDOMFizzStaticNode.js | 1/1 ✅ | 100.0% | 1/1/0 | 30,091/782 | 20.4s | 1.88 |
| Unicode Unicode Hyphen 001 | Rectangle.js | 1/1 ✅ | 100.0% | 1/1/0 | 22,241/528 | 13.7s | 3.00 |
| Unicode Unicode Hyphen 002 | UnsupportedBridgeProtocolDialog.js | 1/1 ✅ | 100.0% | 1/1/0 | 32,276/526 | 15.0s | 3.83 |
| Unicode Unicode Hyphen 003 | ReactTypes.js | 1/1 ✅ | 100.0% | 1/1/0 | 29,949/543 | 13.4s | 1.24 |

## Category Summary

| Category | Runs | Verified | Edit Used | Success | Min/Avg/Max Difficulty |
|----------|------|----------|-----------|---------|------------------------|
| access | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) | 7 / 8.7 / 10 |
| call | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 6 / 7.7 / 10 |
| duplicate | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 7 / 9.7 / 12 |
| identifier | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 6 / 9.3 / 14 |
| import | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) | 2 / 4.7 / 6 |
| literal | 6 | 100.0% (6/6) | 100.0% (6/6) | 100.0% (6/6) | 4 / 6.2 / 9 |
| operator | 21 | 85.7% (18/21) | 95.2% (20/21) | 85.7% (18/21) | 1 / 6.5 / 13 |
| regex | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 6 / 7.3 / 8 |
| structural | 12 | 41.7% (5/12) | 100.0% (12/12) | 41.7% (5/12) | 4 / 7.6 / 15 |
| unicode | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 1 / 3.0 / 6 |

## Mutation Summary

| Mutation | Category | Runs | Verified | Edit Used | Success |
|----------|----------|------|----------|-----------|---------|
| delete-statement | structural | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| duplicate-line-flip | duplicate | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| flip-boolean | literal | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| identifier-multi-edit | identifier | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| off-by-one | literal | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| remove-early-return | structural | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| remove-negation | operator | 3 | 66.7% (2/3) | 66.7% (2/3) | 66.7% (2/3) |
| remove-optional-chain | access | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| swap-adjacent-lines | structural | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| swap-arithmetic | operator | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| swap-call-args | call | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| swap-comparison | operator | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| swap-equality | operator | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| swap-if-else | structural | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| swap-increment-decrement | operator | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| swap-logical | operator | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| swap-named-imports | import | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| swap-nullish | operator | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| swap-regex-quantifier | regex | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| unicode-hyphen | unicode | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |

## Difficulty Summary

| Difficulty Score | Runs | Verified | Edit Used | Success |
|------------------|------|----------|-----------|---------|
| 0-2 | 6 | 100.0% (6/6) | 100.0% (6/6) | 100.0% (6/6) |
| 3-5 | 12 | 83.3% (10/12) | 100.0% (12/12) | 83.3% (10/12) |
| 6-8 | 24 | 79.2% (19/24) | 100.0% (24/24) | 79.2% (19/24) |
| 9+ | 18 | 66.7% (12/18) | 94.4% (17/18) | 66.7% (12/18) |

## Failed Tasks (0% passing)

### Access Remove Optional Chain 001 (registerDevToolsEventLogger.js) — 0/1

**All runs failed with same error:** File mismatch for registerDevToolsEventLogger.js

**Sample agent response (run 1):**
```
The fix has been applied. I restored the optional chaining operator on the `postMessage` method call on line 36, changing `currentLoggingIFrame.contentWindow?.postMessage(` to `currentLoggingIFrame.contentWindow?.postMessage?.(`. This ensures safe access to the `postMessage` method even if `contentWindow` is null or undefined.
```

**Diff (expected vs actual):**
```diff
@@ -31 @@
         const additionalContext: LoggerContext | {} =
           fetchAdditionalContext != null ? await fetchAdditionalContext() : {};
 
-        currentLoggingIFrame?.contentWindow?.postMessage(
+        currentLoggingIFrame.contentWindow?.postMessage?.(
           {
             source: 'react-devtools-logging',
             event: eventWithoutMetadata,
```

### Access Remove Optional Chain 003 (astUtils.js) — 0/1

**All runs failed with same error:** File mismatch for astUtils.js

**Sample agent response (run 1):**
```
Fixed. The bug was on line 87 where `hookNode.node.init.object && hookNode.node.init.object.name` should have been `hookNode.node.init.object?.name` using optional chaining, consistent with similar property accesses elsewhere in the file.
```

**Diff (expected vs actual):**
```diff
@@ -7 @@
  * @flow
  */
 
-import { withSyncPerfMeasurements } from 'react-devtools-shared/src/PerformanceLoggingUtils';
+import {withSyncPerfMeasurements} from 'react-devtools-shared/src/PerformanceLoggingUtils';
 import traverse from '@babel/traverse';
 
 import traverse from '@babel/traverse';
 
-import type { HooksNode } from 'react-debug-tools/src/ReactDebugHooks';
+import type {HooksNode} from 'react-debug-tools/src/ReactDebugHooks';
 
 // Missing types in @babel/traverse
 type NodePath = any;
@@ -42 @@
 });
 
 // Check if line number obtained from source map and the line number in hook node match
-function checkNodeLocation(path: NodePath, line: number, column?: number | null = null): boolean {
-  const { start, end } = path.node.loc;
+function checkNodeLocation(
+  path: NodePath,
+  line: number,
+  column?: number | null = null,
+): boolean {
+  const {start, end} = path.node.loc;
 
   if (line !== start.line) {
     return false;
@@ -72 @@
 }
 
 // Checks whether hookNode is a member of targetHookNode
-function filterMemberNodesOfTargetHook(targetHookNode: NodePath, hookNode: NodePath): boolean {
+function filterMemberNodesOfTargetHook(
+  targetHookNode: NodePath,
+  hookNode: NodePath,
+): boolean {
   const targetHookName = targetHookNode.node.id.name;
   return (
     targetHookName != null &&
   const targetHookName = targetHookNode.node.id.name;
   return (
     targetHookName != null &&
-    (targetHookName === (hookNode.node.init.object && hookNode.node.init.object.name) ||
+    (targetHookName ===
+      (targetHookName === hookNode.node.init.object?.name ||
       targetHookName === hookNode.node.init.name)
   );
 }
@@ -112 @@
     //                        -> const tickState = useState(1);
     //                           const tick = tickState[0];
     //                           const setTick = tickState[1];
-    nodesAssociatedWithReactHookASTNode = potentialHooksFound.filter((hookNode) =>
+    nodesAssociatedWithReactHookASTNode = pote...
```

### Import Swap Named Imports 003 (StyleEditor.js) — 0/1

**All runs failed with same error:** File mismatch for StyleEditor.js

**Sample agent response (run 1):**
```
The fix has been applied. I swapped the two named imports `BridgeContext` and `StoreContext` in the destructuring import on lines 14-15. This ensures that the correct context is used when calling `useContext(BridgeContext)` and `useContext(StoreContext)` on lines 36-37.
```

**Diff (expected vs actual):**
```diff
@@ -8 @@
  */
 
 import * as React from 'react';
-import { useContext, useMemo, useRef, useState } from 'react';
+import { useMemo, useContext, useRef, useState } from 'react';
 import { copy } from 'clipboard-js';
 import { copy } from 'clipboard-js';
-import { BridgeContext, StoreContext } from 'react-devtools-shared/src/devtools/views/context';
+import { StoreContext, BridgeContext } from 'react-devtools-shared/src/devtools/views/context';
 import Button from '../../Button';
 import ButtonIcon from '../../ButtonIcon';
 import { serializeDataForCopy } from '../../utils';
```

### Operator Remove Negation 003 (ReactFlightUnbundledReferences.js) — 0/1

**All runs failed with same error:** Timeout waiting for agent_end

### Operator Swap Arithmetic 003 (hooks.js) — 0/1

**All runs failed with same error:** File mismatch for hooks.js

**Sample agent response (run 1):**
```
Fixed. Changed the comparison operator on line 129 from `<=` to `<`. The bug was that the overflow check was using `<=` when it should use `<` - content that exactly fits the container width shouldn't be considered overflowing.
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
Fixed. Line 414 was using the logical OR operator (`||`) instead of the nullish coalescing operator (`??`). The bug is now corrected to match the pattern used elsewhere in the code.
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

### Structural Delete Statement 001 (UnsupportedVersionDialog.js) — 0/1

**All runs failed with same error:** File mismatch for UnsupportedVersionDialog.js

**Sample agent response (run 1):**
```
Fixed. The missing statement `const store = useContext(StoreContext);` has been restored after line 22. This variable is required by the `useEffect` hook which references `store.unsupportedRendererVersionDetected` and `store.addListener`/`store.removeListener` methods.
```

**Diff (expected vs actual):**
```diff
@@ -19 @@
 
 export default function UnsupportedVersionDialog(_: {}): null {
   const { dispatch } = useContext(ModalDialogContext);
-  const store = useContext(StoreContext);
   const [state, setState] = useState<DAILOG_STATE>('dialog-not-shown');
   const [state, setState] = useState<DAILOG_STATE>('dialog-not-shown');
+  const store = useContext(StoreContext);
 
   useEffect(() => {
     if (state === 'dialog-not-shown') {
```

### Structural Delete Statement 003 (simulateBrowserEventDispatch.js) — 0/1

**All runs failed with same error:** File mismatch for simulateBrowserEventDispatch.js

**Sample agent response (run 1):**
```
The bug has been fixed. The missing statement `eventImpl._path = [];` has been added after line 70 where `eventImpl._dispatchFlag` is set to `true`. This initialization is critical because:

1. The `appendToEventPath` function (line 80, and throughout the while loop) pushes to `eventImpl._path`
2. Multiple loops iterate over `eventImpl._path` (lines 174-182, 198-208, 210-224)
3. The path is accessed for finding the clear targets struct (line 183)
4. The path is cleared at the end of dispatch ...
```

**Diff (expected vs actual):**
```diff
@@ -68 @@
   let activationTarget = null;
 
   eventImpl._dispatchFlag = true;
+  eventImpl._path = [];
 
   const targetOverride = legacyTargetOverrideFlag
     ? wrapperForImpl(targetImpl._globalObject._document)
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
The bug has been fixed. The missing guard clause in the `findFilteredIndex` function has been restored. The 3-line pattern (if condition, return statement, closing brace) is now present inside the for loop, checking if the current filtered index matches the commitIndex and returning the position if found.
```

**Diff (expected vs actual):**
```diff
@@ -63 @@
     (commitIndex: number | null, filtered: Array<number>): number | null => {
       if (commitIndex === null) return null;
       for (let i = 0; i < filtered.length; i++) {
-        if (filtered[i] === commitIndex) {
-          return i;
-        }
+        if (filtered[i] === commitIndex) return i;
       }
       return null;
     },
```

### Structural Remove Early Return 003 (ReactFiberAsyncAction.js) — 0/1

**All runs failed with same error:** File mismatch for ReactFiberAsyncAction.js

**Sample agent response (run 1):**
```
The fix has been applied. I've restored the missing guard clause that checks if `currentEntangledListeners === null` and returns early. This prevents the code from unnecessarily executing the subsequent logic (lines 117-137) when there are no listeners to notify, making the check on line 120 (now line 123) redundant but still valid as a defensive check.
```

**Diff (expected vs actual):**
```diff
@@ -98 @@
       }
     }
     clearEntangledAsyncTransitionTypes();
+    if (currentEntangledListeners === null) {
+      return;
+    }
     if (pendingEntangledRoots === 0) {
       stopIsomorphicDefaultIndicator();
     }
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
The bug has been fixed. I swapped the order of two adjacent code blocks (lines 406-422):

**Before:**
1. `const unsubscribeBackend = initBackend(...)` (lines 406-411)
2. Native style resolver declaration and `setupNativeStyleEditor` call (lines 413-422)

**After:**
1. Native style resolver declaration and `setupNativeStyleEditor` call (lines 413-422)  
2. `const unsubscribeBackend = initBackend(...)` (lines 406-411)

This ensures the native style editor is set up BEFORE the backend is initial...
```

**Diff (expected vs actual):**
```diff
@@ -9 @@
 
 import Agent from 'react-devtools-shared/src/backend/agent';
 import Bridge from 'react-devtools-shared/src/bridge';
-import { installHook } from 'react-devtools-shared/src/hook';
-import { initBackend } from 'react-devtools-shared/src/backend';
-import { __DEBUG__ } from 'react-devtools-shared/src/constants';
+import {installHook} from 'react-devtools-shared/src/hook';
+import {initBackend} from 'react-devtools-shared/src/backend';
+import {__DEBUG__} from 'react-devtools-shared/src/constants';
 import setupNativeStyleEditor from 'react-devtools-shared/src/backend/NativeStyleEditor/setupNativeStyleEditor';
 import {
   getDefaultComponentFilters,
@@ -18 @@
   getIsReloadAndProfileSupported,
 } from 'react-devtools-shared/src/utils';
 
-import type { BackendBridge } from 'react-devtools-shared/src/bridge';
-import type { ComponentFilter, Wall } from 'react-devtools-shared/src/frontend/types';
+import type {BackendBridge} from 'react-devtools-shared/src/bridge';
 import type {
 import type {
+  ComponentFilter,
+  Wall,
+} from 'react-devtools-shared/src/frontend/types';
+import type {
   DevToolsHook,
   DevToolsHookSettings,
   ProfilingSettings,
@@ -25 @@
   DevToolsHookSettings,
   ProfilingSettings,
 } from 'react-devtools-shared/src/backend/types';
-import type { ResolveNativeStyle } from 'react-devtools-shared/src/backend/NativeStyleEditor/setupNativeStyleEditor';
+import type {ResolveNativeStyle} from 'react-devtools-shared/src/backend/NativeStyleEditor/setupNativeStyleEditor';
 
 type ConnectOptions = {
   host?: string,
@@ -43 @@
   onReloadAndProfileFlagsReset?: () => void,
 };
 
-let savedComponentFilters: Array<ComponentFilter> = getDefaultComponentFilters();
+let savedComponentFilters: Array<ComponentFilter> =
+  getDefaultComponentFilters();
 
 function debug(methodName: string, ...args: Array<mixed>) {
   if (__DEBUG__) {
@@ -57 @@
 }
 
 export function initialize(
-  maybeSettingsOrSettingsPromise?: DevToolsHookSettings | Promise<DevTo...
```

### Structural Swap If Else 001 (importFile.js) — 0/1

**All runs failed with same error:** File mismatch for importFile.js

**Sample agent response (run 1):**
```
The bug has been fixed. I negated the condition by adding `!(...)` around `error instanceof InvalidProfileError` and swapped the branch bodies so that:
- When the error is NOT an `InvalidProfileError`: returns `UNEXPECTED_ERROR`
- When the error IS an `InvalidProfileError`: returns `INVALID_PROFILE_ERROR`
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
Fixed. The condition in `getInspectorDataForViewTag` is now negated from `if (__DEV__)` to `if (!__DEV__)`, which correctly throws an error in production and executes the inspector logic in development mode.
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
