/**
 * Exa Researcher Tools
 *
 * Async research tasks with polling for completion.
 */
import { Type } from "@sinclair/typebox";
import type { CustomTool } from "../extensibility/custom-tools/types";
import { createExaTool } from "./factory";
import type { ExaRenderDetails } from "./types";

const researcherStartTool = createExaTool(
	"exa_researcher_start",
	"Start Deep Research",
	"Start an asynchronous deep research task using Exa's researcher. Returns a task_id for polling completion.",
	Type.Object({
		query: Type.String({ description: "Research query to investigate" }),
		depth: Type.Optional(
			Type.Number({
				description: "Research depth (1-5, default: 3)",
				minimum: 1,
				maximum: 5,
			}),
		),
		breadth: Type.Optional(
			Type.Number({
				description: "Research breadth (1-5, default: 3)",
				minimum: 1,
				maximum: 5,
			}),
		),
	}),
	"deep_researcher_start",
	{ formatResponse: false },
);

const researcherPollTool = createExaTool(
	"exa_researcher_poll",
	"Poll Research Status",
	"Poll the status of an asynchronous research task. Returns status (pending|running|completed|failed) and result if completed.",
	Type.Object({
		task_id: Type.String({ description: "Task ID returned from exa_researcher_start" }),
	}),
	"deep_researcher_check",
	{ formatResponse: false },
);

export const researcherTools: CustomTool<any, ExaRenderDetails>[] = [researcherStartTool, researcherPollTool];
