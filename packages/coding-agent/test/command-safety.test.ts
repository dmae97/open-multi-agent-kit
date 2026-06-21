import { describe, expect, it } from "vitest";
import type { CommandRisk } from "../src/core/command-safety.ts";
import {
	classifyShellCommand,
	isDestructiveFilesystem,
	isPrivilegeEscalation,
	isProtectedGitOperation,
} from "../src/core/command-safety.ts";
import type { SandboxPolicy } from "../src/core/sandbox/policy.ts";
import { createLocalBashOperations } from "../src/core/tools/bash.ts";

function expectVerdict(command: string, risk: CommandRisk, rule: string): void {
	const verdict = classifyShellCommand(command);
	expect(verdict).toMatchObject({ risk, rule });
	expect(verdict.reason.length).toBeGreaterThan(0);
}

describe("command safety classifier", () => {
	it("blocks non-negotiable destructive filesystem patterns", () => {
		expectVerdict("rm -rf /", "block", "fs.rm_rf_root");
		expectVerdict("sudo rm -rf /", "block", "fs.rm_rf_root");
		expectVerdict("rm -fr ~", "block", "fs.rm_rf_home");
		expectVerdict("mkfs.ext4 /dev/sda", "block", "fs.mkfs");
		expectVerdict("dd if=/dev/zero of=/dev/sda", "block", "fs.dd_block_device");
		expectVerdict(":(){ :|:& };:", "block", "process.fork_bomb");
	});

	it("requires confirmation for protected privilege and git operations", () => {
		expectVerdict("git reset --hard HEAD~1", "confirm", "git.reset_hard");
		expectVerdict("git clean -fd", "confirm", "git.clean_force");
		expectVerdict("git add -A", "confirm", "git.add_all");
		expectVerdict("git commit --no-verify -m x", "confirm", "git.no_verify");
		expectVerdict("git push --force", "confirm", "git.force_push");
		expectVerdict("sudo apt update", "confirm", "priv.sudo");
	});

	it("allows ordinary scoped commands", () => {
		expectVerdict("ls -la", "allow", "command.allow");
		expectVerdict("git status", "allow", "command.allow");
		expectVerdict("npm run check", "allow", "command.allow");
		expectVerdict("rm -rf node_modules/.cache", "allow", "command.allow");
		expectVerdict("rm -rf ./dist", "allow", "command.allow");
		expectVerdict("git add packages/coding-agent/src/foo.ts", "allow", "command.allow");
	});

	it("returns the highest severity verdict across compound commands", () => {
		expectVerdict("npm ci && git reset --hard", "confirm", "git.reset_hard");
		expectVerdict("echo hi; rm -rf /", "block", "fs.rm_rf_root");
		expectVerdict("sleep 1 & rm -rf /", "block", "fs.rm_rf_root");
		expectVerdict("echo hi\nrm -rf /", "block", "fs.rm_rf_root");
		expectVerdict("build &", "allow", "command.allow");
	});

	it("normalizes env prefixes, whitespace, sudo prefixes, and rm flag order", () => {
		expectVerdict("  FOO=bar   sudo   rm   -fr   /  ", "block", "fs.rm_rf_root");
		expectVerdict("rm -Rf /*", "block", "fs.rm_rf_root");
		expectVerdict("git clean -d -f", "confirm", "git.clean_force");
	});

	it("exposes reusable predicate helpers", () => {
		expect(isDestructiveFilesystem("sudo rm -rf /")).toBe(true);
		expect(isDestructiveFilesystem("rm -rf node_modules/.cache")).toBe(false);
		expect(isProtectedGitOperation("git add -A")).toBe(true);
		expect(isProtectedGitOperation("git add packages/coding-agent/src/foo.ts")).toBe(false);
		expect(isPrivilegeEscalation("FOO=bar sudo apt update")).toBe(true);
		expect(isPrivilegeEscalation("npm run check")).toBe(false);
	});

	it("classifies the effective command inside shell wrappers", () => {
		expectVerdict('bash -c "rm -rf /"', "block", "fs.rm_rf_root");
		expectVerdict("sh -c 'git reset --hard'", "confirm", "git.reset_hard");
		expectVerdict('bash -lc "sudo apt update"', "confirm", "priv.sudo");
		expectVerdict('eval "rm -rf ~"', "block", "fs.rm_rf_home");
		expectVerdict("find . -type f -exec rm -rf / \\;", "block", "fs.rm_rf_root");
		expectVerdict("cat list | xargs git push --force", "confirm", "git.force_push");
		expectVerdict('bash -c "ls -la"', "allow", "command.allow");
	});

	it("flags credential and secret file access for confirmation", () => {
		expectVerdict("cat .env", "confirm", "secret.read_path");
		expectVerdict("cat config/.env.production", "confirm", "secret.read_path");
		expectVerdict("cp ~/.aws/credentials /tmp/x", "confirm", "secret.read_path");
		expectVerdict("cat server.pem", "confirm", "secret.read_path");
		expectVerdict("cat id_rsa", "confirm", "secret.read_path");
		expectVerdict("tar czf out.tgz secrets.yaml", "confirm", "secret.read_path");
	});

	it("does not flag benign files or messages as secret access", () => {
		expectVerdict("cat .env.example", "allow", "command.allow");
		expectVerdict('git commit -m "fix token bug"', "allow", "command.allow");
		expectVerdict("cat package.json", "allow", "command.allow");
		expectVerdict("cat README.md", "allow", "command.allow");
	});

	it("is deterministic for repeated classifications", () => {
		const command = " npm ci && git push --force ";
		expect(classifyShellCommand(command)).toEqual(classifyShellCommand(command));
	});
});

describe("createLocalBashOperations sandbox preflight", () => {
	function enforcePolicy(rootDir: string): SandboxPolicy {
		return {
			mode: "enforce",
			profile: "workspace-write",
			filesystem: {
				root: rootDir,
				readAllow: [rootDir],
				readDeny: [],
				writeAllow: [rootDir],
				denyWrite: [],
				tempWrite: [],
				followSymlinks: false,
			},
			network: {
				mode: "none",
				allowedDomains: [],
				deniedDomains: [],
				allowUnixSockets: [],
				allowBrowser: false,
			},
			process: { allowExec: true, allowShell: true, allowPrivilege: false },
		};
	}

	it("denies shell before spawning when no OS sandbox backend is available", async () => {
		let observedData = false;
		const ops = createLocalBashOperations({ sandboxPolicy: { policy: enforcePolicy(process.cwd()) } });
		await expect(
			ops.exec("echo should-not-run", process.cwd(), {
				onData: () => {
					observedData = true;
				},
			}),
		).rejects.toThrow(/sandbox: shell denied/);
		expect(observedData).toBe(false);
	});

	it("denies a working directory outside the sandbox root", async () => {
		const ops = createLocalBashOperations({
			sandboxPolicy: {
				policy: enforcePolicy(process.cwd()),
				backend: { platform: "linux", backendAvailable: true },
			},
		});
		await expect(ops.exec("echo nope", "/", { onData: () => undefined })).rejects.toThrow(/path\.root_escape/);
	});

	it("runs normally in audit fallback when no backend is available and cwd is inside the root", async () => {
		const chunks: Buffer[] = [];
		const auditPolicy = { ...enforcePolicy(process.cwd()), mode: "audit" as const };
		const ops = createLocalBashOperations({
			sandboxPolicy: {
				policy: auditPolicy,
				backend: { platform: "unsupported", backendAvailable: false },
			},
		});
		const result = await ops.exec("echo sandbox-ok", process.cwd(), {
			onData: (data) => chunks.push(data),
		});
		expect(result.exitCode).toBe(0);
		expect(Buffer.concat(chunks).toString()).toContain("sandbox-ok");
	});

	it("leaves default behavior unchanged when no sandboxPolicy is provided", async () => {
		const chunks: Buffer[] = [];
		const ops = createLocalBashOperations();
		const result = await ops.exec("echo plain-run", process.cwd(), {
			onData: (data) => chunks.push(data),
		});
		expect(result.exitCode).toBe(0);
		expect(Buffer.concat(chunks).toString()).toContain("plain-run");
	});
});
