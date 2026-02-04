import { format } from "date-fns";
import { Activity, AlertCircle, BarChart2, ChevronDown, ChevronUp, Database, RefreshCw, Server } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { getRecentErrors, getRecentRequests, getStats, sync } from "./api";
import { RequestDetail } from "./components/RequestDetail";
import { RequestList } from "./components/RequestList";
import { StatCard } from "./components/StatCard";
import type { DashboardStats, MessageStats, ModelPerformancePoint, ModelStats, ModelTimeSeriesPoint } from "./types";

const MODEL_COLORS = ["#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#38bdf8", "#f472b6"];

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
	return (
		<div
			style={{
				background: "var(--bg-secondary)",
				borderRadius: "12px",
				border: "1px solid var(--border)",
				overflow: "hidden",
				height: "100%",
				display: "flex",
				flexDirection: "column",
			}}
		>
			<div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
				<div style={{ fontSize: "1rem", fontWeight: 600 }}>{title}</div>
				{subtitle ? <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{subtitle}</div> : null}
			</div>
			<div style={{ flex: 1, padding: "12px 16px" }}>{children}</div>
		</div>
	);
}

function formatDateTick(timestamp: number): string {
	return format(new Date(timestamp), "MMM d");
}

function buildModelPreferenceSeries(
	points: ModelTimeSeriesPoint[],
	topN = 5,
): {
	data: Array<Record<string, number>>;
	series: string[];
} {
	if (points.length === 0) return { data: [], series: [] };

	const totals = new Map<string, { label: string; total: number }>();
	for (const point of points) {
		const key = `${point.model}::${point.provider}`;
		const label = `${point.model} (${point.provider})`;
		const existing = totals.get(key);
		if (existing) {
			existing.total += point.requests;
		} else {
			totals.set(key, { label, total: point.requests });
		}
	}

	const sorted = [...totals.values()].sort((a, b) => b.total - a.total);
	const topLabels = sorted.slice(0, topN).map(entry => entry.label);
	const dataMap = new Map<number, Record<string, number>>();

	for (const point of points) {
		const label = `${point.model} (${point.provider})`;
		const bucket = dataMap.get(point.timestamp) ?? { timestamp: point.timestamp, total: 0 };
		bucket.total += point.requests;
		const key = topLabels.includes(label) ? label : "Other";
		bucket[key] = (bucket[key] ?? 0) + point.requests;
		dataMap.set(point.timestamp, bucket);
	}

	const series = [...topLabels];
	if ([...dataMap.values()].some(row => (row.Other ?? 0) > 0)) {
		series.push("Other");
	}

	const data = [...dataMap.values()]
		.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
		.map(row => {
			const total = row.total ?? 0;
			for (const key of series) {
				row[key] = total > 0 ? ((row[key] ?? 0) / total) * 100 : 0;
			}
			return row;
		});

	return { data, series };
}

type ModelPerformanceSeries = {
	label: string;
	data: Array<{
		timestamp: number;
		avgTtftSeconds: number | null;
		avgTokensPerSecond: number | null;
		requests: number;
	}>;
};

function buildModelPerformanceLookup(
	points: ModelPerformancePoint[],
	days = 14,
): { buckets: number[]; seriesByKey: Map<string, ModelPerformanceSeries> } {
	const dayMs = 24 * 60 * 60 * 1000;
	const maxTimestamp = points.reduce((max, point) => Math.max(max, point.timestamp), 0);
	const anchor = maxTimestamp > 0 ? maxTimestamp : Math.floor(Date.now() / dayMs) * dayMs;
	const start = anchor - (days - 1) * dayMs;
	const buckets = Array.from({ length: days }, (_, index) => start + index * dayMs);
	const bucketIndex = new Map(buckets.map((timestamp, index) => [timestamp, index]));
	const seriesByKey = new Map<string, ModelPerformanceSeries>();

	for (const point of points) {
		const key = `${point.model}::${point.provider}`;
		let series = seriesByKey.get(key);
		if (!series) {
			series = {
				label: `${point.model} (${point.provider})`,
				data: buckets.map(timestamp => ({
					timestamp,
					avgTtftSeconds: null,
					avgTokensPerSecond: null,
					requests: 0,
				})),
			};
			seriesByKey.set(key, series);
		}

		const index = bucketIndex.get(point.timestamp);
		if (index === undefined) continue;

		series.data[index] = {
			timestamp: point.timestamp,
			avgTtftSeconds: point.avgTtft !== null ? point.avgTtft / 1000 : null,
			avgTokensPerSecond: point.avgTokensPerSecond,
			requests: point.requests,
		};
	}

	return { buckets, seriesByKey };
}

function ModelStatsTable({
	models,
	performanceSeriesByKey,
}: {
	models: ModelStats[];
	performanceSeriesByKey: Map<string, ModelPerformanceSeries>;
}) {
	const [expandedKey, setExpandedKey] = useState<string | null>(null);
	const sortedModels = [...models].sort(
		(a, b) => b.totalInputTokens + b.totalOutputTokens - (a.totalInputTokens + a.totalOutputTokens),
	);

	return (
		<div
			style={{
				background: "var(--bg-secondary)",
				borderRadius: "12px",
				border: "1px solid var(--border)",
				overflow: "hidden",
			}}
		>
			<div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
				<h3 style={{ margin: 0, fontSize: "1rem" }}>Model Statistics</h3>
			</div>
			<div>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "2.4fr 0.9fr 0.9fr 1fr 0.8fr 0.8fr 160px 32px",
						gap: "12px",
						padding: "12px 20px",
						color: "var(--text-secondary)",
						fontSize: "0.75rem",
						textTransform: "uppercase",
						letterSpacing: "0.04em",
					}}
				>
					<div>Model</div>
					<div style={{ textAlign: "right" }}>Requests</div>
					<div style={{ textAlign: "right" }}>Cost</div>
					<div style={{ textAlign: "right" }}>Tokens</div>
					<div style={{ textAlign: "right" }}>Tokens/s</div>
					<div style={{ textAlign: "right" }}>TTFT</div>
					<div style={{ textAlign: "center" }}>14d Trend</div>
					<div />
				</div>
				<div style={{ maxHeight: "calc(100vh - 260px)", overflowY: "auto" }}>
					{sortedModels.map((model, index) => {
						const key = `${model.model}::${model.provider}`;
						const performance = performanceSeriesByKey.get(key);
						const trendData = performance?.data ?? [];
						const trendColor = MODEL_COLORS[index % MODEL_COLORS.length];
						const isExpanded = expandedKey === key;

						return (
							<div key={key} style={{ borderTop: "1px solid var(--border)" }}>
								<button
									type="button"
									onClick={() => setExpandedKey(isExpanded ? null : key)}
									style={{
										width: "100%",
										background: "transparent",
										border: "none",
										color: "inherit",
										padding: "12px 20px",
										textAlign: "left",
										cursor: "pointer",
									}}
								>
									<div
										style={{
											display: "grid",
											gridTemplateColumns: "2.4fr 0.9fr 0.9fr 1fr 0.8fr 0.8fr 160px 32px",
											gap: "12px",
											alignItems: "center",
										}}
									>
										<div>
											<div style={{ fontWeight: 600 }}>{model.model}</div>
											<div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
												{model.provider}
											</div>
										</div>
										<div style={{ textAlign: "right" }}>{model.totalRequests.toLocaleString()}</div>
										<div style={{ textAlign: "right" }}>${model.totalCost.toFixed(2)}</div>
										<div style={{ textAlign: "right" }}>
											{(model.totalInputTokens + model.totalOutputTokens).toLocaleString()}
										</div>
										<div style={{ textAlign: "right" }}>{model.avgTokensPerSecond?.toFixed(1) ?? "-"}</div>
										<div style={{ textAlign: "right" }}>
											{model.avgTtft ? `${(model.avgTtft / 1000).toFixed(2)}s` : "-"}
										</div>
										<div style={{ height: 40 }}>
											{trendData.length === 0 ? (
												<div style={{ color: "var(--text-secondary)", textAlign: "center" }}>-</div>
											) : (
												<ResponsiveContainer width="100%" height="100%">
													<LineChart data={trendData}>
														<Line
															type="monotone"
															dataKey="avgTokensPerSecond"
															stroke={trendColor}
															strokeWidth={2}
															dot={false}
														/>
													</LineChart>
												</ResponsiveContainer>
											)}
										</div>
										<div style={{ display: "flex", justifyContent: "center" }}>
											{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
										</div>
									</div>
								</button>
								{isExpanded && (
									<div
										style={{
											padding: "16px 20px 20px",
											background: "rgba(0,0,0,0.2)",
										}}
									>
										<div
											style={{
												display: "grid",
												gridTemplateColumns: "240px 1fr",
												gap: "16px",
												alignItems: "stretch",
											}}
										>
											<div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
												<div style={{ marginBottom: "8px" }}>
													<div style={{ color: "var(--text-primary)", fontWeight: 600 }}>Quality</div>
													<div>Errors: {(model.errorRate * 100).toFixed(1)}%</div>
													<div>Cache rate: {(model.cacheRate * 100).toFixed(1)}%</div>
												</div>
												<div>
													<div style={{ color: "var(--text-primary)", fontWeight: 600 }}>Latency</div>
													<div>
														Avg duration:{" "}
														{model.avgDuration ? `${(model.avgDuration / 1000).toFixed(2)}s` : "-"}
													</div>
													<div>
														Avg TTFT: {model.avgTtft ? `${(model.avgTtft / 1000).toFixed(2)}s` : "-"}
													</div>
												</div>
											</div>
											<div style={{ height: 180 }}>
												{trendData.length === 0 ? (
													<div
														style={{
															color: "var(--text-secondary)",
															textAlign: "center",
															paddingTop: "40px",
														}}
													>
														No data yet
													</div>
												) : (
													<ResponsiveContainer width="100%" height="100%">
														<LineChart data={trendData} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
															<CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
															<XAxis
																dataKey="timestamp"
																tickFormatter={formatDateTick}
																stroke="var(--text-secondary)"
															/>
															<YAxis
																yAxisId="left"
																stroke="var(--text-secondary)"
																tickFormatter={value => `${value}s`}
															/>
															<YAxis
																yAxisId="right"
																orientation="right"
																stroke="var(--text-secondary)"
															/>
															<Tooltip
																labelFormatter={(label: ReactNode) =>
																	typeof label === "number" ? formatDateTick(label) : ""
																}
																formatter={(
																	value: number | string | undefined,
																	name: string | undefined,
																) => {
																	const numericValue = value ?? 0;
																	if (name === "avgTtftSeconds")
																		return [`${Number(numericValue).toFixed(2)}s`, "TTFT"];
																	return [`${Number(numericValue).toFixed(1)}`, "Tokens/s"];
																}}
															/>
															<Legend
																formatter={value => (value === "avgTtftSeconds" ? "TTFT" : "Tokens/s")}
															/>
															<Line
																yAxisId="left"
																type="monotone"
																dataKey="avgTtftSeconds"
																stroke="#fbbf24"
																strokeWidth={2}
																dot={false}
															/>
															<Line
																yAxisId="right"
																type="monotone"
																dataKey="avgTokensPerSecond"
																stroke={trendColor}
																strokeWidth={2}
																dot={false}
															/>
														</LineChart>
													</ResponsiveContainer>
												)}
											</div>
										</div>
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

export default function App() {
	const [stats, setStats] = useState<DashboardStats | null>(null);
	const [recentRequests, setRecentRequests] = useState<MessageStats[]>([]);
	const [recentErrors, setRecentErrors] = useState<MessageStats[]>([]);
	const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
	const [syncing, setSyncing] = useState(false);
	const [activeTab, setActiveTab] = useState<"overview" | "requests" | "errors" | "models">("overview");

	const loadData = useCallback(async () => {
		try {
			const [s, r, e] = await Promise.all([getStats(), getRecentRequests(50), getRecentErrors(50)]);
			setStats(s);
			setRecentRequests(r);
			setRecentErrors(e);
		} catch (err) {
			console.error(err);
		}
	}, []);

	const handleSync = async () => {
		setSyncing(true);
		try {
			await sync();
			await loadData();
		} finally {
			setSyncing(false);
		}
	};

	useEffect(() => {
		loadData();
		const interval = setInterval(loadData, 30000);
		return () => clearInterval(interval);
	}, [loadData]);

	if (!stats) return <div style={{ padding: 40, textAlign: "center" }}>Loading stats...</div>;

	const { seriesByKey: performanceSeriesByKey } = buildModelPerformanceLookup(stats.modelPerformanceSeries);
	const modelPreference = buildModelPreferenceSeries(stats.modelSeries);

	return (
		<div style={{ maxWidth: "1400px", margin: "0 auto", padding: "20px" }}>
			<header
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "30px",
					paddingBottom: "20px",
					borderBottom: "1px solid var(--border)",
				}}
			>
				<h1 style={{ margin: 0, fontSize: "1.5rem", display: "flex", alignItems: "center", gap: "10px" }}>
					<Activity color="var(--accent)" />
					AI Usage Statistics
				</h1>
				<div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
					<div style={{ display: "flex", background: "var(--bg-secondary)", borderRadius: "6px", padding: "4px" }}>
						{(["overview", "requests", "errors", "models"] as const).map(tab => (
							<button
								type="button"
								key={tab}
								onClick={() => setActiveTab(tab)}
								style={{
									background: activeTab === tab ? "var(--bg-card)" : "transparent",
									color: activeTab === tab ? "var(--text-primary)" : "var(--text-secondary)",
									border: "none",
									padding: "6px 16px",
									borderRadius: "4px",
									cursor: "pointer",
									textTransform: "capitalize",
									fontWeight: 500,
								}}
							>
								{tab}
							</button>
						))}
					</div>
					<button
						type="button"
						onClick={handleSync}
						disabled={syncing}
						style={{
							background: "var(--accent)",
							color: "white",
							border: "none",
							padding: "8px 16px",
							borderRadius: "6px",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "8px",
							opacity: syncing ? 0.7 : 1,
						}}
					>
						<RefreshCw size={16} className={syncing ? "spin" : ""} />
						{syncing ? "Syncing..." : "Sync"}
					</button>
				</div>
			</header>

			{activeTab === "overview" && (
				<>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
							gap: "20px",
							marginBottom: "30px",
						}}
					>
						<StatCard
							title="Total Requests"
							value={stats.overall.totalRequests.toLocaleString()}
							detail={`${stats.overall.successfulRequests} success, ${stats.overall.failedRequests} errors`}
							icon={<Server size={20} />}
						/>
						<StatCard
							title="Total Cost"
							value={`$${stats.overall.totalCost.toFixed(2)}`}
							detail={
								stats.overall.totalRequests > 0
									? `$${(stats.overall.totalCost / stats.overall.totalRequests).toFixed(4)} avg/req`
									: "-"
							}
							icon={<Activity size={20} />}
						/>
						<StatCard
							title="Cache Rate"
							value={`${(stats.overall.cacheRate * 100).toFixed(1)}%`}
							detail={`${(stats.overall.totalCacheReadTokens / 1000).toFixed(1)}k cached tokens`}
							icon={<Database size={20} />}
						/>
						<StatCard
							title="Error Rate"
							value={`${(stats.overall.errorRate * 100).toFixed(1)}%`}
							detail={`${stats.overall.failedRequests} failed requests`}
							icon={<AlertCircle size={20} />}
							color="var(--error)"
						/>
						<StatCard
							title="Tokens/Sec"
							value={stats.overall.avgTokensPerSecond?.toFixed(1) ?? "-"}
							detail={`${(stats.overall.totalInputTokens + stats.overall.totalOutputTokens).toLocaleString()} total tokens`}
							icon={<BarChart2 size={20} />}
						/>
						<StatCard
							title="TTFT"
							value={stats.overall.avgTtft ? `${(stats.overall.avgTtft / 1000).toFixed(2)}s` : "-"}
							detail="Time to first token"
							icon={<Activity size={20} />}
						/>
					</div>

					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", height: "400px" }}>
						<RequestList
							title="Recent Requests"
							requests={recentRequests}
							onSelect={r => r.id && setSelectedRequest(r.id)}
						/>
						<RequestList
							title="Recent Errors"
							requests={recentErrors}
							onSelect={r => r.id && setSelectedRequest(r.id)}
						/>
					</div>
				</>
			)}

			{activeTab === "requests" && (
				<div style={{ height: "calc(100vh - 150px)" }}>
					<RequestList
						title="All Recent Requests"
						requests={recentRequests}
						onSelect={r => r.id && setSelectedRequest(r.id)}
					/>
				</div>
			)}

			{activeTab === "errors" && (
				<div style={{ height: "calc(100vh - 150px)" }}>
					<RequestList
						title="Failed Requests"
						requests={recentErrors}
						onSelect={r => r.id && setSelectedRequest(r.id)}
					/>
				</div>
			)}

			{activeTab === "models" && (
				<div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
					<ChartCard title="Model Preference" subtitle="Share of requests, last 14 days">
						{modelPreference.data.length === 0 ? (
							<div style={{ color: "var(--text-secondary)", textAlign: "center", paddingTop: "40px" }}>
								No data yet
							</div>
						) : (
							<ResponsiveContainer width="100%" height={260}>
								<AreaChart data={modelPreference.data} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
									<CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
									<XAxis dataKey="timestamp" tickFormatter={formatDateTick} stroke="var(--text-secondary)" />
									<YAxis stroke="var(--text-secondary)" tickFormatter={value => `${value}%`} />
									<Tooltip
										labelFormatter={(label: ReactNode) =>
											typeof label === "number" ? formatDateTick(label) : ""
										}
										formatter={(value: number | string | undefined) => [
											`${Number(value ?? 0).toFixed(1)}%`,
											"Share",
										]}
									/>
									<Legend />
									{modelPreference.series.map((seriesName, index) => (
										<Area
											key={seriesName}
											dataKey={seriesName}
											stackId="1"
											stroke={MODEL_COLORS[index % MODEL_COLORS.length]}
											fill={MODEL_COLORS[index % MODEL_COLORS.length]}
											fillOpacity={0.25}
										/>
									))}
								</AreaChart>
							</ResponsiveContainer>
						)}
					</ChartCard>
					<ModelStatsTable models={stats.byModel} performanceSeriesByKey={performanceSeriesByKey} />
				</div>
			)}

			{selectedRequest !== null && <RequestDetail id={selectedRequest} onClose={() => setSelectedRequest(null)} />}
		</div>
	);
}
