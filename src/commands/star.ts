import { starGitHubRepo, getStarPromptSummary, openRepoInBrowser, parseGitHubRepoSlug } from "../util/first-run-star.js";
import { OMK_REPO_URL } from "../util/version.js";
import { style } from "../util/theme.js";

export async function starCommand(options: { status?: boolean } = {}): Promise<void> {
  if (options.status) {
    const summary = await getStarPromptSummary();
    if (!summary) {
      console.log("No star prompt state found.");
      return;
    }
    console.log(`Answered: ${summary.answered}`);
    if (summary.starred != null) console.log(`Starred: ${summary.starred}`);
    if (summary.starError) console.log(`Error: ${summary.starError}`);
    return;
  }

  const summary = await getStarPromptSummary();
  if (summary?.starred === true) {
    console.log("Already starred. Thanks.");
    return;
  }

  try {
    await starGitHubRepo(OMK_REPO_URL);
    console.log("Starred! Thanks for supporting open-multi-agent-kit.");
  } catch (e) {
    console.error("Failed to star:", e instanceof Error ? e.message : String(e));
    const slug = parseGitHubRepoSlug(OMK_REPO_URL);
    if (slug) console.error(style.gray(`Visit ${style.cream(`https://github.com/${slug}`)} to star manually.`));
    await openRepoInBrowser(OMK_REPO_URL);
    process.exit(1);
  }
}
