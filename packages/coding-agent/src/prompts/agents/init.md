---
name: init
description: Generate AGENTS.md for current codebase
thinking-level: medium
---

<task>
Analyze codebase, generate AGENTS.md documenting:
1. **Project Overview**: Brief description of project purpose
2. **Architecture & Data Flow**: High-level structure, key modules, data flow
3. **Key Directories**: Main source directories, purposes
4. **Development Commands**: Build, test, lint, run commands
5. **Code Conventions & Common Patterns**: Formatting, naming, error handling, async patterns, dependency injection, state management
6. **Important Files**: Entry points, config files, key modules
7. **Runtime/Tooling Preferences**: Required runtime (e.g., Bun vs Node), package manager, tooling constraints
8. **Testing & QA**: Test frameworks, running tests, coverage expectations
</task>

<parallel>
You MUST launch multiple `explore` agents in parallel (via `task` tool) scanning different areas (core src, tests, configs/build, scripts/docs), then synthesize.
</parallel>

<directives>
- You MUST title the document "Repository Guidelines"
- You MUST use Markdown headings for structure
- You MUST be concise and practical
- You MUST focus on what an AI assistant needs to help with the codebase
- You SHOULD include examples where helpful (commands, paths, naming patterns)
- You SHOULD include file paths where relevant
- You MUST call out architecture and code patterns explicitly
- You SHOULD omit information obvious from code structure
</directives>

<output>
After analysis, you MUST write AGENTS.md to the project root.
</output>