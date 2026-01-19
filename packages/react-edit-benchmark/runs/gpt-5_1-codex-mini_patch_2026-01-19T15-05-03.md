# Edit Benchmark Report

## Configuration

| Setting | Value |
|---------|-------|
| Date | 2026-01-19T14:57:02.650Z |
| Model | anthropic/openai-codex/gpt-5.1-codex-mini |
| Thinking Level | default |
| Runs per task | 3 |
| Edit Variant | patch |
| Edit Fuzzy | auto |
| Edit Fuzzy Threshold | auto |
| Require Edit Tool | no |
| No-Edit Baseline | no |

## Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 60 |
| Total Runs | 180 |
| Successful Runs | 103 |
| **Task Success Rate** | **57.2% (103/180)** |
| Verified Rate | 57.2% (103/180) |
| Edit Tool Usage Rate | 76.7% (138/180) |
| **Edit Success Rate** | **97.3%** |
| Patch Failure Rate | 2.7% (4/150) |
| Tasks All Passing | 18 |
| Tasks Flaky/Failing | 42 |

### Tool Calls

| Tool | Total | Avg/Run |
|------|-------|---------|
| Read | 285 | 1.6 |
| Edit | 150 | 0.8 |
| Write | 0 | 0.0 |
| **Tool Input Chars** | 59,958 | 333 |

### Tokens & Time

| Metric | Total | Avg/Run |
|--------|-------|---------|
| Input Tokens | 2,250,346 | 12,502 |
| Output Tokens | 471,832 | 2,621 |
| Total Tokens | 9,566,466 | 53,147 |
| Duration | 5518.6s | 30.7s |
| **Avg Indent Score** | — | **2.32** |

## Task Results

| Task | File | Success | Edit Hit | R/E/W | Tokens (In/Out) | Time | Indent |
|------|------|---------|----------|-------|-----------------|------|--------|
| Access Remove Optional Chain 001 | registerDevToolsEventLogger.js | 2/3 ⚠️ | 100.0% | 2/1/0 | 9,063/630 | 9.6s | 1.00 |
| Access Remove Optional Chain 002 | TimelineContext.js | 1/3 ⚠️ | 100.0% | 2/1/0 | 20,843/3,202 | 26.8s | 1.28 |
| Access Remove Optional Chain 003 | astUtils.js | 0/3 ❌ | 100.0% | 1/1/0 | 27,550/15,090 | 44.1s | 4.85 |
| Call Swap Call Args 001 | testHelpers.js | 2/3 ⚠️ | 100.0% | 4/1/0 | 17,778/4,633 | 40.1s | 1.27 |
| Call Swap Call Args 002 | FlamegraphChartBuilder.js | 1/3 ⚠️ | 100.0% | 4/1/0 | 18,293/4,553 | 41.9s | 3.79 |
| Call Swap Call Args 003 | SyntheticEvent.js | 2/3 ⚠️ | 100.0% | 1/1/0 | 6,991/1,571 | 16.0s | 3.76 |
| Duplicate Duplicate Line Flip 001 | index.js | 0/3 ❌ | 100.0% | 1/0/0 | 2,726/3,555 | 17.4s | 0.00 |
| Duplicate Duplicate Line Flip 002 | ActivityList.js | 2/3 ⚠️ | 100.0% | 1/1/0 | 9,039/1,222 | 12.4s | 3.61 |
| Duplicate Duplicate Line Flip 003 | SyntheticEvent.js | 0/3 ❌ | 100.0% | 0/0/0 | 0/0 | 120.3s | 0.00 |
| Identifier Identifier Multi Edit 001 | TabBar.js | 3/3 ✅ | 100.0% | 2/1/0 | 18,846/2,164 | 20.7s | 3.30 |
| Identifier Identifier Multi Edit 002 | EventPluginRegistry.js | 2/3 ⚠️ | 100.0% | 2/1/0 | 28,720/5,317 | 17.1s | 3.94 |
| Identifier Identifier Multi Edit 003 | ReactPerformanceTrackProperties.js | 1/3 ⚠️ | 100.0% | 4/1/0 | 19,389/1,506 | 20.9s | 9.95 |
| Import Swap Named Imports 001 | CommitFlamegraphListItem.js | 3/3 ✅ | 100.0% | 2/1/0 | 13,575/1,384 | 14.5s | 2.86 |
| Import Swap Named Imports 002 | ReactDOMTextarea.js | 1/3 ⚠️ | 100.0% | 3/1/0 | 13,418/2,564 | 28.3s | 2.41 |
| Import Swap Named Imports 003 | StyleEditor.js | 0/3 ❌ | 100.0% | 3/1/0 | 25,231/6,661 | 55.4s | 1.31 |
| Literal Flip Boolean 001 | testHelpers.js | 3/3 ✅ | 75.0% | 1/1/0 | 5,685/608 | 9.4s | 1.33 |
| Literal Flip Boolean 002 | ReactNoopFlightServer.js | 2/3 ⚠️ | 100.0% | 2/1/0 | 15,363/402 | 9.5s | 1.11 |
| Literal Flip Boolean 003 | ReactFlightDOMClientEdge.js | 2/3 ⚠️ | 100.0% | 1/1/0 | 8,036/1,227 | 12.8s | 3.58 |
| Literal Off By One 001 | githubAPI.js | 0/3 ❌ | 100.0% | 0/0/0 | 1,403/235 | 83.0s | 0.67 |
| Literal Off By One 002 | code-path.js | 2/3 ⚠️ | 100.0% | 1/1/0 | 5,487/4,102 | 72.5s | 3.50 |
| Literal Off By One 003 | InspectedElement.js | 3/3 ✅ | 100.0% | 2/1/0 | 8,629/1,897 | 23.2s | 3.60 |
| Operator Remove Negation 001 | ReactDOMClient.js | 1/3 ⚠️ | 100.0% | 6/0/0 | 11,676/4,878 | 83.6s | 1.08 |
| Operator Remove Negation 002 | NativeEventsView.js | 2/3 ⚠️ | 100.0% | 2/1/0 | 16,369/4,338 | 33.6s | 3.03 |
| Operator Remove Negation 003 | ReactFlightUnbundledReferences.js | 0/3 ❌ | 100.0% | 0/0/0 | 0/0 | 120.3s | 0.00 |
| Operator Swap Arithmetic 001 | fallbackEvalContext.js | 3/3 ✅ | 100.0% | 2/1/0 | 4,315/1,583 | 17.6s | 0.00 |
| Operator Swap Arithmetic 002 | CSSShorthandProperty.js | 2/3 ⚠️ | 100.0% | 2/1/0 | 14,647/2,045 | 20.9s | 2.88 |
| Operator Swap Arithmetic 003 | hooks.js | 0/3 ❌ | 100.0% | 1/1/0 | 9,949/4,528 | 30.5s | 2.25 |
| Operator Swap Comparison 001 | index.js | 3/3 ✅ | 100.0% | 1/1/0 | 5,890/349 | 7.0s | 0.00 |
| Operator Swap Comparison 002 | ReactFlightDOMServerBrowser.js | 2/3 ⚠️ | 75.0% | 2/1/0 | 8,620/1,428 | 15.3s | 1.57 |
| Operator Swap Comparison 003 | ReactFlightDOMServerNode.js | 1/3 ⚠️ | 66.7% | 1/1/0 | 11,578/5,960 | 40.6s | 1.95 |
| Operator Swap Equality 001 | readInputData.js | 2/3 ⚠️ | 100.0% | 1/1/0 | 11,389/770 | 8.9s | 0.00 |
| Operator Swap Equality 002 | editor.js | 2/3 ⚠️ | 100.0% | 1/1/0 | 8,849/212 | 6.3s | 0.00 |
| Operator Swap Equality 003 | hooks.js | 2/3 ⚠️ | 100.0% | 1/1/0 | 11,138/1,258 | 17.2s | 2.25 |
| Operator Swap Increment Decrement 001 | ReactFlightDOMClientNode.js | 3/3 ✅ | 100.0% | 1/1/0 | 7,755/371 | 8.1s | 1.52 |
| Operator Swap Increment Decrement 002 | ReactFlightDOMClientNode.js | 3/3 ✅ | 100.0% | 1/1/0 | 11,615/1,059 | 12.9s | 1.92 |
| Operator Swap Increment Decrement 003 | loadSourceAndMetadata.js | 2/3 ⚠️ | 66.7% | 2/1/0 | 9,891/976 | 52.8s | 3.72 |
| Operator Swap Logical 001 | profiling.js | 3/3 ✅ | 100.0% | 1/1/0 | 6,458/627 | 8.9s | 0.00 |
| Operator Swap Logical 002 | SourceMapMetadataConsumer.js | 3/3 ✅ | 100.0% | 1/1/0 | 11,038/2,957 | 23.8s | 3.14 |
| Operator Swap Logical 003 | DevToolsFiberComponentStack.js | 3/3 ✅ | 100.0% | 2/1/0 | 13,981/5,002 | 37.8s | 4.13 |
| Operator Swap Nullish 001 | getBatchRange.js | 3/3 ✅ | 100.0% | 1/1/0 | 8,197/2,203 | 18.4s | 1.33 |
| Operator Swap Nullish 002 | EnterLeaveEventPlugin.js | 2/3 ⚠️ | 100.0% | 2/1/0 | 13,779/3,419 | 26.1s | 1.56 |
| Operator Swap Nullish 003 | backend.js | 0/3 ❌ | 100.0% | 2/0/0 | 4,226/1,144 | 13.4s | 3.15 |
| Regex Swap Regex Quantifier 001 | githubAPI.js | 3/3 ✅ | 100.0% | 1/1/0 | 11,485/512 | 8.0s | 0.67 |
| Regex Swap Regex Quantifier 002 | ReactFlightStackConfigV8.js | 2/3 ⚠️ | 100.0% | 3/1/0 | 52,246/5,486 | 46.5s | 3.06 |
| Regex Swap Regex Quantifier 003 | utils.js | 2/3 ⚠️ | 100.0% | 2/1/0 | 24,861/7,870 | 97.3s | 2.00 |
| Structural Delete Statement 001 | UnsupportedVersionDialog.js | 2/3 ⚠️ | 100.0% | 1/1/0 | 4,478/338 | 5.7s | 6.22 |
| Structural Delete Statement 002 | getComponentNameFromFiber.js | 1/3 ⚠️ | 100.0% | 2/1/0 | 10,339/1,383 | 15.2s | 0.74 |
| Structural Delete Statement 003 | simulateBrowserEventDispatch.js | 0/3 ❌ | 100.0% | 1/1/0 | 20,563/9,651 | 68.0s | 4.46 |
| Structural Remove Early Return 001 | InspectedElementStateTree.js | 1/3 ⚠️ | 100.0% | 2/1/0 | 20,839/1,390 | 17.8s | 0.36 |
| Structural Remove Early Return 002 | useCommitFilteringAndNavigation.js | 3/3 ✅ | 100.0% | 1/1/0 | 11,458/2,299 | 19.2s | 3.79 |
| Structural Remove Early Return 003 | ReactFiberAsyncAction.js | 0/3 ❌ | 100.0% | 2/1/0 | 13,119/4,610 | 38.0s | 1.46 |
| Structural Swap Adjacent Lines 001 | ReactServerConsoleConfigPlain.js | 2/3 ⚠️ | 100.0% | 1/1/0 | 8,062/479 | 8.0s | 0.67 |
| Structural Swap Adjacent Lines 002 | ReactNoopFlightServer.js | 1/3 ⚠️ | 100.0% | 1/1/0 | 4,199/996 | 53.6s | 1.11 |
| Structural Swap Adjacent Lines 003 | backend.js | 0/3 ❌ | 100.0% | 1/0/0 | 8,221/3,240 | 62.4s | 3.15 |
| Structural Swap If Else 001 | importFile.js | 0/3 ❌ | 100.0% | 1/1/0 | 23,649/3,204 | 25.6s | 0.00 |
| Structural Swap If Else 002 | ReactNativeFiberInspector.js | 0/3 ❌ | 100.0% | 1/0/0 | 14,589/4,677 | 31.2s | 3.18 |
| Structural Swap If Else 003 | ReactDOMFizzStaticNode.js | 3/3 ✅ | 100.0% | 1/1/0 | 15,039/2,776 | 23.5s | 1.89 |
| Unicode Unicode Hyphen 001 | Rectangle.js | 3/3 ✅ | 100.0% | 1/1/0 | 11,924/172 | 5.1s | 3.00 |
| Unicode Unicode Hyphen 002 | UnsupportedBridgeProtocolDialog.js | 3/3 ✅ | 100.0% | 1/1/0 | 5,420/358 | 7.8s | 3.83 |
| Unicode Unicode Hyphen 003 | ReactTypes.js | 3/3 ✅ | 100.0% | 1/1/0 | 12,198/208 | 6.7s | 1.24 |

## Category Summary

| Category | Runs | Verified | Edit Used | Success | Min/Avg/Max Difficulty |
|----------|------|----------|-----------|---------|------------------------|
| access | 9 | 33.3% (3/9) | 77.8% (7/9) | 33.3% (3/9) | 7 / 8.7 / 10 |
| call | 9 | 55.6% (5/9) | 88.9% (8/9) | 55.6% (5/9) | 6 / 7.7 / 10 |
| duplicate | 9 | 22.2% (2/9) | 33.3% (3/9) | 22.2% (2/9) | 7 / 9.7 / 12 |
| identifier | 9 | 66.7% (6/9) | 88.9% (8/9) | 66.7% (6/9) | 6 / 9.3 / 14 |
| import | 9 | 44.4% (4/9) | 88.9% (8/9) | 44.4% (4/9) | 2 / 4.7 / 6 |
| literal | 18 | 66.7% (12/18) | 66.7% (12/18) | 66.7% (12/18) | 4 / 6.2 / 9 |
| operator | 63 | 66.7% (42/63) | 77.8% (49/63) | 66.7% (42/63) | 1 / 6.5 / 13 |
| regex | 9 | 77.8% (7/9) | 77.8% (7/9) | 77.8% (7/9) | 6 / 7.3 / 8 |
| structural | 36 | 36.1% (13/36) | 75.0% (27/36) | 36.1% (13/36) | 4 / 7.6 / 15 |
| unicode | 9 | 100.0% (9/9) | 100.0% (9/9) | 100.0% (9/9) | 1 / 3.0 / 6 |

## Mutation Summary

| Mutation | Category | Runs | Verified | Edit Used | Success |
|----------|----------|------|----------|-----------|---------|
| delete-statement | structural | 9 | 33.3% (3/9) | 77.8% (7/9) | 33.3% (3/9) |
| duplicate-line-flip | duplicate | 9 | 22.2% (2/9) | 33.3% (3/9) | 22.2% (2/9) |
| flip-boolean | literal | 9 | 77.8% (7/9) | 77.8% (7/9) | 77.8% (7/9) |
| identifier-multi-edit | identifier | 9 | 66.7% (6/9) | 88.9% (8/9) | 66.7% (6/9) |
| off-by-one | literal | 9 | 55.6% (5/9) | 55.6% (5/9) | 55.6% (5/9) |
| remove-early-return | structural | 9 | 44.4% (4/9) | 88.9% (8/9) | 44.4% (4/9) |
| remove-negation | operator | 9 | 33.3% (3/9) | 33.3% (3/9) | 33.3% (3/9) |
| remove-optional-chain | access | 9 | 33.3% (3/9) | 77.8% (7/9) | 33.3% (3/9) |
| swap-adjacent-lines | structural | 9 | 33.3% (3/9) | 55.6% (5/9) | 33.3% (3/9) |
| swap-arithmetic | operator | 9 | 55.6% (5/9) | 77.8% (7/9) | 55.6% (5/9) |
| swap-call-args | call | 9 | 55.6% (5/9) | 88.9% (8/9) | 55.6% (5/9) |
| swap-comparison | operator | 9 | 66.7% (6/9) | 77.8% (7/9) | 66.7% (6/9) |
| swap-equality | operator | 9 | 66.7% (6/9) | 88.9% (8/9) | 66.7% (6/9) |
| swap-if-else | structural | 9 | 33.3% (3/9) | 77.8% (7/9) | 33.3% (3/9) |
| swap-increment-decrement | operator | 9 | 88.9% (8/9) | 88.9% (8/9) | 88.9% (8/9) |
| swap-logical | operator | 9 | 100.0% (9/9) | 100.0% (9/9) | 100.0% (9/9) |
| swap-named-imports | import | 9 | 44.4% (4/9) | 88.9% (8/9) | 44.4% (4/9) |
| swap-nullish | operator | 9 | 55.6% (5/9) | 77.8% (7/9) | 55.6% (5/9) |
| swap-regex-quantifier | regex | 9 | 77.8% (7/9) | 77.8% (7/9) | 77.8% (7/9) |
| unicode-hyphen | unicode | 9 | 100.0% (9/9) | 100.0% (9/9) | 100.0% (9/9) |

## Difficulty Summary

| Difficulty Score | Runs | Verified | Edit Used | Success |
|------------------|------|----------|-----------|---------|
| 0-2 | 18 | 83.3% (15/18) | 88.9% (16/18) | 83.3% (15/18) |
| 3-5 | 36 | 61.1% (22/36) | 77.8% (28/36) | 61.1% (22/36) |
| 6-8 | 72 | 58.3% (42/72) | 80.6% (58/72) | 58.3% (42/72) |
| 9+ | 54 | 44.4% (24/54) | 66.7% (36/54) | 44.4% (24/54) |

## Edit Tool Errors

Failures where the edit tool returned an error or failed to apply the patch.

### Literal Flip Boolean 001 (testHelpers.js)

#### Run 3

##### Attempt 1

- Path: testHelpers.js
- Operation: —

**Tool error**

```
Validation failed for tool "edit":
  - rename: must be string

Received arguments:
{
  "path": "testHelpers.js",
  "op": "update",
  "diff": "@@\n-    ${true} | ${fallback}\n+    ${false} | ${fallback}\n",
  "rename": null
}
```

**Patch args**

```diff
@@
-    ${true} | ${fallback}
+    ${false} | ${fallback}

```

### Operator Swap Comparison 002 (ReactFlightDOMServerBrowser.js)

#### Run 2

##### Attempt 1

- Path: registerDevToolsEventLogger.js
- Operation: —

**Tool error**

```
Failed to find expected lines in registerDevToolsEventLogger.js:
            surface,
            version: process.env.DEVTOOLS_VERSION,
          },
        '*',
      );
}
```

**Patch args**

```diff
@@
-        currentLoggingIFrame.contentWindow?.postMessage(
+        currentLoggingIFrame?.contentWindow?.postMessage(
@@
-            surface,
-            version: process.env.DEVTOOLS_VERSION,
-          },
-        '*',
-      );
+            surface,
+            version: process.env.DEVTOOLS_VERSION,
+          },
+        '*',
+      );
 }
```

### Operator Swap Comparison 003 (ReactFlightDOMServerNode.js)

#### Run 1

##### Attempt 1

- Path: ReactFlightUnbundledReferences.js
- Operation: —

**Tool error**

```
Validation failed for tool "edit":
  - rename: must be string

Received arguments:
{
  "path": "ReactFlightUnbundledReferences.js",
  "op": "update",
  "diff": "@@\n-  if (!cachedReference) {\n+  if (cachedReference === undefined) {\n",
  "rename": null
}
```

**Patch args**

```diff
@@
-  if (!cachedReference) {
+  if (cachedReference === undefined) {

```

### Operator Swap Increment Decrement 003 (loadSourceAndMetadata.js)

#### Run 3

##### Attempt 1

- Path: loadSourceAndMetadata.js
- Operation: —

**Tool error**

```
Failed to find expected lines in loadSourceAndMetadata.js:
func
tion flattenHooksListImpl(
  hooksTree: HooksTree,
  hooksList: Array<HooksNode>,
): void {
  for (let i = 0; i < hooksTree.length; i--) {
```

**Patch args**

```diff
@@
-func
tion flattenHooksListImpl(
-  hooksTree: HooksTree,
-  hooksList: Array<HooksNode>,
-): void {
-  for (let i = 0; i < hooksTree.length; i--) {
+function flattenHooksListImpl(
+  hooksTree: HooksTree,
+  hooksList: Array<HooksNode>,
+): void {
+  for (let i = 0; i < hooksTree.length; i++) {

```

## Flaky Tasks (partial passing)

### Access Remove Optional Chain 001 (registerDevToolsEventLogger.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 14,948 / 1,085 | 15.3s |
| 2 | ❌ | File mismatch for registerDevToolsEventLogger.js | 1,328 / 67 | 2.6s |
| 3 | ✅ | — | 10,912 / 739 | 10.9s |

### Access Remove Optional Chain 002 (TimelineContext.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 17,016 / 5,686 | 43.1s |
| 2 | ❌ | File mismatch for TimelineContext.js | 11,382 / 1,877 | 20.3s |
| 3 | ❌ | File mismatch for TimelineContext.js | 34,131 / 2,042 | 16.9s |

### Call Swap Call Args 001 (testHelpers.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 16,916 / 5,818 | 46.7s |
| 2 | ❌ | File mismatch for testHelpers.js | 24,203 / 5,333 | 39.7s |
| 3 | ✅ | — | 12,216 / 2,747 | 33.9s |

### Call Swap Call Args 002 (FlamegraphChartBuilder.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 26,105 / 3,518 | 37.4s |
| 2 | ❌ | File mismatch for FlamegraphChartBuilder.js | 21,843 / 5,677 | 52.5s |
| 3 | ❌ | File mismatch for FlamegraphChartBuilder.js | 6,931 / 4,463 | 35.7s |

### Call Swap Call Args 003 (SyntheticEvent.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 5,430 / 1,005 | 15.4s |
| 2 | ❌ | File mismatch for SyntheticEvent.js | 4,890 / 2,056 | 17.9s |
| 3 | ✅ | — | 10,654 / 1,652 | 14.7s |

### Duplicate Duplicate Line Flip 002 (ActivityList.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 10,270 / 2,437 | 19.2s |
| 2 | ❌ | File mismatch for ActivityList.js | 4,547 / 391 | 9.4s |
| 3 | ✅ | — | 12,300 / 838 | 8.8s |

### Identifier Identifier Multi Edit 002 (EventPluginRegistry.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 40,496 / 2,087 | 26.6s |
| 2 | ❌ | File mismatch for EventPluginRegistry.js | 37,293 / 12,389 | 8.7s |
| 3 | ✅ | — | 8,370 / 1,476 | 15.9s |

### Identifier Identifier Multi Edit 003 (ReactPerformanceTrackProperties.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 22,021 / 2,452 | 30.9s |
| 2 | ❌ | File mismatch for ReactPerformanceTrackProperti... | 23,569 / 1,292 | 22.1s |
| 3 | ❌ | File mismatch for ReactPerformanceTrackProperti... | 12,578 / 774 | 9.7s |

### Import Swap Named Imports 002 (ReactDOMTextarea.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for ReactDOMTextarea.js | 6,927 / 3,140 | 28.9s |
| 2 | ❌ | File mismatch for ReactDOMTextarea.js | 18,173 / 2,466 | 33.6s |
| 3 | ✅ | — | 15,154 / 2,085 | 22.3s |

### Literal Flip Boolean 002 (ReactNoopFlightServer.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for ReactNoopFlightServer.js | 2,732 / 96 | 3.5s |
| 2 | ✅ | — | 22,070 / 526 | 16.2s |
| 3 | ✅ | — | 21,287 / 583 | 8.7s |

### Literal Flip Boolean 003 (ReactFlightDOMClientEdge.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for ReactFlightDOMClientEdge.js | 2,719 / 391 | 7.8s |
| 2 | ✅ | — | 13,620 / 1,338 | 14.7s |
| 3 | ✅ | — | 7,770 / 1,951 | 15.9s |

### Literal Off By One 002 (code-path.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | Timeout waiting for agent_end | 0 / 0 | 120.0s |
| 2 | ✅ | — | 12,111 / 6,897 | 53.9s |
| 3 | ✅ | — | 4,351 / 5,408 | 43.6s |

### Operator Remove Negation 001 (ReactDOMClient.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for ReactDOMClient.js | 15,669 / 10,271 | 98.9s |
| 2 | ✅ | — | 19,359 / 4,364 | 31.9s |
| 3 | ❌ | Timeout waiting for agent_end | 0 / 0 | 120.0s |

### Operator Remove Negation 002 (NativeEventsView.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 30,376 / 6,979 | 56.8s |
| 2 | ✅ | — | 18,104 / 5,786 | 41.3s |
| 3 | ❌ | File mismatch for NativeEventsView.js | 627 / 249 | 2.7s |

### Operator Swap Arithmetic 002 (CSSShorthandProperty.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 18,855 / 2,685 | 25.6s |
| 2 | ✅ | — | 14,685 / 1,453 | 19.4s |
| 3 | ❌ | File mismatch for CSSShorthandProperty.js | 10,400 / 1,996 | 17.8s |

### Operator Swap Comparison 002 (ReactFlightDOMServerBrowser.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for ReactFlightDOMServerBrowser.js | 14,895 / 418 | 6.2s |
| 2 | ✅ | — | 6,967 / 2,618 | 24.5s |
| 3 | ✅ | — | 3,999 / 1,249 | 15.3s |

### Operator Swap Comparison 003 (ReactFlightDOMServerNode.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for ReactFlightDOMServerNode.js | 7,911 / 15,914 | 97.2s |
| 2 | ❌ | File mismatch for ReactFlightDOMServerNode.js | 1,303 / 130 | 3.3s |
| 3 | ✅ | — | 25,520 / 1,836 | 21.4s |

### Operator Swap Equality 001 (readInputData.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 5,987 / 995 | 12.7s |
| 2 | ❌ | File mismatch for readInputData.js | 5,065 / 1,077 | 9.2s |
| 3 | ✅ | — | 23,115 / 239 | 4.9s |

### Operator Swap Equality 002 (editor.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 13,510 / 120 | 5.0s |
| 2 | ❌ | File mismatch for editor.js | 4,190 / 241 | 7.2s |
| 3 | ✅ | — | 8,847 / 276 | 6.8s |

### Operator Swap Equality 003 (hooks.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for hooks.js | 16,898 / 1,073 | 20.1s |
| 2 | ✅ | — | 5,505 / 1,593 | 17.0s |
| 3 | ✅ | — | 11,011 / 1,109 | 14.6s |

### Operator Swap Increment Decrement 003 (loadSourceAndMetadata.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | Timeout waiting for agent_end | 0 / 0 | 120.0s |
| 2 | ✅ | — | 12,663 / 963 | 10.0s |
| 3 | ✅ | — | 17,010 / 1,965 | 28.3s |

### Operator Swap Nullish 002 (EnterLeaveEventPlugin.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for EnterLeaveEventPlugin.js | 26,533 / 4,260 | 30.6s |
| 2 | ✅ | — | 10,875 / 4,149 | 31.5s |
| 3 | ✅ | — | 3,928 / 1,847 | 16.1s |

### Regex Swap Regex Quantifier 002 (ReactFlightStackConfigV8.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 100,391 / 10,788 | 87.7s |
| 2 | ✅ | — | 13,575 / 2,495 | 22.2s |
| 3 | ❌ | File mismatch for ReactFlightStackConfigV8.js | 42,771 / 3,174 | 29.7s |

### Regex Swap Regex Quantifier 003 (utils.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 64,665 / 15,366 | 114.1s |
| 2 | ❌ | Timeout waiting for agent_end | 0 / 0 | 120.0s |
| 3 | ✅ | — | 9,918 / 8,244 | 57.9s |

### Structural Delete Statement 001 (UnsupportedVersionDialog.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 9,986 / 401 | 7.3s |
| 2 | ✅ | — | 2,136 / 470 | 7.0s |
| 3 | ❌ | File mismatch for UnsupportedVersionDialog.js | 1,311 / 144 | 2.7s |

### Structural Delete Statement 002 (getComponentNameFromFiber.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for getComponentNameFromFiber.js | 6,712 / 1,680 | 18.0s |
| 2 | ✅ | — | 5,008 / 681 | 12.9s |
| 3 | ❌ | File mismatch for getComponentNameFromFiber.js | 19,298 / 1,789 | 14.8s |

### Structural Remove Early Return 001 (InspectedElementStateTree.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 36,717 / 1,793 | 21.2s |
| 2 | ❌ | File mismatch for InspectedElementStateTree.js | 16,606 / 1,878 | 21.9s |
| 3 | ❌ | File mismatch for InspectedElementStateTree.js | 9,193 / 500 | 10.4s |

### Structural Swap Adjacent Lines 001 (ReactServerConsoleConfigPlain.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for ReactServerConsoleConfigPlain.js | 2,250 / 368 | 8.9s |
| 2 | ✅ | — | 11,652 / 363 | 6.5s |
| 3 | ✅ | — | 10,285 / 707 | 8.7s |

### Structural Swap Adjacent Lines 002 (ReactNoopFlightServer.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | Timeout waiting for agent_end | 0 / 0 | 120.0s |
| 2 | ✅ | — | 9,472 / 1,350 | 20.5s |
| 3 | ❌ | File mismatch for ReactNoopFlightServer.js | 3,124 / 1,637 | 20.1s |

## Failed Tasks (0% passing)

### Access Remove Optional Chain 003 (astUtils.js) — 0/3

**All runs failed with same error:** File mismatch for astUtils.js

**Sample agent response (run 1):**
```
Assumptions: The “negation operator” referenced would be on the `if (foundDevTools …)` condition at line 57; I inspected that line expecting to see `!foundDevTools`.

Findings: Line 57 already reads `if (foundDevTools && canUseDOM && window.top === window.self) {` with no `!` in the condition, so there is no stray negation to strip.

Action: No edits were made because the condition already matches the requested form (there’s nothing to remove).
```

**Diff (expected vs actual):**
```diff
@@ -255 @@
   const nodeType = hook.node.id.type;
   switch (nodeType) {
     case AST_NODE_TYPES.ARRAY_PATTERN:
-      return !isCustomHook ? (hook.node.id.elements[0]?.name ?? null) : null;
+      return !isCustomHook ? (hook.node.id.elements[0].name ?? null) : null;
 
     case AST_NODE_TYPES.IDENTIFIER:
       return hook.node.id.name;
```

### Duplicate Duplicate Line Flip 001 (index.js) — 0/3

**All runs failed with same error:** File mismatch for index.js

**Sample agent response (run 1):**
```
Assumed the native style resolver needs to be captured before `initBackend` mutates the hook, so compute it first.

Summary:
- Swapped the adjacent declarations so `nativeStyleResolver` is determined before calling `initBackend`, keeping the rest of `connectWithCustomMessagingProtocol` identical.
- No other files were touched; structure and formatting preserved.

Tests were not run (not requested).
```

**Diff (expected vs actual):**
```diff
@@ -42 @@
   return <ClassComponent ref={ref} {...props} />;
 });
 const ForwardRefComponentWithCustomDisplayName = forwardRef((props, ref) => (
-  <ClassComponent ref={ref} {...props} />
+  <=ClassComponent ref={ref} {...props} />
 ));
 ForwardRefComponentWithCustomDisplayName.displayName = 'Custom';
 
```

### Duplicate Duplicate Line Flip 003 (SyntheticEvent.js) — 0/3

**All runs failed with same error:** Timeout waiting for agent_end

### Import Swap Named Imports 003 (StyleEditor.js) — 0/3

**All runs failed with same error:** File mismatch for StyleEditor.js

**Sample agent response (run 1):**
```
Assumptions: The repository is accessible at the stated path; the only issue to fix is the swapped named imports in `StyleEditor.js`; the file is already tracked and editing it alone satisfies the request.

Plan:
1. Read `StyleEditor.js` to locate the destructuring import that has swapped names.
2. Identify the correct order/names for the imports and confirm which ones are swapped.
3. Use `edit` to swap the imports back to their intended names with no other changes.
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
```

### Literal Off By One 001 (githubAPI.js) — 0/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | Timeout waiting for agent_end | 0 / 0 | 120.0s |
| 2 | ❌ | Timeout waiting for agent_end | 0 / 0 | 120.0s |
| 3 | ❌ | File mismatch for githubAPI.js | 4,208 / 704 | 8.9s |

**Sample agent response (run 1):**
```
Plan:
- Verify the boundary check near line 44 that gates returning a GitHub issue from `data.items`.
- Decide the correct comparison so the first matching issue is returned even when only one result is present.
- Use `edit` to change the comparison while leaving the rest of the file untouched.

Assumptions: the function should return the first issue whenever `data.items` has at least one entry; no additional validations (e.g., `items` existing) are required for this change.
```

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

### Operator Remove Negation 003 (ReactFlightUnbundledReferences.js) — 0/3

**All runs failed with same error:** Timeout waiting for agent_end

### Operator Swap Arithmetic 003 (hooks.js) — 0/3

**All runs failed with same error:** File mismatch for hooks.js

**Sample agent response (run 1):**
```
Summary:
- In `hooks.js`’s `useIsOverflowing`, changed the overflow predicate to use `<` so the hook reports overflow only when the children are strictly wider than the container.

Testing: Not run (not provided).

Assumption: overflow should be considered only when `totalChildWidth > container.clientWidth`, not when they are equal.
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

### Operator Swap Nullish 003 (backend.js) — 0/3

**All runs failed with same error:** File mismatch for backend.js

**Sample agent response (run 1):**
```
Plan:
1. Review `backend.js` to locate the nullish coalescing uses and identify the swapped operator bug.
2. Confirm the intended fallback logic and ensure no other instances need touching.
3. Apply the minimal change to restore the correct operator.

Assumptions:
- The nullish coalescing swap is isolated to a single expression in `backend.js`.
- No additional context beyond `backend.js` is required to understand the fix.

Before running a tool, I will state the intent sentence.
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
```

### Structural Delete Statement 003 (simulateBrowserEventDispatch.js) — 0/3

**All runs failed with same error:** File mismatch for simulateBrowserEventDispatch.js

**Sample agent response (run 1):**
```
Plan:
1. Confirmed that `simulateEventDispatch` should mimic `dispatchEvent` by returning the boolean result of `_dispatch`.
2. Added the missing `return await _dispatch...` so callers receive the event cancellation status while retaining the existing structure.

Assumptions:
- The asynchronous simulation should report the same boolean outcome as the native `dispatchEvent`.
- No other parts of the file require adjustment; only the return statement was missing.

Verification: Not run (not requ...
```

**Diff (expected vs actual):**
```diff
@@ -56 @@
 
   eventImpl.isTrusted = false;
 
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

### Structural Remove Early Return 003 (ReactFiberAsyncAction.js) — 0/3

**All runs failed with same error:** File mismatch for ReactFiberAsyncAction.js

**Sample agent response (run 1):**
```
- Reintroduced the guard in `releaseIsomorphicIndicator` so it exits immediately when there are no pending entangled roots before decrementing, preventing the counter from underflowing while still stopping the indicator exactly once.
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

### Structural Swap Adjacent Lines 003 (backend.js) — 0/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for backend.js | 23,363 / 9,656 | 64.0s |
| 2 | ❌ | Timeout waiting for agent_end | 0 / 0 | 120.0s |
| 3 | ❌ | File mismatch for backend.js | 1,301 / 65 | 3.1s |

**Sample agent response (run 1):**
```
Assumptions: the retry timer should be scheduled before emitting the bridge shutdown event so a restart is queued even if the shutdown handler throws or blocks.

Summary:
- In `connectToDevTools`’s `handleClose`, moved the `scheduleRetry()` call ahead of `bridge.emit('shutdown')` so closing the bridge no longer prevents the retry from being scheduled.

Tests: not run (not requested).
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
+
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

### Structural Swap If Else 001 (importFile.js) — 0/3

**All runs failed with same error:** File mismatch for importFile.js

**Sample agent response (run 1):**
```
- Negated the `InvalidProfileError` check inside the catch block so the `if` branch now handles unexpected errors (non-InvalidProfileError cases) and the `else` branch returns the `INVALID_PROFILE_ERROR` for genuine invalid profile errors.
- No tests were run; please run the relevant suite if needed.
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

### Structural Swap If Else 002 (ReactNativeFiberInspector.js) — 0/3

**All runs failed with same error:** File mismatch for ReactNativeFiberInspector.js

**Sample agent response (run 1):**
```
Assumptions:
- Repository uses current React Native architecture; `ReactNativeFiberInspector.js` exists.
- No other files need touching; changes limited to described function.
- Only behavior difference is dev vs production; change is safe to test manually if needed.

Plan:
1. Inspect `getInspectorDataForViewTag` to understand current condition and branches.
2. Swap the bodies of the `if (__DEV__)` and `else` blocks; negate the condition.
3. Confirm only the specified function is modified and...
```

**Diff (expected vs actual):**
```diff
@@ -146 @@
 
 function getInspectorDataForViewTag(viewTag: number): InspectorData {
   if (__DEV__) {
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
