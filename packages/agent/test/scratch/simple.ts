import { getModel } from "@mariozechner/pi-ai";
import { InMemorySessionStorage } from "../../src/harness/session/storage/memory.js";
import {
	createAgentHarness,
	formatSkillsForSystemPrompt,
	loadSkills,
	NodeExecutionEnv,
	Session,
} from "../../src/index.js";

const env = new NodeExecutionEnv({ cwd: process.cwd() });
const skills = await loadSkills(env, "/Users/badlogic/.pi/agent/skills");
const session = new Session(new InMemorySessionStorage());
const agent = createAgentHarness({
	env,
	session,
	model: getModel("openai", "gpt-5.5"),
	thinkingLevel: "low",
	systemPrompt: ({ env, resources }) =>
		[
			`You are a helpful assistant.`,
			formatSkillsForSystemPrompt(resources.skills ?? []),
			`Current working directory: ${env.cwd}`,
		]
			.filter((part) => part.length > 0)
			.join("\n\n"),
	resources: { skills },
});

const response = await agent.prompt("What skills do you have?");
console.log(response);
