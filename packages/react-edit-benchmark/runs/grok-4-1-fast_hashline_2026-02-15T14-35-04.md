# Edit Benchmark Report

## Configuration

| Setting | Value |
|---------|-------|
| Date | 2026-02-15T14:29:20.601Z |
| Model | xai/xai/grok-4-1-fast |
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
| Successful Runs | 46 |
| **Task Success Rate** | **76.7% (46/60)** |
| Verified Rate | 76.7% (46/60) |
| Edit Tool Usage Rate | 98.3% (59/60) |
| **Edit Success Rate** | **96.9%** |
| Timeout Runs | 0 |
| Mutation Intent Match Rate | 78.3% |
| Patch Failure Rate | 3.1% (2/64) |
| Tasks All Passing | 46 |
| Tasks Flaky/Failing | 14 |

### Tool Calls

| Tool | Total | Avg/Run |
|------|-------|---------|
| Read | 138 | 2.3 |
| Edit | 64 | 1.1 |
| Write | 0 | 0.0 |
| **Tool Input Chars** | 15,937 | 266 |

### Tokens & Time

| Metric | Total | Avg/Run |
|--------|-------|---------|
| Input Tokens | 460,218 | 7,670 |
| Output Tokens | 246,833 | 4,114 |
| Total Tokens | 2,771,682 | 46,195 |
| Duration | 2343.3s | 39.1s |
| **Avg Indent Score** | — | **2.24** |

### Hashline Edit Subtypes

| Operation | Count | % |
|-----------|-------|---|
| set_line | 65 | 89.0% |
| replace_lines | 2 | 2.7% |
| insert_after | 5 | 6.8% |
| replace | 1 | 1.4% |
| **Total** | **73** | 100% |

## Task Results

| Task | File | Success | Edit Hit | R/E/W | Tokens (In/Out) | Time | Indent |
|------|------|---------|----------|-------|-----------------|------|--------|
| Access Remove Optional Chain 001 | registerDevToolsEventLogger.js | 0/1 ❌ | 100.0% | 3/1/0 | 17,601/11,111 | 95.8s | 0.00 |
| Access Remove Optional Chain 002 | TimelineContext.js | 1/1 ✅ | 100.0% | 2/1/0 | 0/1,856 | 17.5s | 1.29 |
| Access Remove Optional Chain 003 | astUtils.js | 1/1 ✅ | 100.0% | 2/1/0 | 16,313/2,982 | 25.0s | 4.85 |
| Call Swap Call Args 001 | testHelpers.js | 1/1 ✅ | 100.0% | 2/1/0 | 9,026/4,671 | 36.2s | 1.33 |
| Call Swap Call Args 002 | FlamegraphChartBuilder.js | 1/1 ✅ | 100.0% | 2/1/0 | 9,698/1,972 | 17.9s | 3.79 |
| Call Swap Call Args 003 | SyntheticEvent.js | 1/1 ✅ | 100.0% | 2/1/0 | 0/3,286 | 29.8s | 3.76 |
| Duplicate Duplicate Line Flip 001 | index.js | 1/1 ✅ | 100.0% | 2/1/0 | 12,444/725 | 10.2s | 0.00 |
| Duplicate Duplicate Line Flip 002 | ActivityList.js | 1/1 ✅ | 100.0% | 2/1/0 | 8,430/1,621 | 19.6s | 3.61 |
| Duplicate Duplicate Line Flip 003 | SyntheticEvent.js | 1/1 ✅ | 100.0% | 2/1/0 | 23,157/10,573 | 63.2s | 1.02 |
| Identifier Identifier Multi Edit 001 | TabBar.js | 1/1 ✅ | 100.0% | 7/2/0 | 0/2,765 | 23.1s | 3.33 |
| Identifier Identifier Multi Edit 002 | EventPluginRegistry.js | 1/1 ✅ | 100.0% | 4/2/0 | 35,270/3,848 | 35.1s | 3.94 |
| Identifier Identifier Multi Edit 003 | ReactPerformanceTrackProperties.js | 0/1 ❌ | 100.0% | 5/1/0 | 9,731/3,601 | 24.4s | 9.95 |
| Import Swap Named Imports 001 | CommitFlamegraphListItem.js | 1/1 ✅ | 100.0% | 2/1/0 | 0/3,143 | 27.2s | 2.86 |
| Import Swap Named Imports 002 | ReactDOMTextarea.js | 1/1 ✅ | 100.0% | 4/1/0 | 10,743/4,975 | 51.9s | 2.41 |
| Import Swap Named Imports 003 | StyleEditor.js | 1/1 ✅ | 100.0% | 6/1/0 | 0/6,274 | 52.4s | 1.31 |
| Literal Flip Boolean 001 | testHelpers.js | 1/1 ✅ | 100.0% | 2/1/0 | 14,287/1,460 | 14.6s | 1.33 |
| Literal Flip Boolean 002 | ReactNoopFlightServer.js | 1/1 ✅ | 100.0% | 1/1/0 | 6,170/1,287 | 14.2s | 1.11 |
| Literal Flip Boolean 003 | ReactFlightDOMClientEdge.js | 1/1 ✅ | 100.0% | 2/1/0 | 12,047/3,908 | 28.6s | 3.58 |
| Literal Off By One 001 | githubAPI.js | 1/1 ✅ | 100.0% | 2/1/0 | 0/825 | 10.4s | 0.67 |
| Literal Off By One 002 | code-path.js | 1/1 ✅ | 100.0% | 2/1/0 | 9,986/2,029 | 18.7s | 3.50 |
| Literal Off By One 003 | InspectedElement.js | 1/1 ✅ | 100.0% | 3/1/0 | 0/3,946 | 27.8s | 3.60 |
| Operator Remove Negation 001 | ReactDOMClient.js | 0/1 ❌ | 0.0% | 2/1/0 | 0/13,731 | 83.7s | 1.08 |
| Operator Remove Negation 002 | NativeEventsView.js | 1/1 ✅ | 100.0% | 2/1/0 | 0/5,994 | 39.3s | 3.03 |
| Operator Remove Negation 003 | ReactFlightUnbundledReferences.js | 0/1 ❌ | 100.0% | 2/1/0 | 0/18,060 | 167.7s | 2.00 |
| Operator Swap Arithmetic 001 | fallbackEvalContext.js | 1/1 ✅ | 100.0% | 2/1/0 | 0/1,770 | 16.1s | 0.00 |
| Operator Swap Arithmetic 002 | CSSShorthandProperty.js | 0/1 ❌ | 100.0% | 2/0/0 | 17,220/9,647 | 85.4s | 2.88 |
| Operator Swap Arithmetic 003 | hooks.js | 0/1 ❌ | 100.0% | 2/1/0 | 12,900/4,697 | 40.6s | 2.25 |
| Operator Swap Comparison 001 | index.js | 1/1 ✅ | 100.0% | 1/1/0 | 5,586/1,190 | 11.5s | 0.00 |
| Operator Swap Comparison 002 | ReactFlightDOMServerBrowser.js | 1/1 ✅ | 100.0% | 2/1/0 | 8,700/2,123 | 21.2s | 1.57 |
| Operator Swap Comparison 003 | ReactFlightDOMServerNode.js | 1/1 ✅ | 100.0% | 2/1/0 | 0/2,128 | 16.3s | 1.95 |
| Operator Swap Equality 001 | readInputData.js | 1/1 ✅ | 100.0% | 2/1/0 | 12,630/1,119 | 13.6s | 0.00 |
| Operator Swap Equality 002 | editor.js | 1/1 ✅ | 100.0% | 1/1/0 | 0/1,052 | 10.0s | 0.00 |
| Operator Swap Equality 003 | hooks.js | 1/1 ✅ | 100.0% | 2/1/0 | 11,469/1,433 | 17.2s | 2.25 |
| Operator Swap Increment Decrement 001 | ReactFlightDOMClientNode.js | 1/1 ✅ | 100.0% | 2/1/0 | 8,106/1,394 | 15.5s | 1.52 |
| Operator Swap Increment Decrement 002 | ReactFlightDOMClientNode.js | 1/1 ✅ | 100.0% | 1/1/0 | 7,926/1,151 | 14.5s | 1.92 |
| Operator Swap Increment Decrement 003 | loadSourceAndMetadata.js | 1/1 ✅ | 100.0% | 2/1/0 | 11,335/1,105 | 13.4s | 3.72 |
| Operator Swap Logical 001 | profiling.js | 1/1 ✅ | 100.0% | 2/1/0 | 6,927/978 | 13.5s | 0.00 |
| Operator Swap Logical 002 | SourceMapMetadataConsumer.js | 1/1 ✅ | 100.0% | 2/1/0 | 0/4,323 | 28.6s | 3.14 |
| Operator Swap Logical 003 | DevToolsFiberComponentStack.js | 1/1 ✅ | 100.0% | 2/1/0 | 14,121/3,355 | 33.1s | 4.13 |
| Operator Swap Nullish 001 | getBatchRange.js | 1/1 ✅ | 100.0% | 2/1/0 | 12,093/1,701 | 21.2s | 1.33 |
| Operator Swap Nullish 002 | EnterLeaveEventPlugin.js | 1/1 ✅ | 100.0% | 2/1/0 | 10,327/2,655 | 24.2s | 1.57 |
| Operator Swap Nullish 003 | backend.js | 0/1 ❌ | 100.0% | 2/1/0 | 0/3,539 | 24.9s | 3.15 |
| Regex Swap Regex Quantifier 001 | githubAPI.js | 1/1 ✅ | 66.7% | 3/3/0 | 4,597/3,620 | 343.3s | 0.67 |
| Regex Swap Regex Quantifier 002 | ReactFlightStackConfigV8.js | 1/1 ✅ | 100.0% | 2/1/0 | 158/3,263 | 24.7s | 3.06 |
| Regex Swap Regex Quantifier 003 | utils.js | 1/1 ✅ | 100.0% | 2/1/0 | 16,132/7,950 | 77.7s | 2.00 |
| Structural Delete Statement 001 | UnsupportedVersionDialog.js | 0/1 ❌ | 100.0% | 2/1/0 | 6,332/2,016 | 20.9s | 5.89 |
| Structural Delete Statement 002 | getComponentNameFromFiber.js | 0/1 ❌ | 100.0% | 3/1/0 | 8,589/3,284 | 30.9s | 0.62 |
| Structural Delete Statement 003 | simulateBrowserEventDispatch.js | 0/1 ❌ | 100.0% | 2/1/0 | 0/10,218 | 64.6s | 4.46 |
| Structural Remove Early Return 001 | InspectedElementStateTree.js | 1/1 ✅ | 100.0% | 2/1/0 | 11,368/5,122 | 40.0s | 0.33 |
| Structural Remove Early Return 002 | useCommitFilteringAndNavigation.js | 1/1 ✅ | 100.0% | 2/1/0 | 12,829/5,195 | 39.8s | 3.73 |
| Structural Remove Early Return 003 | ReactFiberAsyncAction.js | 0/1 ❌ | 100.0% | 2/1/0 | 0/11,813 | 68.9s | 1.46 |
| Structural Swap Adjacent Lines 001 | ReactServerConsoleConfigPlain.js | 1/1 ✅ | 100.0% | 2/1/0 | 813/1,740 | 13.1s | 1.00 |
| Structural Swap Adjacent Lines 002 | ReactNoopFlightServer.js | 0/1 ❌ | 100.0% | 3/2/0 | 8,720/3,456 | 27.7s | 0.00 |
| Structural Swap Adjacent Lines 003 | backend.js | 0/1 ❌ | 100.0% | 3/1/0 | 37,288/9,515 | 80.6s | 3.15 |
| Structural Swap If Else 001 | importFile.js | 1/1 ✅ | 100.0% | 2/1/0 | 9,194/3,300 | 44.0s | 0.00 |
| Structural Swap If Else 002 | ReactNativeFiberInspector.js | 0/1 ❌ | 100.0% | 2/1/0 | 0/1,492 | 14.2s | 3.18 |
| Structural Swap If Else 003 | ReactDOMFizzStaticNode.js | 1/1 ✅ | 100.0% | 2/1/0 | 0/11,169 | 56.9s | 1.88 |
| Unicode Unicode Hyphen 001 | Rectangle.js | 1/1 ✅ | 100.0% | 2/1/0 | 0/1,014 | 12.5s | 3.00 |
| Unicode Unicode Hyphen 002 | UnsupportedBridgeProtocolDialog.js | 1/1 ✅ | 100.0% | 2/1/0 | 0/950 | 14.9s | 3.83 |
| Unicode Unicode Hyphen 003 | ReactTypes.js | 1/1 ✅ | 100.0% | 2/1/0 | 9,955/1,713 | 13.7s | 1.24 |

## Category Summary

| Category | Runs | Verified | Edit Used | Success | Min/Avg/Max Difficulty |
|----------|------|----------|-----------|---------|------------------------|
| access | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) | 7 / 8.7 / 10 |
| call | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 6 / 7.7 / 10 |
| duplicate | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 7 / 9.7 / 12 |
| identifier | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) | 6 / 9.3 / 14 |
| import | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 2 / 4.7 / 6 |
| literal | 6 | 100.0% (6/6) | 100.0% (6/6) | 100.0% (6/6) | 4 / 6.2 / 9 |
| operator | 21 | 76.2% (16/21) | 95.2% (20/21) | 76.2% (16/21) | 1 / 6.5 / 13 |
| regex | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 6 / 7.3 / 8 |
| structural | 12 | 41.7% (5/12) | 100.0% (12/12) | 41.7% (5/12) | 4 / 7.6 / 15 |
| unicode | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) | 1 / 3.0 / 6 |

## Mutation Summary

| Mutation | Category | Runs | Verified | Edit Used | Success |
|----------|----------|------|----------|-----------|---------|
| delete-statement | structural | 3 | 0.0% (0/3) | 100.0% (3/3) | 0.0% (0/3) |
| duplicate-line-flip | duplicate | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| flip-boolean | literal | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| identifier-multi-edit | identifier | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| off-by-one | literal | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| remove-early-return | structural | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| remove-negation | operator | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| remove-optional-chain | access | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
| swap-adjacent-lines | structural | 3 | 33.3% (1/3) | 100.0% (3/3) | 33.3% (1/3) |
| swap-arithmetic | operator | 3 | 33.3% (1/3) | 66.7% (2/3) | 33.3% (1/3) |
| swap-call-args | call | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| swap-comparison | operator | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| swap-equality | operator | 3 | 100.0% (3/3) | 100.0% (3/3) | 100.0% (3/3) |
| swap-if-else | structural | 3 | 66.7% (2/3) | 100.0% (3/3) | 66.7% (2/3) |
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
| 3-5 | 12 | 66.7% (8/12) | 91.7% (11/12) | 66.7% (8/12) |
| 6-8 | 24 | 83.3% (20/24) | 100.0% (24/24) | 83.3% (20/24) |
| 9+ | 18 | 72.2% (13/18) | 100.0% (18/18) | 72.2% (13/18) |

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
Edit 0: replacement for 57:ea is identical to current content:
  57:ea|   if (foundDevTools && canUseDOM && window.top === window.self) {
Your content must differ from what the file already contains. Re-read the file to see the current state.
```

**Patch args**

```diff
{
  "path": "ReactDOMClient.js",
  "edits": [
    {
      "set_line": {
        "anchor": "57:ea",
        "new_text": "  if (foundDevTools && canUseDOM && window.top === window.self) {"
      }
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
No changes made to githubAPI.js. The edits produced identical content.
Edit 0: replacement for 19:fc is identical to current content:
  19:fc|   message = message.replace(/
Your content must differ from what the file already contains. Re-read the file to see the current state.
The file differs from the original fixture at these lines:
19:86  -  message = message.replace(/"[0-9]*"/g, '');
20:f2  +  message = message.replace(/"[0-9]+"/g, '');
```

**Patch args**

```diff
{
  "path": "githubAPI.js",
  "edits": [
    {
      "set_line": {
        "anchor": "19:fc",
        "new_text": "  message = message.replace(/"
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
**Fixed.** Line 36 now uses `currentLoggingIFrame.contentWindow?.postMessage(` (hash `36:c5`). Confirmed via re-read; no other changes.
```

**Diff (expected vs actual):**
```diff
@@ -7 @@
  * @flow strict-local
  */
 
-import type { LoggerEvent } from 'react-devtools-shared/src/Logger';
+import type {LoggerEvent} from 'react-devtools-shared/src/Logger';
 
 
-import { registerEventLogger } from 'react-devtools-shared/src/Logger';
-import { enableLogger } from 'react-devtools-feature-flags';
+import {registerEventLogger} from 'react-devtools-shared/src/Logger';
+import {enableLogger} from 'react-devtools-feature-flags';
 
 let currentLoggingIFrame = null;
 let currentSessionId = null;
@@ -22 @@
 
 export function registerDevToolsEventLogger(
   surface: string,
-  fetchAdditionalContext?: (() => LoggerContext) | (() => Promise<LoggerContext>),
+  fetchAdditionalContext?:
+    | (() => LoggerContext)
+    | (() => Promise<LoggerContext>),
 ): void {
   async function logEvent(event: LoggerEvent) {
     if (enableLogger) {
@@ -27 @@
   async function logEvent(event: LoggerEvent) {
     if (enableLogger) {
       if (currentLoggingIFrame != null && currentSessionId != null) {
-        const { metadata, ...eventWithoutMetadata } = event;
+        const {metadata, ...eventWithoutMetadata} = event;
         const additionalContext: LoggerContext | {} =
           fetchAdditionalContext != null ? await fetchAdditionalContext() : {};
 
         const additionalContext: LoggerContext | {} =
           fetchAdditionalContext != null ? await fetchAdditionalContext() : {};
 
-        currentLoggingIFrame?.contentWindow?.postMessage(
+        currentLoggingIFrame.contentWindow?.postMessage
           {
             source: 'react-devtools-logging',
             event: eventWithoutMetadata,
@@ -55 @@
     currentLoggingIFrame = iframe;
 
     if (missedEvents.length > 0) {
-      missedEvents.forEach((event) => logEvent(event));
+      missedEvents.forEach(event => logEvent(event));
       missedEvents = [];
     }
   }
```

### Identifier Identifier Multi Edit 003 (ReactPerformanceTrackProperties.js) — 0/1

**All runs failed with same error:** File mismatch for ReactPerformanceTrackProperties.js

**Sample agent response (run 1):**
```
Bug fixed: `DADED` → `ADDED` in definition (line 281) and usages (lines 336, 361, 431). Confirmed via re-read: all four instances corrected; line 427 already correct; no other changes.
```

**Diff (expected vs actual):**
```diff
@@ -229 @@
 }
 
 const REMOVED = '\u2013\xa0';
-const ADDED = '+\xa0';
+const ADDED = '+ ';
 const UNCHANGED = '\u2007\xa0';
 
 export function addObjectDiffToProperties(
@@ -284 @@
           // with any change to children of the component and their props will be logged
           // elsewhere but still mark it as a cause of render.
           const line = '\xa0\xa0'.repeat(indent) + key;
-          properties.push([REMOVED + line, '\u2026'], [ADDED + line, '\u2026']);
+          properties.push([REMOVED + line, '…'], [ADDED + line, '…']);
           isDeeplyEqual = false;
           continue;
         }
@@ -373 @@
         isDeeplyEqual = false;
       }
     } else {
-      properties.push([ADDED + '\xa0\xa0'.repeat(indent) + key, '\u2026']);
+      properties.push([ADDED + '  '.repeat(indent) + key, '…']);
       isDeeplyEqual = false;
     }
 
```

### Operator Remove Negation 001 (ReactDOMClient.js) — 0/1

**All runs failed with same error:** File mismatch for ReactDOMClient.js

**Sample agent response (run 1):**
```
No `!` operator on line 57: `57:ea|  if (foundDevTools && canUseDOM && window.top === window.self) {`

Edit attempted; rejected as identical (no-op error confirms no `!` present).

No logical negation operator (`!`) anywhere in file.

Cannot remove absent token without fabricating change, violating contract (touch only requested; no incidental changes).

Downside of forced mutation: introduces unrelated bug, fails fixture diff.

Propose: clarify task (e.g., intended location/token, or confirm...
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
The negation operator (`!`) on line 330 accidentally caused `getOwnPropertyDescriptor` to create and define a property descriptor for missing properties, potentially polluting the internal target object with non-enumerable properties.

**Fix:** Removed the `!`, now `if (descriptor)` standardizes attributes only for existing properties (e.g., overriding defaults from `get` trap) and returns `undefined` for missing ones (no pollution).

Verified: Changed region re-read; only line 330 modified (...
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

### Operator Swap Arithmetic 002 (CSSShorthandProperty.js) — 0/1

**All runs failed with same error:** File mismatch for CSSShorthandProperty.js

**Sample agent response (run 1):**
```
No arithmetic operators in `CSSShorthandProperty.js`. Comment paths use `/` (lines 1: /**, 5: / LICENSE, 6: */, 9: // https://.../layout/...); these are literals, not executable operators. No expressions, calculations, or swappable arithmetic near top (lines 1–20) or full file. Edit impossible without fabrication. Verify externally:  
```bash  
head -20 CSSShorthandProperty.js | grep -E '[+\-*/%^]' || echo "No matches"  
cat CSSShorthandProperty.js | wc -l  # expect ~193  
```
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
**Fix applied.**

- Changed `container.clientWidth <= totalChildWidth` to `container.clientWidth < totalChildWidth` in `useIsOverflowing` (line 129).
- This corrects the overflow detection: overflowing only when child width strictly exceeds container width (equal fits exactly).
- Verified: single-line change, formatting preserved, no other modifications.
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
**Fixed.** Changed `||` to `??` on line 414 in `backend.js` to correct the swapped nullish coalescing operator.

Confirmed via re-read: only the targeted line updated; structure, whitespace, and surrounding code preserved.
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
Fixed: Restored `const {store} = useContext(StoreContext);` after dispatch extraction (new line 22).

Verified region:
```
21:99|  const {dispatch} = useContext(ModalDialogContext);
22:07|  const {store} = useContext(StoreContext);
23:05|
24:8a|  const [state, setState] = useState<DAILOG_STATE>('dialog-not-shown');
```

No other changes.
```

**Diff (expected vs actual):**
```diff
@@ -19 @@
 
 export default function UnsupportedVersionDialog(_: {}): null {
   const { dispatch } = useContext(ModalDialogContext);
-  const store = useContext(StoreContext);
+  const { store } = useContext(StoreContext);
+
   const [state, setState] = useState<DAILOG_STATE>('dialog-not-shown');
 
   useEffect(() => {
```

### Structural Delete Statement 002 (getComponentNameFromFiber.js) — 0/1

**All runs failed with same error:** File mismatch for getComponentNameFromFiber.js

**Sample agent response (run 1):**
```
getComponentNameFromFiber.js fixed: restored `const functionName = getComponentNameFromType(innerType) || '';` in `getWrappedName`. Verified post-edit.
```

**Diff (expected vs actual):**
```diff
@@ -54 @@
 
 // Keep in sync with shared/getComponentNameFromType
 function getWrappedName(outerType: mixed, innerType: any, wrapperName: string): string {
-  const functionName = innerType.displayName || innerType.name || '';
+  const functionName = getComponentNameFromType(innerType) || '';
+
   return (
     (outerType: any).displayName ||
     (functionName !== '' ? `${wrapperName}(${functionName})` : wrapperName)
```

### Structural Delete Statement 003 (simulateBrowserEventDispatch.js) — 0/1

**All runs failed with same error:** File mismatch for simulateBrowserEventDispatch.js

**Sample agent response (run 1):**
```
**Fixed:** Added `return` to line 59 of `simulateBrowserEventDispatch.js`.  
The function now returns `!event._canceledFlag` (as `_dispatch` does), matching `dispatchEvent` API. Verified via re-read (line 59 hash: `2d`).  
No other changes.
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

### Structural Remove Early Return 003 (ReactFiberAsyncAction.js) — 0/1

**All runs failed with same error:** File mismatch for ReactFiberAsyncAction.js

**Sample agent response (run 1):**
```
Fix applied to `ReactFiberAsyncAction.js`: restored guard clause `if (currentEntangledPendingCount === 0) { return; }` in `pingEngtangledActionScope` before decrement (lines 104–106 post-edit).

Verified: only targeted insertion (3 lines added, no other content changes, no reformatting). Line anchors shifted as expected. Similar pattern in `releaseIsomorphicIndicator` untouched per instructions.
```

**Diff (expected vs actual):**
```diff
@@ -85 @@
 }
 
 function pingEngtangledActionScope() {
+  if (currentEntangledPendingCount === 0) {
+    return;
+  }
+
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

### Structural Swap Adjacent Lines 002 (ReactNoopFlightServer.js) — 0/1

**All runs failed with same error:** File mismatch for ReactNoopFlightServer.js

**Sample agent response (run 1):**
```
**Fixed.** Swapped lines 46–47 in `ReactNoopFlightServer.js` (added missing comma on re-edit).

**Verification:**
```
44:  closeWithError(destination: Destination, error: mixed): void {},
45:  stringToChunk(content: string): Uint8Array {
46:    return textEncoder.encode(content);
47:  flushBuffered(destination: Destination): void {},
48:  },
```
Only intended lines touched.
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
   stringToChunk(content: string): Uint8Array {
     return textEncoder.encode(content);
+  flushBuffered(destination: Destination): void {},
   },
   stringToPrecomputedChunk(content: string): Uint8Array {
     return textEncoder.encode(content);
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
**Fixed.** Swapped the adjacent `const agent = ...;` declaration (line 192) and the `if (typeof onReloadAndProfileFlagsReset === 'function') { ... }` block (lines 193–195) in `connectToDevTools()`.

**Verification:**  
- Confirmed via re-read: new order is `if` block → `agent` declaration.  
- Only those lines changed; hashes updated (192:6b, 193:89, 194:18, 195:0a).  
- No other mutations (e.g., second instance in `connectWithCustomMessagingProtocol` untouched per "only one intended mutation...
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
+    const agent = new Agent(bridge, isProfiling, onReloadAndProfile);
 
     if (onSettingsUpdated != null) {
       agent.addListener('updateHookSettings', onSettingsUpdated);
```

### Structural Swap If Else 002 (ReactNativeFiberInspector.js) — 0/1

**All runs failed with same error:** File mismatch for ReactNativeFiberInspector.js

**Sample agent response (run 1):**
```
Fixed. Only line 160 changed: `if (__DEV__)` → `if (!__DEV__)`.

Logic now correct:

- `__DEV__` (true): executes `else` branch (work).

- Prod (false): executes `if` branch (throw).
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
