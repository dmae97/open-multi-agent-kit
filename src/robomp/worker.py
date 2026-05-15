"""Per-task RpcClient driver.

The orchestrator calls `run_task(...)` from within an asyncio loop. The
function spins up `RpcClient` on a worker thread, drives the kickoff/follow-up
prompt, and returns when the agent emits `agent_end`.

Host tools call back into the orchestrator's GitHub client and DB. Because the
RpcClient runs in its own subprocess and the host-tool callbacks are dispatched
on the RpcClient's stdout-reader thread, the callbacks block until coroutines
scheduled onto the parent loop complete (`asyncio.run_coroutine_threadsafe`).
"""

from __future__ import annotations

import asyncio
import logging
import os
import shutil
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from omp_rpc import (
    MessageUpdateEvent,
    RpcClient,
    RpcError,
    ToolExecutionEndEvent,
)

from robomp import host_tools, persona, pragmas
from robomp.cancellation import register_cancel_hook, unregister_cancel_hook
from robomp.config import Settings
from robomp.db import Database, issue_key
from robomp.github_backend import GitHubBackend
from robomp.github_client import CommentInfo, IssueInfo, RepoInfo
from robomp.host_tools import ToolBindings
from robomp.sandbox import GitTransport, Workspace, _prepare_slot_tmpdir

log = logging.getLogger(__name__)


@dataclass(slots=True)
class TaskInputs:
    """Common context shared by every task type."""

    settings: Settings
    db: Database
    github: GitHubBackend
    git_transport: GitTransport
    repo: RepoInfo
    issue: IssueInfo
    workspace: Workspace
    delivery_id: str
    attempts: int = 0
    slot_uid: int | None = None


@dataclass(slots=True, frozen=True)
class ThreadMessage:
    """One entry in the conversation a directive carries to the agent."""

    kind: str  # issue_body | pr_body | comment | review_comment | review
    author: str
    body: str
    created_at: str
    path: str | None = None  # review_comment only
    line: int | None = None  # review_comment only
    state: str | None = None  # review only (APPROVED / CHANGES_REQUESTED / COMMENTED)


@dataclass(slots=True, frozen=True)
class DirectiveInfo:
    """A maintainer's `@bot` mention captured as an authoritative instruction.

    `thread` is the full conversation context (issue/PR body + every prior
    comment + every review) up to the moment the directive fired.
    """

    body: str
    author: str
    thread: tuple[ThreadMessage, ...] = ()
    pragmas: tuple[tuple[str, str], ...] = ()


def _resolve_pragma_overrides(
    directive: DirectiveInfo | None,
    settings: Settings,
) -> tuple[str | None, pragmas.ThinkingLevel | None]:
    """Return `(model_override, thinking_override)` for the current directive.

    `None` for either means "no override, use the settings default". Aliases
    that don't match anything in the pool / level set are dropped (caller logs
    the discard at the callsite that has access to issue_key).
    """
    if directive is None or not directive.pragmas:
        return None, None
    model_value = pragmas.pragma_value(directive.pragmas, "model")
    thinking_value = pragmas.pragma_value(directive.pragmas, "thinking")
    model_override = pragmas.resolve_model_alias(model_value, settings.model_pool) if model_value else None
    thinking_override = pragmas.resolve_thinking_level(thinking_value) if thinking_value else None
    return model_override, thinking_override


_SCRUBBED_ENV_KEYS: tuple[str, ...] = (
    # Secrets that MUST NOT reach the agent subprocess; an agent with the
    # `bash` tool could otherwise `printenv` them out of roboomp's env.
    "GITHUB_TOKEN",
    "GITHUB_WEBHOOK_SECRET",
    "ROBOMP_REPLAY_TOKEN",
    "ROBOMP_GH_PROXY_HMAC_KEY",
)

_AGENT_HOME = Path("/srv/agent-home")
_AGENT_HOME_STAGE = Path("/srv/agent-home-stage")


def _stage_agent_home() -> None:
    """Copy late-appearing staged agent config into the runtime HOME."""
    if not _AGENT_HOME_STAGE.exists():
        return

    for rel in (Path(".agent"), Path(".omp/agent")):
        src = _AGENT_HOME_STAGE / rel
        if not src.exists():
            continue

        dst = _AGENT_HOME / rel
        try:
            if os.path.lexists(dst):
                if dst.is_dir() and not dst.is_symlink():
                    shutil.rmtree(dst)
                else:
                    dst.unlink()
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copytree(src, dst, dirs_exist_ok=True)
        except OSError as exc:
            log.warning("Failed to stage agent home path %s: %s", rel, exc)

    if not _AGENT_HOME.exists():
        return

    chown_to_root = os.geteuid() == 0
    for root, dirs, files in os.walk(_AGENT_HOME):
        root_path = Path(root)
        try:
            root_path.chmod(0o755)
            if chown_to_root:
                os.chown(root_path, 0, 0)
        except OSError as exc:
            log.warning("Failed to normalize agent home directory %s: %s", root_path, exc)

        for name in dirs:
            path = root_path / name
            try:
                path.chmod(0o755)
                if chown_to_root:
                    os.chown(path, 0, 0)
            except OSError as exc:
                log.warning("Failed to normalize agent home directory %s: %s", path, exc)

        for name in files:
            path = root_path / name
            try:
                path.chmod(0o644)
                if chown_to_root:
                    os.chown(path, 0, 0)
            except OSError as exc:
                log.warning("Failed to normalize agent home file %s: %s", path, exc)


def _build_extra_env(settings: Settings) -> dict[str, str]:
    """Build the env overlay passed to the omp subprocess.

    `omp_rpc` merges this dict on top of `os.environ`, so overlaying empty
    strings for the sensitive keys is what actually masks them in the
    child — `del` on the parent's env would not help us here.
    """
    del settings  # kept for future hooks (model-specific env, etc.)
    _stage_agent_home()
    env = dict.fromkeys(_SCRUBBED_ENV_KEYS, "")
    if _AGENT_HOME.is_dir():
        env["HOME"] = str(_AGENT_HOME)
    return env


def _prepare_xdg_dirs(workspace: Workspace, slot_uid: int | None) -> dict[str, str]:
    """Prepare per-workspace XDG homes for mutable omp state."""
    xdg_root = workspace.root / ".omp-xdg"
    homes = {
        "XDG_DATA_HOME": xdg_root / "data",
        "XDG_STATE_HOME": xdg_root / "state",
        "XDG_CACHE_HOME": xdg_root / "cache",
    }
    should_chown = slot_uid is not None and os.geteuid() == 0
    for base in homes.values():
        omp_dir = base / "omp"
        base.mkdir(parents=True, exist_ok=True)
        omp_dir.mkdir(parents=True, exist_ok=True)
        if not should_chown:
            continue
        assert slot_uid is not None
        for path in (base, omp_dir):
            try:
                os.chown(path, 0, slot_uid)
                path.chmod(0o770)
            except OSError as exc:
                log.warning("Failed to make XDG directory accessible to slot user %s: %s", path, exc)
    return {key: str(path) for key, path in homes.items()}


def _has_prior_session(session_dir: Path) -> bool:
    """Return True iff `session_dir` already contains an omp JSONL transcript.

    pi's `coding-agent` writes one `*.jsonl` per session into `--session-dir`.
    The presence of any such file is the signal that `--continue` will pick
    up the most recent transcript (`SessionManager.continueRecent`) rather
    than starting fresh.
    """
    try:
        return any(session_dir.glob("*.jsonl"))
    except OSError:
        return False


def _build_prompt(
    task_kind: str,
    inputs: TaskInputs,
    *,
    comment: CommentInfo | None,
    pr_number: int | None,
    review_payload: dict[str, Any] | None,
    directive: DirectiveInfo | None = None,
    resuming: bool = False,
) -> str:
    if task_kind == "triage_issue":
        if resuming:
            return persona.resume_triage(repo=inputs.repo, issue=inputs.issue, workspace=inputs.workspace)
        if directive is not None:
            return persona.kickoff_directive(
                repo=inputs.repo,
                issue=inputs.issue,
                workspace=inputs.workspace,
                directive=directive,
            )
        return persona.kickoff(repo=inputs.repo, issue=inputs.issue, workspace=inputs.workspace)
    if task_kind == "handle_comment":
        assert comment is not None
        issue_row = inputs.db.get_issue(issue_key(inputs.repo.full_name, inputs.issue.number))
        if issue_row is None:
            pr_status = "no PR opened yet"
        elif issue_row.pr_number is None:
            pr_status = "no PR opened yet"
        elif issue_row.state == "merged":
            pr_status = f"PR #{issue_row.pr_number} was merged"
        elif issue_row.state in ("closed", "abandoned"):
            pr_status = f"PR #{issue_row.pr_number} was closed without merge"
        else:
            pr_status = f"PR #{issue_row.pr_number} is open"
        if directive is not None:
            return persona.directive(
                repo=inputs.repo,
                issue=inputs.issue,
                workspace=inputs.workspace,
                comment=comment,
                directive=directive,
                pr_status=pr_status,
                pr_number=pr_number,
            )
        return persona.followup_comment(
            repo=inputs.repo,
            issue=inputs.issue,
            workspace=inputs.workspace,
            comment=comment,
            pr_status=pr_status,
            pr_number=pr_number,
        )
    if task_kind == "handle_review":
        assert review_payload is not None
        path = str(review_payload.get("path") or "")
        start = review_payload.get("start_line") or review_payload.get("line")
        end = review_payload.get("line") or review_payload.get("original_line")
        if isinstance(start, int) and isinstance(end, int) and start != end:
            line_range = f":L{start}-L{end}"
        elif isinstance(end, int):
            line_range = f":L{end}"
        else:
            line_range = ""
        body = str(review_payload.get("body") or "")
        author = str(review_payload.get("author") or "")
        return persona.followup_review(
            repo=inputs.repo,
            workspace=inputs.workspace,
            pr_number=int(pr_number or 0),
            comment_author=author,
            comment_body=body,
            comment_path=path,
            comment_line_range=line_range,
        )
    raise ValueError(f"unknown task kind: {task_kind!r}")


def _run_rpc_blocking(
    inputs: TaskInputs,
    *,
    task_kind: str,
    prompt: str,
    loop: asyncio.AbstractEventLoop,
    bindings: ToolBindings,
    directive: DirectiveInfo | None = None,
) -> str | None:
    """Run a full RPC turn synchronously. Returns final assistant text (or None)."""
    settings = inputs.settings

    def _on_tool_end(event: ToolExecutionEndEvent) -> None:
        tool_name = event.tool_name
        log.info(
            "tool_end",
            extra={
                "issue": bindings.issue_key,
                "tool": tool_name,
                "ok": event.result is not None,
            },
        )

    def _on_msg(event: MessageUpdateEvent) -> None:
        ev = event.assistant_message_event
        if isinstance(ev, dict) and ev.get("type") == "text_delta":
            log.debug("delta", extra={"issue": bindings.issue_key, "delta": str(ev.get("delta", ""))[:200]})

    rpc_env = _build_extra_env(settings)
    slot_tmpdir = str(_prepare_slot_tmpdir(inputs.workspace, inputs.slot_uid))
    rpc_env.update({"TMPDIR": slot_tmpdir, "TMP": slot_tmpdir, "TEMP": slot_tmpdir})
    rpc_env.update(_prepare_xdg_dirs(inputs.workspace, inputs.slot_uid))
    resuming = _has_prior_session(bindings.workspace.session_dir)
    extra_args: tuple[str, ...] = ("--continue",) if resuming else ()
    log.info(
        "rpc_resume",
        extra={
            "issue": bindings.issue_key,
            "task": task_kind,
            "resuming": resuming,
            "session_dir": str(bindings.workspace.session_dir),
            "attempts": inputs.attempts,
        },
    )
    model_override, thinking_override = _resolve_pragma_overrides(directive, settings)
    chosen_model = model_override or settings.pick_model()
    chosen_thinking = thinking_override or settings.thinking_level
    log.info(
        "rpc_model_pick",
        extra={
            "issue": bindings.issue_key,
            "model": chosen_model,
            "pool": list(settings.model_pool),
            "thinking": chosen_thinking,
            "pragma_model": model_override,
            "pragma_thinking": thinking_override,
        },
    )
    inputs.db.set_event_model(inputs.delivery_id, chosen_model)

    with RpcClient(
        executable=settings.omp_command,
        cwd=bindings.workspace.repo_dir,
        session_dir=bindings.workspace.session_dir,
        env=rpc_env,
        no_session=False,
        no_title=True,
        model=chosen_model,
        provider=settings.provider,
        thinking=chosen_thinking if chosen_thinking != "off" else None,
        append_system_prompt=persona.system_append(repo=inputs.repo, issue=inputs.issue, workspace=inputs.workspace),
        custom_tools=host_tools.build(bindings),
        request_timeout=settings.request_timeout_seconds,
        startup_timeout=60.0,
        max_event_history=50_000,
        extra_args=extra_args,
        user=inputs.slot_uid,
        group=inputs.slot_uid if inputs.slot_uid is not None else None,
        extra_groups=["omp"] if inputs.slot_uid is not None else None,
    ) as client:
        # Arm cancellation: from this point the API can kill the omp subprocess
        # out from under us, which makes `prompt_and_wait` raise an `RpcError`
        # we'll let propagate. The `with` exit calls `client.stop()` again, but
        # it's idempotent.
        register_cancel_hook(client.stop)
        try:
            client.install_headless_ui()
            client.on_tool_execution_end(_on_tool_end)
            client.on_message_update(_on_msg)

            phases = persona.seed_phases(task_kind)
            if phases:
                try:
                    if task_kind == "triage_issue" and not resuming:
                        # Fresh triage: seed the full plan.
                        client.set_todos(phases)
                    elif task_kind == "triage_issue":
                        # Resumed triage: prior phases are intact in the
                        # JSONL transcript — re-seeding would clobber any
                        # in-progress task statuses. Trust the loaded state.
                        log.info(
                            "set_todos skipped (resume)",
                            extra={"issue": bindings.issue_key, "task": task_kind},
                        )
                    else:
                        # Follow-up: keep prior phases (e.g. Reproduce / Fix / PR)
                        # so the agent still sees the context, but append the
                        # follow-up phase at the end.
                        existing = list(client.get_todos())
                        merged = [
                            {
                                "id": p.id,
                                "name": p.name,
                                "tasks": [
                                    {
                                        "id": t.id,
                                        "content": t.content,
                                        "status": t.status,
                                        "notes": t.notes,
                                        "details": t.details,
                                    }
                                    for t in p.tasks
                                ],
                            }
                            for p in existing
                        ] + phases
                        client.set_todos(merged)
                except RpcError as exc:
                    log.warning("set_todos failed", extra={"err": str(exc)})

            log.info(
                "rpc_start",
                extra={"issue": bindings.issue_key, "task": task_kind, "branch": bindings.workspace.branch},
            )
            hard_timeout_seconds = settings.task_timeout_seconds + settings.task_timeout_hard_grace_seconds
            hard_timeout_fired = threading.Event()

            def _hard_stop() -> None:
                hard_timeout_fired.set()
                log.warning(
                    "rpc_hard_timeout",
                    extra={"issue": bindings.issue_key, "task": task_kind, "timeout": hard_timeout_seconds},
                )
                try:
                    client.stop()
                except Exception:
                    log.exception(
                        "rpc hard timeout stop failed", extra={"issue": bindings.issue_key, "task": task_kind}
                    )

            hard_timer = threading.Timer(hard_timeout_seconds, _hard_stop)
            hard_timer.daemon = True
            hard_timer.start()
            try:
                turn = client.prompt_and_wait(prompt, timeout=settings.task_timeout_seconds)
            finally:
                hard_timer.cancel()
            if hard_timeout_fired.is_set():
                raise TimeoutError("omp task exceeded hard timeout")
            log.info(
                "rpc_done",
                extra={
                    "issue": bindings.issue_key,
                    "task": task_kind,
                    "messages": len(turn.messages),
                    "events": len(turn.events),
                },
            )
            return turn.assistant_text
        finally:
            unregister_cancel_hook()


async def run_task(
    *,
    task_kind: str,
    inputs: TaskInputs,
    comment: CommentInfo | None = None,
    pr_number: int | None = None,
    review_payload: dict[str, Any] | None = None,
    directive: DirectiveInfo | None = None,
) -> str | None:
    """Async wrapper that runs the synchronous RPC driver on a worker thread."""
    loop = asyncio.get_running_loop()
    bindings = ToolBindings(
        db=inputs.db,
        github=inputs.github,
        git_transport=inputs.git_transport,
        repo=inputs.repo,
        issue=inputs.issue,
        workspace=inputs.workspace,
        loop=loop,
        author_name=inputs.settings.resolved_author_name,
        author_email=inputs.settings.git_author_email,
        inbound_thread_number=pr_number,
        inbound_is_pr=pr_number is not None,
        slot_uid=inputs.slot_uid,
    )
    resuming = _has_prior_session(inputs.workspace.session_dir)
    prompt = _build_prompt(
        task_kind,
        inputs,
        comment=comment,
        pr_number=pr_number,
        review_payload=review_payload,
        directive=directive,
        resuming=resuming,
    )
    return await asyncio.to_thread(
        _run_rpc_blocking,
        inputs,
        task_kind=task_kind,
        prompt=prompt,
        loop=loop,
        bindings=bindings,
        directive=directive,
    )


__all__ = ["DirectiveInfo", "TaskInputs", "ThreadMessage", "run_task"]
