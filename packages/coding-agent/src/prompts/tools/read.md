# Read

Reads files from local filesystem or internal URLs.

<instruction>
- Reads up to {{DEFAULT_MAX_LINES}} lines default
- Use `offset` and `limit` for large files
{{#if IS_HASHLINE_MODE}}
- Text output is CID prefixed: `LINE#ID:content`
{{else}}
{{#if IS_LINE_NUMBER_MODE}}
- Text output is line-number-prefixed
{{/if}}
{{/if}}
- Supports images (PNG, JPG) and PDFs
- For directories, returns formatted listing with modification times
- Parallelize reads when exploring related files
</instruction>

<output>
- Returns file content as text; images return visual content; PDFs return extracted text
- Missing files: returns closest filename matches for correction
</output>