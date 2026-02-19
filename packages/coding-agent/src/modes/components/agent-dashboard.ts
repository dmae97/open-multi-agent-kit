/**
 * AgentDashboard - dedicated control center for Task subagent configuration.
 *
 * Layout:
 * - Top: source tabs (All, Project, User, Bundled)
 * - Body: two-column view (agent list + inspector)
 *
 * Controls:
 * - Up/Down or j/k: move selection
 * - Tab / Shift+Tab: switch source tab
 * - Space: enable/disable selected agent
 * - Enter: edit model override for selected agent
 * - Esc: clear search (if any) or close dashboard
 * - Ctrl+R: reload discovered agents
 */
import {
	type Component,
	Container,
	Input,
	matchesKey,
	padding,
	replaceTabs,
	Spacer,
	Text,
	truncateToWidth,
	visibleWidth,
	wrapTextWithAnsi,
} from "@oh-my-pi/pi-tui";
import type { ModelRegistry } from "../../config/model-registry";
import { formatModelString, isDefaultModelAlias, resolveModelOverride } from "../../config/model-resolver";
import { Settings } from "../../config/settings";
import { discoverAgents } from "../../task/discovery";
import type { AgentDefinition, AgentSource } from "../../task/types";
import { shortenPath } from "../../tools/render-utils";
import { theme } from "../theme/theme";
import { DynamicBorder } from "./dynamic-border";

type SourceTabId = "all" | AgentSource;

interface SourceTab {
	id: SourceTabId;
	label: string;
	count: number;
}

interface DashboardAgent extends AgentDefinition {
	disabled: boolean;
	overrideModel?: string;
}

interface ModelResolution {
	resolved: string;
	thinkingLevel?: string;
}

interface AgentDashboardModelContext {
	modelRegistry?: ModelRegistry;
	activeModelPattern?: string;
	defaultModelPattern?: string;
}

const SOURCE_ORDER: Record<AgentSource, number> = {
	project: 0,
	user: 1,
	bundled: 2,
};

const SOURCE_LABEL: Record<AgentSource, string> = {
	project: "Project",
	user: "User",
	bundled: "Bundled",
};

function normalizeModelPatterns(value: string | string[] | undefined): string[] {
	if (Array.isArray(value)) {
		return value.map(pattern => pattern.trim()).filter(pattern => pattern.length > 0);
	}
	if (typeof value === "string") {
		const normalized = value.trim();
		if (normalized.length > 0) {
			return [normalized];
		}
	}
	return [];
}

function joinPatterns(patterns: string[]): string {
	if (patterns.length === 0) return "(session default)";
	return patterns.join(", ");
}

function matchAgent(agent: DashboardAgent, query: string): boolean {
	const q = query.toLowerCase();
	if (agent.name.toLowerCase().includes(q)) return true;
	if (agent.description.toLowerCase().includes(q)) return true;
	if (SOURCE_LABEL[agent.source].toLowerCase().includes(q)) return true;
	if (agent.overrideModel?.toLowerCase().includes(q)) return true;
	return false;
}

class AgentListPane implements Component {
	constructor(
		private readonly agents: DashboardAgent[],
		private readonly selectedIndex: number,
		private readonly scrollOffset: number,
		private readonly searchQuery: string,
		private readonly maxVisible: number,
	) {}

	render(width: number): string[] {
		const lines: string[] = [];
		const searchPrefix = theme.fg("muted", "Search: ");
		const searchText = this.searchQuery || theme.fg("dim", "type to filter");
		lines.push(`${searchPrefix}${searchText}`);
		lines.push("");

		if (this.agents.length === 0) {
			lines.push(theme.fg("muted", "  No agents found."));
			return lines;
		}

		const start = this.scrollOffset;
		const end = Math.min(start + this.maxVisible, this.agents.length);

		for (let i = start; i < end; i++) {
			const agent = this.agents[i];
			const selected = i === this.selectedIndex;
			const status = agent.disabled
				? theme.fg("dim", theme.status.disabled)
				: theme.fg("success", theme.status.enabled);
			const source = theme.fg("dim", `[${SOURCE_LABEL[agent.source]}]`);
			const override = agent.overrideModel ? ` ${theme.fg("warning", "(override)")}` : "";
			let line = ` ${status} ${replaceTabs(agent.name)} ${source}${override}`;

			if (selected) {
				line = theme.bg("selectedBg", theme.bold(theme.fg("accent", line)));
			} else if (agent.disabled) {
				line = theme.fg("dim", line);
			}

			lines.push(truncateToWidth(line, width));
		}

		if (this.agents.length > this.maxVisible) {
			lines.push(theme.fg("muted", `  (${this.selectedIndex + 1}/${this.agents.length})`));
		}

		return lines;
	}

	invalidate(): void {}
}

class AgentInspectorPane implements Component {
	constructor(
		private readonly agent: DashboardAgent | null,
		private readonly defaultPatterns: string[],
		private readonly defaultResolution: ModelResolution | undefined,
		private readonly effectivePatterns: string[],
		private readonly effectiveResolution: ModelResolution | undefined,
	) {}

	render(width: number): string[] {
		if (!this.agent) {
			return [theme.fg("muted", "Select an agent"), theme.fg("dim", "to inspect settings")];
		}

		const lines: string[] = [];
		const state = this.agent.disabled
			? theme.fg("dim", `${theme.status.disabled} Disabled`)
			: theme.fg("success", `${theme.status.enabled} Enabled`);

		lines.push(theme.bold(theme.fg("accent", replaceTabs(this.agent.name))));
		lines.push("");
		lines.push(`${theme.fg("muted", "Status:")} ${state}`);
		lines.push(`${theme.fg("muted", "Source:")} ${SOURCE_LABEL[this.agent.source]}`);
		lines.push("");

		lines.push(`${theme.fg("muted", "Default pattern:")} ${replaceTabs(joinPatterns(this.defaultPatterns))}`);
		lines.push(
			`${theme.fg("muted", "Default resolves:")} ${this.defaultResolution ? this.#formatResolution(this.defaultResolution) : theme.fg("dim", "(unresolved)")}`,
		);
		lines.push(
			`${theme.fg("muted", "Override:")} ${this.agent.overrideModel ? theme.fg("warning", replaceTabs(this.agent.overrideModel)) : theme.fg("dim", "(none)")}`,
		);
		lines.push(`${theme.fg("muted", "Effective pattern:")} ${replaceTabs(joinPatterns(this.effectivePatterns))}`);
		lines.push(
			`${theme.fg("muted", "Effective:")} ${this.effectiveResolution ? this.#formatResolution(this.effectiveResolution) : theme.fg("dim", "(unresolved)")}`,
		);

		if (this.agent.filePath) {
			lines.push("");
			lines.push(theme.fg("muted", "Path:"));
			lines.push(theme.fg("dim", `  ${replaceTabs(shortenPath(this.agent.filePath))}`));
		}

		if (this.agent.description) {
			lines.push("");
			lines.push(theme.fg("muted", "Description:"));
			for (const wrapped of wrapTextWithAnsi(replaceTabs(this.agent.description), Math.max(10, width - 2))) {
				lines.push(truncateToWidth(wrapped, width));
			}
		}

		return lines;
	}

	#formatResolution(resolution: ModelResolution): string {
		if (resolution.thinkingLevel && resolution.thinkingLevel !== "off") {
			return `${theme.fg("success", resolution.resolved)} ${theme.fg("dim", `(${resolution.thinkingLevel})`)}`;
		}
		return theme.fg("success", resolution.resolved);
	}

	invalidate(): void {}
}

class TwoColumnBody implements Component {
	constructor(
		private readonly leftPane: AgentListPane,
		private readonly rightPane: AgentInspectorPane,
		private readonly maxHeight: number,
	) {}

	render(width: number): string[] {
		const leftWidth = Math.floor(width * 0.5);
		const rightWidth = width - leftWidth - 3;
		const leftLines = this.leftPane.render(leftWidth);
		const rightLines = this.rightPane.render(rightWidth);
		const lineCount = Math.min(this.maxHeight, Math.max(leftLines.length, rightLines.length));
		const out: string[] = [];
		const separator = theme.fg("dim", ` ${theme.boxSharp.vertical} `);

		for (let i = 0; i < lineCount; i++) {
			const left = truncateToWidth(leftLines[i] ?? "", leftWidth);
			const leftPadded = left + padding(Math.max(0, leftWidth - visibleWidth(left)));
			const right = truncateToWidth(rightLines[i] ?? "", rightWidth);
			out.push(leftPadded + separator + right);
		}

		return out;
	}

	invalidate(): void {
		this.leftPane.invalidate?.();
		this.rightPane.invalidate?.();
	}
}

export class AgentDashboard extends Container {
	#settingsManager: Settings | null = null;
	#allAgents: DashboardAgent[] = [];
	#filteredAgents: DashboardAgent[] = [];
	#tabs: SourceTab[] = [{ id: "all", label: "All", count: 0 }];
	#activeTabIndex = 0;
	#selectedIndex = 0;
	#scrollOffset = 0;
	#searchQuery = "";
	#loading = true;
	#loadError: string | null = null;
	#editInput: Input | null = null;
	#editingAgentName: string | null = null;

	onClose?: () => void;

	private constructor(
		private readonly cwd: string,
		private readonly settings: Settings | null,
		private readonly terminalHeight: number,
		private readonly modelContext: AgentDashboardModelContext,
	) {
		super();
	}

	static async create(
		cwd: string,
		settings: Settings | null = null,
		terminalHeight?: number,
		modelContext: AgentDashboardModelContext = {},
	): Promise<AgentDashboard> {
		const dashboard = new AgentDashboard(cwd, settings, terminalHeight ?? process.stdout.rows ?? 24, modelContext);
		await dashboard.#init();
		return dashboard;
	}

	async #init(): Promise<void> {
		this.#settingsManager = this.settings ?? (await Settings.init());
		await this.#reloadData();
		this.#buildLayout();
	}

	async #reloadData(): Promise<void> {
		this.#loading = true;
		this.#loadError = null;
		this.#buildLayout();

		try {
			const selectedName = this.#selectedAgent()?.name;
			const activeTabId = this.#tabs[this.#activeTabIndex]?.id ?? "all";
			const { agents } = await discoverAgents(this.cwd);
			const disabled = new Set((this.#settingsManager?.get("task.disabledAgents") as string[] | undefined) ?? []);
			const overrides =
				(this.#settingsManager?.get("task.agentModelOverrides") as Record<string, string> | undefined) ?? {};

			this.#allAgents = agents
				.slice()
				.sort((a, b) => {
					const sourceCmp = SOURCE_ORDER[a.source] - SOURCE_ORDER[b.source];
					if (sourceCmp !== 0) return sourceCmp;
					return a.name.localeCompare(b.name);
				})
				.map(agent => ({
					...agent,
					disabled: disabled.has(agent.name),
					overrideModel: overrides[agent.name]?.trim() || undefined,
				}));

			this.#tabs = this.#buildTabs(this.#allAgents);
			const nextTabIndex = this.#tabs.findIndex(tab => tab.id === activeTabId);
			this.#activeTabIndex = nextTabIndex >= 0 ? nextTabIndex : 0;
			this.#applyFilters();

			if (selectedName) {
				const idx = this.#filteredAgents.findIndex(agent => agent.name === selectedName);
				if (idx >= 0) {
					this.#selectedIndex = idx;
				}
			}
			this.#clampSelection();
		} catch (error) {
			this.#allAgents = [];
			this.#filteredAgents = [];
			this.#tabs = [{ id: "all", label: "All", count: 0 }];
			this.#activeTabIndex = 0;
			this.#selectedIndex = 0;
			this.#scrollOffset = 0;
			this.#loadError = error instanceof Error ? error.message : String(error);
		} finally {
			this.#loading = false;
			this.#buildLayout();
		}
	}

	#buildTabs(agents: DashboardAgent[]): SourceTab[] {
		const tabs: SourceTab[] = [{ id: "all", label: "All", count: agents.length }];
		const counts: Record<AgentSource, number> = { project: 0, user: 0, bundled: 0 };

		for (const agent of agents) {
			counts[agent.source] += 1;
		}

		for (const source of ["project", "user", "bundled"] as const) {
			if (counts[source] > 0) {
				tabs.push({ id: source, label: SOURCE_LABEL[source], count: counts[source] });
			}
		}

		return tabs;
	}

	#selectedAgent(): DashboardAgent | null {
		return this.#filteredAgents[this.#selectedIndex] ?? null;
	}

	#applyFilters(): void {
		const activeTab = this.#tabs[this.#activeTabIndex] ?? this.#tabs[0];
		const tabFiltered =
			activeTab.id === "all" ? this.#allAgents : this.#allAgents.filter(agent => agent.source === activeTab.id);

		if (!this.#searchQuery) {
			this.#filteredAgents = tabFiltered;
		} else {
			this.#filteredAgents = tabFiltered.filter(agent => matchAgent(agent, this.#searchQuery));
		}

		this.#clampSelection();
	}

	#getMaxVisibleItems(): number {
		return Math.max(5, this.terminalHeight - 14);
	}

	#clampSelection(): void {
		if (this.#filteredAgents.length === 0) {
			this.#selectedIndex = 0;
			this.#scrollOffset = 0;
			return;
		}

		this.#selectedIndex = Math.min(this.#selectedIndex, this.#filteredAgents.length - 1);
		this.#selectedIndex = Math.max(0, this.#selectedIndex);

		const maxVisible = this.#getMaxVisibleItems();
		if (this.#selectedIndex < this.#scrollOffset) {
			this.#scrollOffset = this.#selectedIndex;
		} else if (this.#selectedIndex >= this.#scrollOffset + maxVisible) {
			this.#scrollOffset = this.#selectedIndex - maxVisible + 1;
		}
	}

	#persistDisabledAgents(): void {
		if (!this.#settingsManager) return;
		const disabled = this.#allAgents
			.filter(agent => agent.disabled)
			.map(agent => agent.name)
			.sort((a, b) => a.localeCompare(b));
		this.#settingsManager.set("task.disabledAgents", disabled);
	}

	#persistModelOverrides(): void {
		if (!this.#settingsManager) return;
		const overrides: Record<string, string> = {};
		for (const agent of this.#allAgents) {
			const value = agent.overrideModel?.trim();
			if (value) {
				overrides[agent.name] = value;
			}
		}
		this.#settingsManager.set("task.agentModelOverrides", overrides);
	}

	#toggleSelectedAgent(): void {
		const selected = this.#selectedAgent();
		if (!selected) return;
		selected.disabled = !selected.disabled;
		this.#persistDisabledAgents();
		this.#buildLayout();
	}

	#beginModelEdit(): void {
		const selected = this.#selectedAgent();
		if (!selected) return;

		this.#editingAgentName = selected.name;
		this.#editInput = new Input();
		if (selected.overrideModel) {
			this.#editInput.setValue(selected.overrideModel);
		}
		this.#editInput.onSubmit = value => {
			this.#saveModelOverride(value);
		};
		this.#buildLayout();
	}

	#saveModelOverride(rawValue: string): void {
		if (!this.#editingAgentName) return;
		const selected = this.#allAgents.find(agent => agent.name === this.#editingAgentName);
		if (!selected) return;
		const value = rawValue.trim();
		selected.overrideModel = value || undefined;
		this.#persistModelOverrides();
		this.#editingAgentName = null;
		this.#editInput = null;
		this.#applyFilters();
		this.#buildLayout();
	}

	#cancelModelEdit(): void {
		this.#editingAgentName = null;
		this.#editInput = null;
		this.#buildLayout();
	}

	#switchTab(direction: 1 | -1): void {
		if (this.#tabs.length === 0) return;
		this.#activeTabIndex = (this.#activeTabIndex + direction + this.#tabs.length) % this.#tabs.length;
		this.#selectedIndex = 0;
		this.#scrollOffset = 0;
		this.#applyFilters();
		this.#buildLayout();
	}

	#moveSelection(delta: -1 | 1): void {
		if (this.#filteredAgents.length === 0) return;
		this.#selectedIndex = Math.max(0, Math.min(this.#filteredAgents.length - 1, this.#selectedIndex + delta));
		this.#clampSelection();
		this.#buildLayout();
	}

	#defaultPatternsFor(agent: DashboardAgent): string[] {
		const explicitAgentPatterns = isDefaultModelAlias(agent.model) ? [] : normalizeModelPatterns(agent.model);
		if (explicitAgentPatterns.length > 0) {
			return explicitAgentPatterns;
		}

		const fallback =
			this.modelContext.activeModelPattern?.trim() ||
			this.modelContext.defaultModelPattern?.trim() ||
			this.#settingsManager?.getModelRole("default")?.trim() ||
			"";
		if (!fallback) return [];
		return normalizeModelPatterns(fallback);
	}

	#effectivePatternsFor(agent: DashboardAgent, draftOverride: string | undefined): string[] {
		const override = draftOverride?.trim() || "";
		if (override.length > 0) {
			return [override];
		}
		return this.#defaultPatternsFor(agent);
	}

	#resolvePatterns(patterns: string[]): ModelResolution | undefined {
		const modelRegistry = this.modelContext.modelRegistry;
		if (!modelRegistry || patterns.length === 0) return undefined;
		const { model, thinkingLevel } = resolveModelOverride(
			patterns,
			modelRegistry,
			this.#settingsManager ?? undefined,
		);
		if (!model) return undefined;
		return {
			resolved: formatModelString(model),
			thinkingLevel,
		};
	}

	#renderTabBar(): string {
		const parts: string[] = [" "];
		for (let i = 0; i < this.#tabs.length; i++) {
			const tab = this.#tabs[i];
			const label = `${tab.label} (${tab.count})`;
			if (i === this.#activeTabIndex) {
				parts.push(theme.bg("selectedBg", ` ${label} `));
			} else {
				parts.push(theme.fg("muted", ` ${label} `));
			}
		}
		return parts.join("");
	}

	#buildLayout(): void {
		this.clear();
		this.addChild(new DynamicBorder());
		this.addChild(new Text(theme.bold(theme.fg("accent", " Agent Control Center")), 0, 0));
		this.addChild(new Text(this.#renderTabBar(), 0, 0));
		this.addChild(new Spacer(1));

		if (this.#loading) {
			this.addChild(new Text(theme.fg("muted", "Loading agents..."), 0, 0));
			this.addChild(new Spacer(1));
		} else if (this.#loadError) {
			this.addChild(new Text(theme.fg("error", `Failed to load agents: ${replaceTabs(this.#loadError)}`), 0, 0));
			this.addChild(new Spacer(1));
		} else if (this.#editInput && this.#editingAgentName) {
			const editingAgent = this.#allAgents.find(agent => agent.name === this.#editingAgentName) ?? null;
			const draft = this.#editInput.getValue();
			const defaultPatterns = editingAgent ? this.#defaultPatternsFor(editingAgent) : [];
			const defaultResolution = editingAgent ? this.#resolvePatterns(defaultPatterns) : undefined;
			const previewPatterns = editingAgent ? this.#effectivePatternsFor(editingAgent, draft) : [];
			const previewResolution = editingAgent ? this.#resolvePatterns(previewPatterns) : undefined;

			this.addChild(
				new Text(theme.bold(theme.fg("accent", `Model override: ${replaceTabs(this.#editingAgentName)}`)), 0, 0),
			);
			this.addChild(new Spacer(1));
			this.addChild(new Text(theme.fg("muted", "Enter model pattern (empty clears override)"), 0, 0));
			this.addChild(new Spacer(1));
			this.addChild(this.#editInput);
			this.addChild(new Spacer(1));

			this.addChild(
				new Text(theme.fg("muted", `Default pattern: ${replaceTabs(joinPatterns(defaultPatterns))}`), 0, 0),
			);
			this.addChild(
				new Text(
					theme.fg(
						"muted",
						`Default resolves: ${defaultResolution ? defaultResolution.resolved : "(unresolved)"}`,
					),
					0,
					0,
				),
			);
			this.addChild(
				new Text(
					theme.fg(
						"muted",
						`Preview effective: ${previewResolution ? previewResolution.resolved : "(unresolved)"}`,
					),
					0,
					0,
				),
			);
			this.addChild(new Spacer(1));
			this.addChild(new Text(theme.fg("dim", " Enter: save  Esc: cancel"), 0, 0));
		} else {
			const selected = this.#selectedAgent();
			const defaultPatterns = selected ? this.#defaultPatternsFor(selected) : [];
			const defaultResolution = selected ? this.#resolvePatterns(defaultPatterns) : undefined;
			const effectivePatterns = selected ? this.#effectivePatternsFor(selected, selected.overrideModel) : [];
			const effectiveResolution = selected ? this.#resolvePatterns(effectivePatterns) : undefined;

			const listPane = new AgentListPane(
				this.#filteredAgents,
				this.#selectedIndex,
				this.#scrollOffset,
				this.#searchQuery,
				this.#getMaxVisibleItems(),
			);
			const inspector = new AgentInspectorPane(
				selected,
				defaultPatterns,
				defaultResolution,
				effectivePatterns,
				effectiveResolution,
			);
			const bodyHeight = Math.max(5, this.terminalHeight - 8);
			this.addChild(new TwoColumnBody(listPane, inspector, bodyHeight));
			this.addChild(new Spacer(1));
			this.addChild(
				new Text(
					theme.fg(
						"dim",
						" ↑/↓: navigate  Space: toggle  Enter: model override  Tab: source  Ctrl+R: reload  Esc: close",
					),
					0,
					0,
				),
			);
		}

		this.addChild(new DynamicBorder());
	}

	handleInput(data: string): void {
		const charCode = data.length === 1 ? data.charCodeAt(0) : -1;

		if (matchesKey(data, "ctrl+c")) {
			this.onClose?.();
			return;
		}

		if (this.#editInput) {
			if (matchesKey(data, "escape") || matchesKey(data, "esc")) {
				this.#cancelModelEdit();
				return;
			}
			this.#editInput.handleInput(data);
			if (this.#editInput) {
				this.#buildLayout();
			}
			return;
		}

		if (matchesKey(data, "escape") || matchesKey(data, "esc")) {
			if (this.#searchQuery.length > 0) {
				this.#searchQuery = "";
				this.#applyFilters();
				this.#buildLayout();
				return;
			}
			this.onClose?.();
			return;
		}

		if (matchesKey(data, "ctrl+r")) {
			void this.#reloadData();
			return;
		}

		if (matchesKey(data, "tab")) {
			this.#switchTab(1);
			return;
		}
		if (matchesKey(data, "shift+tab")) {
			this.#switchTab(-1);
			return;
		}

		if (matchesKey(data, "up") || data === "k") {
			this.#moveSelection(-1);
			return;
		}
		if (matchesKey(data, "down") || data === "j") {
			this.#moveSelection(1);
			return;
		}

		if (data === " ") {
			this.#toggleSelectedAgent();
			return;
		}
		if (matchesKey(data, "enter") || matchesKey(data, "return") || data === "\n") {
			this.#beginModelEdit();
			return;
		}

		if (matchesKey(data, "backspace")) {
			if (this.#searchQuery.length > 0) {
				this.#searchQuery = this.#searchQuery.slice(0, -1);
				this.#applyFilters();
				this.#buildLayout();
			}
			return;
		}

		if (data.length === 1 && charCode > 32 && charCode < 127) {
			if (data === "j" || data === "k") {
				return;
			}
			this.#searchQuery += data;
			this.#applyFilters();
			this.#buildLayout();
		}
	}
}
