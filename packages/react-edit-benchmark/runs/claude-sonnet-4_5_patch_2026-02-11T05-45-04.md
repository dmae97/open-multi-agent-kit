# Edit Benchmark Report

## Configuration

| Setting | Value |
|---------|-------|
| Date | 2026-02-11T05:42:42.139Z |
| Model | openrouter/openrouter/anthropic/claude-sonnet-4.5 |
| Thinking Level | default |
| Runs per task | 1 |
| Edit Variant | patch |
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
| Successful Runs | 49 |
| **Task Success Rate** | **81.7% (49/60)** |
| Verified Rate | 81.7% (49/60) |
| Edit Tool Usage Rate | 98.3% (59/60) |
| **Edit Success Rate** | **100.0%** |
| Patch Failure Rate | 0.0% (0/66) |
| Tasks All Passing | 49 |
| Tasks Flaky/Failing | 11 |

### Tool Calls

| Tool | Total | Avg/Run |
|------|-------|---------|
| Read | 60 | 1.0 |
| Edit | 66 | 1.1 |
| Write | 0 | 0.0 |
| **Tool Input Chars** | 24,492 | 408 |

### Tokens & Time

| Metric | Total | Avg/Run |
|--------|-------|---------|
| Input Tokens | 1,470,057 | 24,501 |
| Output Tokens | 51,223 | 854 |
| Total Tokens | 2,142,557 | 35,709 |
| Duration | 1274.4s | 21.2s |
| **Avg Indent Score** | — | **2.28** |

## Task Results

| Task | File | Success | Edit Hit | R/E/W | Tokens (In/Out) | Time | Indent |
|------|------|---------|----------|-------|-----------------|------|--------|
| Access Remove Optional Chain 001 | registerDevToolsEventLogger.js | 1/1 ✅ | 100.0% | 1/1/0 | 21,068/1,140 | 22.7s | 1.00 |
| Access Remove Optional Chain 002 | TimelineContext.js | 1/1 ✅ | 100.0% | 1/1/0 | 22,945/600 | 14.0s | 1.29 |
| Access Remove Optional Chain 003 | astUtils.js | 0/1 ❌ | 100.0% | 1/1/0 | 39,392/1,316 | 27.9s | 4.85 |
| Call Swap Call Args 001 | testHelpers.js | 1/1 ✅ | 100.0% | 1/1/0 | 19,174/646 | 13.4s | 1.33 |
| Call Swap Call Args 002 | FlamegraphChartBuilder.js | 1/1 ✅ | 100.0% | 1/1/0 | 23,876/622 | 15.0s | 3.79 |
| Call Swap Call Args 003 | SyntheticEvent.js | 1/1 ✅ | 100.0% | 1/1/0 | 28,053/1,057 | 23.6s | 3.76 |
| Duplicate Duplicate Line Flip 001 | index.js | 1/1 ✅ | 100.0% | 1/1/0 | 20,070/608 | 14.9s | 0.00 |
| Duplicate Duplicate Line Flip 002 | ActivityList.js | 1/1 ✅ | 100.0% | 1/1/0 | 25,588/618 | 15.9s | 3.61 |
| Duplicate Duplicate Line Flip 003 | SyntheticEvent.js | 1/1 ✅ | 100.0% | 1/1/0 | 37,260/1,159 | 26.2s | 1.02 |
| Identifier Identifier Multi Edit 001 | TabBar.js | 1/1 ✅ | 100.0% | 1/3/0 | 22,736/1,175 | 25.0s | 3.33 |
| Identifier Identifier Multi Edit 002 | EventPluginRegistry.js | 1/1 ✅ | 100.0% | 1/4/0 | 27,352/1,197 | 27.6s | 3.94 |
| Identifier Identifier Multi Edit 003 | ReactPerformanceTrackProperties.js | 1/1 ✅ | 100.0% | 1/3/0 | 32,276/1,218 | 29.9s | 9.95 |
| Import Swap Named Imports 001 | CommitFlamegraphListItem.js | 1/1 ✅ | 100.0% | 1/1/0 | 22,637/1,215 | 27.0s | 2.86 |
| Import Swap Named Imports 002 | ReactDOMTextarea.js | 1/1 ✅ | 100.0% | 1/1/0 | 23,508/642 | 15.8s | 2.41 |
| Import Swap Named Imports 003 | StyleEditor.js | 0/1 ❌ | 100.0% | 1/1/0 | 26,725/1,189 | 25.0s | 1.31 |
| Literal Flip Boolean 001 | testHelpers.js | 1/1 ✅ | 100.0% | 1/1/0 | 19,119/543 | 11.7s | 1.33 |
| Literal Flip Boolean 002 | ReactNoopFlightServer.js | 1/1 ✅ | 100.0% | 1/1/0 | 21,401/598 | 15.2s | 1.11 |
| Literal Flip Boolean 003 | ReactFlightDOMClientEdge.js | 1/1 ✅ | 100.0% | 2/1/0 | 25,604/1,066 | 26.9s | 3.58 |
| Literal Off By One 001 | githubAPI.js | 1/1 ✅ | 100.0% | 1/1/0 | 19,589/672 | 13.5s | 0.67 |
| Literal Off By One 002 | code-path.js | 1/1 ✅ | 100.0% | 1/1/0 | 24,810/849 | 19.8s | 3.50 |
| Literal Off By One 003 | InspectedElement.js | 1/1 ✅ | 100.0% | 1/1/0 | 27,972/799 | 19.7s | 3.60 |
| Operator Remove Negation 001 | ReactDOMClient.js | 1/1 ✅ | 100.0% | 1/1/0 | 20,631/597 | 14.7s | 1.08 |
| Operator Remove Negation 002 | NativeEventsView.js | 1/1 ✅ | 100.0% | 1/1/0 | 25,522/667 | 16.1s | 3.03 |
| Operator Remove Negation 003 | ReactFlightUnbundledReferences.js | 0/1 ❌ | 100.0% | 0/0/0 | 0/0 | 120.5s | 0.00 |
| Operator Swap Arithmetic 001 | fallbackEvalContext.js | 1/1 ✅ | 100.0% | 1/1/0 | 18,971/536 | 12.5s | 0.00 |
| Operator Swap Arithmetic 002 | CSSShorthandProperty.js | 1/1 ✅ | 100.0% | 1/1/0 | 23,559/538 | 13.2s | 2.88 |
| Operator Swap Arithmetic 003 | hooks.js | 0/1 ❌ | 100.0% | 1/1/0 | 29,907/522 | 15.3s | 2.25 |
| Operator Swap Comparison 001 | index.js | 1/1 ✅ | 100.0% | 1/1/0 | 19,965/521 | 11.8s | 0.00 |
| Operator Swap Comparison 002 | ReactFlightDOMServerBrowser.js | 1/1 ✅ | 100.0% | 1/1/0 | 25,667/867 | 18.4s | 1.57 |
| Operator Swap Comparison 003 | ReactFlightDOMServerNode.js | 1/1 ✅ | 100.0% | 1/1/0 | 38,683/962 | 27.6s | 1.95 |
| Operator Swap Equality 001 | readInputData.js | 1/1 ✅ | 100.0% | 1/1/0 | 19,049/592 | 13.0s | 0.00 |
| Operator Swap Equality 002 | editor.js | 1/1 ✅ | 100.0% | 1/1/0 | 23,942/664 | 17.2s | 0.00 |
| Operator Swap Equality 003 | hooks.js | 1/1 ✅ | 100.0% | 1/1/0 | 29,977/606 | 14.4s | 2.25 |
| Operator Swap Increment Decrement 001 | ReactFlightDOMClientNode.js | 1/1 ✅ | 100.0% | 1/1/0 | 21,698/636 | 14.5s | 1.52 |
| Operator Swap Increment Decrement 002 | ReactFlightDOMClientNode.js | 1/1 ✅ | 100.0% | 1/1/0 | 22,045/674 | 14.6s | 1.92 |
| Operator Swap Increment Decrement 003 | loadSourceAndMetadata.js | 1/1 ✅ | 100.0% | 1/1/0 | 34,153/628 | 15.4s | 3.72 |
| Operator Swap Logical 001 | profiling.js | 1/1 ✅ | 100.0% | 1/1/0 | 19,402/629 | 15.1s | 0.00 |
| Operator Swap Logical 002 | SourceMapMetadataConsumer.js | 1/1 ✅ | 100.0% | 1/1/0 | 25,001/902 | 20.5s | 3.14 |
| Operator Swap Logical 003 | DevToolsFiberComponentStack.js | 1/1 ✅ | 100.0% | 1/1/0 | 25,214/789 | 17.8s | 4.13 |
| Operator Swap Nullish 001 | getBatchRange.js | 1/1 ✅ | 100.0% | 1/1/0 | 19,596/620 | 13.3s | 1.33 |
| Operator Swap Nullish 002 | EnterLeaveEventPlugin.js | 1/1 ✅ | 100.0% | 1/1/0 | 23,867/1,014 | 20.7s | 1.56 |
| Operator Swap Nullish 003 | backend.js | 0/1 ❌ | 100.0% | 1/1/0 | 31,058/940 | 22.1s | 3.15 |
| Regex Swap Regex Quantifier 001 | githubAPI.js | 1/1 ✅ | 100.0% | 1/1/0 | 19,580/559 | 12.8s | 0.67 |
| Regex Swap Regex Quantifier 002 | ReactFlightStackConfigV8.js | 1/1 ✅ | 100.0% | 1/1/0 | 26,334/841 | 17.6s | 3.06 |
| Regex Swap Regex Quantifier 003 | utils.js | 1/1 ✅ | 100.0% | 1/1/0 | 26,185/1,254 | 29.6s | 2.00 |
| Structural Delete Statement 001 | UnsupportedVersionDialog.js | 1/1 ✅ | 100.0% | 1/1/0 | 20,337/694 | 16.6s | 6.22 |
| Structural Delete Statement 002 | getComponentNameFromFiber.js | 1/1 ✅ | 100.0% | 1/1/0 | 23,313/648 | 14.7s | 0.62 |
| Structural Delete Statement 003 | simulateBrowserEventDispatch.js | 0/1 ❌ | 100.0% | 1/1/0 | 29,291/948 | 24.3s | 4.46 |
| Structural Remove Early Return 001 | InspectedElementStateTree.js | 1/1 ✅ | 100.0% | 1/1/0 | 20,811/879 | 19.1s | 0.36 |
| Structural Remove Early Return 002 | useCommitFilteringAndNavigation.js | 1/1 ✅ | 100.0% | 1/1/0 | 24,108/735 | 16.4s | 3.76 |
| Structural Remove Early Return 003 | ReactFiberAsyncAction.js | 0/1 ❌ | 100.0% | 1/1/0 | 26,675/1,218 | 29.3s | 1.46 |
| Structural Swap Adjacent Lines 001 | ReactServerConsoleConfigPlain.js | 1/1 ✅ | 100.0% | 1/1/0 | 19,727/553 | 12.8s | 1.00 |
| Structural Swap Adjacent Lines 002 | ReactNoopFlightServer.js | 0/1 ❌ | 100.0% | 1/1/0 | 21,517/684 | 16.2s | 1.11 |
| Structural Swap Adjacent Lines 003 | backend.js | 0/1 ❌ | 100.0% | 1/1/0 | 35,351/5,313 | 92.0s | 3.15 |
| Structural Swap If Else 001 | importFile.js | 0/1 ❌ | 100.0% | 1/1/0 | 19,372/621 | 13.3s | 0.00 |
| Structural Swap If Else 002 | ReactNativeFiberInspector.js | 0/1 ❌ | 100.0% | 1/1/0 | 25,712/714 | 14.6s | 3.18 |
| Structural Swap If Else 003 | ReactDOMFizzStaticNode.js | 1/1 ✅ | 100.0% | 1/1/0 | 29,345/839 | 19.5s | 1.88 |
| Unicode Unicode Hyphen 001 | Rectangle.js | 1/1 ✅ | 100.0% | 1/1/0 | 21,531/509 | 12.5s | 3.00 |
| Unicode Unicode Hyphen 002 | UnsupportedBridgeProtocolDialog.js | 1/1 ✅ | 100.0% | 1/1/0 | 22,429/649 | 15.6s | 3.83 |
| Unicode Unicode Hyphen 003 | ReactTypes.js | 1/1 ✅ | 100.0% | 1/1/0 | 29,377/732 | 17.6s | 1.24 |

## Category Summary

| Category | Runs | Verified | Edit Used | Success | Min/Avg/Max Difficulty |
|----------|------|----------|-----------|---------|------------------------|
| access | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) | 7 / 8.7 / 10 |
| call | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 6 / 7.7 / 10 |
| duplicate | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 7 / 9.7 / 12 |
| identifier | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 6 / 9.3 / 14 |
| import | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) | 2 / 4.7 / 6 |
| literal | 6 | 100.0% (6/6) | 100.0% (6/6) | 100.0% (6/6) | 4 / 6.2 / 9 |
| operator | 21 | 85.7% (18/21) | 95.2% (20/21) | 85.7% (18/21) | 1 / 6.5 / 13 |
| regex | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 6 / 7.3 / 8 |
| structural | 12 | 50.0% (6/12) | 100.0% (12/12) | 50.0% (6/12) | 4 / 7.6 / 15 |
| unicode | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 1 / 3.0 / 6 |

## Mutation Summary

| Mutation | Category | Runs | Verified | Edit Used | Success |
|----------|----------|------|----------|-----------|---------|
| delete-statement | structural | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| duplicate-line-flip | duplicate | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| flip-boolean | literal | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| identifier-multi-edit | identifier | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| off-by-one | literal | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| remove-early-return | structural | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| remove-negation | operator | 3 | 66.7% (2/3) | 66.7% (2/3) | 66.7% (2/3) |
| remove-optional-chain | access | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| swap-adjacent-lines | structural | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
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
| 6-8 | 24 | 87.5% (21/24) | 100.0% (24/24) | 87.5% (21/24) |
| 9+ | 18 | 66.7% (12/18) | 94.4% (17/18) | 66.7% (12/18) |

## Failed Tasks (0% passing)

### Access Remove Optional Chain 003 (astUtils.js) — 0/1

**All runs failed with same error:** File mismatch for astUtils.js

**Sample agent response (run 1):**
```
Fixed. The bug was on lines 95-96 in the `filterMemberWithHookVariableName` function where `hook.node.init.property` was accessed without optional chaining. Changed both property accesses to use optional chaining (`hook.node.init?.property`) to safely handle cases where `init` might be null or undefined.
```

**Diff (expected vs actual):**
```diff
@@ -84 @@
 // Checks whether hook is the first member node of a state variable declaration node
 function filterMemberWithHookVariableName(hook: NodePath): boolean {
   return (
-    hook.node.init.property.type === AST_NODE_TYPES.NUMERIC_LITERAL &&
-    hook.node.init.property.value === 0
+    hook.node.init?.property.type === AST_NODE_TYPES.NUMERIC_LITERAL &&
+    hook.node.init?.property.value === 0
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

### Import Swap Named Imports 003 (StyleEditor.js) — 0/1

**All runs failed with same error:** File mismatch for StyleEditor.js

**Sample agent response (run 1):**
```
Fixed. The two named imports `BridgeContext` and `StoreContext` were swapped in the destructuring import on lines 14-15. They are now in the correct order.
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
Fixed. The bug was on line 129: the comparison operator `<=` was changed to `<`. The overflow check should use strict less-than (`<`) to determine if content overflows the container.
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
Fixed. The bug was on line 414 where `||` (logical OR) was used instead of `??` (nullish coalescing). This is inconsistent with line 218 which correctly uses `??` for the same pattern. The fix ensures both locations use the nullish coalescing operator, which is the correct choice when checking for null/undefined values rather than all falsy values.
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
The fix has been applied. The critical missing statement was `eventImpl._path = []` which initializes the event path array before it's used. Without this initialization, the first call to `appendToEventPath` at line 80 would fail because it tries to push to `eventImpl._path` (line 379) which would be undefined.

This initialization is placed right after setting `eventImpl._dispatchFlag = true` and before the event path is populated, which is the logical place for it in the event dispatch flow.
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

### Structural Remove Early Return 003 (ReactFiberAsyncAction.js) — 0/1

**All runs failed with same error:** File mismatch for ReactFiberAsyncAction.js

**Sample agent response (run 1):**
```
The fix has been applied. The bug was a missing guard clause in the `pingEngtangledActionScope` function. After decrementing `currentEntangledPendingCount` and checking if it equals 0, the function should immediately return if `currentEntangledListeners` is null, since there's no entangled action scope to clean up in that case. This prevents unnecessary cleanup operations and ensures the function only processes the entangled scope when one actually exists.
```

**Diff (expected vs actual):**
```diff
@@ -86 @@
 
 function pingEngtangledActionScope() {
   if (--currentEntangledPendingCount === 0) {
+    if (currentEntangledListeners === null) {
+      return;
+    }
     if (enableProfilerTimer && enableComponentPerformanceTrack) {
       if (!hasScheduledTransitionWork()) {
         // If we have received no updates since we started the entangled Actions
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
Fixed! I swapped the two adjacent lines:
- Moved `flushBuffered(destination: Destination): void {},` from line 46 to after the `stringToChunk` function closes (after line 48)
- This ensures the `stringToChunk` function is properly formed with its return statement inside the function body

The bug was that `flushBuffered` was incorrectly placed in the middle of the `stringToChunk` function definition, breaking its structure.
```

**Diff (expected vs actual):**
```diff
@@ -42 @@
   completeWriting(destination: Destination): void {},
   close(destination: Destination): void {},
   closeWithError(destination: Destination, error: mixed): void {},
-  flushBuffered(destination: Destination): void {},
   stringToChunk(content: string): Uint8Array {
     return textEncoder.encode(content);
   },
   stringToChunk(content: string): Uint8Array {
     return textEncoder.encode(content);
   },
+  flushBuffered(destination: Destination): void {},
   stringToPrecomputedChunk(content: string): Uint8Array {
     return textEncoder.encode(content);
   },
```

### Structural Swap Adjacent Lines 003 (backend.js) — 0/1

**All runs failed with same error:** File mismatch for backend.js

**Sample agent response (run 1):**
```
The fix has been applied. I've swapped two adjacent multi-line statements:

1. **Before**: `initBackend()` was called first, then `nativeStyleResolver` was computed
2. **After**: `nativeStyleResolver` is computed first, then `initBackend()` is called

This ensures that the native style resolver is determined before the backend is initialized, which may be necessary if `initBackend` needs to access or validate the native style configuration through the hook object.
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
Done. The condition is now negated (`!(error instanceof InvalidProfileError)`) and the branch bodies are swapped back to their correct positions:
- When error is NOT an InvalidProfileError → returns `'INVALID_PROFILE_ERROR'` status
- When error IS an InvalidProfileError → returns `'UNEXPECTED_ERROR'` status
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
The bug has been fixed. I negated the condition from `if (__DEV__)` to `if (!__DEV__)` so that:
- In production (when `__DEV__` is false), it throws the error
- In development (when `__DEV__` is true), it executes the actual functionality

This is the minimum change necessary to fix the swapped branches.
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
