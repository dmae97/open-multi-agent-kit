import { describe, expect, it } from "bun:test";
import { type Component, TUI } from "@oh-my-pi/pi-tui";
import { VirtualTerminal } from "./virtual-terminal";

class LineComponent implements Component {
	constructor(
		private readonly prefix: string,
		private readonly count: number,
	) {}

	invalidate(): void {
		// No cached state
	}

	render(_width: number): string[] {
		return Array.from({ length: this.count }, (_v, i) => `${this.prefix}${i}`);
	}
}

describe("TUI overlays", () => {
	it("does not scroll the terminal when an overlay is shown with a large historical working area", async () => {
		const term = new VirtualTerminal(80, 24);
		const tui = new TUI(term);

		tui.addChild(new LineComponent("base-", 5));

		tui.start();
		await Bun.sleep(0);
		await term.flush();

		// Simulate a large historical working area (max lines ever rendered) without actually
		// rendering that many lines in the current view.
		(tui as unknown as { maxLinesRendered: number; previousViewportTop: number }).maxLinesRendered = 1500;
		(tui as unknown as { maxLinesRendered: number; previousViewportTop: number }).previousViewportTop = Math.max(
			0,
			1500 - term.rows,
		);

		tui.showOverlay(new LineComponent("overlay-", 3), { anchor: "center" });
		await Bun.sleep(0);
		await term.flush();

		// The scroll buffer should stay small; we should not have printed hundreds/thousands of blank lines.
		expect(term.getScrollBuffer().length).toBeLessThan(200);
	});
});
