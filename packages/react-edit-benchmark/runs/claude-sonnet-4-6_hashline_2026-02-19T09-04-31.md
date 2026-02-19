# Edit Benchmark Report

## Configuration

| Setting | Value |
|---------|-------|
| Date | 2026-02-19T08:57:52.294Z |
| Model | p-anthropic/p-anthropic/claude-sonnet-4-6 |
| Thinking Level | low |
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
| Total Tasks | 80 |
| Total Runs | 80 |
| Successful Runs | 68 |
| **Task Success Rate** | **85.0% (68/80)** |
| Verified Rate | 85.0% (68/80) |
| Edit Tool Usage Rate | 97.5% (78/80) |
| **Edit Success Rate** | **100.0%** |
| Timeout Runs | 0 |
| Mutation Intent Match Rate | 82.1% |
| Patch Failure Rate | 0.0% (0/78) |
| Tasks All Passing | 68 |
| Tasks Flaky/Failing | 12 |

### Tool Calls

| Tool | Total | Avg/Run |
|------|-------|---------|
| Read | 177 | 2.2 |
| Edit | 78 | 1.0 |
| Write | 0 | 0.0 |
| **Tool Input Chars** | 20,586 | 257 |

### Tokens & Time

| Metric | Total | Avg/Run |
|--------|-------|---------|
| Input Tokens | 481 | 6 |
| Output Tokens | 132,906 | 1,661 |
| Total Tokens | 3,047,906 | 38,099 |
| Duration | 3428.4s | 42.9s |
| **Avg Indent Score** | — | **0.00** |

### Hashline Edit Subtypes

| Operation | Count | % |
|-----------|-------|---|
| set_line | 82 | 90.1% |
| replace_lines | 1 | 1.1% |
| insert_after | 7 | 7.7% |
| replace | 1 | 1.1% |
| **Total** | **91** | 100% |

## Task Results

| Task | File | Success | Edit Hit | R/E/W | Tokens (In/Out) | Time | Indent |
|------|------|---------|----------|-------|-----------------|------|--------|
| Access Remove Optional Chain 001 | fallbackEvalContext.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/380 | 11.3s | 0.00 |
| Access Remove Optional Chain 003 | hookNamesCache.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/482 | 12.1s | 0.00 |
| Access Remove Optional Chain 005 | registerDevToolsEventLogger.js | 1/1 ✅ | 100.0% | 5/1/0 | 9/2,765 | 49.3s | 0.00 |
| Access Remove Optional Chain 007 | index.js | 0/1 ❌ | 100.0% | 0/0/0 | 0/0 | 360.0s | 0.00 |
| Call Swap Call Args 001 | formatConsoleArguments.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/389 | 10.8s | 0.00 |
| Call Swap Call Args 003 | ReactFlightDOMServerBrowser.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/482 | 13.8s | 0.00 |
| Call Swap Call Args 005 | ReactNoopPersistent.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/509 | 9.9s | 0.00 |
| Call Swap Call Args 007 | parseSourceAndMetadata.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/616 | 13.5s | 0.00 |
| Duplicate Duplicate Line Flip 001 | isCustomElement.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/698 | 16.8s | 0.00 |
| Duplicate Duplicate Line Flip 003 | ReactFiberDevToolsHook.js | 0/1 ❌ | 100.0% | 0/0/0 | 0/0 | 360.0s | 0.00 |
| Duplicate Duplicate Line Flip 005 | shallowEqual.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/408 | 10.6s | 0.00 |
| Duplicate Duplicate Line Flip 007 | ReactDOMEventReplaying.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/4,259 | 70.7s | 0.00 |
| Identifier Identifier Multi Edit 001 | Button.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/615 | 12.5s | 0.00 |
| Identifier Identifier Multi Edit 003 | ReactFlightDOMClientBrowser.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/618 | 13.0s | 0.00 |
| Identifier Identifier Multi Edit 005 | githubAPI.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/546 | 14.1s | 0.00 |
| Identifier Identifier Multi Edit 007 | ReactFiberComponentStack.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/544 | 12.5s | 0.00 |
| Import Swap Named Imports 001 | ListApp.js | 1/1 ✅ | 100.0% | 3/1/0 | 7/1,646 | 32.4s | 0.00 |
| Import Swap Named Imports 003 | index.js | 1/1 ✅ | 100.0% | 3/1/0 | 7/3,598 | 68.1s | 0.00 |
| Import Swap Named Imports 005 | SuspenseScrubber.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/1,156 | 23.4s | 0.00 |
| Import Swap Named Imports 007 | InspectedElement.js | 1/1 ✅ | 100.0% | 1/1/0 | 3/13,469 | 277.2s | 0.00 |
| Literal Flip Boolean 001 | ReactDOMLegacyServerImpl.js | 1/1 ✅ | 100.0% | 5/1/0 | 9/4,246 | 71.1s | 0.00 |
| Literal Flip Boolean 003 | ReactProfilerTimer.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/831 | 20.3s | 0.00 |
| Literal Flip Boolean 005 | OpenInEditorButton.js | 1/1 ✅ | 100.0% | 3/1/0 | 7/2,254 | 37.4s | 0.00 |
| Literal Flip Boolean 007 | Element.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/484 | 12.1s | 0.00 |
| Literal Off By One 001 | ReactOwnerStackFrames.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/368 | 11.6s | 0.00 |
| Literal Off By One 003 | ReactFlightClientConfigBundlerTurbopack.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/497 | 11.2s | 0.00 |
| Literal Off By One 005 | ContextMenu.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/451 | 10.1s | 0.00 |
| Literal Off By One 007 | index.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/734 | 16.9s | 0.00 |
| Operator Remove Negation 001 | prepareInjection.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/323 | 8.0s | 0.00 |
| Operator Remove Negation 003 | ReactDOMSelection.js | 1/1 ✅ | 100.0% | 3/1/0 | 7/1,874 | 35.3s | 0.00 |
| Operator Remove Negation 005 | ReactDOMContainer.js | 0/1 ❌ | 100.0% | 3/1/0 | 7/5,927 | 100.0s | 0.00 |
| Operator Remove Negation 007 | SelectEventPlugin.js | 1/1 ✅ | 100.0% | 3/1/0 | 7/599 | 18.8s | 0.00 |
| Operator Swap Arithmetic 001 | formatConsoleArguments.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/393 | 11.2s | 0.00 |
| Operator Swap Arithmetic 003 | ReactFlightDOMServerBrowser.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/776 | 16.2s | 0.00 |
| Operator Swap Arithmetic 005 | ReactFiberConfigWithNoResources.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/339 | 8.2s | 0.00 |
| Operator Swap Arithmetic 007 | useCanvasInteraction.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/590 | 14.2s | 0.00 |
| Operator Swap Comparison 001 | useSmartTooltip.js | 1/1 ✅ | 100.0% | 4/1/0 | 8/2,913 | 60.1s | 0.00 |
| Operator Swap Comparison 003 | ReactFlightDOMServerBrowser.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/946 | 20.3s | 0.00 |
| Operator Swap Comparison 005 | Rectangle.js | 1/1 ✅ | 100.0% | 1/1/0 | 3/838 | 160.8s | 0.00 |
| Operator Swap Comparison 007 | ReactFiberTreeReflection.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/852 | 17.5s | 0.00 |
| Operator Swap Equality 001 | ReactNoopFlightClient.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/400 | 11.1s | 0.00 |
| Operator Swap Equality 003 | astUtils.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/961 | 16.7s | 0.00 |
| Operator Swap Equality 005 | ReactDOMContainer.js | 1/1 ✅ | 100.0% | 4/1/0 | 8/1,848 | 38.1s | 0.00 |
| Operator Swap Equality 007 | ReactFlightDOMServerBrowser.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/1,140 | 23.6s | 0.00 |
| Operator Swap Increment Decrement 001 | index.js | 1/1 ✅ | 100.0% | 1/1/0 | 5/224 | 5.4s | 0.00 |
| Operator Swap Increment Decrement 003 | ReactFlightClientConfigBundlerESM.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/428 | 14.6s | 0.00 |
| Operator Swap Increment Decrement 005 | ReactFiberViewTransitionComponent.js | 1/1 ✅ | 100.0% | 3/1/0 | 7/1,004 | 26.2s | 0.00 |
| Operator Swap Increment Decrement 007 | ReactFiberConcurrentUpdates.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/512 | 14.1s | 0.00 |
| Operator Swap Logical 001 | ErrorView.js | 1/1 ✅ | 100.0% | 3/1/0 | 7/5,758 | 101.6s | 0.00 |
| Operator Swap Logical 003 | DevTools.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/539 | 12.7s | 0.00 |
| Operator Swap Logical 005 | UseEffectEvent.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/958 | 20.6s | 0.00 |
| Operator Swap Logical 007 | getHookNameForLocation.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/1,322 | 25.8s | 0.00 |
| Operator Swap Nullish 001 | ElementBadges.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/440 | 10.0s | 0.00 |
| Operator Swap Nullish 003 | ReactComponentStackFrame.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/576 | 16.0s | 0.00 |
| Operator Swap Nullish 005 | ReactLogo.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/979 | 19.8s | 0.00 |
| Operator Swap Nullish 007 | SuspenseBreadcrumbs.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/1,889 | 35.8s | 0.00 |
| Regex Swap Regex Quantifier 001 | SimpleValues.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/365 | 10.1s | 0.00 |
| Regex Swap Regex Quantifier 003 | utils.js | 1/1 ✅ | 100.0% | 3/1/0 | 7/6,702 | 117.4s | 0.00 |
| Regex Swap Regex Quantifier 005 | formatWithStyles.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/1,582 | 26.9s | 0.00 |
| Regex Swap Regex Quantifier 007 | RunReactCompiler.ts | 1/1 ✅ | 100.0% | 1/1/0 | 3/10,364 | 165.4s | 0.00 |
| Structural Delete Statement 001 | useExtensionComponentsPanelVisibility.js | 0/1 ❌ | 100.0% | 2/1/0 | 6/575 | 13.1s | 0.00 |
| Structural Delete Statement 003 | useCanvasInteraction.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/838 | 16.5s | 0.00 |
| Structural Delete Statement 005 | StackTraceView.js | 0/1 ❌ | 100.0% | 4/1/0 | 8/1,693 | 37.5s | 0.00 |
| Structural Delete Statement 007 | ReactDOMFizzStaticBrowser.js | 0/1 ❌ | 100.0% | 2/1/0 | 6/1,047 | 22.3s | 0.00 |
| Structural Remove Early Return 001 | ReactFlightAsyncDispatcher.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/1,145 | 22.6s | 0.00 |
| Structural Remove Early Return 003 | ReactDOMComponentTree.js | 0/1 ❌ | 100.0% | 2/1/0 | 6/7,048 | 115.7s | 0.00 |
| Structural Remove Early Return 005 | TabBar.js | 0/1 ❌ | 100.0% | 4/1/0 | 8/1,273 | 32.0s | 0.00 |
| Structural Remove Early Return 007 | CommitTreeBuilder.js | 0/1 ❌ | 100.0% | 2/1/0 | 6/1,178 | 22.6s | 0.00 |
| Structural Swap Adjacent Lines 001 | reactPolling.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/391 | 9.3s | 0.00 |
| Structural Swap Adjacent Lines 003 | OwnersStack.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/517 | 11.6s | 0.00 |
| Structural Swap Adjacent Lines 005 | ReactOwnerStackFrames.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/676 | 14.0s | 0.00 |
| Structural Swap Adjacent Lines 007 | ReactFlightClientConfigBundlerWebpack.js | 0/1 ❌ | 100.0% | 2/1/0 | 6/2,884 | 42.8s | 0.00 |
| Structural Swap If Else 001 | utils.js | 0/1 ❌ | 100.0% | 2/1/0 | 4/11,719 | 192.7s | 0.00 |
| Structural Swap If Else 003 | ReactDOMFloat.js | 0/1 ❌ | 100.0% | 3/1/0 | 7/1,307 | 26.2s | 0.00 |
| Structural Swap If Else 005 | ReactClientConsoleConfigPlain.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/848 | 15.9s | 0.00 |
| Structural Swap If Else 007 | index.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/601 | 12.3s | 0.00 |
| Unicode Unicode Hyphen 001 | formatProdErrorMessage.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/389 | 18.4s | 0.00 |
| Unicode Unicode Hyphen 003 | SourceMapConsumer.js | 1/1 ✅ | 100.0% | 3/1/0 | 7/532 | 15.6s | 0.00 |
| Unicode Unicode Hyphen 005 | babel.config.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/393 | 10.0s | 0.00 |
| Unicode Unicode Hyphen 007 | ReactInternalTestUtils.js | 1/1 ✅ | 100.0% | 2/1/0 | 6/446 | 12.3s | 0.00 |

## Category Summary

| Category | Runs | Verified | Edit Used | Success | Min/Avg/Max Difficulty |
|----------|------|----------|-----------|---------|------------------------|
| access | 4 | 75.0% (3/4) | 75.0% (3/4) | 75.0% (3/4) | 3 / 7.5 / 10 |
| call | 4 | 100.0% (4/4) | 100.0% (4/4) | 100.0% (4/4) | 2 / 7.8 / 14 |
| duplicate | 4 | 75.0% (3/4) | 75.0% (3/4) | 75.0% (3/4) | 8 / 11.3 / 17 |
| identifier | 4 | 100.0% (4/4) | 100.0% (4/4) | 100.0% (4/4) | 4 / 6.8 / 9 |
| import | 4 | 100.0% (4/4) | 100.0% (4/4) | 100.0% (4/4) | 2 / 3.8 / 5 |
| literal | 8 | 100.0% (8/8) | 100.0% (8/8) | 100.0% (8/8) | 3 / 6.9 / 10 |
| operator | 28 | 96.4% (27/28) | 100.0% (28/28) | 96.4% (27/28) | 3 / 6.7 / 10 |
| regex | 4 | 100.0% (4/4) | 100.0% (4/4) | 100.0% (4/4) | 2 / 5.8 / 10 |
| structural | 16 | 43.8% (7/16) | 100.0% (16/16) | 43.8% (7/16) | 4 / 8.3 / 13 |
| unicode | 4 | 100.0% (4/4) | 100.0% (4/4) | 100.0% (4/4) | 2 / 4.8 / 8 |

## Mutation Summary

| Mutation | Category | Runs | Verified | Edit Used | Success |
|----------|----------|------|----------|-----------|---------|
| delete-statement | structural | 4 | 25.0% (1/4) | 100.0% (4/4) | 25.0% (1/4) |
| duplicate-line-flip | duplicate | 4 | 75.0% (3/4) | 75.0% (3/4) | 75.0% (3/4) |
| flip-boolean | literal | 4 | 100.0% (4/4) | 100.0% (4/4) | 100.0% (4/4) |
| identifier-multi-edit | identifier | 4 | 100.0% (4/4) | 100.0% (4/4) | 100.0% (4/4) |
| off-by-one | literal | 4 | 100.0% (4/4) | 100.0% (4/4) | 100.0% (4/4) |
| remove-early-return | structural | 4 | 25.0% (1/4) | 100.0% (4/4) | 25.0% (1/4) |
| remove-negation | operator | 4 | 75.0% (3/4) | 100.0% (4/4) | 75.0% (3/4) |
| remove-optional-chain | access | 4 | 75.0% (3/4) | 75.0% (3/4) | 75.0% (3/4) |
| swap-adjacent-lines | structural | 4 | 75.0% (3/4) | 100.0% (4/4) | 75.0% (3/4) |
| swap-arithmetic | operator | 4 | 100.0% (4/4) | 100.0% (4/4) | 100.0% (4/4) |
| swap-call-args | call | 4 | 100.0% (4/4) | 100.0% (4/4) | 100.0% (4/4) |
| swap-comparison | operator | 4 | 100.0% (4/4) | 100.0% (4/4) | 100.0% (4/4) |
| swap-equality | operator | 4 | 100.0% (4/4) | 100.0% (4/4) | 100.0% (4/4) |
| swap-if-else | structural | 4 | 50.0% (2/4) | 100.0% (4/4) | 50.0% (2/4) |
| swap-increment-decrement | operator | 4 | 100.0% (4/4) | 100.0% (4/4) | 100.0% (4/4) |
| swap-logical | operator | 4 | 100.0% (4/4) | 100.0% (4/4) | 100.0% (4/4) |
| swap-named-imports | import | 4 | 100.0% (4/4) | 100.0% (4/4) | 100.0% (4/4) |
| swap-nullish | operator | 4 | 100.0% (4/4) | 100.0% (4/4) | 100.0% (4/4) |
| swap-regex-quantifier | regex | 4 | 100.0% (4/4) | 100.0% (4/4) | 100.0% (4/4) |
| unicode-hyphen | unicode | 4 | 100.0% (4/4) | 100.0% (4/4) | 100.0% (4/4) |

## Difficulty Summary

| Difficulty Score | Runs | Verified | Edit Used | Success |
|------------------|------|----------|-----------|---------|
| 0-2 | 4 | 100.0% (4/4) | 100.0% (4/4) | 100.0% (4/4) |
| 3-5 | 24 | 87.5% (21/24) | 100.0% (24/24) | 87.5% (21/24) |
| 6-8 | 27 | 88.9% (24/27) | 100.0% (27/27) | 88.9% (24/27) |
| 9+ | 25 | 76.0% (19/25) | 92.0% (23/25) | 76.0% (19/25) |

## Failed Tasks (0% passing)

### Access Remove Optional Chain 007 (index.js) — 0/1

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | — | 0 / 0 | 360.0s |

### Duplicate Duplicate Line Flip 003 (ReactFiberDevToolsHook.js) — 0/1

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | — | 0 / 0 | 360.0s |

### Operator Remove Negation 005 (ReactDOMContainer.js) — 0/1

**All runs failed with same error:** File mismatch for ReactDOMContainer.js

**Sample agent response (run 1):**
```
Line 16: `!node &&` → `!!node &&`. The function now correctly short-circuits to `false` when `node` is null/undefined, instead of incorrectly treating null nodes as valid containers.
```

**Diff (expected vs actual):**
```diff
@@ -12 @@
 import { ELEMENT_NODE, COMMENT_NODE, DOCUMENT_NODE, DOCUMENT_FRAGMENT_NODE } from './HTMLNodeType';
 
 export function isValidContainer(node: any): boolean {
-  return !!(
-    node &&
+  return (
+    !!node &&
     (node.nodeType === ELEMENT_NODE ||
       node.nodeType === DOCUMENT_NODE ||
       node.nodeType === DOCUMENT_FRAGMENT_NODE ||
```

### Structural Delete Statement 001 (useExtensionComponentsPanelVisibility.js) — 0/1

**All runs failed with same error:** File mismatch for useExtensionComponentsPanelVisibility.js

**Sample agent response (run 1):**
```
The missing `const [isVisible, setIsVisible] = useState(true);` declaration has been restored at line 16. The state was referenced throughout but never initialized.
```

**Diff (expected vs actual):**
```diff
@@ -14 @@
 // For other implementations, this hook will just return constant `true` value.
 export function useExtensionComponentsPanelVisibility(bridge: FrontendBridge): boolean {
   const [isVisible, setIsVisible] = useState(true);
-
   useEffect(() => {
     function onPanelShown() {
       setIsVisible(true);
```

### Structural Delete Statement 005 (StackTraceView.js) — 0/1

**All runs failed with same error:** File mismatch for StackTraceView.js

**Sample agent response (run 1):**
```
Line 52 now defines `ignored` from `symbolicatedCallSite.ignored`, which feeds directly into the ternary at line 62. The fix is minimal and structurally correct.
```

**Diff (expected vs actual):**
```diff
@@ -49 @@
   );
   const [functionName, url, line, column] =
     symbolicatedCallSite !== null ? symbolicatedCallSite.location : callSite;
-  const ignored = symbolicatedCallSite !== null ? symbolicatedCallSite.ignored : false;
+  const ignored = symbolicatedCallSite !== null && symbolicatedCallSite.ignored;
+
   // TODO: Make an option to be able to toggle the display of ignore listed rows.
   // Ideally this UI should be higher than a single Stack Trace so that there's not
   // multiple buttons in a single inspection taking up space.
```

### Structural Delete Statement 007 (ReactDOMFizzStaticBrowser.js) — 0/1

**All runs failed with same error:** File mismatch for ReactDOMFizzStaticBrowser.js

**Sample agent response (run 1):**
```
The fix is correct. The missing `ReadableStream` construction (lines 72–85) has been restored inside `prerender`'s `onAllReady`, exactly mirroring the pattern in `resumeAndPrerender`. The `stream` variable is now defined before it's used in the result object.
```

**Diff (expected vs actual):**
```diff
@@ -83 @@
         // $FlowFixMe[prop-missing] size() methods are not allowed on byte streams.
         { highWaterMark: 0 },
       );
-
       const result: StaticResult = {
         postponed: getPostponedState(request),
         prelude: stream,
```

### Structural Remove Early Return 003 (ReactDOMComponentTree.js) — 0/1

**All runs failed with same error:** File mismatch for ReactDOMComponentTree.js

**Sample agent response (run 1):**
```
The guard clause is restored in the correct position. When `targetFiber` is found for a hydration boundary instance, it now returns immediately rather than silently discarding the found fiber and falling through to return the unrelated `targetInst` ancestor.
```

**Diff (expected vs actual):**
```diff
@@ -188 @@
           if (targetFiber) {
             return targetFiber;
           }
+
           // If we don't find a Fiber on the comment, it might be because
           // we haven't gotten to hydrate it yet. There might still be a
           // parent boundary that hasn't above this one so we need to find
```

### Structural Remove Early Return 005 (TabBar.js) — 0/1

**All runs failed with same error:** File mismatch for TabBar.js

**Sample agent response (run 1):**
```
The guard clause is restored at lines 92–94: `if (tab === null) {` / `return null;` / `}`. This prevents the destructuring on line 95 from throwing when `tabs` contains `null` entries.
```

**Diff (expected vs actual):**
```diff
@@ -90 @@
     <Fragment>
       {tabs.map((tab) => {
         if (tab === null) {
-          return <div key="VRule" className={styles.VRule} />;
+          return null;
         }
         }
-
         const { icon, id, label, title } = tab;
 
         let button = (
```

### Structural Remove Early Return 007 (CommitTreeBuilder.js) — 0/1

**All runs failed with same error:** File mismatch for CommitTreeBuilder.js

**Sample agent response (run 1):**
```
The guard clause is restored correctly at lines 67–69, immediately after the `commitTrees` binding. When `commitTrees` already contains the requested `commitIndex`, the function returns the cached tree early rather than falling through to the loop with `commitTree` uninitialized.
```

**Diff (expected vs actual):**
```diff
@@ -63 @@
   }
 
   const commitTrees = ((rootToCommitTreeMap.get(rootID): any): Array<CommitTree>);
-  if (commitIndex < commitTrees.length) {
+
+  if (commitTrees.length > commitIndex) {
     return commitTrees[commitIndex];
   }
 
```

### Structural Swap Adjacent Lines 007 (ReactFlightClientConfigBundlerWebpack.js) — 0/1

**All runs failed with same error:** File mismatch for ReactFlightClientConfigBundlerWebpack.js

**Sample agent response (run 1):**
```
Lines 190 and 191 are now swapped. The cache entry is established before the `.then` handler is attached, eliminating the race where a synchronous resolution would write `null` into the cache and then be overwritten by the thenable on the next line.
```

**Diff (expected vs actual):**
```diff
@@ -184 @@
     const entry = chunkCache.get(chunkId);
     if (entry === undefined) {
       const thenable = loadChunk(chunkId, chunkFilename);
-      promises.push(thenable);
-      // $FlowFixMe[method-unbinding]
       const resolve = chunkCache.set.bind(chunkCache, chunkId, null);
       const resolve = chunkCache.set.bind(chunkCache, chunkId, null);
-      thenable.then(resolve, ignoreReject);
+      // $FlowFixMe[method-unbinding]
+      promises.push(thenable);
       chunkCache.set(chunkId, thenable);
       chunkCache.set(chunkId, thenable);
+      thenable.then(resolve, ignoreReject);
     } else if (entry !== null) {
       promises.push(entry);
     }
```

### Structural Swap If Else 001 (utils.js) — 0/1

**All runs failed with same error:** File mismatch for utils.js

**Sample agent response (run 1):**
```
Swapped correctly. The `file:///` branch now keeps `sourceURL` as-is, and the general `://` branch extracts `.pathname`. Only lines 24 and 26 were touched; everything else is unchanged.
```

**Diff (expected vs actual):**
```diff
@@ -21 @@
 
     // Check if sourceURL is a correct URL, which has a protocol specified
     if (sourceURL.startsWith('file:///')) {
-      filePath = new URL(sourceURL).pathname;
+      filePath = sourceURL;
     } else if (sourceURL.includes('://')) {
     } else if (sourceURL.includes('://')) {
-      // $FlowFixMe[cannot-resolve-name]
+      filePath = new URL(sourceURL).pathname;
+    } else {
       if (!__IS_INTERNAL_VERSION__) {
       if (!__IS_INTERNAL_VERSION__) {
-        // In this case, we can't really determine the path to a file, disable a button
-        return { url: null, shouldDisableButton: true };
+        return {
+          url: null,
+          shouldDisableButton: true,
+        };
       } else {
         const endOfSourceMapURLPattern = '.js/';
         const endOfSourceMapURLIndex = sourceURL.lastIndexOf(endOfSourceMapURLPattern);
       } else {
         const endOfSourceMapURLPattern = '.js/';
         const endOfSourceMapURLIndex = sourceURL.lastIndexOf(endOfSourceMapURLPattern);
-
         if (endOfSourceMapURLIndex === -1) {
         if (endOfSourceMapURLIndex === -1) {
-          return { url: null, shouldDisableButton: true };
+          return {
+            url: null,
+            shouldDisableButton: true,
+          };
         } else {
           filePath = sourceURL.slice(
             endOfSourceMapURLIndex + endOfSourceMapURLPattern.length,
@@ -40 @@
           );
         }
       }
-    } else {
-      filePath = sourceURL;
     }
 
     const lineNumberAsString = String(line);
```

### Structural Swap If Else 003 (ReactDOMFloat.js) — 0/1

**All runs failed with same error:** File mismatch for ReactDOMFloat.js

**Sample agent response (run 1):**
```
The fix is correct. Now the logic reads:

- `if (!encountered)` — no validation errors collected → run the `as`-type switch to warn if `as` isn't `'script'`
- `else` — validation errors were collected → emit the general error with the `encountered` details

Single token change (`if (encountered)` → `if (!encountered)`), nothing else touched.
```

**Diff (expected vs actual):**
```diff
@@ -246 @@
         options.as,
       )}.`;
     }
-    if (encountered) {
-      console.error(
-        'ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` string and, optionally, an `options` object with a valid `as` property.%s',
-        encountered,
-      );
-    } else {
+    if (!encountered) {
       const as = options && typeof options.as === 'string' ? options.as : 'script';
       switch (as) {
         case 'script': {
@@ -257 @@
         case 'script': {
           break;
         }
-
-        // We have an invalid as type and need to warn
         default: {
           const typeOfAs = getValueDescriptorExpectingEnumForWarning(as);
           console.error(
@@ -271 @@
           );
         }
       }
+    } else {
+      console.error(
+        'ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` string and, optionally, an `options` object with a valid `as` property.%s',
+        encountered,
+      );
     }
   }
   if (typeof href === 'string') {
```
