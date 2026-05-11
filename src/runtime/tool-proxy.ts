/**
 * ToolProxy — intercepts and compresses tool results before they enter context.
 *
 * Applies format-aware compressors for common OMK tool outputs (git, grep, etc.)
 * to keep context bounded within ContextBudget limits.
 */

export interface ToolResultCompression {
  readonly original: string;
  readonly compressed: string;
  readonly savedBytes: number;
  readonly method: string;
}

export interface ToolProxyOptions {
  readonly maxResultTokens: number;
  readonly compressors?: Map<string, (input: string) => string>;
}

type Compressor = (input: string) => string;

const GIT_DIFF_COMPRESSOR: Compressor = (input) => {
  const lines = input.split("\n");
  if (lines.length <= 20) return input;
  const header = lines.slice(0, 5).join("\n");
  const stats = lines.filter((l) => /^[\d-]+ files? changed/.test(l)).join("\n");
  const hunks = lines.filter((l) => /^@@/.test(l)).slice(0, 3).join("\n");
  return [header, hunks, stats, `... (${lines.length} lines total)`].filter(Boolean).join("\n");
};

const GIT_STATUS_COMPRESSOR: Compressor = (input) => {
  const lines = input.split("\n").filter((l) => l.trim());
  if (lines.length <= 10) return input;
  return lines.slice(0, 10).join("\n") + `\n... (${lines.length} files total)`;
};

const GREP_COMPRESSOR: Compressor = (input) => {
  const lines = input.split("\n").filter((l) => l.trim());
  if (lines.length <= 15) return input;
  return lines.slice(0, 15).join("\n") + `\n... (${lines.length} matches total)`;
};

const FIND_COMPRESSOR: Compressor = (input) => {
  const lines = input.split("\n").filter((l) => l.trim());
  if (lines.length <= 15) return input;
  return lines.slice(0, 15).join("\n") + `\n... (${lines.length} results total)`;
};

const TREE_COMPRESSOR: Compressor = (input) => {
  const lines = input.split("\n").filter((l) => l.trim());
  if (lines.length <= 20) return input;
  return lines.slice(0, 20).join("\n") + `\n... (${lines.length} entries total)`;
};

const LS_COMPRESSOR: Compressor = (input) => {
  const lines = input.split("\n").filter((l) => l.trim());
  if (lines.length <= 20) return input;
  return lines.slice(0, 20).join("\n") + `\n... (${lines.length} entries total)`;
};

const READ_FILE_COMPRESSOR: Compressor = (input) => {
  if (input.length <= 4000) return input;
  return input.slice(0, 4000) + `\n... (truncated, ${input.length} chars total)`;
};

const DEFAULT_COMPRESSORS = new Map<string, Compressor>([
  ["git_diff", GIT_DIFF_COMPRESSOR],
  ["git_status", GIT_STATUS_COMPRESSOR],
  ["grep", GREP_COMPRESSOR],
  ["find", FIND_COMPRESSOR],
  ["tree", TREE_COMPRESSOR],
  ["ls", LS_COMPRESSOR],
  ["read_file", READ_FILE_COMPRESSOR],
  ["ctx_read", READ_FILE_COMPRESSOR],
  ["read_text_file", READ_FILE_COMPRESSOR],
]);

function detectToolName(output: string): string {
  const first = output.slice(0, 1024);
  if (first.includes("diff --git") || first.includes("--- a/") || first.includes("+++ b/")) return "git_diff";
  if (/^[MADRC]\s+/m.test(first) || first.includes("Changes to be committed")) return "git_status";
  if (/:\d+:/m.test(first)) return "grep";
  if (first.includes("├──") || first.includes("└──") || first.includes("│")) return "tree";
  return "generic";
}

export function createToolProxy(options: Partial<ToolProxyOptions> = {}) {
  const maxTokens = options.maxResultTokens ?? 512;
  const compressors = options.compressors ?? DEFAULT_COMPRESSORS;

  function compress(toolName: string, output: string): ToolResultCompression {
    const maxChars = maxTokens * 4;
    if (output.length <= maxChars) {
      return { original: output, compressed: output, savedBytes: 0, method: "none" };
    }

    const compressor = compressors.get(toolName);
    if (compressor) {
      const compressed = compressor(output);
      if (compressed.length < output.length) {
        return {
          original: output,
          compressed,
          savedBytes: output.length - compressed.length,
          method: toolName,
        };
      }
    }

    const compressed = output.slice(0, maxChars) + `\n... (truncated from ${output.length} chars)`;
    return {
      original: output,
      compressed,
      savedBytes: output.length - compressed.length,
      method: "truncation",
    };
  }

  return {
    compress,
    compressAuto(output: string): ToolResultCompression {
      const toolName = detectToolName(output);
      return compress(toolName, output);
    },
  };
}
