# Edit Benchmark Report

## Configuration

| Setting | Value |
|---------|-------|
| Date | 2026-02-11T05:38:08.994Z |
| Model | xai/xai/grok-4-fast-non-reasonin |
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
| Successful Runs | 21 |
| **Task Success Rate** | **35.0% (21/60)** |
| Verified Rate | 35.0% (21/60) |
| Edit Tool Usage Rate | 98.3% (59/60) |
| **Edit Success Rate** | **86.1%** |
| Patch Failure Rate | 13.9% (11/79) |
| Tasks All Passing | 21 |
| Tasks Flaky/Failing | 39 |

### Tool Calls

| Tool | Total | Avg/Run |
|------|-------|---------|
| Read | 210 | 3.5 |
| Edit | 79 | 1.3 |
| Write | 0 | 0.0 |
| **Tool Input Chars** | 27,460 | 458 |

### Tokens & Time

| Metric | Total | Avg/Run |
|--------|-------|---------|
| Input Tokens | 952,551 | 15,876 |
| Output Tokens | 19,376 | 323 |
| Total Tokens | 4,667,291 | 77,788 |
| Duration | 442.5s | 7.4s |
| **Avg Indent Score** | — | **2.10** |

## Task Results

| Task | File | Success | Edit Hit | R/E/W | Tokens (In/Out) | Time | Indent |
|------|------|---------|----------|-------|-----------------|------|--------|
| Access Remove Optional Chain 001 | registerDevToolsEventLogger.js | 0/1 ❌ | 0.0% | 2/1/0 | 8,041/172 | 4.5s | 1.00 |
| Access Remove Optional Chain 002 | TimelineContext.js | 1/1 ✅ | 100.0% | 1/1/0 | 13,671/128 | 5.1s | 1.29 |
| Access Remove Optional Chain 003 | astUtils.js | 0/1 ❌ | 100.0% | 1/1/0 | 21,657/240 | 5.3s | 4.85 |
| Call Swap Call Args 001 | testHelpers.js | 1/1 ✅ | 100.0% | 1/1/0 | 16,854/123 | 6.7s | 1.33 |
| Call Swap Call Args 002 | FlamegraphChartBuilder.js | 0/1 ❌ | 100.0% | 2/1/0 | 7,027/187 | 3.8s | 3.79 |
| Call Swap Call Args 003 | SyntheticEvent.js | 0/1 ❌ | 60.0% | 3/10/0 | 29,771/970 | 13.5s | 1.50 |
| Duplicate Duplicate Line Flip 001 | index.js | 1/1 ✅ | 100.0% | 1/1/0 | 10,456/122 | 4.2s | 0.00 |
| Duplicate Duplicate Line Flip 002 | ActivityList.js | 0/1 ❌ | 66.7% | 2/3/0 | 31,621/402 | 11.2s | 0.00 |
| Duplicate Duplicate Line Flip 003 | SyntheticEvent.js | 0/1 ❌ | 100.0% | 1/1/0 | 20,019/123 | 3.8s | 1.02 |
| Identifier Identifier Multi Edit 001 | TabBar.js | 0/1 ❌ | 100.0% | 1/1/0 | 16,004/152 | 5.9s | 3.33 |
| Identifier Identifier Multi Edit 002 | EventPluginRegistry.js | 0/1 ❌ | 100.0% | 1/1/0 | 5,549/259 | 4.1s | 3.79 |
| Identifier Identifier Multi Edit 003 | ReactPerformanceTrackProperties.js | 0/1 ❌ | 100.0% | 1/1/0 | 7,734/186 | 4.4s | 9.95 |
| Import Swap Named Imports 001 | CommitFlamegraphListItem.js | 0/1 ❌ | 100.0% | 1/1/0 | 12,973/132 | 4.5s | 2.86 |
| Import Swap Named Imports 002 | ReactDOMTextarea.js | 1/1 ✅ | 100.0% | 6/1/0 | 14,314/368 | 9.0s | 2.41 |
| Import Swap Named Imports 003 | StyleEditor.js | 0/1 ❌ | 100.0% | 1/1/0 | 10,543/135 | 5.4s | 0.00 |
| Literal Flip Boolean 001 | testHelpers.js | 1/1 ✅ | 100.0% | 1/1/0 | 10,067/120 | 5.1s | 1.33 |
| Literal Flip Boolean 002 | ReactNoopFlightServer.js | 0/1 ❌ | 100.0% | 39/2/0 | 63,599/2,068 | 36.8s | 1.11 |
| Literal Flip Boolean 003 | ReactFlightDOMClientEdge.js | 0/1 ❌ | 100.0% | 1/1/0 | 5,189/143 | 4.9s | 3.55 |
| Literal Off By One 001 | githubAPI.js | 1/1 ✅ | 100.0% | 1/1/0 | 10,893/130 | 4.4s | 0.67 |
| Literal Off By One 002 | code-path.js | 0/1 ❌ | 100.0% | 1/1/0 | 7,485/129 | 4.5s | 3.40 |
| Literal Off By One 003 | InspectedElement.js | 0/1 ❌ | 0.0% | 5/1/0 | 16,832/326 | 9.6s | 3.60 |
| Operator Remove Negation 001 | ReactDOMClient.js | 0/1 ❌ | 100.0% | 1/1/0 | 6,959/152 | 3.3s | 1.08 |
| Operator Remove Negation 002 | NativeEventsView.js | 0/1 ❌ | 100.0% | 1/1/0 | 5,336/134 | 4.6s | 3.03 |
| Operator Remove Negation 003 | ReactFlightUnbundledReferences.js | 0/1 ❌ | 100.0% | 1/1/0 | 18,223/137 | 4.8s | 2.00 |
| Operator Swap Arithmetic 001 | fallbackEvalContext.js | 1/1 ✅ | 100.0% | 1/1/0 | 2,821/133 | 4.5s | 0.00 |
| Operator Swap Arithmetic 002 | CSSShorthandProperty.js | 0/1 ❌ | 100.0% | 62/0/0 | 90,373/3,536 | 52.9s | 2.88 |
| Operator Swap Arithmetic 003 | hooks.js | 0/1 ❌ | 100.0% | 5/1/0 | 38,910/305 | 10.6s | 2.28 |
| Operator Swap Comparison 001 | index.js | 0/1 ❌ | 100.0% | 1/1/0 | 3,213/113 | 4.8s | 7.00 |
| Operator Swap Comparison 002 | ReactFlightDOMServerBrowser.js | 1/1 ✅ | 100.0% | 1/1/0 | 5,387/177 | 5.7s | 1.57 |
| Operator Swap Comparison 003 | ReactFlightDOMServerNode.js | 0/1 ❌ | 100.0% | 1/3/0 | 21,302/279 | 6.6s | 1.91 |
| Operator Swap Equality 001 | readInputData.js | 1/1 ✅ | 100.0% | 1/1/0 | 12,937/123 | 4.2s | 1.00 |
| Operator Swap Equality 002 | editor.js | 1/1 ✅ | 100.0% | 1/1/0 | 19,264/122 | 5.1s | 0.17 |
| Operator Swap Equality 003 | hooks.js | 0/1 ❌ | 100.0% | 1/1/0 | 14,495/127 | 5.1s | 2.28 |
| Operator Swap Increment Decrement 001 | ReactFlightDOMClientNode.js | 1/1 ✅ | 100.0% | 1/1/0 | 7,770/125 | 4.4s | 1.52 |
| Operator Swap Increment Decrement 002 | ReactFlightDOMClientNode.js | 1/1 ✅ | 100.0% | 1/1/0 | 12,908/161 | 4.2s | 1.88 |
| Operator Swap Increment Decrement 003 | loadSourceAndMetadata.js | 1/1 ✅ | 100.0% | 1/1/0 | 8,906/145 | 3.7s | 3.72 |
| Operator Swap Logical 001 | profiling.js | 0/1 ❌ | 100.0% | 1/1/0 | 5,939/152 | 3.7s | 0.00 |
| Operator Swap Logical 002 | SourceMapMetadataConsumer.js | 0/1 ❌ | 100.0% | 1/1/0 | 12,328/162 | 5.0s | 1.50 |
| Operator Swap Logical 003 | DevToolsFiberComponentStack.js | 0/1 ❌ | 100.0% | 3/1/0 | 13,773/292 | 6.2s | 3.94 |
| Operator Swap Nullish 001 | getBatchRange.js | 1/1 ✅ | 100.0% | 1/1/0 | 6,119/138 | 4.1s | 1.33 |
| Operator Swap Nullish 002 | EnterLeaveEventPlugin.js | 1/1 ✅ | 100.0% | 1/1/0 | 4,665/130 | 4.5s | 1.54 |
| Operator Swap Nullish 003 | backend.js | 0/1 ❌ | 100.0% | 1/1/0 | 14,965/147 | 3.6s | 3.12 |
| Regex Swap Regex Quantifier 001 | githubAPI.js | 0/1 ❌ | 100.0% | 1/1/0 | 9,948/151 | 4.5s | 0.00 |
| Regex Swap Regex Quantifier 002 | ReactFlightStackConfigV8.js | 0/1 ❌ | 100.0% | 1/1/0 | 8,223/197 | 3.7s | 0.00 |
| Regex Swap Regex Quantifier 003 | utils.js | 0/1 ❌ | 100.0% | 1/1/0 | 10,909/143 | 3.9s | 2.00 |
| Structural Delete Statement 001 | UnsupportedVersionDialog.js | 1/1 ✅ | 100.0% | 3/1/0 | 16,775/217 | 6.3s | 6.22 |
| Structural Delete Statement 002 | getComponentNameFromFiber.js | 0/1 ❌ | 100.0% | 21/1/0 | 30,510/925 | 21.4s | 0.00 |
| Structural Delete Statement 003 | simulateBrowserEventDispatch.js | 0/1 ❌ | 100.0% | 5/1/0 | 9,442/1,011 | 18.4s | 4.46 |
| Structural Remove Early Return 001 | InspectedElementStateTree.js | 0/1 ❌ | 100.0% | 1/1/0 | 3,470/134 | 3.4s | 0.36 |
| Structural Remove Early Return 002 | useCommitFilteringAndNavigation.js | 0/1 ❌ | 100.0% | 1/1/0 | 4,811/198 | 3.9s | 1.33 |
| Structural Remove Early Return 003 | ReactFiberAsyncAction.js | 0/1 ❌ | 100.0% | 1/1/0 | 13,239/580 | 6.2s | 2.00 |
| Structural Swap Adjacent Lines 001 | ReactServerConsoleConfigPlain.js | 1/1 ✅ | 100.0% | 1/1/0 | 10,222/153 | 4.1s | 1.00 |
| Structural Swap Adjacent Lines 002 | ReactNoopFlightServer.js | 0/1 ❌ | 100.0% | 2/1/0 | 13,844/268 | 6.8s | 0.00 |
| Structural Swap Adjacent Lines 003 | backend.js | 0/1 ❌ | 60.0% | 3/5/0 | 47,037/572 | 13.2s | 3.08 |
| Structural Swap If Else 001 | importFile.js | 1/1 ✅ | 100.0% | 1/1/0 | 10,835/216 | 6.1s | 0.00 |
| Structural Swap If Else 002 | ReactNativeFiberInspector.js | 0/1 ❌ | 50.0% | 2/2/0 | 21,199/350 | 8.1s | 1.33 |
| Structural Swap If Else 003 | ReactDOMFizzStaticNode.js | 0/1 ❌ | 50.0% | 2/2/0 | 35,117/462 | 10.4s | 1.91 |
| Unicode Unicode Hyphen 001 | Rectangle.js | 1/1 ✅ | 100.0% | 1/1/0 | 7,808/125 | 3.4s | 3.00 |
| Unicode Unicode Hyphen 002 | UnsupportedBridgeProtocolDialog.js | 1/1 ✅ | 100.0% | 1/1/0 | 13,139/137 | 3.9s | 3.83 |
| Unicode Unicode Hyphen 003 | ReactTypes.js | 1/1 ✅ | 100.0% | 1/1/0 | 19,131/132 | 6.9s | 1.23 |

## Category Summary

| Category | Runs | Verified | Edit Used | Success | Min/Avg/Max Difficulty |
|----------|------|----------|-----------|---------|------------------------|
| access | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) | 7 / 8.7 / 10 |
| call | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) | 6 / 7.7 / 10 |
| duplicate | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) | 7 / 9.7 / 12 |
| identifier | 3 | 0.0% (0/3) | 100.0% (3/3) | 0.0% (0/3) | 6 / 9.3 / 14 |
| import | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) | 2 / 4.7 / 6 |
| literal | 6 | 33.3% (2/6) | 100.0% (6/6) | 33.3% (2/6) | 4 / 6.2 / 9 |
| operator | 21 | 42.9% (9/21) | 95.2% (20/21) | 42.9% (9/21) | 1 / 6.5 / 13 |
| regex | 3 | 0.0% (0/3) | 100.0% (3/3) | 0.0% (0/3) | 6 / 7.3 / 8 |
| structural | 12 | 25.0% (3/12) | 100.0% (12/12) | 25.0% (3/12) | 4 / 7.6 / 15 |
| unicode | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 1 / 3.0 / 6 |

## Mutation Summary

| Mutation | Category | Runs | Verified | Edit Used | Success |
|----------|----------|------|----------|-----------|---------|
| delete-statement | structural | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| duplicate-line-flip | duplicate | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| flip-boolean | literal | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| identifier-multi-edit | identifier | 3 | 0.0% (0/3) | 100.0% (3/3) | 0.0% (0/3) |
| off-by-one | literal | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| remove-early-return | structural | 3 | 0.0% (0/3) | 100.0% (3/3) | 0.0% (0/3) |
| remove-negation | operator | 3 | 0.0% (0/3) | 100.0% (3/3) | 0.0% (0/3) |
| remove-optional-chain | access | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| swap-adjacent-lines | structural | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| swap-arithmetic | operator | 3 | 33.3% (1/3) | 66.7% (2/3) | 33.3% (1/3) |
| swap-call-args | call | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| swap-comparison | operator | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| swap-equality | operator | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| swap-if-else | structural | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| swap-increment-decrement | operator | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| swap-logical | operator | 3 | 0.0% (0/3) | 100.0% (3/3) | 0.0% (0/3) |
| swap-named-imports | import | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| swap-nullish | operator | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| swap-regex-quantifier | regex | 3 | 0.0% (0/3) | 100.0% (3/3) | 0.0% (0/3) |
| unicode-hyphen | unicode | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |

## Difficulty Summary

| Difficulty Score | Runs | Verified | Edit Used | Success |
|------------------|------|----------|-----------|---------|
| 0-2 | 6 | 66.7% (4/6) | 100.0% (6/6) | 66.7% (4/6) |
| 3-5 | 12 | 33.3% (4/12) | 91.7% (11/12) | 33.3% (4/12) |
| 6-8 | 24 | 37.5% (9/24) | 100.0% (24/24) | 37.5% (9/24) |
| 9+ | 18 | 22.2% (4/18) | 100.0% (18/18) | 22.2% (4/18) |

## Edit Tool Errors

Failures where the edit tool returned an error or failed to apply the patch.

### Access Remove Optional Chain 001 (registerDevToolsEventLogger.js)

#### Run 1

##### Attempt 1

- Path: registerDevToolsEventLogger.js
- Operation: —

**Tool error**

```
No changes made to registerDevToolsEventLogger.js. The edits produced identical content.
```

**Patch args**

```diff
{
  "path": "registerDevToolsEventLogger.js",
  "edits": [
    {
      "replaceLine": {
        "loc": "36:kuo",
        "content": "         currentLoggingIFrame.contentWindow?.postMessage("
      }
    }
  ]
}
```

### Call Swap Call Args 003 (SyntheticEvent.js)

#### Run 1

##### Attempt 1

- Path: SyntheticEvent.js
- Operation: —

**Tool error**

```
2 lines have changed since last read. Use the updated LINE:HASH references shown below (>>> marks changed lines).

    317:q2k|     dispatchConfig,
    318:kvd|     targetInst,
>>> 319:99j|     nativeEvent,
    320:u6a|     nativeInst,
    321:8to|   );
    322:4yg| }
>>> 323:8zp| 
    324:fm8| function releasePooledEvent(event) {
    325:z7w|   const EventConstructor = this;
```

**Patch args**

```diff
{
  "path": "SyntheticEvent.js",
  "edits": [
    {
      "replaceLines": {
        "start": "319:q2k",
        "end": "323:8to",
        "content": "  dispatchConfig,\n  targetInst,\n  nativeEvent,\n  nativeInst,\n);"
      }
    }
  ]
}
```

##### Attempt 2

- Path: SyntheticEvent.js
- Operation: —

**Tool error**

```
2 lines have changed since last read. Use the updated LINE:HASH references shown below (>>> marks changed lines).

    309:q2k|       dispatchConfig,
    310:kvd|       targetInst,
>>> 311:99j|       nativeEvent,
    312:u6a|       nativeInst,
    313:8to|     );
    314:jh8|     return instance;
>>> 315:4yg|   }
    316:z1y|   return new EventConstructor(
    317:q2k|     dispatchConfig,
```

**Patch args**

```diff
{
  "path": "SyntheticEvent.js",
  "edits": [
    {
      "replaceLines": {
        "start": "311:q2k",
        "end": "315:8to",
        "content": "  dispatchConfig,\n  targetInst,\n  nativeEvent,\n  nativeInst,\n);"
      }
    }
  ]
}
```

##### Attempt 3

- Path: SyntheticEvent.js
- Operation: —

**Tool error**

```
2 lines have changed since last read. Use the updated LINE:HASH references shown below (>>> marks changed lines).

    307:bgx|   if (EventConstructor.eventPool.length) {
    308:69l|     const instance = EventConstructor.eventPool.pop();
>>> 309:zwo|     EventConstructor.call(
    310:6rv|       instance,
    311:q2k|       dispatchConfig,
    312:kvd|       targetInst,
>>> 313:u6a|       nativeInst,
    314:99j|       nativeEvent,
    315:8to|     );
```

**Patch args**

```diff
{
  "path": "SyntheticEvent.js",
  "edits": [
    {
      "replaceLines": {
        "start": "309:q2k",
        "end": "313:8to",
        "content": "      dispatchConfig,\n      targetInst,\n      nativeEvent,\n      nativeInst,\n    );"
      }
    }
  ]
}
```

##### Attempt 4

- Path: SyntheticEvent.js
- Operation: —

**Tool error**

```
2 lines have changed since last read. Use the updated LINE:HASH references shown below (>>> marks changed lines).

    315:8to|     );
    316:jh8|     return instance;
>>> 317:4yg|   }
    318:z1y|   return new EventConstructor(
    319:q2k|     dispatchConfig,
    320:kvd|     targetInst,
>>> 321:u6a|       nativeInst,
    322:99j|       nativeEvent,
    323:8to|   );
```

**Patch args**

```diff
{
  "path": "SyntheticEvent.js",
  "edits": [
    {
      "replaceLines": {
        "start": "317:q2k",
        "end": "321:8to",
        "content": "  dispatchConfig,\n  targetInst,\n  nativeEvent,\n  nativeInst,\n);"
      }
    }
  ]
}
```

### Duplicate Duplicate Line Flip 002 (ActivityList.js)

#### Run 1

##### Attempt 1

- Path: ActivityList.js
- Operation: —

**Tool error**

```
No changes made to ActivityList.js. The edits produced identical content.
The file differs from the original fixture at these lines:
167:s7h| -          payload: nextIndex === -1 ? null : activities[nextIndex].id,
168:wjh| +           payload: nextIndex === -1 ? null : activities[nextIndex].id ;
185:s7h| -          payload: nextIndex === -1 ? null : activities[nextIndex].id,
186:wjh| +           payload: nextIndex === -1 ? null : activities[nextIndex].id ;
```

**Patch args**

```diff
{
  "path": "ActivityList.js",
  "edits": [
    {
      "replaceLine": {
        "loc": "167:s7h",
        "content": "           payload: nextIndex === -1 ? null : activities[nextIndex].id,"
      }
    }
  ]
}
```

### Literal Off By One 003 (InspectedElement.js)

#### Run 1

##### Attempt 1

- Path: InspectedElement.js
- Operation: —

**Tool error**

```
No changes made to InspectedElement.js. The edits produced identical content.
```

**Patch args**

```diff
{
  "path": "InspectedElement.js",
  "edits": [
    {
      "replaceLine": {
        "loc": "81:7da",
        "content": "      const [, sourceURL, line, column] = source;"
      }
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
Invalid line reference "406: cgc". Expected format "LINE:HASH" (e.g. "5:aa").
```

**Patch args**

```diff
{
  "path": "backend.js",
  "edits": [
    {
      "replaceLines": {
        "start": "406: cgc",
        "end": "410: 49t",
        "content": "  const unsubscribeBackend = initBackend(\n    hook,\n    agent,\n    window,\n    isReloadAndProfileSupported,\n  );"
      }
    }
  ]
}
```

##### Attempt 2

- Path: backend.js
- Operation: —

**Tool error**

```
2 lines have changed since last read. Use the updated LINE:HASH references shown below (>>> marks changed lines).

    404:q2u|   });
    405:8zp| 
>>> 406:eh6|   initBackend(hook, agent, window, isReloadAndProfileSupported);
    407:8zp| 
    408:xts|   const unsubscribeBackend = () => {};
    409:8zp| 
    410:8zp| 
>>> 411:e00|   const nativeStyleResolver: ResolveNativeStyle | void =
    412:lj7|     resolveRNStyle || hook.resolveRNStyle;
    413:8zp| 
```

**Patch args**

```diff
{
  "path": "backend.js",
  "edits": [
    {
      "replaceLines": {
        "start": "406:cgc",
        "end": "411:8to",
        "content": "  initBackend(hook, agent, window, isReloadAndProfileSupported);\n\n  const unsubscribeBackend = () => {};\n"
      }
    }
  ]
}
```

### Structural Swap If Else 002 (ReactNativeFiberInspector.js)

#### Run 1

##### Attempt 1

- Path: ReactNativeFiberInspector.js
- Operation: —

**Tool error**

```
Invalid line reference "160: qxb". Expected format "LINE:HASH" (e.g. "5:aa").
```

**Patch args**

```diff
{
  "path": "ReactNativeFiberInspector.js",
  "edits": [
    {
      "replaceLines": {
        "start": "160: qxb",
        "end": "167:4yg",
        "content": "  } else {\n    throw new Error(\n      'getInspectorDataForViewTag() is not available in production',\n    );\n  }\n\n  const closestInstance = getClosestInstanceFromNode(viewTag);\n  return getInspectorDataForInstance(closestInstance);"
      }
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
Invalid line reference "262: fyg". Expected format "LINE:HASH" (e.g. "5:aa").
```

**Patch args**

```diff
{
  "path": "ReactDOMFizzStaticNode.js",
  "edits": [
    {
      "replaceLines": {
        "start": "262: fyg",
        "end": "273:4yg",
        "content": "    if (options && options.signal) {\n      const listener = () => {\n        abort(request, (signal: any).reason);\n        signal.removeEventListener('abort', listener);\n      };\n      signal.addEventListener('abort', listener);\n    } else {\n      const signal = options.signal;\n      if (signal.aborted) {\n        abort(request, (signal: any).reason);\n      }\n    }"
      }
    }
  ]
}
```

## Failed Tasks (0% passing)

### Access Remove Optional Chain 001 (registerDevToolsEventLogger.js) — 0/1

**All runs failed with same error:** File mismatch for registerDevToolsEventLogger.js

**Sample agent response (run 1):**
```
The optional chaining operator is already present on line 36 (`currentLoggingIFrame.contentWindow?.postMessage`). No edit is required.
```

**Diff (expected vs actual):**
```diff
@@ -31 @@
         const additionalContext: LoggerContext | {} =
           fetchAdditionalContext != null ? await fetchAdditionalContext() : {};
 
-        currentLoggingIFrame?.contentWindow?.postMessage(
+        currentLoggingIFrame.contentWindow?.postMessage(
           {
             source: 'react-devtools-logging',
             event: eventWithoutMetadata,
```

### Access Remove Optional Chain 003 (astUtils.js) — 0/1

**All runs failed with same error:** File mismatch for astUtils.js

**Sample agent response (run 1):**
```
### Fix Applied

The bug was in the `isHook` function (lines 523–544), where a property access on `node.object` lacked optional chaining. This could cause runtime errors if `node.object` is null or undefined during AST traversal.

- **Change**: `const obj = node.object.name;` → `const obj = node.object?.name;`
- **Location**: Line 531 (original line numbering).
- **Impact**: Restores safe access to the `name` property without altering logic or structure. No other similar patterns were modifie...
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
@@ -487 @@
     !node.computed &&
     isHook(node.property)
   ) {
-    const obj = node.object;
+    const obj = node.object?.name;
     const isPascalCaseNameSpace = /^[A-Z].*/;
     return obj.type === AST_NODE_TYPES.IDENTIFIER && isPascalCaseNameSpace.test(obj.name);
   } else {
```

### Call Swap Call Args 002 (FlamegraphChartBuilder.js) — 0/1

**All runs failed with same error:** File mismatch for FlamegraphChartBuilder.js

**Sample agent response (run 1):**
```
Fixed: Swapped arguments in `profilerStore.getCommitData()` call on line 48 from `(rootID, commitIndex)` to `(commitIndex, rootID)`.
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

### Call Swap Call Args 003 (SyntheticEvent.js) — 0/1

**All runs failed with same error:** File mismatch for SyntheticEvent.js

**Sample agent response (run 1):**
```
The bug was in `createOrGetPooledEvent`: the call to `EventConstructor` and `new EventConstructor` had the last two arguments swapped (nativeInst and nativeEvent). Swapped them back to match the `SyntheticEvent` constructor signature.
```

**Diff (expected vs actual):**
```diff
@@ -58 @@
  * @param {object} nativeEvent Native browser event.
  * @param {DOMEventTarget} nativeEventTarget Target node.
  */
-function SyntheticEvent(dispatchConfig, targetInst, nativeEvent, nativeEventTarget) {
+function SyntheticEvent(
+  dispatchConfig,
+  targetInst,
+  nativeEvent,
+  nativeEventTarget,
+) {
   if (__DEV__) {
     // these have a getter/setter for warnings
     delete this.nativeEvent;
@@ -191 @@
       Object.defineProperty(
         this,
         'isDefaultPrevented',
-        getPooledWarningPropertyDefinition('isDefaultPrevented', functionThatReturnsFalse),
+        getPooledWarningPropertyDefinition(
+          'isDefaultPrevented',
+          functionThatReturnsFalse,
+        ),
       );
       Object.defineProperty(
         this,
@@ -196 @@
       Object.defineProperty(
         this,
         'isPropagationStopped',
-        getPooledWarningPropertyDefinition('isPropagationStopped', functionThatReturnsFalse),
+        getPooledWarningPropertyDefinition(
+          'isPropagationStopped',
+          functionThatReturnsFalse,
+        ),
       );
       Object.defineProperty(
         this,
@@ -250 @@
 function getPooledWarningPropertyDefinition(propName, getVal) {
   function set(val) {
     const action = isFunction ? 'setting the method' : 'setting the property';
-    warn(action, 'This is effectively a no-op');
+    warn('This is effectively a no-op', action);
     return val;
   }
 
@@ -255 @@
   }
 
   function get() {
-    const action = isFunction ? 'accessing the method' : 'accessing the property';
-    const result = isFunction ? 'This is a no-op function' : 'This is set to null';
+    const action = isFunction
+      ? 'accessing the method'
+      : 'accessing the property';
+    const result = isFunction
+      ? 'This is a no-op function'
+      : 'This is set to null';
     warn(action, result);
     return getVal;
   }
@@ -282 @@
   };
 }
 
-function createOrGetPooledEvent(dispatchConfig, targetInst, nativeEvent...
```

### Duplicate Duplicate Line Flip 002 (ActivityList.js) — 0/1

**All runs failed with same error:** File mismatch for ActivityList.js

**Sample agent response (run 1):**
```
The bug was in the `ArrowUp` and `ArrowDown` key handlers within `handleKeyDown`. The duplicated lines used `===` for strict equality, but the condition checks against `-1` (which is always falsy but intended as an exact match for the "All" option index). This caused incorrect navigation wrapping when `includeAllOption` is true.

Fixed by changing both instances to `==` (non-strict equality) for the intended loose check against `-1`.

To verify: Run the component with keyboard navigation enab...
```

**Diff (expected vs actual):**
```diff
@@ -18 @@
 import type Store from 'react-devtools-shared/src/devtools/store';
 
 import * as React from 'react';
-import { useContext, useMemo, useTransition } from 'react';
+import {useContext, useMemo, useTransition} from 'react';
 import {
   ComponentFilterActivitySlice,
   ElementTypeActivity,
@@ -24 @@
   ElementTypeActivity,
 } from 'react-devtools-shared/src/frontend/types';
 import styles from './ActivityList.css';
-import { TreeStateContext, TreeDispatcherContext } from '../Components/TreeContext';
-import { useHighlightHostInstance } from '../hooks';
-import { StoreContext } from '../context';
+import {
+  TreeStateContext,
+  TreeDispatcherContext,
+} from '../Components/TreeContext';
+import {useHighlightHostInstance} from '../hooks';
+import {StoreContext} from '../context';
 
 
-export function useChangeActivitySliceAction(): (id: Element['id'] | null) => void {
+export function useChangeActivitySliceAction(): (
+  id: Element['id'] | null,
+) => void {
   const store = useContext(StoreContext);
 
   function changeActivitySliceAction(activityID: Element['id'] | null) {
@@ -61 @@
   return changeActivitySliceAction;
 }
 
-function findNearestActivityParentID(elementID: Element['id'], store: Store): Element['id'] | null {
+function findNearestActivityParentID(
+  elementID: Element['id'],
+  store: Store,
+): Element['id'] | null {
   let currentID: null | Element['id'] = elementID;
   while (currentID !== null) {
     const element = store.getElementByID(currentID);
@@ -78 @@
 }
 
 function useSelectedActivityID(): Element['id'] | null {
-  const { inspectedElementID } = useContext(TreeStateContext);
+  const {inspectedElementID} = useContext(TreeStateContext);
   const store = useContext(StoreContext);
   return useMemo(() => {
     if (inspectedElementID === null) {
@@ -84 @@
     if (inspectedElementID === null) {
       return null;
     }
-    const nearestActivityID = findNearestActivityParentID(inspectedElementID, store);
+    const nearestA...
```

### Duplicate Duplicate Line Flip 003 (SyntheticEvent.js) — 0/1

**All runs failed with same error:** File mismatch for SyntheticEvent.js

**Sample agent response (run 1):**
```
Fixed duplicated line in `SyntheticEvent.js` (line 98): `'unknown'` → `'undefined'`.
```

**Diff (expected vs actual):**
```diff
@@ -95 @@
       if (event.preventDefault) {
         event.preventDefault();
         // $FlowFixMe[illegal-typeof] - flow is not aware of `unknown` in IE
-      } else if (typeof event.returnValue !== 'unknown') {
+      } else if (typeof event.returnValue !== 'undefined') {
         event.returnValue = false;
       }
       this.isDefaultPrevented = functionThatReturnsTrue;
@@ -448 @@
 
     // KeyPress is deprecated, but its replacement is not yet final and not
     // implemented in any major browser. Only KeyPress has charCode.
-    if (event.type === 'keypress') {
+    if (event.type !== 'keypress') {
       return getEventCharCode(
         // $FlowFixMe[incompatible-call] unable to narrow to `KeyboardEvent`
         event,
```

### Identifier Identifier Multi Edit 001 (TabBar.js) — 0/1

**All runs failed with same error:** File mismatch for TabBar.js

**Sample agent response (run 1):**
```
Fixed misspelling of `id` to `di` on line 96 and the corresponding use on line 112. No other occurrences found.
```

**Diff (expected vs actual):**
```diff
@@ -18 @@
 
 type TabInfo = {
   icon: IconType,
-  id: string,
+  di: string,
   label: string,
   title?: string,
 };
```

### Identifier Identifier Multi Edit 002 (EventPluginRegistry.js) — 0/1

**All runs failed with same error:** File mismatch for EventPluginRegistry.js

**Sample agent response (run 1):**
```
Fixed: restored `eventName` spelling in `publishEventForPlugin` calls and parameter usage.
```

**Diff (expected vs actual):**
```diff
@@ -87 @@
   if (eventNameDispatchConfigs.hasOwnProperty(eventName)) {
     throw new Error(
       'EventPluginRegistry: More than one plugin attempted to publish the same ' +
-        `event name, \`${eventName}\`.`,
+        `event name, "${eventName}".`,
     );
   }
 
```

### Identifier Identifier Multi Edit 003 (ReactPerformanceTrackProperties.js) — 0/1

**All runs failed with same error:** File mismatch for ReactPerformanceTrackProperties.js

**Sample agent response (run 1):**
```
Fixed the misspelled "DADED" to "ADDED" in line 281 and the malformed Unicode in "UNCHANGED" (line 282) to use the correct figure space (U+2007). These were the only occurrences of clear identifier misspellings in the file.
```

**Diff (expected vs actual):**
```diff
@@ -229 @@
 }
 
 const REMOVED = '\u2013\xa0';
-const ADDED = '+\xa0';
-const UNCHANGED = '\u2007\xa0';
+const ADDED = '+ ';
+const UNCHANGED = '  ';
 
 export function addObjectDiffToProperties(
   prev: Object,
@@ -305 @@
               const typeName = getComponentNameFromType(nextValue.type) || '\u2026';
               const line = '\xa0\xa0'.repeat(indent) + key;
               const desc = '<' + typeName + ' \u2026 />';
-              properties.push([REMOVED + line, desc], [ADDED + line, desc]);
+              properties.push([REMOVED + line, desc], [DADED + line, desc]);
               isDeeplyEqual = false;
               continue;
             }
@@ -373 @@
         isDeeplyEqual = false;
       }
     } else {
-      properties.push([ADDED + '\xa0\xa0'.repeat(indent) + key, '\u2026']);
+      properties.push([DADED + '\xa0\xa0'.repeat(indent) + key, '\u2026']);
       isDeeplyEqual = false;
     }
 
```

### Import Swap Named Imports 001 (CommitFlamegraphListItem.js) — 0/1

**All runs failed with same error:** File mismatch for CommitFlamegraphListItem.js

**Sample agent response (run 1):**
```
Fixed: Swapped `Fragment` and `memo` in the line 11 import destructuring.
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
Fixed: Swapped `StoreContext` and `BridgeContext` in the destructuring import (lines 15-16).
```

**Diff (expected vs actual):**
```diff
@@ -8 @@
  */
 
 import * as React from 'react';
-import { useContext, useMemo, useRef, useState } from 'react';
-import { copy } from 'clipboard-js';
-import { BridgeContext, StoreContext } from 'react-devtools-shared/src/devtools/views/context';
+import {useMemo, useContext, useRef, useState} from 'react';
+import {copy} from 'clipboard-js';
+import {
+  BridgeContext,
+  StoreContext,
+  StoreContext,
 import Button from '../../Button';
 import ButtonIcon from '../../ButtonIcon';
 import Button from '../../Button';
 import ButtonIcon from '../../ButtonIcon';
-import { serializeDataForCopy } from '../../utils';
+import {serializeDataForCopy} from '../../utils';
 import AutoSizeInput from './AutoSizeInput';
 import styles from './StyleEditor.css';
 import AutoSizeInput from './AutoSizeInput';
 import styles from './StyleEditor.css';
-import { sanitizeForParse } from '../../../utils';
-import { withPermissionsCheck } from 'react-devtools-shared/src/frontend/utils/withPermissionsCheck';
+import {sanitizeForParse} from '../../../utils';
+import {withPermissionsCheck} from 'react-devtools-shared/src/frontend/utils/withPermissionsCheck';
 
 
-import type { Style } from './types';
+import type {Style} from './types';
 
 type Props = {
   id: number,
@@ -29 @@
 type ChangeAttributeFn = (oldName: string, newName: string, value: any) => void;
 type ChangeValueFn = (name: string, value: any) => void;
 
-export default function StyleEditor({ id, style }: Props): React.Node {
+export default function StyleEditor({id, style}: Props): React.Node {
   const bridge = useContext(BridgeContext);
   const store = useContext(StoreContext);
 
@@ -60 @@
 
   const keys = useMemo(() => Array.from(Object.keys(style)), [style]);
 
-  const handleCopy = withPermissionsCheck({ permissions: ['clipboardWrite'] }, () =>
-    copy(serializeDataForCopy(style)),
+  const handleCopy = withPermissionsCheck(
+    {permissions: ['clipboardWrite']},
+    () => copy(serializeDataForCopy(style)),
   )...
```

### Literal Flip Boolean 002 (ReactNoopFlightServer.js) — 0/1

**All runs failed with same error:** File mismatch for ReactNoopFlightServer.js

**Sample agent response (run 1):**
```
The boolean literal at line 40 was inverted from `false` to `true`. This is the only change made.

To verify, run a test that exercises `writeChunkAndReturn` and check if the returned boolean now matches the intended logic (likely expecting `true` to indicate successful write in noop mode).
```

**Diff (expected vs actual):**
```diff
@@ -83 @@
     undefined,
     __DEV__ && options ? options.environmentName : undefined,
     __DEV__ && options ? options.filterStackFrame : undefined,
-    __DEV__ && options && options.debugChannel !== undefined,
+    __DEV__ && options && options.debugChannel === undefined,
   );
   const signal = options ? options.signal : undefined;
   if (signal) {
```

### Literal Flip Boolean 003 (ReactFlightDOMClientEdge.js) — 0/1

**All runs failed with same error:** File mismatch for ReactFlightDOMClientEdge.js

**Sample agent response (run 1):**
```
Fixed inverted boolean in replay console logs logic (line 110): `=== false` → `!== true` to correctly default to `true`.
```

**Diff (expected vs actual):**
```diff
@@ -100 @@
     typeof options.nonce === 'string' ? options.nonce : undefined,
     options && options.temporaryReferences ? options.temporaryReferences : undefined,
     __DEV__ && options && options.findSourceMapURL ? options.findSourceMapURL : undefined,
-    __DEV__ && options ? options.replayConsoleLogs === true : false, // defaults to false
+    __DEV__ && options ? options.replayConsoleLogs !== true : true, // defaults to true
     __DEV__ && options && options.environmentName ? options.environmentName : undefined,
     __DEV__ && options && options.startTime != null ? options.startTime : undefined,
     __DEV__ && options && options.endTime != null ? options.endTime : undefined,
```

### Literal Off By One 002 (code-path.js) — 0/1

**All runs failed with same error:** File mismatch for code-path.js

**Sample agent response (run 1):**
```
Fixed off-by-one in `code-path.js` line 225. The `end` index was exclusive; changed to inclusive `length` for correct traversal boundary.
```

**Diff (expected vs actual):**
```diff
@@ -86 @@
    * @type {CodePathSegment[]}
    */
   get finalSegments() {
-    return this.internal.finalSegments;
+    end = segment.nextSegments.length;
   }
 
   /**
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

### Literal Off By One 003 (InspectedElement.js) — 0/1

**All runs failed with same error:** File mismatch for InspectedElement.js

**Sample agent response (run 1):**
```
The file `InspectedElement.js` has been read and analyzed for numeric boundaries. No off-by-one error was found in any numeric calculations, array accesses, conditionals, or similar patterns. The code uses safe practices like optional chaining and null checks for potentially undefined values. If the bug is in a different file or requires additional context (e.g., a specific line or runtime behavior), provide more details.
```

**Diff (expected vs actual):**
```diff
@@ -179 @@
   }
 
   let strictModeBadge = null;
-  if (element.isStrictModeNonCompliant && element.parentID !== 0) {
+  if (element.isStrictModeNonCompliant && element.parentID !== 1) {
     strictModeBadge = (
       <Tooltip label="This component is not running in StrictMode. Click to learn more.">
         <a
```

### Operator Remove Negation 001 (ReactDOMClient.js) — 0/1

**All runs failed with same error:** File mismatch for ReactDOMClient.js

**Sample agent response (run 1):**
```
Fixed. The stray `!` before `window.self` on line 57 has been removed, changing `window.top === window.self` to `window.top !== window.self` for the intended dev tools warning logic.
```

**Diff (expected vs actual):**
```diff
@@ -49 @@
 const foundDevTools = injectIntoDevTools();
 
 if (__DEV__) {
-  if (!foundDevTools && canUseDOM && window.top === window.self) {
+  if (foundDevTools && canUseDOM && window.top !== window.self) {
     // If we're in Chrome or Firefox, provide a download link if not installed.
     if (
       (navigator.userAgent.indexOf('Chrome') > -1 && navigator.userAgent.indexOf('Edge') === -1) ||
```

### Operator Remove Negation 002 (NativeEventsView.js) — 0/1

**All runs failed with same error:** File mismatch for NativeEventsView.js

**Sample agent response (run 1):**
```
Fixed: Removed stray `!` from the `rectIntersectsRect` check in `_drawSingleNativeEvent`, correcting the early return logic to draw events that intersect the visible area.
```

**Diff (expected vs actual):**
```diff
@@ -114 @@
       },
       size: { width: xStop - xStart, height: NATIVE_EVENT_HEIGHT },
     };
-    if (!rectIntersectsRect(eventRect, rect)) {
-      return; // Not in view
+    if (rectIntersectsRect(eventRect, rect)) {
+      return; // In view
     }
 
     const width = durationToWidth(duration, scaleFactor);
```

### Operator Remove Negation 003 (ReactFlightUnbundledReferences.js) — 0/1

**All runs failed with same error:** File mismatch for ReactFlightUnbundledReferences.js

**Sample agent response (run 1):**
```
Fixed negation bug in `ReactFlightUnbundledReferences.js` at line 282: changed `return !then;` to `return then;` (thenable case for non-async client reference).
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
@@ -274 @@
           false,
         ));
         return then;
-      } else {
+        return then;
         // Since typeof .then === 'function' is a feature test we'd continue recursing
         // indefinitely if we return a function. Instead, we return an object reference
         // if we check further.
```

### Operator Swap Arithmetic 002 (CSSShorthandProperty.js) — 0/1

**All runs failed with same error:** File mismatch for CSSShorthandProperty.js

**Sample agent response (run 1):**
```
The file CSSShorthandProperty.js is a simple export of a constant mapping CSS shorthand properties to their longhand components. No arithmetic operators appear in the code. The file is clean and correct as-is; no bug is present to fix.

If the file path is incorrect or this is not the intended file, provide the full path or more context.
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

### Operator Swap Arithmetic 003 (hooks.js) — 0/1

**All runs failed with same error:** File mismatch for hooks.js

**Sample agent response (run 1):**
```
Bug fixed in `hooks.js`: Swapped `<=` to `<` in the `useIsOverflowing` hook's resize handler (line 129). This corrects the overflow detection logic, as `clientWidth` equals `totalChildWidth` should not trigger "overflowing" (no scrollbar appears).
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

### Operator Swap Comparison 001 (index.js) — 0/1

**All runs failed with same error:** File mismatch for index.js

**Sample agent response (run 1):**
```
Fixed. The `<` was swapped to `>` on line 63.
```

**Diff (expected vs actual):**
```diff
@@ -61 @@
         </Context.Provider>
         <StrictMode>
           <Suspense fallback={<div>Loading...</div>}>
+            :
             <ClassComponent />
             <FunctionComponent />
             <MemoFunctionComponent />
```

### Operator Swap Comparison 003 (ReactFlightDOMServerNode.js) — 0/1

**All runs failed with same error:** File mismatch for ReactFlightDOMServerNode.js

**Sample agent response (run 1):**
```
The bug was in three places where `signal.aborted` (a boolean) was checked with `if (signal.aborted)`, which can fail if the property is non-boolean due to loose equality. Fixed with strict equality `=== true`. No other changes.
```

**Diff (expected vs actual):**
```diff
@@ -332 @@
   );
   if (options && options.signal) {
     const signal = options.signal;
-    if (signal.aborted) {
+    if (signal.aborted === true) {
       abort(request, (signal: any).reason);
     } else {
       const listener = () => {
@@ -443 @@
     );
     if (options && options.signal) {
       const signal = options.signal;
-      if (signal.aborted) {
+      if (signal.aborted === true) {
         const reason = (signal: any).reason;
         abort(request, reason);
       } else {
@@ -504 @@
     );
     if (options && options.signal) {
       const signal = options.signal;
-      if (signal.aborted) {
+      if (signal.aborted === true) {
         const reason = (signal: any).reason;
         abort(request, reason);
       } else {
@@ -538 @@
   let pendingFiles = 0;
   const queuedFields: Array<string> = [];
   busboyStream.on('field', (name, value) => {
-    if (pendingFiles > 0) {
+    if (pendingFiles >= 0) {
       // Because the 'end' event fires two microtasks after the next 'field'
       // we would resolve files and fields out of order. To handle this properly
       // we queue any fields we receive until the previous file is done.
```

### Operator Swap Equality 003 (hooks.js) — 0/1

**All runs failed with same error:** File mismatch for hooks.js

**Sample agent response (run 1):**
```
Fixed inverted equality in `hooks.js` at line 129: `<=` changed to `<` in `useIsOverflowing` hook.
```

**Diff (expected vs actual):**
```diff
@@ -118 @@
 
     const container = ((containerRef.current: any): HTMLDivElement);
 
-    const handleResize = () => setIsOverflowing(container.clientWidth <= totalChildWidth);
+    const handleResize = () => setIsOverflowing(container.clientWidth < totalChildWidth);
 
     handleResize();
 
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

### Operator Swap Logical 001 (profiling.js) — 0/1

**All runs failed with same error:** File mismatch for profiling.js

**Sample agent response (run 1):**
```
Fixed the boolean operator on line 6 of `profiling.js` from `&&` to `||` to match the intended logic (bail out unless both the global hook exists and its checkDCE method is a function).
```

**Diff (expected vs actual):**
```diff
@@ -3 @@
 function checkDCE() {
   /* global __REACT_DEVTOOLS_GLOBAL_HOOK__ */
   if (
-    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === 'undefined' ||
+    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== 'function' ||
     typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== 'function'
   ) {
     return;
```

### Operator Swap Logical 002 (SourceMapMetadataConsumer.js) — 0/1

**All runs failed with same error:** File mismatch for SourceMapMetadataConsumer.js

**Sample agent response (run 1):**
```
Fixed: Changed `&&` to `||` in the React sources check (lines 156–159) to apply metadata if the property exists, even if null.
```

**Diff (expected vs actual):**
```diff
@@ -7 @@
  * @flow strict-local
  */
 
-import type { Position } from './astUtils';
+import type {Position} from './astUtils';
 import type {
   ReactSourceMetadata,
   IndexSourceMap,
@@ -14 @@
   BasicSourceMap,
   MixedSourceMap,
 } from './SourceMapTypes';
-import type { HookMap } from './generateHookMap';
+import type {HookMap} from './generateHookMap';
 import * as util from 'source-map-js/lib/util';
 import * as util from 'source-map-js/lib/util';
-import { decodeHookMap } from './generateHookMap';
-import { getHookNameForLocation } from './getHookNameForLocation';
+import {decodeHookMap} from './generateHookMap';
+import {getHookNameForLocation} from './getHookNameForLocation';
 
 type MetadataMap = Map<string, ?ReactSourceMetadata>;
 
@@ -31 @@
  * By default, source names are normalized using the same logic that the `source-map-js@0.6.2` package uses internally.
  * This is crucial for keeping the sources list in sync with a `SourceMapConsumer` instance.
  */
-function normalizeSourcePath(sourceInput: string, map: { +sourceRoot?: ?string, ... }): string {
-  const { sourceRoot } = map;
+function normalizeSourcePath(
+  sourceInput: string,
+  map: {+sourceRoot?: ?string, ...},
+): string {
+  const {sourceRoot} = map;
   let source = sourceInput;
 
   source = String(source);
@@ -45 @@
   // be particularly problematic when the source root is a prefix of the
   // source (valid, but why??). See github issue #199 and bugzil.la/1188982.
   source =
-    sourceRoot != null && util.isAbsolute(sourceRoot) && util.isAbsolute(source)
+    sourceRoot != null && util.isAbsolute(sourceRoot) || util.isAbsolute(source)
       ? util.relative(sourceRoot, source)
       : source;
   return util.computeSourceURL(sourceRoot, source);
@@ -76 @@
    * `SourceMapConsumer#originalPositionFor` to retrieve a source location,
    * then pass that location to `hookNameFor`.
    */
-  hookNameFor({ line, column, source }: { ...Position, +source: ?string }): ?string {
+  hookNam...
```

### Operator Swap Logical 003 (DevToolsFiberComponentStack.js) — 0/1

**All runs failed with same error:** File mismatch for DevToolsFiberComponentStack.js

**Sample agent response (run 1):**
```
Fixed the incorrect logical operator in the owner stack generation logic. The condition `if (owner || ownerStack)` was buggy (always true, skipping the addition of the owner stack frame when there was no further owner). Changed to `if (ownerStack && owner)` to add the frame only when both are present.
```

**Diff (expected vs actual):**
```diff
@@ -209 @@
         // Server Component
         const ownerStack: Error = owner.debugStack;
         owner = owner.owner;
-        if (owner && ownerStack) {
+        if (ownerStack && owner) {
           info += '\n' + formatOwnerStack(ownerStack);
         }
       } else {
```

### Operator Swap Nullish 003 (backend.js) — 0/1

**All runs failed with same error:** File mismatch for backend.js

**Sample agent response (run 1):**
```
Fixed: Swapped `??` to `||` on line 218 for `resolveRNStyle` fallback, as the hook value is `null` (not `undefined`) when unset, making `??` fail to fallback.
```

**Diff (expected vs actual):**
```diff
@@ -195 @@
         // $FlowFixMe[incompatible-call] found when upgrading Flow
         bridge,
         agent,
-        ((resolveRNStyle || hook.resolveRNStyle: any): ResolveNativeStyle),
+        (resolveRNStyle || hook.resolveRNStyle: ResolveNativeStyle),
         nativeStyleEditorValidAttributes || hook.nativeStyleEditorValidAttributes || null,
       );
     } else {
```

### Regex Swap Regex Quantifier 001 (githubAPI.js) — 0/1

**All runs failed with same error:** File mismatch for githubAPI.js

**Sample agent response (run 1):**
```
The regex on line 19 in `githubAPI.js` used `*` (zero or more digits), which incorrectly matches the empty string between quotes, causing unintended removals. Changing it to `+` (one or more digits) fixes this while preserving the structure.
```

**Diff (expected vs actual):**
```diff
@@ -16 @@
 
 export function searchGitHubIssuesURL(message: string): string {
   // Remove Fiber IDs from error message (as those will be unique).
-  message = message.replace(/"[0-9]+"/g, '');
+  message = message.replace(/
 
   const filters = [
     'in:title',
@@ -36 @@
   );
 }
 
-export async function searchGitHubIssues(message: string): Promise<GitHubIssue | null> {
+export async function searchGitHubIssues(
+  message: string,
+): Promise<GitHubIssue | null> {
   const response = await fetch(searchGitHubIssuesURL(message));
   const data = await response.json();
   if (data.items.length > 0) {
```

### Regex Swap Regex Quantifier 002 (ReactFlightStackConfigV8.js) — 0/1

**All runs failed with same error:** File mismatch for ReactFlightStackConfigV8.js

**Sample agent response (run 1):**
```
**Fix applied:** In `ReactFlightStackConfigV8.js`, line 147's comment had `async filename*` (incorrectly using `*` for one instance of "filename"). Changed to `async filename+` to correctly indicate one or more non-whitespace characters in the filename group, matching the regex's `(.+):` pattern.

No other changes made. The file now correctly documents the V8 frame format for async calls.
```

**Diff (expected vs actual):**
```diff
@@ -7 @@
  * @flow
  */
 
-import type { ReactStackTrace } from 'shared/ReactTypes';
+import type {ReactStackTrace} from 'shared/ReactTypes';
 
 let framesToSkip: number = 0;
 let collectedStackTrace: null | ReactStackTrace = null;
@@ -20 @@
   const functionName = callSite.getFunctionName();
   let result = '';
   if (functionName) {
-    if (typeName && identifierRegExp.test(functionName) && functionName !== typeName) {
+    if (
+      typeName &&
+      identifierRegExp.test(functionName) &&
+      functionName !== typeName
+    ) {
       result += typeName + '.';
     }
     result += functionName;
@@ -45 @@
   return result;
 }
 
-function collectStackTracePrivate(error: Error, structuredStackTrace: CallSite[]): string {
+function collectStackTracePrivate(
+  error: Error,
+  structuredStackTrace: CallSite[],
+): string {
   const result: ReactStackTrace = [];
   // Collect structured stack traces from the callsites.
   // We mirror how V8 serializes stack frames and how we later parse them.
@@ -95 @@
           : 0;
       // $FlowFixMe[prop-missing]
       const isAsync = callSite.isAsync();
-      result.push([name, filename, line, col, enclosingLine, enclosingCol, isAsync]);
+      result.push([
+        name,
+        filename,
+        line,
+        col,
+        enclosingLine,
+        enclosingCol,
+        isAsync,
+      ]);
     }
   }
   collectedStackTrace = result;
@@ -102 @@
   return '';
 }
 
-function collectStackTrace(error: Error, structuredStackTrace: CallSite[]): string {
+function collectStackTrace(
+  error: Error,
+  structuredStackTrace: CallSite[],
+): string {
   collectStackTracePrivate(error, structuredStackTrace);
   // At the same time we generate a string stack trace just in case someone
   // else reads it. Ideally, we'd call the previous prepareStackTrace to
@@ -126 @@
 //     at filename:0:0
 //     at async filename:0:0
 const frameRegExp =
-  /^ {3} at (?:(.+) \((?:(.+):(\d+):(\d+)|\<anonymous\>)\)|(?:async )?(.+):(\d+...
```

### Regex Swap Regex Quantifier 003 (utils.js) — 0/1

**All runs failed with same error:** File mismatch for utils.js

**Sample agent response (run 1):**
```
Fixed regex in `utils.js` line 224: `/[^s]s$/i` → `/s$/i` to match singular words ending in 's' (e.g., "glass") for correct pluralization as "glasses".
```

**Diff (expected vs actual):**
```diff
@@ -188 @@
 }
 
 export function pluralize(word: string): string {
-  if (!/^[a-z]+$/i.test(word)) {
+  if (!/^[a-z]*$/i.test(word)) {
     // If it's not a single a-z word, give up.
     return word;
   }
@@ -209 @@
     /(ches|shes|ses|xes|zes)$/i.test(word) ||
     /[^s]ies$/i.test(word) ||
     /ves$/i.test(word) ||
-    /[^s]s$/i.test(word)
+    /s$/i.test(word)
   ) {
     return word;
   }
```

### Structural Delete Statement 002 (getComponentNameFromFiber.js) — 0/1

**All runs failed with same error:** File mismatch for getComponentNameFromFiber.js

**Sample agent response (run 1):**
```
Fixed. The missing line was `const functionName = getComponentNameFromType(innerType);` in `getWrappedName`.
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
+  const functionName = getComponentNameFromType(innerType);
+  wrapperName: string,
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

### Structural Delete Statement 003 (simulateBrowserEventDispatch.js) — 0/1

**All runs failed with same error:** File mismatch for simulateBrowserEventDispatch.js

**Sample agent response (run 1):**
```
### Verification
The fix inserts `eventImpl._path.reverse();` immediately after the capturing phase loop (after line 208). This ensures the path is correctly ordered for the bubbling phase loop (starting at line 210), restoring proper bottom-up propagation.

#### Why This Fixes the Bug
- **Before**: Path built as [root, ..., target]. Capturing runs correctly (end-to-start: root → target). Bubbling runs start-to-end: root → target (incorrect; should be target → root).
- **After**: Path reverse...
```

**Diff (expected vs actual):**
```diff
@@ -82 @@
     const isActivationEvent = false; // TODO Not ported in fork.
 
     if (isActivationEvent && targetImpl._hasActivationBehavior) {
-      activationTarget = targetImpl;
     }
 
     let slotInClosedTree = false;
@@ -179 @@
 
       await invokeEventListeners(struct, eventImpl, 'capturing');
     }
+    eventImpl._path.reverse();
 
     for (let i = 0; i < eventImpl._path.length; i++) {
       const struct = eventImpl._path[i];
```

### Structural Remove Early Return 001 (InspectedElementStateTree.js) — 0/1

**All runs failed with same error:** File mismatch for InspectedElementStateTree.js

**Sample agent response (run 1):**
```
Fixed. The guard clause is restored before the existing logic (lines 40-42 in the updated file).
```

**Diff (expected vs actual):**
```diff
@@ -36 @@
   store,
 }: Props): React.Node {
   const { state, type } = inspectedElement;
-  if (state == null) {
+
+  if (isEmpty || isHostComponent) {
     return null;
   }
     return null;
   }
-
   // HostSingleton and HostHoistable may have state that we don't want to expose to users
   const isHostComponent = type === ElementTypeHostComponent;
   const entries = Object.entries(state);
```

### Structural Remove Early Return 002 (useCommitFilteringAndNavigation.js) — 0/1

**All runs failed with same error:** File mismatch for useCommitFilteringAndNavigation.js

**Sample agent response (run 1):**
```
Fixed the bug in `useCommitFilteringAndNavigation` by restoring the guard clause in the `findFilteredIndex` callback. The early return now handles `commitIndex === null` before the loop, preserving the original structure.
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
+       
       return null;
     },
     [],
@@ -76 @@
   const adjustSelectionAfterFilterChange = useCallback(
     (newFilteredIndices: Array<number>) => {
       const currentSelectedIndex = selectedCommitIndex;
-      const selectedFilteredIndex = findFilteredIndex(currentSelectedIndex, newFilteredIndices);
+      const selectedFilteredIndex = findFilteredIndex(
+        currentSelec...
```

### Structural Remove Early Return 003 (ReactFiberAsyncAction.js) — 0/1

**All runs failed with same error:** File mismatch for ReactFiberAsyncAction.js

**Sample agent response (run 1):**
```
The bug in `entangleAsyncAction` is fixed. The removed guard clause (early return when `currentEntangledListeners === null`) is restored, preserving the exact original structure and comments. No other changes were made.
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

### Structural Swap Adjacent Lines 002 (ReactNoopFlightServer.js) — 0/1

**All runs failed with same error:** File mismatch for ReactNoopFlightServer.js

**Sample agent response (run 1):**
```
The bug was two adjacent statements swapped in the `ReactNoopFlightServer` configuration: the empty `flushBuffered` method was placed inside the `stringToChunk` method body, and the `stringToChunk` method declaration was after it.

Swapped them back to the original order (method declaration first, then the inner body return statement). No other changes.
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
 
@@ -45 @@
   flushBuffered(destination: Destination): void {},
   stringToChunk(content: string): Uint8Array {
     return textEncoder.encode(content);
-  },
+  }
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

### Structural Swap Adjacent Lines 003 (backend.js) — 0/1

**All runs failed with same error:** File mismatch for backend.js

**Sample agent response (run 1):**
```
The bug was in `connectWithCustomMessagingProtocol`: `initBackend` returned an unsubscribe function, but it was called before the assignment to `unsubscribeBackend` (a no-op), so the return value was discarded and the function returned undefined instead of the unsubscribe. Swapped the order.

This is the only instance of this pattern in the file.
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
+  initBackend(hook, agent, window, isReloadAndProfileSupported);
 
   const nativeStyleResolver: ResolveNativeStyle | void = resolveRNStyle || hook.resolveRNStyle;
 
@@ -387 @@
     setupNativeStyleEditor(bridge, agent, nativeStyleResolver, validAttributes);
   }
 
-  return unsubscribeBackend;
+  return () => {};
 }
```

### Structural Swap If Else 002 (ReactNativeFiberInspector.js) — 0/1

**All runs failed with same error:** File mismatch for ReactNativeFiberInspector.js

**Sample agent response (run 1):**
```
Fixed the swapped if/else branches in `getInspectorDataForViewTag` by negating the condition (now `if (!__DEV__)` effectively) and swapping the branch bodies.
```

**Diff (expected vs actual):**
```diff
@@ -7 @@
  * @flow
  */
 
-import type { Fiber } from 'react-reconciler/src/ReactInternalTypes';
-import type { TouchedViewDataAtPoint, InspectorData } from './ReactNativeTypes';
+import type {Fiber} from 'react-reconciler/src/ReactInternalTypes';
+import type {TouchedViewDataAtPoint, InspectorData} from './ReactNativeTypes';
 
 import {
   findCurrentHostFiber,
@@ -15 @@
   findCurrentFiberUsingSlowPath,
 } from 'react-reconciler/src/ReactFiberTreeReflection';
 import getComponentNameFromType from 'shared/getComponentNameFromType';
-import { HostComponent } from 'react-reconciler/src/ReactWorkTags';
+import {HostComponent} from 'react-reconciler/src/ReactWorkTags';
 // Module provided by RN:
 import {
   UIManager,
@@ -21 @@
   UIManager,
   getNodeFromPublicInstance,
 } from 'react-native/Libraries/ReactPrivate/ReactNativePrivateInterface';
-import { getClosestInstanceFromNode } from './ReactNativeComponentTree';
-import { getNodeFromInternalInstanceHandle, findNodeHandle } from './ReactNativePublicCompat';
-import { getStackByFiberInDevAndProd } from 'react-reconciler/src/ReactFiberComponentStack';
+import {getClosestInstanceFromNode} from './ReactNativeComponentTree';
+import {
+  getNodeFromInternalInstanceHandle,
+  findNodeHandle,
+} from './ReactNativePublicCompat';
+import {getStackByFiberInDevAndProd} from 'react-reconciler/src/ReactFiberComponentStack';
 
 
-let getInspectorDataForInstance: (closestInstance: Fiber | null) => InspectorData;
+let getInspectorDataForInstance: (
+  closestInstance: Fiber | null,
+) => InspectorData;
 
 if (__DEV__) {
   const emptyObject = Object.freeze({});
@@ -32 @@
 
   // $FlowFixMe[missing-local-annot]
   const createHierarchy = function (fiberHierarchy) {
-    return fiberHierarchy.map((fiber) => ({
+    return fiberHierarchy.map(fiber => ({
       name: getComponentNameFromType(fiber.type),
       getInspectorData: () => {
         return {
@@ -37 @@
       getInspectorData: () => {
         return {
           prop...
```

### Structural Swap If Else 003 (ReactDOMFizzStaticNode.js) — 0/1

**All runs failed with same error:** File mismatch for ReactDOMFizzStaticNode.js

**Sample agent response (run 1):**
```
Fixed: Swapped the if/else branches in the signal handling for the `prerender` function (lines 262–273). The condition `if (signal.aborted)` now correctly aborts immediately in the `if` branch when a signal is provided, and the listener setup is in the `else` branch for non-aborted signals.
```

**Diff (expected vs actual):**
```diff
@@ -164 @@
       onFatalError,
     );
     if (options && options.signal) {
+      const listener = () => {
+        abort(request, (signal: any).reason);
+        signal.removeEventListener('abort', listener);
+      };
+      signal.addEventListener('abort', listener);
+    } else {
       const signal = options.signal;
       if (signal.aborted) {
         abort(request, (signal: any).reason);
       const signal = options.signal;
       if (signal.aborted) {
         abort(request, (signal: any).reason);
-      } else {
-        const listener = () => {
-          abort(request, (signal: any).reason);
-          signal.removeEventListener('abort', listener);
-        };
-        signal.addEventListener('abort', listener);
       }
     }
     startWork(request);
@@ -256 @@
       onFatalError,
     );
     if (options && options.signal) {
+      const listener = () => {
+        abort(request, (signal: any).reason);
+        signal.removeEventListener('abort', listener);
+      };
+      signal.addEventListener('abort', listener);
+    } else {
       const signal = options.signal;
       if (signal.aborted) {
         abort(request, (signal: any).reason);
       const signal = options.signal;
       if (signal.aborted) {
         abort(request, (signal: any).reason);
-      } else {
-        const listener = () => {
-          abort(request, (signal: any).reason);
-          signal.removeEventListener('abort', listener);
-        };
-        signal.addEventListener('abort', listener);
       }
     }
     startWork(request);
```
