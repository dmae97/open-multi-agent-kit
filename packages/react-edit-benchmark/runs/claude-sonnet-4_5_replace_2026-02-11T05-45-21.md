# Edit Benchmark Report

## Configuration

| Setting | Value |
|---------|-------|
| Date | 2026-02-11T05:42:50.272Z |
| Model | openrouter/openrouter/anthropic/claude-sonnet-4.5 |
| Thinking Level | default |
| Runs per task | 1 |
| Edit Variant | replace |
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
| Successful Runs | 44 |
| **Task Success Rate** | **73.3% (44/60)** |
| Verified Rate | 73.3% (44/60) |
| Edit Tool Usage Rate | 96.7% (58/60) |
| **Edit Success Rate** | **94.4%** |
| Tasks All Passing | 44 |
| Tasks Flaky/Failing | 16 |

### Tool Calls

| Tool | Total | Avg/Run |
|------|-------|---------|
| Read | 62 | 1.0 |
| Edit | 71 | 1.2 |
| Write | 0 | 0.0 |
| **Tool Input Chars** | 25,683 | 428 |

### Tokens & Time

| Metric | Total | Avg/Run |
|--------|-------|---------|
| Input Tokens | 1,347,932 | 22,466 |
| Output Tokens | 52,876 | 881 |
| Total Tokens | 2,062,735 | 34,379 |
| Duration | 1390.8s | 23.2s |
| **Avg Indent Score** | — | **2.28** |

## Task Results

| Task | File | Success | Edit Hit | R/E/W | Tokens (In/Out) | Time | Indent |
|------|------|---------|----------|-------|-----------------|------|--------|
| Access Remove Optional Chain 001 | registerDevToolsEventLogger.js | 0/1 ❌ | 100.0% | 1/1/0 | 18,957/739 | 16.7s | 1.00 |
| Access Remove Optional Chain 002 | TimelineContext.js | 1/1 ✅ | 100.0% | 1/1/0 | 21,193/593 | 13.7s | 1.29 |
| Access Remove Optional Chain 003 | astUtils.js | 0/1 ❌ | 100.0% | 1/1/0 | 37,400/995 | 23.5s | 4.90 |
| Call Swap Call Args 001 | testHelpers.js | 1/1 ✅ | 100.0% | 1/1/0 | 17,412/666 | 13.7s | 1.33 |
| Call Swap Call Args 002 | FlamegraphChartBuilder.js | 1/1 ✅ | 100.0% | 1/1/0 | 22,078/649 | 13.2s | 3.79 |
| Call Swap Call Args 003 | SyntheticEvent.js | 1/1 ✅ | 100.0% | 1/1/0 | 26,462/1,241 | 24.0s | 3.76 |
| Duplicate Duplicate Line Flip 001 | index.js | 1/1 ✅ | 100.0% | 1/1/0 | 18,342/648 | 13.1s | 0.00 |
| Duplicate Duplicate Line Flip 002 | ActivityList.js | 1/1 ✅ | 100.0% | 1/1/0 | 23,887/722 | 16.6s | 3.61 |
| Duplicate Duplicate Line Flip 003 | SyntheticEvent.js | 1/1 ✅ | 100.0% | 1/1/0 | 35,841/1,604 | 33.4s | 1.02 |
| Identifier Identifier Multi Edit 001 | TabBar.js | 1/1 ✅ | 100.0% | 1/3/0 | 21,065/1,166 | 24.3s | 3.33 |
| Identifier Identifier Multi Edit 002 | EventPluginRegistry.js | 1/1 ✅ | 100.0% | 1/4/0 | 25,985/1,330 | 26.6s | 3.94 |
| Identifier Identifier Multi Edit 003 | ReactPerformanceTrackProperties.js | 1/1 ✅ | 100.0% | 1/3/0 | 30,570/1,330 | 27.5s | 9.95 |
| Import Swap Named Imports 001 | CommitFlamegraphListItem.js | 0/1 ❌ | 100.0% | 1/1/0 | 20,393/731 | 16.5s | 2.86 |
| Import Swap Named Imports 002 | ReactDOMTextarea.js | 1/1 ✅ | 100.0% | 1/1/0 | 21,734/665 | 15.0s | 2.41 |
| Import Swap Named Imports 003 | StyleEditor.js | 0/1 ❌ | 100.0% | 1/1/0 | 27,606/3,981 | 74.7s | 1.31 |
| Literal Flip Boolean 001 | testHelpers.js | 1/1 ✅ | 100.0% | 1/1/0 | 17,316/539 | 12.2s | 1.33 |
| Literal Flip Boolean 002 | ReactNoopFlightServer.js | 1/1 ✅ | 100.0% | 1/1/0 | 19,629/673 | 12.4s | 1.11 |
| Literal Flip Boolean 003 | ReactFlightDOMClientEdge.js | 0/1 ❌ | 100.0% | 1/1/0 | 23,376/802 | 19.0s | 3.58 |
| Literal Off By One 001 | githubAPI.js | 1/1 ✅ | 100.0% | 1/1/0 | 17,727/528 | 12.6s | 0.67 |
| Literal Off By One 002 | code-path.js | 0/1 ❌ | 100.0% | 1/1/0 | 23,151/953 | 20.4s | 3.50 |
| Literal Off By One 003 | InspectedElement.js | 1/1 ✅ | 100.0% | 1/1/0 | 26,332/965 | 20.5s | 3.60 |
| Operator Remove Negation 001 | ReactDOMClient.js | 1/1 ✅ | 42.9% | 4/7/0 | 24,730/3,980 | 92.6s | 1.08 |
| Operator Remove Negation 002 | NativeEventsView.js | 0/1 ❌ | 100.0% | 0/0/0 | 0/0 | 120.5s | 0.00 |
| Operator Remove Negation 003 | ReactFlightUnbundledReferences.js | 0/1 ❌ | 100.0% | 0/0/0 | 0/0 | 120.7s | 0.00 |
| Operator Swap Arithmetic 001 | fallbackEvalContext.js | 1/1 ✅ | 100.0% | 1/1/0 | 17,207/485 | 11.9s | 0.00 |
| Operator Swap Arithmetic 002 | CSSShorthandProperty.js | 1/1 ✅ | 100.0% | 2/1/0 | 22,458/700 | 19.4s | 2.88 |
| Operator Swap Arithmetic 003 | hooks.js | 0/1 ❌ | 100.0% | 1/1/0 | 28,324/710 | 17.9s | 2.25 |
| Operator Swap Comparison 001 | index.js | 1/1 ✅ | 100.0% | 1/1/0 | 18,220/509 | 13.3s | 0.00 |
| Operator Swap Comparison 002 | ReactFlightDOMServerBrowser.js | 1/1 ✅ | 100.0% | 1/1/0 | 23,843/733 | 18.0s | 1.57 |
| Operator Swap Comparison 003 | ReactFlightDOMServerNode.js | 1/1 ✅ | 100.0% | 1/1/0 | 36,989/1,060 | 22.4s | 1.95 |
| Operator Swap Equality 001 | readInputData.js | 1/1 ✅ | 100.0% | 1/1/0 | 17,239/546 | 11.6s | 0.00 |
| Operator Swap Equality 002 | editor.js | 1/1 ✅ | 100.0% | 1/1/0 | 22,123/651 | 13.6s | 0.00 |
| Operator Swap Equality 003 | hooks.js | 1/1 ✅ | 100.0% | 1/1/0 | 28,253/657 | 14.5s | 2.25 |
| Operator Swap Increment Decrement 001 | ReactFlightDOMClientNode.js | 1/1 ✅ | 100.0% | 1/1/0 | 20,024/716 | 16.2s | 1.52 |
| Operator Swap Increment Decrement 002 | ReactFlightDOMClientNode.js | 1/1 ✅ | 100.0% | 1/1/0 | 20,354/751 | 16.6s | 1.92 |
| Operator Swap Increment Decrement 003 | loadSourceAndMetadata.js | 1/1 ✅ | 100.0% | 1/1/0 | 32,310/582 | 13.6s | 3.72 |
| Operator Swap Logical 001 | profiling.js | 1/1 ✅ | 100.0% | 1/1/0 | 17,638/601 | 14.1s | 0.00 |
| Operator Swap Logical 002 | SourceMapMetadataConsumer.js | 1/1 ✅ | 100.0% | 1/1/0 | 23,063/712 | 16.9s | 3.14 |
| Operator Swap Logical 003 | DevToolsFiberComponentStack.js | 1/1 ✅ | 100.0% | 1/1/0 | 23,500/797 | 17.2s | 4.13 |
| Operator Swap Nullish 001 | getBatchRange.js | 1/1 ✅ | 100.0% | 1/1/0 | 17,760/557 | 11.2s | 1.33 |
| Operator Swap Nullish 002 | EnterLeaveEventPlugin.js | 1/1 ✅ | 100.0% | 1/1/0 | 22,063/774 | 17.1s | 1.56 |
| Operator Swap Nullish 003 | backend.js | 0/1 ❌ | 100.0% | 1/1/0 | 30,332/1,947 | 38.0s | 3.15 |
| Regex Swap Regex Quantifier 001 | githubAPI.js | 1/1 ✅ | 100.0% | 1/1/0 | 17,752/632 | 12.9s | 0.67 |
| Regex Swap Regex Quantifier 002 | ReactFlightStackConfigV8.js | 1/1 ✅ | 100.0% | 1/1/0 | 24,778/1,041 | 23.4s | 3.06 |
| Regex Swap Regex Quantifier 003 | utils.js | 1/1 ✅ | 100.0% | 1/1/0 | 24,079/916 | 21.3s | 2.00 |
| Structural Delete Statement 001 | UnsupportedVersionDialog.js | 1/1 ✅ | 100.0% | 1/1/0 | 18,667/718 | 15.9s | 6.22 |
| Structural Delete Statement 002 | getComponentNameFromFiber.js | 1/1 ✅ | 100.0% | 1/1/0 | 21,672/810 | 17.1s | 0.62 |
| Structural Delete Statement 003 | simulateBrowserEventDispatch.js | 0/1 ❌ | 100.0% | 1/1/0 | 27,351/694 | 18.1s | 4.46 |
| Structural Remove Early Return 001 | InspectedElementStateTree.js | 0/1 ❌ | 100.0% | 1/1/0 | 19,065/850 | 15.5s | 0.36 |
| Structural Remove Early Return 002 | useCommitFilteringAndNavigation.js | 1/1 ✅ | 100.0% | 1/1/0 | 22,327/671 | 16.2s | 3.73 |
| Structural Remove Early Return 003 | ReactFiberAsyncAction.js | 0/1 ❌ | 100.0% | 1/1/0 | 24,640/854 | 18.8s | 1.78 |
| Structural Swap Adjacent Lines 001 | ReactServerConsoleConfigPlain.js | 1/1 ✅ | 100.0% | 1/1/0 | 17,986/583 | 13.8s | 1.00 |
| Structural Swap Adjacent Lines 002 | ReactNoopFlightServer.js | 1/1 ✅ | 100.0% | 1/1/0 | 19,745/665 | 13.8s | 1.11 |
| Structural Swap Adjacent Lines 003 | backend.js | 0/1 ❌ | 100.0% | 1/1/0 | 29,711/1,283 | 27.4s | 3.15 |
| Structural Swap If Else 001 | importFile.js | 0/1 ❌ | 100.0% | 1/1/0 | 17,597/665 | 13.1s | 0.00 |
| Structural Swap If Else 002 | ReactNativeFiberInspector.js | 0/1 ❌ | 100.0% | 1/1/0 | 24,050/780 | 15.3s | 3.18 |
| Structural Swap If Else 003 | ReactDOMFizzStaticNode.js | 1/1 ✅ | 100.0% | 1/1/0 | 27,790/1,005 | 19.3s | 1.88 |
| Unicode Unicode Hyphen 001 | Rectangle.js | 1/1 ✅ | 100.0% | 1/1/0 | 19,731/484 | 13.5s | 3.00 |
| Unicode Unicode Hyphen 002 | UnsupportedBridgeProtocolDialog.js | 1/1 ✅ | 100.0% | 1/1/0 | 20,588/518 | 13.2s | 3.83 |
| Unicode Unicode Hyphen 003 | ReactTypes.js | 1/1 ✅ | 100.0% | 1/1/0 | 27,517/719 | 15.4s | 1.24 |

## Category Summary

| Category | Runs | Verified | Edit Used | Success | Min/Avg/Max Difficulty |
|----------|------|----------|-----------|---------|------------------------|
| access | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) | 7 / 8.7 / 10 |
| call | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 6 / 7.7 / 10 |
| duplicate | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 7 / 9.7 / 12 |
| identifier | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 6 / 9.3 / 14 |
| import | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) | 2 / 4.7 / 6 |
| literal | 6 | 66.7% (4/6) | 100.0% (6/6) | 66.7% (4/6) | 4 / 6.2 / 9 |
| operator | 21 | 81.0% (17/21) | 90.5% (19/21) | 81.0% (17/21) | 1 / 6.5 / 13 |
| regex | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 6 / 7.3 / 8 |
| structural | 12 | 50.0% (6/12) | 100.0% (12/12) | 50.0% (6/12) | 4 / 7.6 / 15 |
| unicode | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 1 / 3.0 / 6 |

## Mutation Summary

| Mutation | Category | Runs | Verified | Edit Used | Success |
|----------|----------|------|----------|-----------|---------|
| delete-statement | structural | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| duplicate-line-flip | duplicate | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| flip-boolean | literal | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| identifier-multi-edit | identifier | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| off-by-one | literal | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| remove-early-return | structural | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| remove-negation | operator | 3 | 33.3% (1/3) | 33.3% (1/3) | 33.3% (1/3) |
| remove-optional-chain | access | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| swap-adjacent-lines | structural | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| swap-arithmetic | operator | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| swap-call-args | call | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| swap-comparison | operator | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| swap-equality | operator | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| swap-if-else | structural | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| swap-increment-decrement | operator | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| swap-logical | operator | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| swap-named-imports | import | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| swap-nullish | operator | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| swap-regex-quantifier | regex | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| unicode-hyphen | unicode | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |

## Difficulty Summary

| Difficulty Score | Runs | Verified | Edit Used | Success |
|------------------|------|----------|-----------|---------|
| 0-2 | 6 | 83.3% (5/6) | 100.0% (6/6) | 83.3% (5/6) |
| 3-5 | 12 | 83.3% (10/12) | 91.7% (11/12) | 83.3% (10/12) |
| 6-8 | 24 | 70.8% (17/24) | 100.0% (24/24) | 70.8% (17/24) |
| 9+ | 18 | 66.7% (12/18) | 94.4% (17/18) | 66.7% (12/18) |

## Edit Tool Errors

Failures where the edit tool returned an error or failed to apply the patch.

### Operator Remove Negation 001 (ReactDOMClient.js)

#### Run 1

##### Attempt 1

- Path: ReactDOMClient.js
- Operation: —

**Tool error**

```
No changes made to ReactDOMClient.js. The replacement produced identical content. This might indicate an issue with special characters or the text not existing as expected.
The file differs from the original fixture at these lines:
57:8kq| -  if (foundDevTools && canUseDOM && window.top === window.self) {
58:jtk| +  if (!foundDevTools && canUseDOM && window.top === window.self) {
```

**Patch args**

```diff
{
  "path": "ReactDOMClient.js",
  "old_text": "  if (!foundDevTools && canUseDOM && window.top === window.self) {",
  "new_text": "  if (foundDevTools && canUseDOM && window.top === window.self) {"
}
```

##### Attempt 2

- Path: ReactDOMClient.js
- Operation: —

**Tool error**

```
No changes made to ReactDOMClient.js. The replacement produced identical content. This might indicate an issue with special characters or the text not existing as expected.
The file differs from the original fixture at these lines:
57:8kq| -  if (foundDevTools && canUseDOM && window.top === window.self) {
58:jtk| +  if (!foundDevTools && canUseDOM && window.top === window.self) {
```

**Patch args**

```diff
{
  "path": "ReactDOMClient.js",
  "old_text": "  if (foundDevTools && !canUseDOM && window.top === window.self) {",
  "new_text": "  if (foundDevTools && canUseDOM && window.top === window.self) {"
}
```

##### Attempt 3

- Path: ReactDOMClient.js
- Operation: —

**Tool error**

```
No changes made to ReactDOMClient.js. The replacement produced identical content. This might indicate an issue with special characters or the text not existing as expected.
The file differs from the original fixture at these lines:
57:8kq| -  if (foundDevTools && canUseDOM && window.top === window.self) {
58:jtk| +  if (!foundDevTools && canUseDOM && window.top === window.self) {
```

**Patch args**

```diff
{
  "path": "ReactDOMClient.js",
  "old_text": "  if (foundDevTools && canUseDOM && window.top !== window.self) {",
  "new_text": "  if (foundDevTools && canUseDOM && window.top === window.self) {"
}
```

##### Attempt 4

- Path: ReactDOMClient.js
- Operation: —

**Tool error**

```
No changes made to ReactDOMClient.js. The replacement produced identical content. This might indicate an issue with special characters or the text not existing as expected.
The file differs from the original fixture at these lines:
57:8kq| -  if (foundDevTools && canUseDOM && window.top === window.self) {
58:jtk| +  if (!foundDevTools && canUseDOM && window.top === window.self) {
```

**Patch args**

```diff
{
  "path": "ReactDOMClient.js",
  "old_text": "  if (!(foundDevTools && canUseDOM && window.top === window.self)) {",
  "new_text": "  if (foundDevTools && canUseDOM && window.top === window.self) {"
}
```

## Failed Tasks (0% passing)

### Access Remove Optional Chain 001 (registerDevToolsEventLogger.js) — 0/1

**All runs failed with same error:** File mismatch for registerDevToolsEventLogger.js

**Sample agent response (run 1):**
```
Fixed. The optional chaining operator (`?.`) has been restored on `currentLoggingIFrame` on line 36, changing from `currentLoggingIFrame.contentWindow?.postMessage(` to `currentLoggingIFrame?.contentWindow.postMessage(`.
```

**Diff (expected vs actual):**
```diff
@@ -31 @@
         const additionalContext: LoggerContext | {} =
           fetchAdditionalContext != null ? await fetchAdditionalContext() : {};
 
-        currentLoggingIFrame?.contentWindow?.postMessage(
+        currentLoggingIFrame?.contentWindow.postMessage(
           {
             source: 'react-devtools-logging',
             event: eventWithoutMetadata,
```

### Access Remove Optional Chain 003 (astUtils.js) — 0/1

**All runs failed with same error:** File mismatch for astUtils.js

**Sample agent response (run 1):**
```
Fixed. The bug was on line 87 where optional chaining (`?.`) was removed from the property access `hookNode.node.init.object`. The code was using an explicit check with `&&` instead of the more concise and safer optional chaining operator. I've restored the optional chaining to match the modern JavaScript pattern used elsewhere in the codebase.
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

### Import Swap Named Imports 001 (CommitFlamegraphListItem.js) — 0/1

**All runs failed with same error:** File mismatch for CommitFlamegraphListItem.js

**Sample agent response (run 1):**
```
Done. I've swapped `Fragment` and `memo` on line 11. The imports now read `{memo, Fragment, useContext, useCallback}` instead of `{Fragment, memo, useContext, useCallback}`.
```

**Diff (expected vs actual):**
```diff
@@ -8 @@
  */
 
 import * as React from 'react';
-import { Fragment, memo, useCallback, useContext } from 'react';
+import { memo, Fragment, useContext, useCallback } from 'react';
 import { areEqual } from 'react-window';
 import { barWidthThreshold } from './constants';
 import { getGradientColor } from './utils';
```

### Import Swap Named Imports 003 (StyleEditor.js) — 0/1

**All runs failed with same error:** File mismatch for StyleEditor.js

**Sample agent response (run 1):**
```
The bug has been fixed. The issue was on lines 36-37 where the context arguments to `useContext` were swapped:
- `bridge` was incorrectly using `BridgeContext` when it should use `StoreContext`
- `store` was incorrectly using `StoreContext` when it should use `BridgeContext`

This is a destructuring issue in the sense that `useContext()` is extracting/destructuring values from the named imports, and those two calls had their arguments swapped.
```

**Diff (expected vs actual):**
```diff
@@ -8 @@
  */
 
 import * as React from 'react';
-import { useContext, useMemo, useRef, useState } from 'react';
+import { useMemo, useContext, useRef, useState } from 'react';
 import { copy } from 'clipboard-js';
 import { BridgeContext, StoreContext } from 'react-devtools-shared/src/devtools/views/context';
 import Button from '../../Button';
@@ -30 @@
 type ChangeValueFn = (name: string, value: any) => void;
 
 export default function StyleEditor({ id, style }: Props): React.Node {
-  const bridge = useContext(BridgeContext);
-  const store = useContext(StoreContext);
+  const bridge = useContext(StoreContext);
+  const store = useContext(BridgeContext);
 
   const changeAttribute = (oldName: string, newName: string, value: any) => {
     const rendererID = store.getRendererIDForElement(id);
```

### Literal Flip Boolean 003 (ReactFlightDOMClientEdge.js) — 0/1

**All runs failed with same error:** File mismatch for ReactFlightDOMClientEdge.js

**Sample agent response (run 1):**
```
Fixed. The boolean comparison on line 110 was inverted - it was checking `=== false` when it should check `!== false`. This ensures that `replayConsoleLogs` defaults to `true` in dev mode (when not explicitly set to `false`), which aligns with the comment stating "defaults to false" refers to the production behavior (when `__DEV__` is false).
```

**Diff (expected vs actual):**
```diff
@@ -100 @@
     typeof options.nonce === 'string' ? options.nonce : undefined,
     options && options.temporaryReferences ? options.temporaryReferences : undefined,
     __DEV__ && options && options.findSourceMapURL ? options.findSourceMapURL : undefined,
-    __DEV__ && options ? options.replayConsoleLogs === true : false, // defaults to false
+    __DEV__ && options ? options.replayConsoleLogs !== false : false, // defaults to false
     __DEV__ && options && options.environmentName ? options.environmentName : undefined,
     __DEV__ && options && options.startTime != null ? options.startTime : undefined,
     __DEV__ && options && options.endTime != null ? options.endTime : undefined,
```

### Literal Off By One 002 (code-path.js) — 0/1

**All runs failed with same error:** File mismatch for code-path.js

**Sample agent response (run 1):**
```
Fixed the off-by-one error on line 226. The condition `index < end` was changed to `index <= end` to properly handle all segments in the array, including the last one at index `end`.
```

**Diff (expected vs actual):**
```diff
@@ -221 @@
 
       // Update the stack.
       end = segment.nextSegments.length - 1;
-      if (index < end) {
+      if (index <= end) {
         item[1] += 1;
         stack.push([segment.nextSegments[index], 0]);
       } else if (index === end) {
@@ -226 @@
         stack.push([segment.nextSegments[index], 0]);
       } else if (index === end) {
         item[0] = segment.nextSegments[index];
-        item[1] = 0;
+        item[1] = 1;
       } else {
         stack.pop();
       }
```

### Operator Remove Negation 002 (NativeEventsView.js) — 0/1

**All runs failed with same error:** Timeout waiting for agent_end

### Operator Remove Negation 003 (ReactFlightUnbundledReferences.js) — 0/1

**All runs failed with same error:** Timeout waiting for agent_end

### Operator Swap Arithmetic 003 (hooks.js) — 0/1

**All runs failed with same error:** File mismatch for hooks.js

**Sample agent response (run 1):**
```
Fixed. The bug was on line 129 where `<=` (less than or equal) was used instead of `<` (less than). The overflow check should trigger when the container width is strictly less than the total child width, not when they're equal.
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
Fixed. The nullish coalescing operator on line 218 had its operands swapped. It should prefer `hook.resolveRNStyle` over the parameter `resolveRNStyle`, not the other way around. The hook property represents the canonical integration point for React DevTools and should take precedence.
```

**Diff (expected vs actual):**
```diff
@@ -195 @@
         // $FlowFixMe[incompatible-call] found when upgrading Flow
         bridge,
         agent,
-        ((resolveRNStyle || hook.resolveRNStyle: any): ResolveNativeStyle),
+        ((hook.resolveRNStyle ?? resolveRNStyle: any): ResolveNativeStyle),
         nativeStyleEditorValidAttributes || hook.nativeStyleEditorValidAttributes || null,
       );
     } else {
```

### Structural Delete Statement 003 (simulateBrowserEventDispatch.js) — 0/1

**All runs failed with same error:** File mismatch for simulateBrowserEventDispatch.js

**Sample agent response (run 1):**
```
Fixed. The critical missing statement was `eventImpl._path = [];` which must be initialized before the first call to `appendToEventPath` at line 80. Without this initialization, the code would fail when trying to push to an undefined array.
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

### Structural Remove Early Return 001 (InspectedElementStateTree.js) — 0/1

**All runs failed with same error:** File mismatch for InspectedElementStateTree.js

**Sample agent response (run 1):**
```
Fixed. I've added back the missing guard clause after line 38 that checks if `state` is null or undefined and returns early if so. This prevents `Object.entries(state)` from being called on a null/undefined value, which would throw an error. The 3-line pattern (if condition, return statement, closing brace) has been restored.
```

**Diff (expected vs actual):**
```diff
@@ -39 @@
   if (state == null) {
     return null;
   }
-
   // HostSingleton and HostHoistable may have state that we don't want to expose to users
   const isHostComponent = type === ElementTypeHostComponent;
   const entries = Object.entries(state);
```

### Structural Remove Early Return 003 (ReactFiberAsyncAction.js) — 0/1

**All runs failed with same error:** File mismatch for ReactFiberAsyncAction.js

**Sample agent response (run 1):**
```
The bug has been fixed. I restored the guard clause that checks if `currentEntangledListeners === null` and returns early before attempting to clean up the entangled async transition state. This prevents the cleanup code from running when there's no active entangled scope, which was the missing guard clause.
```

**Diff (expected vs actual):**
```diff
@@ -7 @@
  * @flow
  */
 
-import type { Thenable, FulfilledThenable, RejectedThenable } from 'shared/ReactTypes';
-import type { Lane } from './ReactFiberLane';
-import type { Transition } from 'react/src/ReactStartTransition';
+import type {
+  Thenable,
+  FulfilledThenable,
+  RejectedThenable,
+} from 'shared/ReactTypes';
+import type {Lane} from './ReactFiberLane';
+import type {Transition} from 'react/src/ReactStartTransition';
 
 
-import { requestTransitionLane, ensureScheduleIsScheduled } from './ReactFiberRootScheduler';
-import { NoLane } from './ReactFiberLane';
-import { hasScheduledTransitionWork, clearAsyncTransitionTimer } from './ReactProfilerTimer';
 import {
 import {
+  requestTransitionLane,
+  ensureScheduleIsScheduled,
+} from './ReactFiberRootScheduler';
+import {NoLane} from './ReactFiberLane';
+import {
+  hasScheduledTransitionWork,
+  clearAsyncTransitionTimer,
+} from './ReactProfilerTimer';
+import {
   enableComponentPerformanceTrack,
   enableProfilerTimer,
   enableDefaultTransitionIndicator,
@@ -19 @@
   enableProfilerTimer,
   enableDefaultTransitionIndicator,
 } from 'shared/ReactFeatureFlags';
-import { clearEntangledAsyncTransitionTypes } from './ReactFiberTransitionTypes';
+import {clearEntangledAsyncTransitionTypes} from './ReactFiberTransitionTypes';
 
 import noop from 'shared/noop';
 import reportGlobalError from 'shared/reportGlobalError';
@@ -47 @@
 // had any roots registered yet. null means there's more than one callback.
 // If there's more than one callback we bailout to not supporting isomorphic
 // default indicators.
-let isomorphicDefaultTransitionIndicator: void | null | (() => void | (() => void)) = undefined;
+let isomorphicDefaultTransitionIndicator:
+  | void
+  | null
+  | (() => void | (() => void)) = undefined;
 // The clean up function for the currently running indicator.
 let pendingIsomorphicIndicator: null | (() => void) = null;
 // The number of roots that have pending Transitions that depend on t...
```

### Structural Swap Adjacent Lines 003 (backend.js) — 0/1

**All runs failed with same error:** File mismatch for backend.js

**Sample agent response (run 1):**
```
The bug has been fixed. The issue was on lines 192-195 where the `Agent` was being created with profiling parameters (`isProfiling`, `onReloadAndProfile`) **before** calling `onReloadAndProfileFlagsReset()`, which is meant to reset those flags. The correct order is to reset the flags first, then create the agent with the (now reset) values.
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
@@ -168 @@
     }
 
     // TODO (npm-packages) Warn if "isBackendStorageAPISupported"
-    // $FlowFixMe[incompatible-call] found when upgrading Flow
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
Done. The condition is now negated (`!(error instanceof InvalidProfileError)`) which swaps the branch execution logic back to the correct state:

- When error is NOT an InvalidProfileError → returns `'UNEXPECTED_ERROR'`
- When error IS an InvalidProfileError → returns `'INVALID_PROFILE_ERROR'`
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
Fixed. The condition in `getInspectorDataForViewTag` is now negated from `if (__DEV__)` to `if (!__DEV__)`, which corrects the logic so that:
- In production (`!__DEV__`): throws error
- In development (`__DEV__`): executes the actual inspector functionality
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
