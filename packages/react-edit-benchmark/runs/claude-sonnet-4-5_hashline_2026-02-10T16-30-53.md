# Edit Benchmark Report

## Configuration

| Setting | Value |
|---------|-------|
| Date | 2026-02-10T16:21:14.873Z |
| Model | p-anthropic/p-anthropic/claude-sonnet-4-5 |
| Thinking Level | default |
| Runs per task | 3 |
| Edit Variant | hashline |
| Edit Fuzzy | auto |
| Edit Fuzzy Threshold | auto |
| Require Edit Tool | no |
| No-Edit Baseline | no |

## Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 60 |
| Total Runs | 180 |
| Successful Runs | 131 |
| **Task Success Rate** | **72.8% (131/180)** |
| Verified Rate | 72.8% (131/180) |
| Edit Tool Usage Rate | 93.3% (168/180) |
| **Edit Success Rate** | **98.8%** |
| Patch Failure Rate | 1.2% (2/172) |
| Tasks All Passing | 38 |
| Tasks Flaky/Failing | 22 |

### Tool Calls

| Tool | Total | Avg/Run |
|------|-------|---------|
| Read | 194 | 1.1 |
| Edit | 172 | 1.0 |
| Write | 0 | 0.0 |
| **Tool Input Chars** | 39,693 | 221 |

### Tokens & Time

| Metric | Total | Avg/Run |
|--------|-------|---------|
| Input Tokens | 2,861,720 | 15,898 |
| Output Tokens | 178,916 | 994 |
| Total Tokens | 11,126,087 | 61,812 |
| Duration | 5243.6s | 29.1s |
| **Avg Indent Score** | — | **2.25** |

## Task Results

| Task | File | Success | Edit Hit | R/E/W | Tokens (In/Out) | Time | Indent |
|------|------|---------|----------|-------|-----------------|------|--------|
| Access Remove Optional Chain 001 | registerDevToolsEventLogger.js | 2/3 ⚠️ | 100.0% | 1/1/0 | 32,063/1,582 | 33.7s | 1.00 |
| Access Remove Optional Chain 002 | TimelineContext.js | 3/3 ✅ | 100.0% | 1/1/0 | 13,016/752 | 17.5s | 1.29 |
| Access Remove Optional Chain 003 | astUtils.js | 0/3 ❌ | 100.0% | 1/1/0 | 9,330/2,173 | 43.6s | 4.85 |
| Call Swap Call Args 001 | testHelpers.js | 3/3 ✅ | 100.0% | 1/1/0 | 34/804 | 18.4s | 1.33 |
| Call Swap Call Args 002 | FlamegraphChartBuilder.js | 2/3 ⚠️ | 100.0% | 1/1/0 | 7,722/738 | 16.0s | 3.79 |
| Call Swap Call Args 003 | SyntheticEvent.js | 3/3 ✅ | 100.0% | 1/1/0 | 8,535/1,486 | 30.7s | 3.76 |
| Duplicate Duplicate Line Flip 001 | index.js | 3/3 ✅ | 100.0% | 1/1/0 | 11,927/538 | 14.3s | 0.00 |
| Duplicate Duplicate Line Flip 002 | ActivityList.js | 3/3 ✅ | 100.0% | 1/1/0 | 35,027/511 | 16.0s | 3.61 |
| Duplicate Duplicate Line Flip 003 | SyntheticEvent.js | 3/3 ✅ | 100.0% | 1/1/0 | 34/1,628 | 30.8s | 1.02 |
| Identifier Identifier Multi Edit 001 | TabBar.js | 3/3 ✅ | 100.0% | 1/1/0 | 7,195/1,012 | 21.5s | 3.33 |
| Identifier Identifier Multi Edit 002 | EventPluginRegistry.js | 3/3 ✅ | 100.0% | 1/1/0 | 12,310/952 | 22.9s | 3.94 |
| Identifier Identifier Multi Edit 003 | ReactPerformanceTrackProperties.js | 3/3 ✅ | 100.0% | 1/1/0 | 19,357/991 | 21.1s | 9.95 |
| Import Swap Named Imports 001 | CommitFlamegraphListItem.js | 3/3 ✅ | 100.0% | 1/1/0 | 15,352/786 | 20.5s | 2.86 |
| Import Swap Named Imports 002 | ReactDOMTextarea.js | 3/3 ✅ | 100.0% | 1/1/0 | 8,343/1,669 | 35.1s | 2.41 |
| Import Swap Named Imports 003 | StyleEditor.js | 0/3 ❌ | 100.0% | 1/1/0 | 14,919/1,401 | 69.0s | 1.31 |
| Literal Flip Boolean 001 | testHelpers.js | 2/3 ⚠️ | 100.0% | 1/1/0 | 7,956/484 | 51.7s | 1.33 |
| Literal Flip Boolean 002 | ReactNoopFlightServer.js | 3/3 ✅ | 100.0% | 1/1/0 | 9,915/685 | 17.6s | 1.11 |
| Literal Flip Boolean 003 | ReactFlightDOMClientEdge.js | 3/3 ✅ | 100.0% | 1/1/0 | 10,312/1,560 | 29.5s | 3.58 |
| Literal Off By One 001 | githubAPI.js | 2/3 ⚠️ | 100.0% | 1/1/0 | 11,681/399 | 49.7s | 0.67 |
| Literal Off By One 002 | code-path.js | 3/3 ✅ | 100.0% | 1/1/0 | 10,619/1,098 | 24.4s | 3.50 |
| Literal Off By One 003 | InspectedElement.js | 2/3 ⚠️ | 100.0% | 1/1/0 | 13,549/722 | 19.0s | 3.60 |
| Operator Remove Negation 001 | ReactDOMClient.js | 1/3 ⚠️ | 100.0% | 1/1/0 | 4,061/1,829 | 78.4s | 1.08 |
| Operator Remove Negation 002 | NativeEventsView.js | 3/3 ✅ | 100.0% | 1/1/0 | 15,357/3,102 | 65.5s | 3.03 |
| Operator Remove Negation 003 | ReactFlightUnbundledReferences.js | 0/3 ❌ | 100.0% | 0/0/0 | 0/0 | 120.0s | 0.00 |
| Operator Swap Arithmetic 001 | fallbackEvalContext.js | 3/3 ✅ | 100.0% | 1/1/0 | 3,285/621 | 15.3s | 0.00 |
| Operator Swap Arithmetic 002 | CSSShorthandProperty.js | 3/3 ✅ | 100.0% | 1/1/0 | 12,218/552 | 14.3s | 2.86 |
| Operator Swap Arithmetic 003 | hooks.js | 0/3 ❌ | 100.0% | 1/1/0 | 21,655/2,105 | 86.5s | 2.25 |
| Operator Swap Comparison 001 | index.js | 3/3 ✅ | 100.0% | 1/1/0 | 11,102/529 | 13.7s | 0.00 |
| Operator Swap Comparison 002 | ReactFlightDOMServerBrowser.js | 3/3 ✅ | 100.0% | 1/1/0 | 12,757/1,064 | 22.9s | 1.57 |
| Operator Swap Comparison 003 | ReactFlightDOMServerNode.js | 3/3 ✅ | 100.0% | 1/1/0 | 46,638/766 | 19.7s | 1.95 |
| Operator Swap Equality 001 | readInputData.js | 3/3 ✅ | 100.0% | 1/1/0 | 16,399/658 | 16.6s | 0.00 |
| Operator Swap Equality 002 | editor.js | 3/3 ✅ | 100.0% | 1/1/0 | 12,004/389 | 13.6s | 0.00 |
| Operator Swap Equality 003 | hooks.js | 3/3 ✅ | 100.0% | 1/1/0 | 22,003/1,085 | 24.7s | 2.25 |
| Operator Swap Increment Decrement 001 | ReactFlightDOMClientNode.js | 3/3 ✅ | 100.0% | 1/1/0 | 9,369/559 | 13.4s | 1.52 |
| Operator Swap Increment Decrement 002 | ReactFlightDOMClientNode.js | 3/3 ✅ | 100.0% | 1/1/0 | 19,517/878 | 21.5s | 1.92 |
| Operator Swap Increment Decrement 003 | loadSourceAndMetadata.js | 3/3 ✅ | 100.0% | 1/1/0 | 48,072/595 | 16.3s | 3.72 |
| Operator Swap Logical 001 | profiling.js | 2/3 ⚠️ | 100.0% | 1/1/0 | 7,453/1,117 | 15.8s | 0.00 |
| Operator Swap Logical 002 | SourceMapMetadataConsumer.js | 3/3 ✅ | 100.0% | 1/1/0 | 11,615/1,696 | 33.6s | 3.14 |
| Operator Swap Logical 003 | DevToolsFiberComponentStack.js | 3/3 ✅ | 100.0% | 2/1/0 | 16,380/1,472 | 34.4s | 4.13 |
| Operator Swap Nullish 001 | getBatchRange.js | 3/3 ✅ | 100.0% | 1/1/0 | 13,238/532 | 12.8s | 1.33 |
| Operator Swap Nullish 002 | EnterLeaveEventPlugin.js | 1/3 ⚠️ | 100.0% | 1/1/0 | 18,580/873 | 22.4s | 1.56 |
| Operator Swap Nullish 003 | backend.js | 0/3 ❌ | 100.0% | 1/1/0 | 26,304/1,862 | 37.8s | 3.15 |
| Regex Swap Regex Quantifier 001 | githubAPI.js | 3/3 ✅ | 100.0% | 1/1/0 | 19,553/524 | 14.0s | 0.67 |
| Regex Swap Regex Quantifier 002 | ReactFlightStackConfigV8.js | 3/3 ✅ | 100.0% | 1/1/0 | 9,518/1,414 | 28.4s | 3.06 |
| Regex Swap Regex Quantifier 003 | utils.js | 3/3 ✅ | 100.0% | 1/1/0 | 49,681/1,320 | 28.1s | 2.00 |
| Structural Delete Statement 001 | UnsupportedVersionDialog.js | 0/3 ❌ | 100.0% | 1/1/0 | 4,331/908 | 22.1s | 6.00 |
| Structural Delete Statement 002 | getComponentNameFromFiber.js | 3/3 ✅ | 100.0% | 1/1/0 | 4,583/651 | 15.0s | 0.62 |
| Structural Delete Statement 003 | simulateBrowserEventDispatch.js | 1/3 ⚠️ | 100.0% | 3/1/0 | 16,375/1,635 | 43.0s | 4.46 |
| Structural Remove Early Return 001 | InspectedElementStateTree.js | 0/3 ❌ | 100.0% | 1/1/0 | 23,704/681 | 15.6s | 0.34 |
| Structural Remove Early Return 002 | useCommitFilteringAndNavigation.js | 2/3 ⚠️ | 75.0% | 1/1/0 | 11,136/865 | 20.5s | 2.49 |
| Structural Remove Early Return 003 | ReactFiberAsyncAction.js | 0/3 ❌ | 100.0% | 1/1/0 | 30,365/604 | 55.6s | 0.00 |
| Structural Swap Adjacent Lines 001 | ReactServerConsoleConfigPlain.js | 3/3 ✅ | 100.0% | 1/1/0 | 21,296/432 | 12.2s | 1.00 |
| Structural Swap Adjacent Lines 002 | ReactNoopFlightServer.js | 0/3 ❌ | 100.0% | 1/1/0 | 23,366/509 | 14.3s | 0.00 |
| Structural Swap Adjacent Lines 003 | backend.js | 0/3 ❌ | 100.0% | 1/1/0 | 12,613/1,115 | 65.1s | 3.15 |
| Structural Swap If Else 001 | importFile.js | 0/3 ❌ | 100.0% | 1/1/0 | 14,696/889 | 18.9s | 0.00 |
| Structural Swap If Else 002 | ReactNativeFiberInspector.js | 0/3 ❌ | 75.0% | 1/1/0 | 11,552/1,040 | 22.7s | 3.18 |
| Structural Swap If Else 003 | ReactDOMFizzStaticNode.js | 3/3 ✅ | 100.0% | 1/1/0 | 19,805/1,205 | 24.7s | 1.88 |
| Unicode Unicode Hyphen 001 | Rectangle.js | 3/3 ✅ | 100.0% | 1/1/0 | 16,261/426 | 13.3s | 3.00 |
| Unicode Unicode Hyphen 002 | UnsupportedBridgeProtocolDialog.js | 3/3 ✅ | 100.0% | 1/1/0 | 26,804/476 | 14.3s | 3.83 |
| Unicode Unicode Hyphen 003 | ReactTypes.js | 3/3 ✅ | 100.0% | 1/1/0 | 31,062/691 | 18.0s | 1.24 |

## Category Summary

| Category | Runs | Verified | Edit Used | Success | Min/Avg/Max Difficulty |
|----------|------|----------|-----------|---------|------------------------|
| access | 9 | 55.6% (5/9) | 100.0% (9/9) | 55.6% (5/9) | 7 / 8.7 / 10 |
| call | 9 | 88.9% (8/9) | 88.9% (8/9) | 88.9% (8/9) | 6 / 7.7 / 10 |
| duplicate | 9 | 100.0% (9/9) | 100.0% (9/9) | 100.0% (9/9) | 7 / 9.7 / 12 |
| identifier | 9 | 100.0% (9/9) | 100.0% (9/9) | 100.0% (9/9) | 6 / 9.3 / 14 |
| import | 9 | 66.7% (6/9) | 88.9% (8/9) | 66.7% (6/9) | 2 / 4.7 / 6 |
| literal | 18 | 83.3% (15/18) | 88.9% (16/18) | 83.3% (15/18) | 4 / 6.2 / 9 |
| operator | 63 | 77.8% (49/63) | 90.5% (57/63) | 77.8% (49/63) | 1 / 6.5 / 13 |
| regex | 9 | 100.0% (9/9) | 100.0% (9/9) | 100.0% (9/9) | 6 / 7.3 / 8 |
| structural | 36 | 33.3% (12/36) | 94.4% (34/36) | 33.3% (12/36) | 4 / 7.6 / 15 |
| unicode | 9 | 100.0% (9/9) | 100.0% (9/9) | 100.0% (9/9) | 1 / 3.0 / 6 |

## Mutation Summary

| Mutation | Category | Runs | Verified | Edit Used | Success |
|----------|----------|------|----------|-----------|---------|
| delete-statement | structural | 9 | 44.4% (4/9) | 100.0% (9/9) | 44.4% (4/9) |
| duplicate-line-flip | duplicate | 9 | 100.0% (9/9) | 100.0% (9/9) | 100.0% (9/9) |
| flip-boolean | literal | 9 | 88.9% (8/9) | 88.9% (8/9) | 88.9% (8/9) |
| identifier-multi-edit | identifier | 9 | 100.0% (9/9) | 100.0% (9/9) | 100.0% (9/9) |
| off-by-one | literal | 9 | 77.8% (7/9) | 88.9% (8/9) | 77.8% (7/9) |
| remove-early-return | structural | 9 | 22.2% (2/9) | 88.9% (8/9) | 22.2% (2/9) |
| remove-negation | operator | 9 | 44.4% (4/9) | 55.6% (5/9) | 44.4% (4/9) |
| remove-optional-chain | access | 9 | 55.6% (5/9) | 100.0% (9/9) | 55.6% (5/9) |
| swap-adjacent-lines | structural | 9 | 33.3% (3/9) | 88.9% (8/9) | 33.3% (3/9) |
| swap-arithmetic | operator | 9 | 66.7% (6/9) | 88.9% (8/9) | 66.7% (6/9) |
| swap-call-args | call | 9 | 88.9% (8/9) | 88.9% (8/9) | 88.9% (8/9) |
| swap-comparison | operator | 9 | 100.0% (9/9) | 100.0% (9/9) | 100.0% (9/9) |
| swap-equality | operator | 9 | 100.0% (9/9) | 100.0% (9/9) | 100.0% (9/9) |
| swap-if-else | structural | 9 | 33.3% (3/9) | 100.0% (9/9) | 33.3% (3/9) |
| swap-increment-decrement | operator | 9 | 100.0% (9/9) | 100.0% (9/9) | 100.0% (9/9) |
| swap-logical | operator | 9 | 88.9% (8/9) | 88.9% (8/9) | 88.9% (8/9) |
| swap-named-imports | import | 9 | 66.7% (6/9) | 88.9% (8/9) | 66.7% (6/9) |
| swap-nullish | operator | 9 | 44.4% (4/9) | 100.0% (9/9) | 44.4% (4/9) |
| swap-regex-quantifier | regex | 9 | 100.0% (9/9) | 100.0% (9/9) | 100.0% (9/9) |
| unicode-hyphen | unicode | 9 | 100.0% (9/9) | 100.0% (9/9) | 100.0% (9/9) |

## Difficulty Summary

| Difficulty Score | Runs | Verified | Edit Used | Success |
|------------------|------|----------|-----------|---------|
| 0-2 | 18 | 88.9% (16/18) | 94.4% (17/18) | 88.9% (16/18) |
| 3-5 | 36 | 69.4% (25/36) | 94.4% (34/36) | 69.4% (25/36) |
| 6-8 | 72 | 75.0% (54/72) | 94.4% (68/72) | 75.0% (54/72) |
| 9+ | 54 | 66.7% (36/54) | 90.7% (49/54) | 66.7% (36/54) |

## Edit Tool Errors

Failures where the edit tool returned an error or failed to apply the patch.

### Structural Remove Early Return 002 (useCommitFilteringAndNavigation.js)

#### Run 2

##### Attempt 1

- Path: /tmp/reach-benchmark-SrLkdS/batch-f1240384-f474-442e-b3a2-4ffed8cc0361/useCommitFilteringAndNavigation.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    61:f6|     (commitIndex: number | null, filtered: Array<number>): number | null => {
    62:1b|       if (commitIndex === null) return null;
>>> 63:f6|       for (let i = 0; i < filtered.length; i++) {
    64:53|       }
    65:57|       return null;
```

**Patch args**

```diff
{
  "path": "/tmp/reach-benchmark-SrLkdS/batch-f1240384-f474-442e-b3a2-4ffed8cc0361/useCommitFilteringAndNavigation.js",
  "edits": [
    {
      "src": "63:53..64:53",
      "dst": "      for (let i = 0; i < filtered.length; i++) {\n        if (filtered[i] === commitIndex) {\n          return i;\n        }"
    }
  ]
}
```

### Structural Swap If Else 002 (ReactNativeFiberInspector.js)

#### Run 2

##### Attempt 1

- Path: ReactNativeFiberInspector.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    158:57| 
    159:02| function getInspectorDataForViewTag(viewTag: number): InspectorData {
>>> 160:a7|   if (__DEV__) {
    161:9a|     throw new Error(
    162:47|       'getInspectorDataForViewTag() is not available in production',
```

**Patch args**

```diff
{
  "path": "ReactNativeFiberInspector.js",
  "edits": [
    {
      "src": "160:9a",
      "dst": "  if (!__DEV__) {"
    }
  ]
}
```

## Flaky Tasks (partial passing)

### Access Remove Optional Chain 001 (registerDevToolsEventLogger.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 32,688 / 1,144 | 21.6s |
| 2 | ✅ | — | 43,654 / 2,751 | 56.8s |
| 3 | ❌ | File mismatch for registerDevToolsEventLogger.js | 19,848 / 852 | 22.7s |

### Call Swap Call Args 002 (FlamegraphChartBuilder.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 23,122 / 613 | 19.4s |
| 2 | ❌ | File mismatch for FlamegraphChartBuilder.js | 11 / 802 | 12.1s |
| 3 | ✅ | — | 34 / 800 | 16.4s |

### Literal Flip Boolean 001 (testHelpers.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | Timeout waiting for agent_end | 0 / 0 | 120.0s |
| 2 | ✅ | — | 34 / 713 | 18.1s |
| 3 | ✅ | — | 23,834 / 738 | 17.0s |

### Literal Off By One 001 (githubAPI.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 20,461 / 604 | 14.8s |
| 2 | ✅ | — | 14,581 / 593 | 14.2s |
| 3 | ❌ | Timeout waiting for agent_end | 0 / 0 | 120.0s |

### Literal Off By One 003 (InspectedElement.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 21,305 / 922 | 20.2s |
| 2 | ✅ | — | 10,152 / 474 | 14.0s |
| 3 | ❌ | File mismatch for InspectedElement.js | 9,190 / 769 | 22.9s |

### Operator Remove Negation 001 (ReactDOMClient.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 12,114 / 449 | 10.2s |
| 2 | ❌ | File mismatch for ReactDOMClient.js | 70 / 5,039 | 104.9s |
| 3 | ❌ | Timeout waiting for agent_end | 0 / 0 | 120.0s |

### Operator Swap Logical 001 (profiling.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for profiling.js | 22,292 / 1,823 | 15.6s |
| 2 | ✅ | — | 34 / 687 | 14.2s |
| 3 | ✅ | — | 34 / 840 | 17.7s |

### Operator Swap Nullish 002 (EnterLeaveEventPlugin.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for EnterLeaveEventPlugin.js | 12,074 / 905 | 21.5s |
| 2 | ❌ | File mismatch for EnterLeaveEventPlugin.js | 20,149 / 1,273 | 34.4s |
| 3 | ✅ | — | 23,518 / 440 | 11.4s |

### Structural Delete Statement 003 (simulateBrowserEventDispatch.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for simulateBrowserEventDispatch.js | 9,196 / 1,301 | 37.3s |
| 2 | ❌ | File mismatch for simulateBrowserEventDispatch.js | 30,737 / 2,552 | 60.7s |
| 3 | ✅ | — | 9,192 / 1,051 | 31.0s |

### Structural Remove Early Return 002 (useCommitFilteringAndNavigation.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 15,255 / 383 | 16.5s |
| 2 | ❌ | File mismatch for useCommitFilteringAndNavigati... | 18,120 / 1,301 | 27.5s |
| 3 | ✅ | — | 34 / 910 | 17.4s |

## Failed Tasks (0% passing)

### Access Remove Optional Chain 003 (astUtils.js) — 0/3

**All runs failed with same error:** File mismatch for astUtils.js

**Sample agent response (run 1):**
```
Fixed. I added optional chaining back to line 95, changing `hook.node.init.property.type` to `hook.node.init.property?.type`. This prevents errors when `property` is undefined or null.
```

**Diff (expected vs actual):**
```diff
@@ -84 @@
 // Checks whether hook is the first member node of a state variable declaration node
 function filterMemberWithHookVariableName(hook: NodePath): boolean {
   return (
-    hook.node.init.property.type === AST_NODE_TYPES.NUMERIC_LITERAL &&
+    hook.node.init.property?.type === AST_NODE_TYPES.NUMERIC_LITERAL &&
     hook.node.init.property.value === 0
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

### Import Swap Named Imports 003 (StyleEditor.js) — 0/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | Timeout waiting for agent_end | 0 / 0 | 120.0s |
| 2 | ❌ | File mismatch for StyleEditor.js | 46 / 3,404 | 64.4s |
| 3 | ❌ | File mismatch for StyleEditor.js | 44,710 / 800 | 22.7s |

**Sample agent response (run 1):**
```
Done. Fixed the swapped named imports on line 11. The imports `useMemo` and `useState` were in the wrong order - they've been corrected to follow the conventional React hooks order with `useState` first and `useMemo` last.
```

**Diff (expected vs actual):**
```diff
@@ -8 @@
  */
 
 import * as React from 'react';
-import { useContext, useMemo, useRef, useState } from 'react';
+import { useState, useContext, useRef, useMemo } from 'react';
 import { copy } from 'clipboard-js';
 import { BridgeContext, StoreContext } from 'react-devtools-shared/src/devtools/views/context';
 import Button from '../../Button';
```

### Operator Remove Negation 003 (ReactFlightUnbundledReferences.js) — 0/3

**All runs failed with same error:** Timeout waiting for agent_end

### Operator Swap Arithmetic 003 (hooks.js) — 0/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | Timeout waiting for agent_end | 0 / 0 | 120.0s |
| 2 | ❌ | File mismatch for hooks.js | 33,200 / 1,715 | 39.2s |
| 3 | ❌ | File mismatch for hooks.js | 31,766 / 4,601 | 100.1s |

**Sample agent response (run 1):**
```
Done. I've fixed the swapped arithmetic operator bug in `hooks.js` on line 129. The comparison was using `<=` (less than or equal) when it should use `<` (less than). The `useIsOverflowing` function should only return `true` when the container's width is strictly less than the total child width, indicating that content is overflowing. When they're equal, there's no overflow.
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
Fixed. The bug was on line 414 where `||` was used instead of `??`. Changed:
```javascript
resolveRNStyle || hook.resolveRNStyle;
```
to:
```javascript
resolveRNStyle ?? hook.resolveRNStyle;
```

This makes it consistent with line 218 which correctly uses the nullish coalescing operator for the same pattern.
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

### Structural Delete Statement 001 (UnsupportedVersionDialog.js) — 0/3

**All runs failed with same error:** File mismatch for UnsupportedVersionDialog.js

**Sample agent response (run 1):**
```
Fixed. The missing statement was `const store = useContext(StoreContext);` which I've restored after line 21. This provides the `store` variable that's referenced later in the code on lines 36, 39, and 41.
```

**Diff (expected vs actual):**
```diff
@@ -19 @@
 
 export default function UnsupportedVersionDialog(_: {}): null {
   const { dispatch } = useContext(ModalDialogContext);
+  const { dispatch } = useContext(ModalDialogContext);
   const store = useContext(StoreContext);
   const [state, setState] = useState<DAILOG_STATE>('dialog-not-shown');
 
```

### Structural Remove Early Return 001 (InspectedElementStateTree.js) — 0/3

**All runs failed with same error:** File mismatch for InspectedElementStateTree.js

**Sample agent response (run 1):**
```
Fixed. I added the missing guard clause after line 38 to check if `state` is null or undefined and return early. This prevents the code from attempting to call `Object.entries(state)` on a null/undefined value, which would cause an error. The guard clause follows the exact 3-line pattern: if condition, return statement, closing brace.
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

### Structural Remove Early Return 003 (ReactFiberAsyncAction.js) — 0/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for ReactFiberAsyncAction.js | 36,722 / 945 | 21.6s |
| 2 | ❌ | Timeout waiting for agent_end | 0 / 0 | 120.0s |
| 3 | ❌ | File mismatch for ReactFiberAsyncAction.js | 54,374 / 867 | 25.2s |

**Sample agent response (run 1):**
```
Fixed. The bug was in the `retainIsomorphicIndicator()` function (line 253) which was missing a guard clause to check if the `enableDefaultTransitionIndicator` feature flag is enabled. 

I added the guard clause:
```javascript
if (!enableDefaultTransitionIndicator) {
  return noop;
}
```

This makes it consistent with the other indicator-related functions (`startIsomorphicDefaultIndicatorIfNeeded()` and `stopIsomorphicDefaultIndicator()`) which also check this feature flag before proceeding. ...
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

### Structural Swap Adjacent Lines 002 (ReactNoopFlightServer.js) — 0/3

**All runs failed with same error:** File mismatch for ReactNoopFlightServer.js

**Sample agent response (run 1):**
```
Fixed. I've swapped lines 46 and 47 back to their correct order. The `return textEncoder.encode(content);` statement now properly closes the `stringToChunk` function, and the `flushBuffered` function definition follows it as a separate method.
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
   },
   stringToChunk(content: string): Uint8Array {
     return textEncoder.encode(content);
   },
+  flushBuffered(destination: Destination): void {}
+  },
   stringToPrecomputedChunk(content: string): Uint8Array {
     return textEncoder.encode(content);
   },
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

### Structural Swap Adjacent Lines 003 (backend.js) — 0/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for backend.js | 9,189 / 1,003 | 23.7s |
| 2 | ❌ | Timeout waiting for agent_end | 0 / 0 | 120.0s |
| 3 | ❌ | File mismatch for backend.js | 28,649 / 2,341 | 51.7s |

**Sample agent response (run 1):**
```
The bug has been fixed. I swapped lines 192-195 so that `onReloadAndProfileFlagsReset()` is called BEFORE creating the `Agent` instance. This ensures profiling flags are reset before the agent is initialized with those flags, which is the correct order of operations.
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

### Structural Swap If Else 001 (importFile.js) — 0/3

**All runs failed with same error:** File mismatch for importFile.js

**Sample agent response (run 1):**
```
Fixed. The condition is now negated (`!(error instanceof InvalidProfileError)`) and the branch bodies are swapped:
- When error is NOT an `InvalidProfileError`: returns `UNEXPECTED_ERROR`
- When error IS an `InvalidProfileError`: returns `INVALID_PROFILE_ERROR`
```

**Diff (expected vs actual):**
```diff
@@ -9 @@
 
 import 'regenerator-runtime/runtime';
 
-import type { TimelineEvent } from '@elg/speedscope';
-import type { ImportWorkerOutputData } from './index';
+import type {TimelineEvent} from '@elg/speedscope';
+import type {ImportWorkerOutputData} from './index';
 
 import preprocessData from './preprocessData';
 
 import preprocessData from './preprocessData';
-import { readInputData } from './readInputData';
+import {readInputData} from './readInputData';
 import InvalidProfileError from './InvalidProfileError';
 
 export async function importFile(file: File): Promise<ImportWorkerOutputData> {
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
         error,
       };
     }
+    }
   }
 }
```

### Structural Swap If Else 002 (ReactNativeFiberInspector.js) — 0/3

**All runs failed with same error:** File mismatch for ReactNativeFiberInspector.js

**Sample agent response (run 1):**
```
Fixed. The condition in `getInspectorDataForViewTag` has been negated from `if (__DEV__)` to `if (!__DEV__)`, which correctly places:
- The error throw in production (!__DEV__)
- The actual functionality in development (__DEV__)
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
