<task-summary>
<header>{{successCount}}/{{totalCount}} succeeded{{#if hasCancelledNote}} ({{cancelledCount}} cancelled){{/if}} [{{duration}}]</header>

{{#each summaries}}
<result>
<agent>{{agent}}</agent>
<status>{{status}}</status>
{{#if meta}}<meta lines="{{meta.lineCount}}" chars="{{meta.charCount}}" size="{{meta.charSize}}" />{{/if}}
<id>{{id}}</id>
<preview>
{{preview}}
</preview>
</result>

{{#unless @last}}
---
{{/unless}}
{{/each}}
{{#if (len outputIds)}}
<output-hint>Use read with agent:// for full logs: {{join outputIds ", "}}</output-hint>
{{/if}}

{{#if schemaOverridden}}
<schema-note>
Note: Agent '{{agentName}}' has a fixed output schema; your 'output' parameter was ignored.
Required schema: {{requiredSchema}}
</schema-note>
{{/if}}

{{#if patchApplySummary}}
<patch-summary>
{{patchApplySummary}}
</patch-summary>
{{/if}}
</task-summary>