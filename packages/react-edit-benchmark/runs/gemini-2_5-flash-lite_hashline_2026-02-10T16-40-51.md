# Edit Benchmark Report

## Configuration

| Setting | Value |
|---------|-------|
| Date | 2026-02-10T16:34:49.111Z |
| Model | openrouter/openrouter/google/gemini-2.5-flash-lite |
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
| Successful Runs | 66 |
| **Task Success Rate** | **36.7% (66/180)** |
| Verified Rate | 36.7% (66/180) |
| Edit Tool Usage Rate | 92.2% (166/180) |
| **Edit Success Rate** | **66.8%** |
| Patch Failure Rate | 33.2% (79/238) |
| Tasks All Passing | 7 |
| Tasks Flaky/Failing | 53 |

### Tool Calls

| Tool | Total | Avg/Run |
|------|-------|---------|
| Read | 240 | 1.3 |
| Edit | 238 | 1.3 |
| Write | 0 | 0.0 |
| **Tool Input Chars** | 42,394 | 236 |

### Tokens & Time

| Metric | Total | Avg/Run |
|--------|-------|---------|
| Input Tokens | 5,112,690 | 28,404 |
| Output Tokens | 1,060,757 | 5,893 |
| Total Tokens | 18,674,646 | 103,748 |
| Duration | 4084.8s | 22.7s |
| **Avg Indent Score** | — | **2.26** |

## Task Results

| Task | File | Success | Edit Hit | R/E/W | Tokens (In/Out) | Time | Indent |
|------|------|---------|----------|-------|-----------------|------|--------|
| Access Remove Optional Chain 001 | registerDevToolsEventLogger.js | 1/3 ⚠️ | 100.0% | 1/1/0 | 13,094/5,849 | 19.1s | 1.00 |
| Access Remove Optional Chain 002 | TimelineContext.js | 2/3 ⚠️ | 75.0% | 1/1/0 | 26,180/1,640 | 9.5s | 1.34 |
| Access Remove Optional Chain 003 | astUtils.js | 0/3 ❌ | 60.0% | 2/2/0 | 50,760/12,267 | 39.8s | 4.89 |
| Call Swap Call Args 001 | testHelpers.js | 2/3 ⚠️ | 75.0% | 1/1/0 | 27,011/2,038 | 10.3s | 0.89 |
| Call Swap Call Args 002 | FlamegraphChartBuilder.js | 0/3 ❌ | 60.0% | 2/2/0 | 31,873/10,186 | 46.9s | 3.43 |
| Call Swap Call Args 003 | SyntheticEvent.js | 0/3 ❌ | 100.0% | 1/0/0 | 24,333/467 | 5.8s | 3.68 |
| Duplicate Duplicate Line Flip 001 | index.js | 3/3 ✅ | 83.3% | 2/2/0 | 22,654/4,670 | 17.5s | 0.67 |
| Duplicate Duplicate Line Flip 002 | ActivityList.js | 3/3 ✅ | 100.0% | 1/1/0 | 23,207/6,344 | 24.8s | 3.46 |
| Duplicate Duplicate Line Flip 003 | SyntheticEvent.js | 0/3 ❌ | 33.3% | 1/1/0 | 24,983/13,550 | 40.1s | 1.02 |
| Identifier Identifier Multi Edit 001 | TabBar.js | 2/3 ⚠️ | 71.4% | 2/2/0 | 35,920/3,444 | 16.8s | 2.70 |
| Identifier Identifier Multi Edit 002 | EventPluginRegistry.js | 1/3 ⚠️ | 75.0% | 2/1/0 | 19,019/959 | 9.3s | 3.52 |
| Identifier Identifier Multi Edit 003 | ReactPerformanceTrackProperties.js | 0/3 ❌ | 60.0% | 2/2/0 | 49,085/3,721 | 18.2s | 9.94 |
| Import Swap Named Imports 001 | CommitFlamegraphListItem.js | 1/3 ⚠️ | 75.0% | 1/1/0 | 44,845/1,846 | 10.9s | 2.86 |
| Import Swap Named Imports 002 | ReactDOMTextarea.js | 1/3 ⚠️ | 100.0% | 1/1/0 | 16,796/2,229 | 10.8s | 2.41 |
| Import Swap Named Imports 003 | StyleEditor.js | 1/3 ⚠️ | 50.0% | 2/1/0 | 34,848/2,992 | 15.9s | 1.31 |
| Literal Flip Boolean 001 | testHelpers.js | 3/3 ✅ | 75.0% | 1/1/0 | 10,257/855 | 7.2s | 1.33 |
| Literal Flip Boolean 002 | ReactNoopFlightServer.js | 2/3 ⚠️ | 100.0% | 1/1/0 | 11,319/2,367 | 13.7s | 1.30 |
| Literal Flip Boolean 003 | ReactFlightDOMClientEdge.js | 2/3 ⚠️ | 60.0% | 2/2/0 | 31,159/1,898 | 13.2s | 3.48 |
| Literal Off By One 001 | githubAPI.js | 2/3 ⚠️ | 100.0% | 1/1/0 | 15,028/859 | 7.6s | 0.56 |
| Literal Off By One 002 | code-path.js | 1/3 ⚠️ | 60.0% | 2/2/0 | 39,613/20,498 | 54.7s | 4.10 |
| Literal Off By One 003 | InspectedElement.js | 2/3 ⚠️ | 66.7% | 1/1/0 | 20,749/8,138 | 22.2s | 3.58 |
| Operator Remove Negation 001 | ReactDOMClient.js | 0/3 ❌ | 50.0% | 1/1/0 | 27,386/8,848 | 44.0s | 1.12 |
| Operator Remove Negation 002 | NativeEventsView.js | 0/3 ❌ | 50.0% | 1/1/0 | 19,283/15,353 | 43.1s | 3.03 |
| Operator Remove Negation 003 | ReactFlightUnbundledReferences.js | 0/3 ❌ | 50.0% | 2/2/0 | 30,132/13,159 | 53.8s | 2.08 |
| Operator Swap Arithmetic 001 | fallbackEvalContext.js | 3/3 ✅ | 100.0% | 1/1/0 | 16,203/6,671 | 23.6s | 0.13 |
| Operator Swap Arithmetic 002 | CSSShorthandProperty.js | 0/3 ❌ | 50.0% | 1/1/0 | 18,453/13,466 | 38.6s | 2.88 |
| Operator Swap Arithmetic 003 | hooks.js | 0/3 ❌ | 50.0% | 2/2/0 | 69,132/15,693 | 54.5s | 2.22 |
| Operator Swap Comparison 001 | index.js | 3/3 ✅ | 50.0% | 2/2/0 | 53,312/1,981 | 12.6s | 10.00 |
| Operator Swap Comparison 002 | ReactFlightDOMServerBrowser.js | 1/3 ⚠️ | 75.0% | 1/1/0 | 15,360/4,871 | 15.0s | 0.52 |
| Operator Swap Comparison 003 | ReactFlightDOMServerNode.js | 1/3 ⚠️ | 75.0% | 1/1/0 | 69,649/9,578 | 38.6s | 1.31 |
| Operator Swap Equality 001 | readInputData.js | 3/3 ✅ | 100.0% | 1/1/0 | 15,006/2,342 | 11.1s | 6.00 |
| Operator Swap Equality 002 | editor.js | 2/3 ⚠️ | 60.0% | 2/2/0 | 21,210/2,658 | 15.6s | 0.89 |
| Operator Swap Equality 003 | hooks.js | 0/3 ❌ | 50.0% | 1/1/0 | 38,619/3,684 | 16.8s | 2.25 |
| Operator Swap Increment Decrement 001 | ReactFlightDOMClientNode.js | 2/3 ⚠️ | 100.0% | 1/1/0 | 23,812/1,747 | 9.5s | 1.13 |
| Operator Swap Increment Decrement 002 | ReactFlightDOMClientNode.js | 1/3 ⚠️ | 50.0% | 2/1/0 | 50,266/3,315 | 14.6s | 1.33 |
| Operator Swap Increment Decrement 003 | loadSourceAndMetadata.js | 1/3 ⚠️ | 20.0% | 1/2/0 | 41,961/4,360 | 16.1s | 3.69 |
| Operator Swap Logical 001 | profiling.js | 1/3 ⚠️ | 100.0% | 1/1/0 | 17,306/1,227 | 7.2s | 0.00 |
| Operator Swap Logical 002 | SourceMapMetadataConsumer.js | 1/3 ⚠️ | 100.0% | 1/1/0 | 17,489/8,389 | 28.8s | 2.14 |
| Operator Swap Logical 003 | DevToolsFiberComponentStack.js | 0/3 ❌ | 66.7% | 2/2/0 | 40,472/6,011 | 29.5s | 2.75 |
| Operator Swap Nullish 001 | getBatchRange.js | 3/3 ✅ | 75.0% | 1/1/0 | 32,729/3,156 | 13.9s | 1.43 |
| Operator Swap Nullish 002 | EnterLeaveEventPlugin.js | 0/3 ❌ | 100.0% | 1/1/0 | 6,814/2,143 | 8.7s | 1.69 |
| Operator Swap Nullish 003 | backend.js | 1/3 ⚠️ | 75.0% | 1/1/0 | 30,885/5,588 | 17.9s | 1.07 |
| Regex Swap Regex Quantifier 001 | githubAPI.js | 2/3 ⚠️ | 75.0% | 1/1/0 | 19,738/1,837 | 9.0s | 0.58 |
| Regex Swap Regex Quantifier 002 | ReactFlightStackConfigV8.js | 1/3 ⚠️ | 75.0% | 2/1/0 | 38,113/4,940 | 25.1s | 0.99 |
| Regex Swap Regex Quantifier 003 | utils.js | 1/3 ⚠️ | 50.0% | 2/2/0 | 49,079/10,121 | 43.6s | 1.37 |
| Structural Delete Statement 001 | UnsupportedVersionDialog.js | 2/3 ⚠️ | 60.0% | 2/2/0 | 9,607/4,932 | 24.0s | 4.00 |
| Structural Delete Statement 002 | getComponentNameFromFiber.js | 0/3 ❌ | 75.0% | 1/1/0 | 10,806/2,662 | 12.6s | 0.14 |
| Structural Delete Statement 003 | simulateBrowserEventDispatch.js | 0/3 ❌ | 75.0% | 1/1/0 | 37,211/6,328 | 21.7s | 4.42 |
| Structural Remove Early Return 001 | InspectedElementStateTree.js | 1/3 ⚠️ | 100.0% | 1/1/0 | 10,348/2,508 | 12.9s | 0.36 |
| Structural Remove Early Return 002 | useCommitFilteringAndNavigation.js | 0/3 ❌ | 100.0% | 1/1/0 | 23,295/15,183 | 36.3s | 3.80 |
| Structural Remove Early Return 003 | ReactFiberAsyncAction.js | 0/3 ❌ | 100.0% | 1/1/0 | 22,518/5,801 | 27.2s | 1.51 |
| Structural Swap Adjacent Lines 001 | ReactServerConsoleConfigPlain.js | 2/3 ⚠️ | 100.0% | 1/1/0 | 25,078/5,779 | 22.7s | 0.87 |
| Structural Swap Adjacent Lines 002 | ReactNoopFlightServer.js | 0/3 ❌ | 66.7% | 1/1/0 | 13,815/4,826 | 16.8s | 0.00 |
| Structural Swap Adjacent Lines 003 | backend.js | 0/3 ❌ | 40.0% | 2/2/0 | 63,274/17,775 | 53.4s | 1.05 |
| Structural Swap If Else 001 | importFile.js | 0/3 ❌ | 100.0% | 1/1/0 | 27,071/13,358 | 32.0s | 0.17 |
| Structural Swap If Else 002 | ReactNativeFiberInspector.js | 0/3 ❌ | 100.0% | 1/1/0 | 14,144/6,221 | 22.5s | 2.11 |
| Structural Swap If Else 003 | ReactDOMFizzStaticNode.js | 1/3 ⚠️ | 50.0% | 1/1/0 | 21,207/6,116 | 39.1s | 1.90 |
| Unicode Unicode Hyphen 001 | Rectangle.js | 2/3 ⚠️ | 100.0% | 1/1/0 | 15,463/504 | 5.9s | 2.80 |
| Unicode Unicode Hyphen 002 | UnsupportedBridgeProtocolDialog.js | 1/3 ⚠️ | 20.0% | 1/2/0 | 23,455/1,232 | 11.1s | 3.83 |
| Unicode Unicode Hyphen 003 | ReactTypes.js | 1/3 ⚠️ | 18.2% | 3/4/0 | 51,798/2,408 | 18.2s | 0.84 |

## Category Summary

| Category | Runs | Verified | Edit Used | Success | Min/Avg/Max Difficulty |
|----------|------|----------|-----------|---------|------------------------|
| access | 9 | 33.3% (3/9) | 88.9% (8/9) | 33.3% (3/9) | 7 / 8.7 / 10 |
| call | 9 | 22.2% (2/9) | 77.8% (7/9) | 22.2% (2/9) | 6 / 7.7 / 10 |
| duplicate | 9 | 66.7% (6/9) | 100.0% (9/9) | 66.7% (6/9) | 7 / 9.7 / 12 |
| identifier | 9 | 33.3% (3/9) | 100.0% (9/9) | 33.3% (3/9) | 6 / 9.3 / 14 |
| import | 9 | 33.3% (3/9) | 100.0% (9/9) | 33.3% (3/9) | 2 / 4.7 / 6 |
| literal | 18 | 66.7% (12/18) | 94.4% (17/18) | 66.7% (12/18) | 4 / 6.2 / 9 |
| operator | 63 | 36.5% (23/63) | 88.9% (56/63) | 36.5% (23/63) | 1 / 6.5 / 13 |
| regex | 9 | 44.4% (4/9) | 100.0% (9/9) | 44.4% (4/9) | 6 / 7.3 / 8 |
| structural | 36 | 16.7% (6/36) | 91.7% (33/36) | 16.7% (6/36) | 4 / 7.6 / 15 |
| unicode | 9 | 44.4% (4/9) | 100.0% (9/9) | 44.4% (4/9) | 1 / 3.0 / 6 |

## Mutation Summary

| Mutation | Category | Runs | Verified | Edit Used | Success |
|----------|----------|------|----------|-----------|---------|
| delete-statement | structural | 9 | 22.2% (2/9) | 100.0% (9/9) | 22.2% (2/9) |
| duplicate-line-flip | duplicate | 9 | 66.7% (6/9) | 100.0% (9/9) | 66.7% (6/9) |
| flip-boolean | literal | 9 | 77.8% (7/9) | 100.0% (9/9) | 77.8% (7/9) |
| identifier-multi-edit | identifier | 9 | 33.3% (3/9) | 100.0% (9/9) | 33.3% (3/9) |
| off-by-one | literal | 9 | 55.6% (5/9) | 88.9% (8/9) | 55.6% (5/9) |
| remove-early-return | structural | 9 | 11.1% (1/9) | 88.9% (8/9) | 11.1% (1/9) |
| remove-negation | operator | 9 | 0.0% (0/9) | 77.8% (7/9) | 0.0% (0/9) |
| remove-optional-chain | access | 9 | 33.3% (3/9) | 88.9% (8/9) | 33.3% (3/9) |
| swap-adjacent-lines | structural | 9 | 22.2% (2/9) | 88.9% (8/9) | 22.2% (2/9) |
| swap-arithmetic | operator | 9 | 33.3% (3/9) | 77.8% (7/9) | 33.3% (3/9) |
| swap-call-args | call | 9 | 22.2% (2/9) | 77.8% (7/9) | 22.2% (2/9) |
| swap-comparison | operator | 9 | 55.6% (5/9) | 100.0% (9/9) | 55.6% (5/9) |
| swap-equality | operator | 9 | 55.6% (5/9) | 100.0% (9/9) | 55.6% (5/9) |
| swap-if-else | structural | 9 | 11.1% (1/9) | 88.9% (8/9) | 11.1% (1/9) |
| swap-increment-decrement | operator | 9 | 44.4% (4/9) | 88.9% (8/9) | 44.4% (4/9) |
| swap-logical | operator | 9 | 22.2% (2/9) | 88.9% (8/9) | 22.2% (2/9) |
| swap-named-imports | import | 9 | 33.3% (3/9) | 100.0% (9/9) | 33.3% (3/9) |
| swap-nullish | operator | 9 | 44.4% (4/9) | 88.9% (8/9) | 44.4% (4/9) |
| swap-regex-quantifier | regex | 9 | 44.4% (4/9) | 100.0% (9/9) | 44.4% (4/9) |
| unicode-hyphen | unicode | 9 | 44.4% (4/9) | 100.0% (9/9) | 44.4% (4/9) |

## Difficulty Summary

| Difficulty Score | Runs | Verified | Edit Used | Success |
|------------------|------|----------|-----------|---------|
| 0-2 | 18 | 55.6% (10/18) | 100.0% (18/18) | 55.6% (10/18) |
| 3-5 | 36 | 33.3% (12/36) | 83.3% (30/36) | 33.3% (12/36) |
| 6-8 | 72 | 41.7% (30/72) | 95.8% (69/72) | 41.7% (30/72) |
| 9+ | 54 | 25.9% (14/54) | 90.7% (49/54) | 25.9% (14/54) |

## Edit Tool Errors

Failures where the edit tool returned an error or failed to apply the patch.

### Access Remove Optional Chain 002 (TimelineContext.js)

#### Run 1

##### Attempt 1

- Path: TimelineContext.js
- Operation: —

**Tool error**

```
Invalid line reference "store.profilerStore.profilingData.timelineData || null;". Expected format "LINE:HASH" (e.g. "5:a3f2").
```

**Patch args**

```diff
{
  "path": "TimelineContext.js",
  "edits": [
    {
      "src": "store.profilerStore.profilingData.timelineData || null;",
      "dst": "store.profilerStore.profilingData?.timelineData || null;"
    }
  ]
}
```

### Access Remove Optional Chain 003 (astUtils.js)

#### Run 1

##### Attempt 1

- Path: astUtils.js
- Operation: —

**Tool error**

```
Invalid line reference "hook.node.id.elements[0].name". Expected format "LINE:HASH" (e.g. "5:a3f2").
```

**Patch args**

```diff
{
  "path": "astUtils.js",
  "edits": [
    {
      "dst": "hook.node.id.elements?.[0]?.name",
      "src": "hook.node.id.elements[0].name"
    }
  ]
}
```

#### Run 3

##### Attempt 1

- Path: astUtils.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    438:a6|             // the Hook call is being used to declare other variables.
    439:2f|             let variableDeclaratorPath = referencePath;
>>> 440:83|             while (
    441:2a|               variableDeclaratorPath != null &&
    442:7d|               variableDeclaratorPath.node.type !==
```

**Patch args**

```diff
{
  "path": "astUtils.js",
  "edits": [
    {
      "dst": "variableDeclaratorPath?.node.type !==",
      "src": "440:7d"
    }
  ]
}
```

### Call Swap Call Args 001 (testHelpers.js)

#### Run 3

##### Attempt 1

- Path: testHelpers.js
- Operation: —

**Tool error**

```
src must not contain commas: "14:23export function describeWithPointerEvent(describeFn, message)"
```

**Patch args**

```diff
{
  "path": "testHelpers.js",
  "edits": [
    {
      "src": "14:23export function describeWithPointerEvent(describeFn, message)",
      "dst": "export function describeWithPointerEvent(message, describeFn)"
    }
  ]
}
```

### Call Swap Call Args 002 (FlamegraphChartBuilder.js)

#### Run 2

##### Attempt 1

- Path: FlamegraphChartBuilder.js
- Operation: —

**Tool error**

```
src must not contain commas: "childChartNode: $FlowFixMe = walkTree(childID, rightOffset, currentDepth + 1);"
```

**Patch args**

```diff
{
  "path": "FlamegraphChartBuilder.js",
  "edits": [
    {
      "src": "childChartNode: $FlowFixMe = walkTree(childID, rightOffset, currentDepth + 1);",
      "dst": "childChartNode: $FlowFixMe = walkTree(childID, currentDepth + 1, rightOffset);"
    }
  ]
}
```

#### Run 3

##### Attempt 1

- Path: FlamegraphChartBuilder.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    130:6b|       const childChartNode: $FlowFixMe = walkTree(
    131:4f|         childID,
>>> 132:0e|         rightOffset,
    133:b2|         currentDepth + 1,
    134:fc|       );
```

**Patch args**

```diff
{
  "path": "FlamegraphChartBuilder.js",
  "edits": [
    {
      "src": "132:b2",
      "dst": "currentDepth + 1,"
    },
    {
      "dst": "rightOffset,",
      "src": "133:b2"
    }
  ]
}
```

### Duplicate Duplicate Line Flip 001 (index.js)

#### Run 2

##### Attempt 1

- Path: SyntheticEvent.js
- Operation: —

**Tool error**

```
src must not contain commas: "314:b4| nativeInst,"
```

**Patch args**

```diff
{
  "path": "SyntheticEvent.js",
  "edits": [
    {
      "dst": "      nativeEvent,",
      "src": "314:b4| nativeInst,"
    },
    {
      "dst": "      nativeEvent,",
      "src": "322:2d| nativeInst,"
    }
  ]
}
```

### Duplicate Duplicate Line Flip 003 (SyntheticEvent.js)

#### Run 1

##### Attempt 1

- Path: SyntheticEvent.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    581:c0|           'wheelDelta' in event
    582:b4|           ? // $FlowFixMe[unsafe-arithmetic] assuming this is a number
>>> 583:c6|             -event.wheelDelta
    584:ff|           : 0;
    585:95|   },
```

**Patch args**

```diff
{
  "path": "SyntheticEvent.js",
  "edits": [
    {
      "src": "583:ff",
      "dst": "-event.wheelDeltaY"
    }
  ]
}
```

#### Run 2

##### Attempt 1

- Path: SyntheticEvent.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    494:b3|     if (event.type === 'keydown' || event.type === 'keyup') {
    495:5c|       return event.keyCode;
>>> 496:ef|     }
    497:6d|     return 0;
    498:5f|   },
```

**Patch args**

```diff
{
  "path": "SyntheticEvent.js",
  "edits": [
    {
      "src": "496:93",
      "dst": ""
    }
  ]
}
```

### Identifier Identifier Multi Edit 001 (TabBar.js)

#### Run 3

##### Attempt 1

- Path: TabBar.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    110:e9|               type="radio"
    111:0a|               className={styles.Input}
>>> 112:21|               checked={currentTab === di}
    113:1a|               disabled={disabled}
    114:c0|               name={groupName}
```

**Patch args**

```diff
{
  "path": "TabBar.js",
  "edits": [
    {
      "dst": "  id: string,",
      "src": "21:78"
    },
    {
      "dst": "        const {icon, id, label, title} = tab;",
      "src": "96:6f"
    },
    {
      "dst": "        checked={currentTab === id}",
      "src": "112:1a"
    }
  ]
}
```

##### Attempt 2

- Path: TabBar.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    110:e9|               type="radio"
    111:0a|               className={styles.Input}
>>> 112:21|               checked={currentTab === di}
    113:1a|               disabled={disabled}
    114:c0|               name={groupName}
```

**Patch args**

```diff
{
  "edits": [
    {
      "dst": "        checked={currentTab === id}",
      "src": "112:1a"
    },
    {
      "src": "96:6f",
      "dst": "        const {icon, id, label, title} = tab;"
    },
    {
      "dst": "  id: string,",
      "src": "21:78"
    }
  ],
  "path": "TabBar.js"
}
```

### Identifier Identifier Multi Edit 002 (EventPluginRegistry.js)

#### Run 2

##### Attempt 1

- Path: EventPluginRegistry.js
- Operation: —

**Tool error**

```
2 lines have changed since last read. Re-read the file.

    71:fe|           publishedEvents[eventName],
    72:38|           pluginModule,
>>> 73:92|           veentName,
    74:34|         )
    75:01|       ) {
    ...
    93:77|   dispatchConfig: DispatchConfig,
    94:31|   pluginModule: LegacyPluginModule<AnyNativeEvent>,
>>> 95:74|   veentName: string,
    96:a2| ): boolean {
    97:6d|   if (eventNameDispatchConfigs.hasOwnProperty(veentName)) {
```

**Patch args**

```diff
{
  "path": "EventPluginRegistry.js",
  "edits": [
    {
      "dst": "eventName,",
      "src": "73:38"
    },
    {
      "dst": "eventName: string,",
      "src": "95:a2"
    }
  ]
}
```

### Identifier Identifier Multi Edit 003 (ReactPerformanceTrackProperties.js)

#### Run 1

##### Attempt 1

- Path: ReactPerformanceTrackProperties.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    425:fc|         // Otherwise, emit the change in property and the values.
    426:1c|         addValueToProperties(key, prevValue, properties, indent, REMOVED);
>>> 427:2a|         addValueToProperties(key, nextValue, properties, indent, ADDED);
    428:94|         isDeeplyEqual = false;
    429:fc|       }
```

**Patch args**

```diff
{
  "edits": [
    {
      "dst": "properties.push([REMOVED + line, '\\u2026'], [DADED + line, '\\u2026']);",
      "src": "336:23"
    },
    {
      "dst": "addValueToProperties(key, nextValue, properties, indent, DADED);",
      "src": "427:94"
    }
  ],
  "path": "ReactPerformanceTrackProperties.js"
}
```

#### Run 2

##### Attempt 1

- Path: ReactPerformanceTrackProperties.js
- Operation: —

**Tool error**

```
src must not contain commas: "336:23| Added + line, '\u2026']"
```

**Patch args**

```diff
{
  "edits": [
    {
      "dst": "DADED",
      "src": "336:23| Added + line, '\\u2026']"
    }
  ],
  "path": "ReactPerformanceTrackProperties.js"
}
```

### Import Swap Named Imports 001 (CommitFlamegraphListItem.js)

#### Run 3

##### Attempt 1

- Path: CommitFlamegraphListItem.js
- Operation: —

**Tool error**

```
src must not contain commas: "11:d2| import {Fragment, memo, useContext, useCallback} from 'react';"
```

**Patch args**

```diff
{
  "path": "CommitFlamegraphListItem.js",
  "edits": [
    {
      "src": "11:d2| import {Fragment, memo, useContext, useCallback} from 'react';",
      "dst": "memo,Fragment,useContext,useCallback"
    }
  ]
}
```

### Import Swap Named Imports 003 (StyleEditor.js)

#### Run 1

##### Attempt 1

- Path: StyleEditor.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    9:fa| 
    10:df| import * as React from 'react';
>>> 11:79| import {useMemo, useContext, useRef, useState} from 'react';
    12:7e| import {copy} from 'clipboard-js';
    13:fd| import {
```

**Patch args**

```diff
{
  "edits": [
    {
      "src": "11:7e",
      "dst": "import {useContext, useMemo, useRef, useState} from 'react';"
    }
  ],
  "path": "StyleEditor.js"
}
```

#### Run 3

##### Attempt 1

- Path: StyleEditor.js
- Operation: —

**Tool error**

```
src must not contain commas: "BridgeContext, StoreContext"
```

**Patch args**

```diff
{
  "edits": [
    {
      "src": "BridgeContext, StoreContext",
      "dst": "StoreContext, BridgeContext"
    }
  ],
  "path": "StyleEditor.js"
}
```

### Literal Flip Boolean 001 (testHelpers.js)

#### Run 2

##### Attempt 1

- Path: testHelpers.js
- Operation: —

**Tool error**

```
No changes made to testHelpers.js. The edits produced identical content.
```

**Patch args**

```diff
{
  "path": "testHelpers.js",
  "edits": [
    {
      "src": "20:5d|     ${true} | ${fallback}",
      "dst": "    ${true} | ${fallback}"
    }
  ]
}
```

### Literal Flip Boolean 003 (ReactFlightDOMClientEdge.js)

#### Run 1

##### Attempt 1

- Path: ReactFlightDOMClientEdge.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    108:02|       ? options.findSourceMapURL
    109:60|       : undefined,
>>> 110:95|     __DEV__ && options ? options.replayConsoleLogs === false : false, // defaults to false
    111:08|     __DEV__ && options && options.environmentName
    112:09|       ? options.environmentName
```

**Patch args**

```diff
{
  "path": "ReactFlightDOMClientEdge.js",
  "edits": [
    {
      "src": "110:08",
      "dst": "__DEV__ && options ? options.replayConsoleLogs === true : false, // defaults to false"
    }
  ]
}
```

#### Run 3

##### Attempt 1

- Path: ReactFlightDOMClientEdge.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    108:02|       ? options.findSourceMapURL
    109:60|       : undefined,
>>> 110:95|     __DEV__ && options ? options.replayConsoleLogs === false : false, // defaults to false
    111:08|     __DEV__ && options && options.environmentName
    112:09|       ? options.environmentName
```

**Patch args**

```diff
{
  "path": "ReactFlightDOMClientEdge.js",
  "edits": [
    {
      "dst": "__DEV__ && options ? options.replayConsoleLogs : false, // defaults to false",
      "src": "110:110"
    }
  ]
}
```

### Literal Off By One 002 (code-path.js)

#### Run 2

##### Attempt 1

- Path: code-path.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    229:eb|       } else if (index === end) {
    230:cb|         item[0] = segment.nextSegments[index];
>>> 231:7c|         item[1] = 1;
    232:0b|       } else {
    233:c8|         stack.pop();
```

**Patch args**

```diff
{
  "path": "code-path.js",
  "edits": [
    {
      "dst": "item[1] = end + 1;",
      "src": "231:0b"
    }
  ]
}
```

#### Run 3

##### Attempt 1

- Path: code-path.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    229:eb|       } else if (index === end) {
    230:cb|         item[0] = segment.nextSegments[index];
>>> 231:7c|         item[1] = 1;
    232:0b|       } else {
    233:c8|         stack.pop();
```

**Patch args**

```diff
{
  "path": "code-path.js",
  "edits": [
    {
      "src": "231:1559",
      "dst": "item[1] = 0;"
    }
  ]
}
```

### Literal Off By One 003 (InspectedElement.js)

#### Run 2

##### Attempt 1

- Path: InspectedElement.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    203:bc| 
    204:e1|   let strictModeBadge = null;
>>> 205:a1|   if (element.isStrictModeNonCompliant && element.parentID !== 1) {
    206:4f|     strictModeBadge = (
    207:66|       <Tooltip label="This component is not running in StrictMode. Click to learn more.">
```

**Patch args**

```diff
{
  "edits": [
    {
      "dst": "if (element.isStrictModeNonCompliant && element.parentID !== 0) {",
      "src": "205:4f"
    }
  ],
  "path": "InspectedElement.js"
}
```

### Operator Remove Negation 001 (ReactDOMClient.js)

#### Run 1

##### Attempt 1

- Path: ReactDOMClient.js
- Operation: —

**Tool error**

```
Invalid line reference "!(window.top === window.self)". Expected format "LINE:HASH" (e.g. "5:a3f2").
```

**Patch args**

```diff
{
  "edits": [
    {
      "dst": "window.top === window.self",
      "src": "!(window.top === window.self)"
    }
  ],
  "path": "ReactDOMClient.js"
}
```

##### Attempt 2

- Path: ReactDOMClient.js
- Operation: —

**Tool error**

```
No changes made to ReactDOMClient.js. The edits produced identical content.
```

**Patch args**

```diff
{
  "edits": [
    {
      "src": "57:ff",
      "dst": "  if (foundDevTools && canUseDOM && window.top === window.self) {"
    }
  ],
  "path": "ReactDOMClient.js"
}
```

### Operator Remove Negation 002 (NativeEventsView.js)

#### Run 2

##### Attempt 1

- Path: NativeEventsView.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    213:3f|   _handleMouseMove(interaction: MouseMoveInteraction, viewRefs: ViewRefs) {
    214:a6|     const {frame, _intrinsicSize, onHover, visibleArea} = this;
>>> 215:82|     if (!onHover) {
    216:1e|       return;
    217:66|     }
```

**Patch args**

```diff
{
  "edits": [
    {
      "src": "215:2a",
      "dst": "    if (onHover) {"
    }
  ],
  "path": "NativeEventsView.js"
}
```

### Operator Remove Negation 003 (ReactFlightUnbundledReferences.js)

#### Run 2

##### Attempt 1

- Path: ReactFlightUnbundledReferences.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    250:b1|         target.$$async,
    251:2c|       );
>>> 252:c7|       return true;
    253:2a|     case 'then':
    254:ad|       if (target.then) {
```

**Patch args**

```diff
{
  "path": "ReactFlightUnbundledReferences.js",
  "edits": [
    {
      "src": "252:e2",
      "dst": "false"
    }
  ]
}
```

#### Run 3

##### Attempt 1

- Path: ReactFlightUnbundledReferences.js
- Operation: —

**Tool error**

```
src must not contain commas: "target.$$async,"
```

**Patch args**

```diff
{
  "path": "ReactFlightUnbundledReferences.js",
  "edits": [
    {
      "dst": "!target.$$async,",
      "src": "target.$$async,"
    }
  ]
}
```

##### Attempt 2

- Path: ReactFlightUnbundledReferences.js
- Operation: —

**Tool error**

```
Invalid line reference "target.$$async". Expected format "LINE:HASH" (e.g. "5:a3f2").
```

**Patch args**

```diff
{
  "path": "ReactFlightUnbundledReferences.js",
  "edits": [
    {
      "src": "target.$$async",
      "dst": "!target.$$async"
    }
  ]
}
```

### Operator Swap Arithmetic 002 (CSSShorthandProperty.js)

#### Run 3

##### Attempt 1

- Path: CSSShorthandProperty.js
- Operation: —

**Tool error**

```
src must not contain commas: "108:b4|   columns: ['columnCount', 'columnWidth'],"
```

**Patch args**

```diff
{
  "path": "CSSShorthandProperty.js",
  "edits": [
    {
      "src": "108:b4|   columns: ['columnCount', 'columnWidth'],",
      "dst": "columns: ['columnCount', 'columnCount'],"
    }
  ]
}
```

### Operator Swap Arithmetic 003 (hooks.js)

#### Run 1

##### Attempt 1

- Path: hooks.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    123:3e|       return () => {};
    124:89|     }
>>> 125:0b| 
    126:ca|     const container = ((containerRef.current: any): HTMLDivElement);
    127:bc| 
```

**Patch args**

```diff
{
  "path": "hooks.js",
  "edits": [
    {
      "dst": "currentDepth + 1",
      "src": "125:b9"
    }
  ]
}
```

#### Run 2

##### Attempt 1

- Path: hooks.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    355:60|       const element = store.getElementByID(id);
    356:c4|       if (element !== null) {
>>> 357:0f|         const isRoot = element.parentID === 0;
    358:d6|         let displayName = element.displayName;
    359:c2|         if (displayName !== null && element.nameProp !== null) {
```

**Patch args**

```diff
{
  "edits": [
    {
      "dst": "const isRoot = element.parentID - 0;",
      "src": "357:d6"
    }
  ],
  "path": "hooks.js"
}
```

#### Run 3

##### Attempt 1

- Path: hooks.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    69:ef|         editableValue: sanitizeForParse(action.editableValue),
    70:3c|         externalValue: action.externalValue,
>>> 71:e2|         hasPendingChanges:
    72:89|           smartStringify(action.externalValue) !== action.editableValue,
    73:06|         isValid: isNewValueValid,
```

**Patch args**

```diff
{
  "edits": [
    {
      "dst": "!=",
      "src": "71:89"
    }
  ],
  "path": "hooks.js"
}
```

### Operator Swap Comparison 001 (index.js)

#### Run 1

##### Attempt 1

- Path: index.js
- Operation: —

**Tool error**

```
Invalid line reference "<=Suspense fallback={<div>Loading". Expected format "LINE:HASH" (e.g. "5:a3f2").
```

**Patch args**

```diff
{
  "path": "index.js",
  "edits": [
    {
      "src": "<=Suspense fallback={<div>Loading...</div>}>",
      "dst": "<Suspense fallback={<div>Loading...</div>}>"
    }
  ]
}
```

#### Run 2

##### Attempt 1

- Path: index.js
- Operation: —

**Tool error**

```
Invalid line reference "<=". Expected format "LINE:HASH" (e.g. "5:a3f2").
```

**Patch args**

```diff
{
  "path": "index.js",
  "edits": [
    {
      "dst": "<",
      "src": "<="
    }
  ]
}
```

##### Attempt 2

- Path: index.js
- Operation: —

**Tool error**

```
Invalid line reference "63:84:<=". Expected format "LINE:HASH" (e.g. "5:a3f2").
```

**Patch args**

```diff
{
  "path": "index.js",
  "edits": [
    {
      "src": "63:84:<=",
      "dst": "<"
    }
  ]
}
```

### Operator Swap Comparison 002 (ReactFlightDOMServerBrowser.js)

#### Run 2

##### Attempt 1

- Path: ReactFlightDOMServerBrowser.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    87:2b|       : readPartialStringChunk(stringDecoder, buffer);
    88:0f|     const messages = stringBuffer.split('\n');
>>> 89:73|     for (let i = 0; i <= messages.length - 1; i++) {
    90:6f|       resolveDebugMessage(request, messages[i]);
    91:11|     }
```

**Patch args**

```diff
{
  "path": "ReactFlightDOMServerBrowser.js",
  "edits": [
    {
      "src": "89:90",
      "dst": "i < messages.length"
    }
  ]
}
```

### Operator Swap Comparison 003 (ReactFlightDOMServerNode.js)

#### Run 3

##### Attempt 1

- Path: ReactFlightDOMServerNode.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    226:d8|       );
    227:eb|       // We don't close until the debug channel closes.
>>> 228:32|       if (!__DEV__ || debugChannelReadable === undefined) {
    229:97|         destination.on(
    230:f6|           'close',
```

**Patch args**

```diff
{
  "edits": [
    {
      "src": "228:c1",
      "dst": "!__DEV__ || debugChannelReadable == null"
    }
  ],
  "path": "ReactFlightDOMServerNode.js"
}
```

### Operator Swap Equality 002 (editor.js)

#### Run 1

##### Attempt 1

- Path: editor.js
- Operation: —

**Tool error**

```
Invalid line reference "if (output.indexOf(processName) === -1) {". Expected format "LINE:HASH" (e.g. "5:a3f2").
```

**Patch args**

```diff
{
  "edits": [
    {
      "dst": "if (output.indexOf(processName) !== -1) {",
      "src": "if (output.indexOf(processName) === -1) {"
    }
  ],
  "path": "editor.js"
}
```

#### Run 2

##### Attempt 1

- Path: editor.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    89:a9|       for (let i = 0; i < processNames.length; i++) {
    90:a6|         const processName = processNames[i];
>>> 91:af|         if (output.indexOf(processName) === -1) {
    92:30|           return [COMMON_EDITORS[processName]];
    93:79|         }
```

**Patch args**

```diff
{
  "edits": [
    {
      "src": "91:30",
      "dst": "if (output.indexOf(processName) !== -1)"
    }
  ],
  "path": "editor.js"
}
```

### Operator Swap Equality 003 (hooks.js)

#### Run 2

##### Attempt 1

- Path: hooks.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    415:ae|       const element = store.getElementByID(id);
    416:93|       const rendererID = store.getRendererIDForElement(id);
>>> 417:e1|       if (element !== null && rendererID === null) {
    418:17|         bridge.send('scrollToHostInstance', {
    419:d7|           id,
```

**Patch args**

```diff
{
  "path": "hooks.js",
  "edits": [
    {
      "dst": "if (element !== null && rendererID !== null)",
      "src": "417:17"
    }
  ]
}
```

#### Run 3

##### Attempt 1

- Path: hooks.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    126:ca|     const container = ((containerRef.current: any): HTMLDivElement);
    127:bc| 
>>> 128:03|     const handleResize = () =>
    129:83|       setIsOverflowing(container.clientWidth <= totalChildWidth);
    130:6e| 
```

**Patch args**

```diff
{
  "path": "hooks.js",
  "edits": [
    {
      "dst": "setIsOverflowing(container.clientWidth < totalChildWidth);",
      "src": "128:83"
    }
  ]
}
```

### Operator Swap Increment Decrement 002 (ReactFlightDOMClientNode.js)

#### Run 2

##### Attempt 1

- Path: ReactFlightDOMClientNode.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    124:c4|     let streamEndedCount = 0;
    125:99|     const handleEnd = () => {
>>> 126:08|       if (--streamEndedCount === 2) {
    127:44|         close(response);
    128:a4|       }
```

**Patch args**

```diff
{
  "path": "ReactFlightDOMClientNode.js",
  "edits": [
    {
      "dst": "if (++streamEndedCount === 2) {",
      "src": "126:44"
    }
  ]
}
```

#### Run 3

##### Attempt 1

- Path: ReactFlightDOMClientNode.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    124:c4|     let streamEndedCount = 0;
    125:99|     const handleEnd = () => {
>>> 126:08|       if (--streamEndedCount === 2) {
    127:44|         close(response);
    128:a4|       }
```

**Patch args**

```diff
{
  "path": "ReactFlightDOMClientNode.js",
  "edits": [
    {
      "dst": "if (++streamEndedCount === 2)",
      "src": "126:44"
    }
  ]
}
```

### Operator Swap Increment Decrement 003 (loadSourceAndMetadata.js)

#### Run 1

##### Attempt 1

- Path: loadSourceAndMetadata.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    383:70|   hooksList: Array<HooksNode>,
    384:48| ): void {
>>> 385:98|   for (let i = 0; i < hooksTree.length; i--) {
    386:91|     const hook = hooksTree[i];
    387:de| 
```

**Patch args**

```diff
{
  "path": "loadSourceAndMetadata.js",
  "edits": [
    {
      "src": "385:91",
      "dst": "for (let i = 0; i < hooksTree.length; i++) {"
    }
  ]
}
```

#### Run 3

##### Attempt 1

- Path: loadSourceAndMetadata.js
- Operation: —

**Tool error**

```
No changes made to loadSourceAndMetadata.js. The edits produced identical content.
```

**Patch args**

```diff
{
  "path": "loadSourceAndMetadata.js",
  "edits": [
    {
      "src": "351:fc",
      "dst": "for (let i = 0; i < hooksTree.length; i++) {"
    }
  ]
}
```

##### Attempt 2

- Path: loadSourceAndMetadata.js
- Operation: —

**Tool error**

```
No changes made to loadSourceAndMetadata.js. The edits produced identical content.
```

**Patch args**

```diff
{
  "path": "loadSourceAndMetadata.js",
  "edits": [
    {
      "src": "351:fc",
      "dst": "    for (let i = 0; i < hooksTree.length; i++) {"
    }
  ]
}
```

##### Attempt 3

- Path: loadSourceAndMetadata.js
- Operation: —

**Tool error**

```
No changes made to loadSourceAndMetadata.js. The edits produced identical content.
```

**Patch args**

```diff
{
  "edits": [
    {
      "src": "351:fc",
      "dst": "  for (let i = 0; i < hooksTree.length; i++) {"
    }
  ],
  "path": "loadSourceAndMetadata.js"
}
```

### Operator Swap Logical 003 (DevToolsFiberComponentStack.js)

#### Run 1

##### Attempt 1

- Path: DevToolsFiberComponentStack.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    201:86|         owner = fiber._debugOwner;
    202:bb|         let debugStack: void | null | string | Error = fiber._debugStack;
>>> 203:48|         // If we don't actually print the stack if there is no owner of this JSX element.
    204:61|         // In a real app it's typically not useful since the root app is always controlled
    205:4f|         // by the framework. These also tend to have noisy stacks because they're not rooted
```

**Patch args**

```diff
{
  "path": "DevToolsFiberComponentStack.js",
  "edits": [
    {
      "src": "203:61",
      "dst": "if (debugStack) {"
    }
  ]
}
```

##### Attempt 2

- Path: DevToolsFiberComponentStack.js
- Operation: —

**Tool error**

```
No changes made to DevToolsFiberComponentStack.js. The edits produced identical content.
```

**Patch args**

```diff
{
  "path": "DevToolsFiberComponentStack.js",
  "edits": [
    {
      "src": "203:36",
      "dst": "if (debugStack) {"
    }
  ]
}
```

### Operator Swap Nullish 001 (getBatchRange.js)

#### Run 1

##### Attempt 1

- Path: getBatchRange.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    23:b1| ): [Milliseconds, Milliseconds] {
    24:d3|   const measures = data.batchUIDToMeasuresMap.get(batchUID);
>>> 25:6f|   if (measures == null ?? measures.length === 0) {
    26:93|     throw Error(`Could not find measures with batch UID "${batchUID}"`);
    27:5a|   }
```

**Patch args**

```diff
{
  "path": "getBatchRange.js",
  "edits": [
    {
      "src": "25:72",
      "dst": "const batchSize = options.batchSize || 100;"
    }
  ]
}
```

### Operator Swap Nullish 003 (backend.js)

#### Run 3

##### Attempt 1

- Path: backend.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    211:5b| 
    212:cb|     // Setup React Native style editor if the environment supports it.
>>> 213:af|     if (resolveRNStyle != null || hook.resolveRNStyle != null) {
    214:01|       setupNativeStyleEditor(
    215:e5|         // $FlowFixMe[incompatible-call] found when upgrading Flow
```

**Patch args**

```diff
{
  "path": "backend.js",
  "edits": [
    {
      "dst": "const nativeStyleResolver: ResolveNativeStyle | void = resolveRNStyle ?? hook.resolveRNStyle;",
      "src": "213:e0"
    }
  ]
}
```

### Regex Swap Regex Quantifier 001 (githubAPI.js)

#### Run 1

##### Attempt 1

- Path: githubAPI.js
- Operation: —

**Tool error**

```
src must not contain commas: "19:8e| message = message.replace(/"[0-9]*"/g, '');"
```

**Patch args**

```diff
{
  "path": "githubAPI.js",
  "edits": [
    {
      "dst": "message = message.replace(/\"[0-9]+\"/g, '');",
      "src": "19:8e| message = message.replace(/\"[0-9]*\"/g, '');"
    }
  ]
}
```

### Regex Swap Regex Quantifier 002 (ReactFlightStackConfigV8.js)

#### Run 2

##### Attempt 1

- Path: ReactFlightStackConfigV8.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    145:ca| //     at async filename:0:0
    146:36| const frameRegExp =
>>> 147:35|   /^ {3} at (?:(.+) \((?:(.+):(\d*):(\d+)|\<anonymous\>)\)|(?:async )?(.+):(\d+):(\d+)|\<anonymous\>)$/;
    148:4e| 
    149:53| // DEV-only cache of parsed and filtered stack frames.
```

**Patch args**

```diff
{
  "path": "ReactFlightStackConfigV8.js",
  "edits": [
    {
      "dst": "const frameRegExp = /^ {3} at (?:(.+) \\\\((?:(.+):(\\\\d+):(\\\\d+)|\\\\<anonymous\\\\>)\\\\)|(?:async )?(.+):(\\\\d+):(\\\\d+)|\\\\<anonymous\\\\>)$/",
      "src": "147:4e"
    }
  ]
}
```

### Regex Swap Regex Quantifier 003 (utils.js)

#### Run 2

##### Attempt 1

- Path: utils.js
- Operation: —

**Tool error**

```
src must not contain newlines: "word: string): string {
  if (!/^[a-z]*$/i.test(word)) {"
```

**Patch args**

```diff
{
  "edits": [
    {
      "dst": "word: string): string {\n  if (!/^[a-z]+$/i.test(word)) {",
      "src": "word: string): string {\n  if (!/^[a-z]*$/i.test(word)) {"
    }
  ],
  "path": "utils.js"
}
```

##### Attempt 2

- Path: utils.js
- Operation: —

**Tool error**

```
Invalid line reference "/^[a-z]*$/i". Expected format "LINE:HASH" (e.g. "5:a3f2").
```

**Patch args**

```diff
{
  "path": "utils.js",
  "edits": [
    {
      "src": "/^[a-z]*$/i",
      "dst": "/^[a-z]+$/i"
    }
  ]
}
```

#### Run 3

##### Attempt 1

- Path: utils.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    201:e0| 
    202:8d| export function pluralize(word: string): string {
>>> 203:45|   if (!/^[a-z]*$/i.test(word)) {
    204:2d|     // If it's not a single a-z word, give up.
    205:97|     return word;
```

**Patch args**

```diff
{
  "path": "utils.js",
  "edits": [
    {
      "dst": "if (!/^[a-z]+$/i.test(word)) {",
      "src": "203:2d"
    }
  ]
}
```

### Structural Delete Statement 001 (UnsupportedVersionDialog.js)

#### Run 1

##### Attempt 1

- Path: UnsupportedVersionDialog.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    26:9f|       const showDialog = () => {
    27:58|         setState('show-dialog');
>>> 28:04|         dispatch({
    29:ee|           canBeDismissed: true,
    30:80|           id: 'UnsupportedVersionDialog',
```

**Patch args**

```diff
{
  "edits": [
    {
      "dst": "        store.unsupportedRendererVersionDetected = false;",
      "src": "27:58..28:ee"
    }
  ],
  "path": "UnsupportedVersionDialog.js"
}
```

#### Run 2

##### Attempt 1

- Path: UnsupportedVersionDialog.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    19:28| 
    20:2b| export default function UnsupportedVersionDialog(_: {}): null {
>>> 21:cc|   const {dispatch} = useContext(ModalDialogContext);
    22:0b|   const [state, setState] = useState<DAILOG_STATE>('dialog-not-shown');
    23:2a| 
```

**Patch args**

```diff
{
  "edits": [
    {
      "dst": "const store = useContext(StoreContext);",
      "src": "21:0b.."
    }
  ],
  "path": "UnsupportedVersionDialog.js"
}
```

### Structural Delete Statement 002 (getComponentNameFromFiber.js)

#### Run 2

##### Attempt 1

- Path: getComponentNameFromFiber.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    60:fa| ): string {
    61:11|   return (
>>> 62:cb|     (outerType: any).displayName ||
    63:a1|     (functionName !== '' ? `${wrapperName}(${functionName})` : wrapperName)
    64:7b|   );
```

**Patch args**

```diff
{
  "edits": [
    {
      "src": "62:a1..",
      "dst": "const functionName = innerType.displayName || innerType.name || '';"
    }
  ],
  "path": "getComponentNameFromFiber.js"
}
```

### Structural Delete Statement 003 (simulateBrowserEventDispatch.js)

#### Run 2

##### Attempt 1

- Path: simulateBrowserEventDispatch.js
- Operation: —

**Tool error**

```
Invalid line reference "208". Expected format "LINE:HASH" (e.g. "5:a3f2").
```

**Patch args**

```diff
{
  "edits": [
    {
      "dst": "await waitForMicrotasks();",
      "src": "208.."
    }
  ],
  "path": "simulateBrowserEventDispatch.js"
}
```

### Structural Swap Adjacent Lines 002 (ReactNoopFlightServer.js)

#### Run 2

##### Attempt 1

- Path: ReactNoopFlightServer.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    44:eb|   closeWithError(destination: Destination, error: mixed): void {},
    45:9c|   stringToChunk(content: string): Uint8Array {
>>> 46:0f|   flushBuffered(destination: Destination): void {},
    47:ad|     return textEncoder.encode(content);
    48:15|   },
```

**Patch args**

```diff
{
  "path": "ReactNoopFlightServer.js",
  "edits": [
    {
      "src": "46:4a",
      "dst": "  return textEncoder.encode(content);"
    },
    {
      "src": "47:ad",
      "dst": "flushBuffered(destination: Destination): void {}"
    }
  ]
}
```

### Structural Swap Adjacent Lines 003 (backend.js)

#### Run 1

##### Attempt 1

- Path: backend.js
- Operation: —

**Tool error**

```
3 lines have changed since last read. Re-read the file.

    199:f0|     }
    200:4c|     agent.addListener('shutdown', () => {
>>> 201:f9|       if (onSettingsUpdated != null) {
    202:1b|         agent.removeListener('updateHookSettings', onSettingsUpdated);
    203:ca|       }
    ...
    208:5e|     });
    209:0a| 
>>> 210:26|     initBackend(hook, agent, window, isReloadAndProfileSupported);
    211:5b| 
>>> 212:cb|     // Setup React Native style editor if the environment supports it.
    213:af|     if (resolveRNStyle != null || hook.resolveRNStyle != null) {
    214:01|       setupNativeStyleEditor(
```

**Patch args**

```diff
{
  "path": "backend.js",
  "edits": [
    {
      "dst": "agent.addListener('shutdown', () => {\n    if (onSettingsUpdated != null) {\n      agent.removeListener('updateHookSettings', onSettingsUpdated);\n    }\n\n    // If we received 'shutdown' from `agent`, we assume the `bridge` is already shutting down,\n    // and that caused the 'shutdown' event on the `agent`, so we don't need to call `bridge.shutdown()` here.\n    // $FlowFixMe[incompatible-use] found when upgrading Flow\n    hook.emit('shutdown');\n});",
      "src": "201:4c..210:5b"
    },
    {
      "dst": "initBackend(hook, agent, window, isReloadAndProfileSupported);",
      "src": "212:af.."
    }
  ]
}
```

##### Attempt 2

- Path: backend.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    207:98|       hook.emit('shutdown');
    208:5e|     });
>>> 209:0a| 
    210:26|     initBackend(hook, agent, window, isReloadAndProfileSupported);
    211:5b| 
```

**Patch args**

```diff
{
  "path": "backend.js",
  "edits": [
    {
      "src": "200:4c..208:5e",
      "dst": "agent.addListener('shutdown', () => {\n  if (onSettingsUpdated != null) {\n    agent.removeListener('updateHookSettings', onSettingsUpdated);\n  }\n\n  // If we received 'shutdown' from `agent`, we assume the `bridge` is already shutting down,\n  // and that caused the 'shutdown' event on the `agent`, so we don't need to call `bridge.shutdown()` here.\n  // $FlowFixMe[incompatible-use] found when upgrading Flow\n  hook.emit('shutdown');\n});"
    },
    {
      "dst": "initBackend(hook, agent, window, isReloadAndProfileSupported);",
      "src": "209:26.."
    }
  ]
}
```

##### Attempt 3

- Path: backend.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    207:98|       hook.emit('shutdown');
    208:5e|     });
>>> 209:0a| 
    210:26|     initBackend(hook, agent, window, isReloadAndProfileSupported);
    211:5b| 
```

**Patch args**

```diff
{
  "path": "backend.js",
  "edits": [
    {
      "dst": "agent.addListener('shutdown', () => {\n  if (onSettingsUpdated != null) {\n    agent.removeListener('updateHookSettings', onSettingsUpdated);\n  }\n\n  // If we received 'shutdown' from `agent`, we assume the `bridge` is already shutting down,\n  // and that caused the 'shutdown' event on the `agent`, so we don't need to call `bridge.shutdown()` here.\n  // $FlowFixMe[incompatible-use] found when upgrading Flow\n  hook.emit('shutdown');\n});",
      "src": "200:4c..208:5e"
    },
    {
      "src": "209:26..",
      "dst": "initBackend(hook, agent, window, isReloadAndProfileSupported);"
    }
  ]
}
```

### Structural Swap If Else 003 (ReactDOMFizzStaticNode.js)

#### Run 1

##### Attempt 1

- Path: ReactDOMFizzStaticNode.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    177:b4|       if (signal.aborted) {
    178:fc|         abort(request, (signal: any).reason);
>>> 179:ff|       }
    180:fc|     }
    181:5c|     startWork(request);
```

**Patch args**

```diff
{
  "edits": [
    {
      "dst": "if (!options || !options.signal) {\n  const signal = options.signal;\n  if (signal.aborted) {\n    abort(request, (signal: any).reason);\n  }\n}\nelse {\n  const listener = () => {\n    abort(request, (signal: any).reason);\n    signal.removeEventListener('abort', listener);\n  };\n  signal.addEventListener('abort', listener);\n}",
      "src": "168:d3..179:fc"
    }
  ],
  "path": "ReactDOMFizzStaticNode.js"
}
```

### Unicode Unicode Hyphen 002 (UnsupportedBridgeProtocolDialog.js)

#### Run 1

##### Attempt 1

- Path: UnsupportedBridgeProtocolDialog.js
- Operation: —

**Tool error**

```
Invalid line reference "devtools–unsupported-bridge-protocol". Expected format "LINE:HASH" (e.g. "5:a3f2").
```

**Patch args**

```diff
{
  "edits": [
    {
      "src": "devtools–unsupported-bridge-protocol",
      "dst": "devtools-unsupported-bridge-protocol"
    }
  ],
  "path": "UnsupportedBridgeProtocolDialog.js"
}
```

##### Attempt 2

- Path: UnsupportedBridgeProtocolDialog.js
- Operation: —

**Tool error**

```
No changes made to UnsupportedBridgeProtocolDialog.js. The edits produced identical content.
```

**Patch args**

```diff
{
  "path": "UnsupportedBridgeProtocolDialog.js",
  "edits": [
    {
      "src": "25:e6",
      "dst": "  'https://fb.me/devtools-unsupported-bridge-protocol';"
    }
  ]
}
```

##### Attempt 3

- Path: UnsupportedBridgeProtocolDialog.js
- Operation: —

**Tool error**

```
No changes made to UnsupportedBridgeProtocolDialog.js. The edits produced identical content.
```

**Patch args**

```diff
{
  "edits": [
    {
      "dst": "  'https://fb.me/devtools-unsupported-bridge-protocol';",
      "src": "25:e6"
    }
  ],
  "path": "UnsupportedBridgeProtocolDialog.js"
}
```

#### Run 2

##### Attempt 1

- Path: UnsupportedBridgeProtocolDialog.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    17:35| import {copy} from 'clipboard-js';
    18:db| import styles from './UnsupportedBridgeProtocolDialog.css';
>>> 19:9f| import {withPermissionsCheck} from 'react–devtools-shared/src/frontend/utils/withPermissionsCheck';
    20:b5| 
    21:37| import type {BridgeProtocol} from 'react-devtools-shared/src/bridge';
```

**Patch args**

```diff
{
  "path": "UnsupportedBridgeProtocolDialog.js",
  "edits": [
    {
      "dst": "import {withPermissionsCheck} from 'react-devtools-shared/src/frontend/utils/withPermissionsCheck';",
      "src": "19:b5"
    }
  ]
}
```

### Unicode Unicode Hyphen 003 (ReactTypes.js)

#### Run 1

##### Attempt 1

- Path: ReactTypes.js
- Operation: —

**Tool error**

```
2 lines have changed since last read. Re-read the file.

    345:00|   // It does not allow a single element child.
    346:92|   children?: Iterable<SuspenseListRow> | AsyncIterable<SuspenseListRow>, // Note: AsyncIterable is experimental.
>>> 347:8c|   revealOrder: 'forwards' | 'backwards' | 'unstable_legacy–backwards',
    348:73|   tail?: SuspenseListTailMode,
    349:b6| };
```

**Patch args**

```diff
{
  "edits": [
    {
      "dst": "unstable_legacy-backwards",
      "src": "347:73..347:a4"
    }
  ],
  "path": "ReactTypes.js"
}
```

##### Attempt 2

- Path: ReactTypes.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    345:00|   // It does not allow a single element child.
    346:92|   children?: Iterable<SuspenseListRow> | AsyncIterable<SuspenseListRow>, // Note: AsyncIterable is experimental.
>>> 347:8c|   revealOrder: 'forwards' | 'backwards' | 'unstable_legacy–backwards',
    348:73|   tail?: SuspenseListTailMode,
    349:b6| };
```

**Patch args**

```diff
{
  "path": "ReactTypes.js",
  "edits": [
    {
      "dst": "unstable_legacy-backwards",
      "src": "347:8c..347:a4"
    }
  ]
}
```

##### Attempt 3

- Path: ReactTypes.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    345:00|   // It does not allow a single element child.
    346:92|   children?: Iterable<SuspenseListRow> | AsyncIterable<SuspenseListRow>, // Note: AsyncIterable is experimental.
>>> 347:8c|   revealOrder: 'forwards' | 'backwards' | 'unstable_legacy–backwards',
    348:73|   tail?: SuspenseListTailMode,
    349:b6| };
```

**Patch args**

```diff
{
  "edits": [
    {
      "src": "347:8c..347:a4",
      "dst": "unstable_legacy-backwards"
    }
  ],
  "path": "ReactTypes.js"
}
```

##### Attempt 4

- Path: ReactTypes.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    345:00|   // It does not allow a single element child.
    346:92|   children?: Iterable<SuspenseListRow> | AsyncIterable<SuspenseListRow>, // Note: AsyncIterable is experimental.
>>> 347:8c|   revealOrder: 'forwards' | 'backwards' | 'unstable_legacy–backwards',
    348:73|   tail?: SuspenseListTailMode,
    349:b6| };
```

**Patch args**

```diff
{
  "path": "ReactTypes.js",
  "edits": [
    {
      "dst": "unstable_legacy-backwards",
      "src": "347:8c..347:a4"
    }
  ]
}
```

##### Attempt 5

- Path: ReactTypes.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    345:00|   // It does not allow a single element child.
    346:92|   children?: Iterable<SuspenseListRow> | AsyncIterable<SuspenseListRow>, // Note: AsyncIterable is experimental.
>>> 347:8c|   revealOrder: 'forwards' | 'backwards' | 'unstable_legacy–backwards',
    348:73|   tail?: SuspenseListTailMode,
    349:b6| };
```

**Patch args**

```diff
{
  "path": "ReactTypes.js",
  "edits": [
    {
      "dst": "unstable_legacy-backwards",
      "src": "347:8c..347:a4"
    }
  ]
}
```

#### Run 2

##### Attempt 1

- Path: ReactTypes.js
- Operation: —

**Tool error**

```
src must not contain commas: "347:73|     revealOrder: 'forwards' | 'backwards' | 'unstable_legacy–backwards',"
```

**Patch args**

```diff
{
  "path": "ReactTypes.js",
  "edits": [
    {
      "dst": "    revealOrder: 'forwards' | 'backwards' | 'unstable_legacy-backwards',",
      "src": "347:73|     revealOrder: 'forwards' | 'backwards' | 'unstable_legacy–backwards',"
    }
  ]
}
```

##### Attempt 2

- Path: ReactTypes.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    345:00|   // It does not allow a single element child.
    346:92|   children?: Iterable<SuspenseListRow> | AsyncIterable<SuspenseListRow>, // Note: AsyncIterable is experimental.
>>> 347:8c|   revealOrder: 'forwards' | 'backwards' | 'unstable_legacy–backwards',
    348:73|   tail?: SuspenseListTailMode,
    349:b6| };
```

**Patch args**

```diff
{
  "path": "ReactTypes.js",
  "edits": [
    {
      "src": "347:73",
      "dst": "revealOrder: 'forwards' | 'backwards' | 'unstable_legacy-backwards',"
    }
  ]
}
```

##### Attempt 3

- Path: ReactTypes.js
- Operation: —

**Tool error**

```
src must not contain commas: "347:8c| revealOrder: 'forwards' | 'backwards' | 'unstable_legacy–backwards',"
```

**Patch args**

```diff
{
  "edits": [
    {
      "src": "347:8c| revealOrder: 'forwards' | 'backwards' | 'unstable_legacy–backwards',",
      "dst": "revealOrder: 'forwards' | 'backwards' | 'unstable_legacy-backwards',"
    }
  ],
  "path": "ReactTypes.js"
}
```

#### Run 3

##### Attempt 1

- Path: ReactTypes.js
- Operation: —

**Tool error**

```
1 line has changed since last read. Re-read the file.

    345:00|   // It does not allow a single element child.
    346:92|   children?: Iterable<SuspenseListRow> | AsyncIterable<SuspenseListRow>, // Note: AsyncIterable is experimental.
>>> 347:8c|   revealOrder: 'forwards' | 'backwards' | 'unstable_legacy–backwards',
    348:73|   tail?: SuspenseListTailMode,
    349:b6| };
```

**Patch args**

```diff
{
  "path": "ReactTypes.js",
  "edits": [
    {
      "src": "347:a5",
      "dst": "'unstable_legacy-backwards'"
    }
  ]
}
```

## Flaky Tasks (partial passing)

### Access Remove Optional Chain 001 (registerDevToolsEventLogger.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 19,323 / 5,869 | 16.5s |
| 2 | ❌ | File mismatch for registerDevToolsEventLogger.js | 16,342 / 6,710 | 19.9s |
| 3 | ❌ | File mismatch for registerDevToolsEventLogger.js | 3,617 / 4,967 | 20.8s |

### Access Remove Optional Chain 002 (TimelineContext.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for TimelineContext.js | 37,441 / 941 | 8.9s |
| 2 | ✅ | — | 34,537 / 2,942 | 13.2s |
| 3 | ✅ | — | 6,561 / 1,038 | 6.5s |

### Call Swap Call Args 001 (testHelpers.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 9,974 / 1,149 | 8.7s |
| 2 | ✅ | — | 13,226 / 3,800 | 13.0s |
| 3 | ❌ | File mismatch for testHelpers.js | 57,833 / 1,164 | 9.2s |

### Identifier Identifier Multi Edit 001 (TabBar.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for TabBar.js | 13,875 / 1,379 | 10.9s |
| 2 | ✅ | — | 13,415 / 2,798 | 11.3s |
| 3 | ✅ | — | 80,471 / 6,155 | 28.2s |

### Identifier Identifier Multi Edit 002 (EventPluginRegistry.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 35,692 / 1,420 | 9.7s |
| 2 | ❌ | File mismatch for EventPluginRegistry.js | 13,254 / 758 | 10.4s |
| 3 | ❌ | File mismatch for EventPluginRegistry.js | 8,112 / 698 | 7.7s |

### Import Swap Named Imports 001 (CommitFlamegraphListItem.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for CommitFlamegraphListItem.js | 4,604 / 767 | 6.7s |
| 2 | ✅ | — | 12,504 / 3,164 | 11.5s |
| 3 | ❌ | File mismatch for CommitFlamegraphListItem.js | 117,427 / 1,606 | 14.4s |

### Import Swap Named Imports 002 (ReactDOMTextarea.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for ReactDOMTextarea.js | 22,774 / 1,800 | 12.6s |
| 2 | ✅ | — | 15,976 / 3,132 | 11.2s |
| 3 | ❌ | File mismatch for ReactDOMTextarea.js | 11,638 / 1,756 | 8.5s |

### Import Swap Named Imports 003 (StyleEditor.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 29,215 / 3,575 | 17.7s |
| 2 | ❌ | File mismatch for StyleEditor.js | 61,376 / 2,542 | 12.5s |
| 3 | ❌ | File mismatch for StyleEditor.js | 13,952 / 2,858 | 17.4s |

### Literal Flip Boolean 002 (ReactNoopFlightServer.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 9,270 / 4,944 | 24.9s |
| 2 | ❌ | File mismatch for ReactNoopFlightServer.js | 5,823 / 1,274 | 9.4s |
| 3 | ✅ | — | 18,864 / 883 | 6.8s |

### Literal Flip Boolean 003 (ReactFlightDOMClientEdge.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 57,711 / 2,361 | 15.5s |
| 2 | ✅ | — | 7,444 / 1,230 | 9.3s |
| 3 | ❌ | File mismatch for ReactFlightDOMClientEdge.js | 28,321 / 2,102 | 14.7s |

### Literal Off By One 001 (githubAPI.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 4,848 / 770 | 7.1s |
| 2 | ✅ | — | 2,625 / 688 | 6.6s |
| 3 | ❌ | File mismatch for githubAPI.js | 37,611 / 1,119 | 9.0s |

### Literal Off By One 002 (code-path.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for code-path.js | 53,174 / 36,369 | 85.1s |
| 2 | ❌ | File mismatch for code-path.js | 18,102 / 8,691 | 41.7s |
| 3 | ✅ | — | 47,563 / 16,434 | 37.2s |

### Literal Off By One 003 (InspectedElement.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for InspectedElement.js | 17,018 / 30 | 1.9s |
| 2 | ✅ | — | 20,578 / 9,169 | 28.0s |
| 3 | ✅ | — | 24,650 / 15,215 | 36.7s |

### Operator Swap Comparison 002 (ReactFlightDOMServerBrowser.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 18,451 / 8,975 | 20.0s |
| 2 | ❌ | File mismatch for ReactFlightDOMServerBrowser.js | 12,456 / 904 | 10.5s |
| 3 | ❌ | File mismatch for ReactFlightDOMServerBrowser.js | 15,174 / 4,734 | 14.4s |

### Operator Swap Comparison 003 (ReactFlightDOMServerNode.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 30,140 / 4,218 | 15.1s |
| 2 | ❌ | File mismatch for ReactFlightDOMServerNode.js | 98,284 / 12,168 | 43.8s |
| 3 | ❌ | File mismatch for ReactFlightDOMServerNode.js | 80,524 / 12,348 | 57.0s |

### Operator Swap Equality 002 (editor.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 23,771 / 1,089 | 10.6s |
| 2 | ❌ | File mismatch for editor.js | 13,762 / 3,936 | 21.7s |
| 3 | ✅ | — | 26,098 / 2,950 | 14.6s |

### Operator Swap Increment Decrement 001 (ReactFlightDOMClientNode.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 26,019 / 2,540 | 9.0s |
| 2 | ✅ | — | 6,744 / 1,891 | 11.8s |
| 3 | ❌ | File mismatch for ReactFlightDOMClientNode.js | 38,672 / 809 | 7.7s |

### Operator Swap Increment Decrement 002 (ReactFlightDOMClientNode.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for ReactFlightDOMClientNode.js | 17,378 / 6,945 | 18.7s |
| 2 | ✅ | — | 7,563 / 1,341 | 12.0s |
| 3 | ❌ | File mismatch for ReactFlightDOMClientNode.js | 125,857 / 1,658 | 13.2s |

### Operator Swap Increment Decrement 003 (loadSourceAndMetadata.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for loadSourceAndMetadata.js | 35,585 / 2,172 | 10.2s |
| 2 | ✅ | — | 12,471 / 2,344 | 10.2s |
| 3 | ❌ | File mismatch for loadSourceAndMetadata.js | 77,826 / 8,564 | 27.8s |

### Operator Swap Logical 001 (profiling.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 26,179 / 978 | 7.4s |
| 2 | ❌ | File mismatch for profiling.js | 0 / 0 | 3.3s |
| 3 | ❌ | File mismatch for profiling.js | 25,738 / 2,703 | 10.9s |

### Operator Swap Logical 002 (SourceMapMetadataConsumer.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for SourceMapMetadataConsumer.js | 19,170 / 10,113 | 39.9s |
| 2 | ❌ | File mismatch for SourceMapMetadataConsumer.js | 24,656 / 11,864 | 28.5s |
| 3 | ✅ | — | 8,642 / 3,189 | 17.8s |

### Operator Swap Nullish 003 (backend.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for backend.js | 31,230 / 4,005 | 13.7s |
| 2 | ❌ | File mismatch for backend.js | 32,595 / 6,355 | 15.0s |
| 3 | ✅ | — | 28,830 / 6,405 | 25.0s |

### Regex Swap Regex Quantifier 001 (githubAPI.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 7,354 / 1,360 | 9.7s |
| 2 | ✅ | — | 25,819 / 1,224 | 7.3s |
| 3 | ❌ | File mismatch for githubAPI.js | 26,040 / 2,928 | 10.1s |

### Regex Swap Regex Quantifier 002 (ReactFlightStackConfigV8.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 23,920 / 8,008 | 37.5s |
| 2 | ❌ | File mismatch for ReactFlightStackConfigV8.js | 63,303 / 4,426 | 24.5s |
| 3 | ❌ | File mismatch for ReactFlightStackConfigV8.js | 27,115 / 2,386 | 13.4s |

### Regex Swap Regex Quantifier 003 (utils.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for utils.js | 19,776 / 9,225 | 45.9s |
| 2 | ❌ | File mismatch for utils.js | 36,526 / 9,166 | 38.0s |
| 3 | ✅ | — | 90,935 / 11,973 | 46.9s |

### Structural Delete Statement 001 (UnsupportedVersionDialog.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for UnsupportedVersionDialog.js | 9,660 / 4,337 | 26.1s |
| 2 | ✅ | — | 8,066 / 2,326 | 13.6s |
| 3 | ✅ | — | 11,095 / 8,133 | 32.4s |

### Structural Remove Early Return 001 (InspectedElementStateTree.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for InspectedElementStateTree.js | 23,671 / 3,429 | 13.7s |
| 2 | ✅ | — | 5,517 / 2,713 | 16.2s |
| 3 | ❌ | File mismatch for InspectedElementStateTree.js | 1,857 / 1,382 | 8.8s |

### Structural Swap Adjacent Lines 001 (ReactServerConsoleConfigPlain.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ✅ | — | 23,426 / 6,342 | 32.0s |
| 2 | ❌ | File mismatch for ReactServerConsoleConfigPlain.js | 11,994 / 9,639 | 24.5s |
| 3 | ✅ | — | 39,813 / 1,355 | 11.5s |

### Structural Swap If Else 003 (ReactDOMFizzStaticNode.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for ReactDOMFizzStaticNode.js | 23,211 / 9,679 | 34.3s |
| 2 | ❌ | File mismatch for ReactDOMFizzStaticNode.js | 399 / 463 | 42.5s |
| 3 | ✅ | — | 40,012 / 8,207 | 40.4s |

### Unicode Unicode Hyphen 001 (Rectangle.js) — 2/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for Rectangle.js | 17,129 / 596 | 5.1s |
| 2 | ✅ | — | 18,929 / 403 | 6.0s |
| 3 | ✅ | — | 10,331 / 512 | 6.5s |

### Unicode Unicode Hyphen 002 (UnsupportedBridgeProtocolDialog.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for UnsupportedBridgeProtocolDial... | 35,661 / 1,962 | 17.3s |
| 2 | ❌ | File mismatch for UnsupportedBridgeProtocolDial... | 23,857 / 1,085 | 9.2s |
| 3 | ✅ | — | 10,848 / 649 | 6.7s |

### Unicode Unicode Hyphen 003 (ReactTypes.js) — 1/3

| Run | Status | Error | Tokens (in/out) | Time |
|-----|--------|-------|-----------------|------|
| 1 | ❌ | File mismatch for ReactTypes.js | 72,505 / 1,916 | 19.9s |
| 2 | ✅ | — | 56,581 / 2,243 | 19.0s |
| 3 | ❌ | File mismatch for ReactTypes.js | 26,309 / 3,064 | 15.8s |

## Failed Tasks (0% passing)

### Access Remove Optional Chain 003 (astUtils.js) — 0/3

**All runs failed with same error:** File mismatch for astUtils.js

**Sample agent response (run 1):**
```
I have applied the fix to `astUtils.js`. The issue was that the property access `hook.node.id.elements[0].name` was not safely chained, which could lead to errors if `elements` or `elements[0]` were null or undefined. I have added optional chaining (`?.`) to make the access safer.
```

**Diff (expected vs actual):**
```diff
@@ -255 @@
   const nodeType = hook.node.id.type;
   switch (nodeType) {
     case AST_NODE_TYPES.ARRAY_PATTERN:
-      return !isCustomHook ? (hook.node.id.elements[0]?.name ?? null) : null;
+      return !isCustomHook ? (hook.node.id.elements?.[0]?.name ?? null) : null;
 
     case AST_NODE_TYPES.IDENTIFIER:
       return hook.node.id.name;
```

### Call Swap Call Args 002 (FlamegraphChartBuilder.js) — 0/3

**All runs failed with same error:** File mismatch for FlamegraphChartBuilder.js

**Sample agent response (run 1):**
```
I have swapped the arguments `baseDuration` and `1` in the call to `walkTree` on line 162 of `FlamegraphChartBuilder.js`, changing the call from `walkTree(id, baseDuration, 1)` to `walkTree(id, 1, baseDuration)`. This addresses the identified bug of swapped arguments.
```

**Diff (expected vs actual):**
```diff
@@ -64 @@
 
   // Generate flame graph structure using tree base durations.
   const walkTree = (id: number, rightOffset: number, currentDepth: number): ChartNode => {
-    idToDepthMap.set(id, currentDepth);
+    idToDepthMap.set(currentDepth, id);
 
     const node = nodes.get(id);
     if (node == null) {
@@ -141 @@
         throw Error(`Could not find node with id "${id}" in commit tree`);
       }
       baseDuration += node.treeBaseDuration;
-      walkTree(id, baseDuration, 1);
+      walkTree(id, 1, baseDuration);
     }
 
     fiberActualDurations.forEach((duration, id) => {
```

### Call Swap Call Args 003 (SyntheticEvent.js) — 0/3

**All runs failed with same error:** File mismatch for SyntheticEvent.js

**Sample agent response (run 1):**
```
I have read `SyntheticEvent.js`. I've identified a potential candidate for swapped arguments.

On lines 310-314, within the `createOrGetPooledEvent` function, the `EventConstructor.call` method is invoked. The arguments passed are:
`instance, dispatchConfig, targetInst, nativeEvent, nativeInst`.

Looking at the `SyntheticEvent` constructor signature on lines 61-66:
`SyntheticEvent(dispatchConfig, targetInst, nativeEvent, nativeEventTarget)`

It appears that the `nativeInst` argument is being ...
```

**Diff (expected vs actual):**
```diff
@@ -250 @@
 function getPooledWarningPropertyDefinition(propName, getVal) {
   function set(val) {
     const action = isFunction ? 'setting the method' : 'setting the property';
-    warn(action, 'This is effectively a no-op');
+    warn('This is effectively a no-op', action);
     return val;
   }
 
```

### Duplicate Duplicate Line Flip 003 (SyntheticEvent.js) — 0/3

**All runs failed with same error:** File mismatch for SyntheticEvent.js

**Sample agent response (run 1):**
```
The edit was successful. I have modified `SyntheticEvent.js`.

The issue was identified in the `deltaY` function where the fallback logic for `wheelDelta` was ` -event.wheelDelta`.
This was likely a duplicate of the behavior for `wheelDeltaY` but with a missing 'Y', representing a subtle literal change in a duplicated expression.

The fix changed line 583 to use `-event.wheelDeltaY`, ensuring consistent normalization for both properties.The edit was successful. I have modified `SyntheticEvent...
```

**Diff (expected vs actual):**
```diff
@@ -448 @@
 
     // KeyPress is deprecated, but its replacement is not yet final and not
     // implemented in any major browser. Only KeyPress has charCode.
-    if (event.type === 'keypress') {
+    if (event.type !== 'keypress') {
       return getEventCharCode(
         // $FlowFixMe[incompatible-call] unable to narrow to `KeyboardEvent`
         event,
```

### Identifier Identifier Multi Edit 003 (ReactPerformanceTrackProperties.js) — 0/3

**All runs failed with same error:** File mismatch for ReactPerformanceTrackProperties.js

**Sample agent response (run 1):**
```
The edit was successful. The identifier `ADDED` was used in two separate locations and was not defined. I have replaced it with `DADED`, which is a defined constant used for indicating added properties, thus fixing the bug. The changes were made to `ReactPerformanceTrackProperties.js`.
```

**Diff (expected vs actual):**
```diff
@@ -229 @@
 }
 
 const REMOVED = '\u2013\xa0';
-const ADDED = '+\xa0';
+const DADED = '+\xa0';
 const UNCHANGED = '\u2007\xa0';
 
 export function addObjectDiffToProperties(
@@ -284 @@
           // with any change to children of the component and their props will be logged
           // elsewhere but still mark it as a cause of render.
           const line = '\xa0\xa0'.repeat(indent) + key;
-          properties.push([REMOVED + line, '\u2026'], [ADDED + line, '\u2026']);
+          properties.push([REMOVED + line, '\u2026'], [DADED + line, '\u2026']);
           isDeeplyEqual = false;
           continue;
         }
@@ -305 @@
               const typeName = getComponentNameFromType(nextValue.type) || '\u2026';
               const line = '\xa0\xa0'.repeat(indent) + key;
               const desc = '<' + typeName + ' \u2026 />';
-              properties.push([REMOVED + line, desc], [ADDED + line, desc]);
+              properties.push([REMOVED + line, desc], [DADED + line, desc]);
               isDeeplyEqual = false;
               continue;
             }
@@ -369 @@
 
         // Otherwise, emit the change in property and the values.
         addValueToProperties(key, prevValue, properties, indent, REMOVED);
-        addValueToProperties(key, nextValue, properties, indent, ADDED);
+        addValueToProperties(key, nextValue, properties, indent, DADED);
         isDeeplyEqual = false;
       }
     } else {
         isDeeplyEqual = false;
       }
     } else {
-      properties.push([ADDED + '\xa0\xa0'.repeat(indent) + key, '\u2026']);
+      properties.push([DADED + '\xa0\xa0'.repeat(indent) + key, '\u2026']);
       isDeeplyEqual = false;
     }
 
```

### Operator Remove Negation 001 (ReactDOMClient.js) — 0/3

**All runs failed with same error:** File mismatch for ReactDOMClient.js

**Sample agent response (run 1):**
```
The edit command returned "No changes made to ReactDOMClient.js. The edits produced identical content." This indicates that the line content I intended to write (`  if (foundDevTools && canUseDOM && window.top === window.self) {`) was identical to the existing content of line 57.

This confirms my suspicion from the `read` output: the negation operator (`!`) that the prompt mentioned to be removed from line 57 is not present in the current version of the file. The file is already in the state...
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

### Operator Remove Negation 002 (NativeEventsView.js) — 0/3

**All runs failed with same error:** File mismatch for NativeEventsView.js

**Sample agent response (run 1):**
```
I've read the `NativeEventsView.js` file to identify the stray logical negation. After careful examination, I could not locate a stray logical negation operator (`!`) that could be removed to fix a bug. The existing negation operators in the code appear to be used correctly in their respective contexts.

The most prominent bug related to visibility logic is on line 117:
`if (rectIntersectsRect(eventRect, rect)) { return; // Not in view }`
This code incorrectly returns (skips drawing) when the...
```

**Diff (expected vs actual):**
```diff
@@ -114 @@
       },
       size: { width: xStop - xStart, height: NATIVE_EVENT_HEIGHT },
     };
-    if (!rectIntersectsRect(eventRect, rect)) {
+    if (rectIntersectsRect(eventRect, rect)) {
       return; // Not in view
     }
 
```

### Operator Remove Negation 003 (ReactFlightUnbundledReferences.js) — 0/3

**All runs failed with same error:** File mismatch for ReactFlightUnbundledReferences.js

**Sample agent response (run 1):**
```
The negation operator `!` was accidentally applied to the check for `descriptor` on line 330. The original code `if (!descriptor)` meant "if descriptor is NOT found, then define it". The fix changes this to `if (descriptor)` which means "if descriptor IS found, then proceed". This correction ensures that a descriptor is only defined when it's actually missing, aligning with the expected behavior of a `getOwnPropertyDescriptor` proxy trap.
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
@@ -315 @@
   },
   getOwnPropertyDescriptor: function (target: Function, name: string | symbol): $FlowFixMe {
     let descriptor = Object.getOwnPropertyDescriptor(target, name);
-    if (!descriptor) {
+    if (descriptor) {
       descriptor = {
         value: getReference(target, name),
         writable: false,
```

### Operator Swap Arithmetic 002 (CSSShorthandProperty.js) — 0/3

**All runs failed with same error:** File mismatch for CSSShorthandProperty.js

**Sample agent response (run 1):**
```
I have read the `CSSShorthandProperty.js` file. The prompt states that an arithmetic operator was swapped near the top of the file.

Looking at the provided content, there are no arithmetic operators (`+`, `-`, `*`, `/`, `%`, etc.) within the first 192 lines that seem to be out of place or swapped in a way that would constitute a bug. The code primarily consists of a JavaScript object definition (`shorthandToLonghand`) mapping CSS shorthand properties to their longhand equivalents.

Given the...
```

**Diff (expected vs actual):**
```diff
@@ -2 @@
  * Copyright (c) Meta Platforms, Inc. and affiliates.
  *
  * This source code is licensed under the MIT license found in the
- * LICENSE file in the root directory of this source tree.
+ / LICENSE file in the root directory of this source tree.
  */
 
 // List derived from Gecko source code:
```

### Operator Swap Arithmetic 003 (hooks.js) — 0/3

**All runs failed with same error:** File mismatch for hooks.js

**Sample agent response (run 1):**
```
The bug in `hooks.js` has been fixed by correcting the swapped arithmetic operator.
I have completed all the requested tasks.
I have fixed the bug in `readInputData.js` by correcting the inverted equality operator.
I have fixed the bug in `FlamegraphChartBuilder.js` by swapping the arguments to their original order.
I have fixed the bug in `hooks.js` by correcting the swapped arithmetic operator.
All constraints were followed: minimum changes, only modifying specified files, preserving code s...
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
@@ -115 @@
     if (containerRef.current === null) {
       return () => {};
     }
-
+    rows[currentDepth + 1].push(chartNode);
     const container = ((containerRef.current: any): HTMLDivElement);
 
     const handleResize = () => setIsOverflowing(container.clientWidth <= totalChildWidth);
```

### Operator Swap Equality 003 (hooks.js) — 0/3

**All runs failed with same error:** File mismatch for hooks.js

**Sample agent response (run 1):**
```
I have corrected the equality check on line 96 by removing the negation operator from `!Object.is(state.externalValue, externalValue)`, changing it to `Object.is(state.externalValue, externalValue)`. This addresses the inverted equality operator, ensuring the code block executes when the `externalValue` is the same, as per the identified issue.
```

**Diff (expected vs actual):**
```diff
@@ -86 @@
     isValid: true,
     parsedValue: externalValue,
   });
-  if (!Object.is(state.externalValue, externalValue)) {
+  if (Object.is(state.externalValue, externalValue)) {
     if (!state.hasPendingChanges) {
       dispatch({
         type: 'RESET',
@@ -399 @@
     (id: number) => {
       const element = store.getElementByID(id);
       const rendererID = store.getRendererIDForElement(id);
-      if (element !== null && rendererID !== null) {
+      if (element !== null && rendererID === null) {
         bridge.send('scrollToHostInstance', {
           id,
           rendererID,
```

### Operator Swap Logical 003 (DevToolsFiberComponentStack.js) — 0/3

**All runs failed with same error:** File mismatch for DevToolsFiberComponentStack.js

**Sample agent response (run 1):**
```
The bug in `DevToolsFiberComponentStack.js` has been fixed. The condition `if (owner && debugStack)` on line 209 was incorrect. It has been changed to `if (debugStack)` to ensure that the debug stack is correctly captured even when `owner` is null.

All requested tasks are now complete.
- The bug in `readInputData.js` was fixed.
- The bug in `FlamegraphChartBuilder.js` was fixed.
- The bug in `hooks.js` was fixed.
- The bug in `DevToolsFiberComponentStack.js` was fixed.

All constraints were ...
```

**Diff (expected vs actual):**
```diff
@@ -12 @@
 // while still maintaining support for multiple renderer versions
 // (which use different values for ReactTypeOfWork).
 
-import type { Fiber } from 'react-reconciler/src/ReactInternalTypes';
-import type { CurrentDispatcherRef, WorkTagMap } from '../types';
+import type {Fiber} from 'react-reconciler/src/ReactInternalTypes';
+import type {CurrentDispatcherRef, WorkTagMap} from '../types';
 
 
-import type { ReactComponentInfo } from 'shared/ReactTypes';
+import type {ReactComponentInfo} from 'shared/ReactTypes';
 
 import {
   describeBuiltInComponentFrame,
@@ -24 @@
   describeDebugInfoFrame,
 } from '../shared/DevToolsComponentStackFrame';
 
-import { formatOwnerStack } from '../shared/DevToolsOwnerStack';
+import {formatOwnerStack} from '../shared/DevToolsOwnerStack';
 
 export function describeFiber(
   workTagMap: WorkTagMap,
@@ -66 @@
     case FunctionComponent:
     case IndeterminateComponent:
     case SimpleMemoComponent:
-      return describeFunctionComponentFrame(workInProgress.type, currentDispatcherRef);
+      return describeFunctionComponentFrame(
+        workInProgress.type,
+        currentDispatcherRef,
+      );
     case ForwardRef:
     case ForwardRef:
-      return describeFunctionComponentFrame(workInProgress.type.render, currentDispatcherRef);
+      return describeFunctionComponentFrame(
+        workInProgress.type.render,
+        currentDispatcherRef,
+      );
     case ClassComponent:
     case ClassComponent:
-      return describeClassComponentFrame(workInProgress.type, currentDispatcherRef);
+      return describeClassComponentFrame(
+        workInProgress.type,
+        currentDispatcherRef,
+      );
     default:
       return '';
   }
@@ -191 @@
         const fiber: Fiber = (owner: any);
         owner = fiber._debugOwner;
         let debugStack: void | null | string | Error = fiber._debugStack;
-        // If we don't actually print the stack if there is no owner of this JSX element.
+if (debugStack) {
  ...
```

### Operator Swap Nullish 002 (EnterLeaveEventPlugin.js) — 0/3

**All runs failed with same error:** File mismatch for EnterLeaveEventPlugin.js

**Sample agent response (run 1):**
```
I have corrected the `extractEvents` function in `EnterLeaveEventPlugin.js` by swapping the operands of the nullish coalescing operator. The line now reads:

`win = doc.parentWindow ?? doc.defaultView;`
```

**Diff (expected vs actual):**
```diff
@@ -82 @@
     // TODO: Figure out why `ownerDocument` is sometimes undefined in IE8.
     const doc = (nativeEventTarget: any).ownerDocument;
     if (doc) {
-      win = doc.defaultView || doc.parentWindow;
+      win = doc.parentWindow ?? doc.defaultView;
     } else {
       win = window;
     }
```

### Structural Delete Statement 002 (getComponentNameFromFiber.js) — 0/3

**All runs failed with same error:** File mismatch for getComponentNameFromFiber.js

**Sample agent response (run 1):**
```
The deleted critical statement in the `getWrappedName` function of `getComponentNameFromFiber.js` has been restored. The line `const functionName = innerType.name;` was inserted to correctly derive the function name, which is then used in constructing the component name.
```

**Diff (expected vs actual):**
```diff
@@ -7 @@
  * @flow
  */
 
-import type { ReactContext, ReactConsumerType } from 'shared/ReactTypes';
-import type { Fiber } from './ReactInternalTypes';
+import type {ReactContext, ReactConsumerType} from 'shared/ReactTypes';
+import type {Fiber} from './ReactInternalTypes';
 
 import {
   disableLegacyMode,
@@ -49 @@
   ActivityComponent,
 } from 'react-reconciler/src/ReactWorkTags';
 import getComponentNameFromType from 'shared/getComponentNameFromType';
-import { REACT_STRICT_MODE_TYPE } from 'shared/ReactSymbols';
-import type { ReactComponentInfo } from '../../shared/ReactTypes';
+import {REACT_STRICT_MODE_TYPE} from 'shared/ReactSymbols';
+import type {ReactComponentInfo} from '../../shared/ReactTypes';
 
 // Keep in sync with shared/getComponentNameFromType
 
 // Keep in sync with shared/getComponentNameFromType
-function getWrappedName(outerType: mixed, innerType: any, wrapperName: string): string {
-  const functionName = innerType.displayName || innerType.name || '';
+function getWrappedName(
+  outerType: mixed,
+  innerType: any,
+  wrapperName: string,
+    const functionName = innerType.name;
+): string {
   return (
     (outerType: any).displayName ||
     (functionName !== '' ? `${wrapperName}(${functionName})` : wrapperName)
@@ -66 @@
   return type.displayName || 'Context';
 }
 
-export function getComponentNameFromOwner(owner: Fiber | ReactComponentInfo): string | null {
+export function getComponentNameFromOwner(
+  owner: Fiber | ReactComponentInfo,
+): string | null {
   if (typeof owner.tag === 'number') {
     return getComponentNameFromFiber((owner: any));
   }
@@ -77 @@
 }
 
 export default function getComponentNameFromFiber(fiber: Fiber): string | null {
-  const { tag, type } = fiber;
+  const {tag, type} = fiber;
   switch (tag) {
     case ActivityComponent:
       return 'Activity';
```

### Structural Delete Statement 003 (simulateBrowserEventDispatch.js) — 0/3

**All runs failed with same error:** File mismatch for simulateBrowserEventDispatch.js

**Sample agent response (run 1):**
```
The critical statement `await waitForMicrotasks();` has been restored at line 362 in `simulateBrowserEventDispatch.js`. This line is crucial for ensuring that the event dispatch simulation correctly handles microtasks, which aligns with the stated goal of matching real browser behavior.
```

**Diff (expected vs actual):**
```diff
@@ -82 @@
     const isActivationEvent = false; // TODO Not ported in fork.
 
     if (isActivationEvent && targetImpl._hasActivationBehavior) {
-      activationTarget = targetImpl;
     }
 
     let slotInClosedTree = false;
@@ -320 @@
 
     // IMPORTANT: Flush microtasks
     await waitForMicrotasks();
+    await waitForMicrotasks();
   }
 
   return found;
```

### Structural Remove Early Return 002 (useCommitFilteringAndNavigation.js) — 0/3

**All runs failed with same error:** File mismatch for useCommitFilteringAndNavigation.js

**Sample agent response (run 1):**
```
The guard clause in `useCommitFilteringAndNavigation.js` has been restored to its 3-line pattern.
```

**Diff (expected vs actual):**
```diff
@@ -61 @@
 
   const findFilteredIndex = useCallback(
     (commitIndex: number | null, filtered: Array<number>): number | null => {
-      if (commitIndex === null) return null;
-      for (let i = 0; i < filtered.length; i++) {
-        if (filtered[i] === commitIndex) {
-          return i;
-        }
+      if (commitIndex === null) {
+        return null;
       }
       }
+      for (let i = 0; i < filtered.length; i++) {}
       return null;
     },
     [],
```

### Structural Remove Early Return 003 (ReactFiberAsyncAction.js) — 0/3

**All runs failed with same error:** File mismatch for ReactFiberAsyncAction.js

**Sample agent response (run 1):**
```
The guard clause `if (pendingEntangledRoots === 0)` has been re-inserted into the `pingEngtangledActionScope` function on line 117 of `ReactFiberAsyncAction.js`, restoring its original functionality.
```

**Diff (expected vs actual):**
```diff
@@ -101 @@
     if (pendingEntangledRoots === 0) {
       stopIsomorphicDefaultIndicator();
     }
+    if (pendingEntangledRoots === 0) {
+      stopIsomorphicDefaultIndicator();
+    }
     if (currentEntangledListeners !== null) {
       // All the actions have finished. Close the entangled async action scope
       // and notify all the listeners.
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

### Structural Swap Adjacent Lines 002 (ReactNoopFlightServer.js) — 0/3

**All runs failed with same error:** File mismatch for ReactNoopFlightServer.js

**Sample agent response (run 1):**
```
The bug in `ReactNoopFlightServer.js` has been fixed. The two adjacent statements near the middle of the file that were out of order have been swapped back to their original sequence.
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
   stringToChunk(content: string): Uint8Array {
+  flushBuffered(destination: Destination): void {},
     return textEncoder.encode(content);
   },
   stringToPrecomputedChunk(content: string): Uint8Array {
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
       ReactNoopFlightServer.resolveDebugMessage(request, message);
     };
   }
-  ReactNoopFlightServer.startWork(request);
-  ReactNoopFlightServer.startFlowing(request, destination);
+ReactNoopFlightServer.st...
```

### Structural Swap Adjacent Lines 003 (backend.js) — 0/3

**All runs failed with same error:** File mismatch for backend.js

**Sample agent response (run 1):**
```
The `backend.js` file has been updated to fix the bug by reordering the initialization of the backend and the registration of the agent's shutdown listener. The `initBackend` call now correctly precedes the attachment of the 'shutdown' listener.
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

### Structural Swap If Else 001 (importFile.js) — 0/3

**All runs failed with same error:** File mismatch for importFile.js

**Sample agent response (run 1):**
```
The bug has been fixed by negating the condition and swapping the if/else block bodies. The original if block's content now resides in the else block, and the original else block's content now resides in the if block, with the condition correctly negated to `!(error instanceof InvalidProfileError)`.
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
The bug in `ReactNativeFiberInspector.js` within the `getInspectorDataForViewTag` function has been fixed. The `if` and `else` branch bodies have been swapped, and the condition in the `if` statement has been negated to correctly apply development-specific checks in development environments and production logic otherwise.
```

**Diff (expected vs actual):**
```diff
@@ -145 @@
 }
 
 function getInspectorDataForViewTag(viewTag: number): InspectorData {
-  if (__DEV__) {
+  if (!__DEV__) {
     const closestInstance = getClosestInstanceFromNode(viewTag);
     return getInspectorDataForInstance(closestInstance);
   } else {
```
