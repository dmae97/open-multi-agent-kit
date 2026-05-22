import { style, header, status, label } from "../util/theme.js";
import { emitJson, CliError } from "../util/cli-contract.js";
import { listActiveNotices, getNotice } from "../awareness/notice-store.js";
import { routeNotice, noticeToAction } from "../awareness/router.js";

interface NoticeOptions {
  json?: boolean;
}

function printNotice(notice: import("../awareness/notice.js").Notice): void {
  console.log(header(`Notice: ${notice.id}`));
  console.log(label("Type", notice.type));
  console.log(label("Source", notice.source));
  console.log(label("Severity", notice.severity));
  console.log(label("Confidence", `${Math.round(notice.confidence * 100)}%`));
  console.log(label("Created", notice.createdAt));
  console.log(label("Summary", notice.summary));
  if (notice.evidenceRefs.length > 0) {
    console.log(label("Evidence", notice.evidenceRefs.join(", ")));
  }
  console.log(label("Suggested Action", notice.suggestedAction));
}

export async function noticeListCommand(options: NoticeOptions): Promise<void> {
  const notices = await listActiveNotices();
  if (options.json) {
    emitJson({ notices });
    return;
  }

  if (notices.length === 0) {
    console.log(status.info("No active notices."));
    return;
  }

  console.log(header("Active Notices"));
  for (const notice of notices) {
    const severityIcon =
      notice.severity === "blocker"
        ? style.red("▸")
        : notice.severity === "warning"
          ? style.orange("▸")
          : style.blue("▸");
    console.log(
      `${severityIcon} ${style.creamBold(notice.id)} ${style.gray("|")} ${style.pink(notice.type)} ${style.gray("|")} ${notice.summary.slice(0, 80)}`
    );
  }
  console.log("");
  console.log(status.info(`${notices.length} active notice(s)`));
}

export async function noticeActCommand(
  noticeId: string,
  options: NoticeOptions
): Promise<void> {
  const notice = await getNotice(noticeId);
  if (!notice) {
    throw new CliError(`Notice not found: ${noticeId}`);
  }

  const action = noticeToAction(notice);
  const route = routeNotice(notice);

  if (options.json) {
    emitJson({
      noticeId,
      route,
      action,
    });
    return;
  }

  console.log(header(`Action for ${noticeId}`));
  console.log(route);
  if (action) {
    console.log("");
    console.log(
      status.info(`Recommended command: ${style.creamBold(`${action.command} ${action.args.join(" ")}`)}`)
    );
  } else {
    console.log("");
    console.log(status.warn("No automated action available. Manual review required."));
  }
}

export async function noticeExplainCommand(
  noticeId: string,
  options: NoticeOptions
): Promise<void> {
  const notice = await getNotice(noticeId);
  if (!notice) {
    throw new CliError(`Notice not found: ${noticeId}`);
  }

  if (options.json) {
    emitJson(notice);
    return;
  }

  printNotice(notice);
}
