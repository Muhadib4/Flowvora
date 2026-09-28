"use client";

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import type { FlowvoraAnalytics } from "@/domain/types";

const colors = ["#7B8CFF", "#65C9A8", "#D7A858", "#E06B6B", "#8C7DD5"];
const tooltipStyle = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, boxShadow: "0 8px 28px rgba(0,0,0,.12)" };

export function AnalyticsCharts({ analytics }: { analytics: FlowvoraAnalytics }) {
  const priority = Object.entries(analytics.byPriority).map(([name, value]) => ({ name: name[0].toUpperCase() + name.slice(1), value }));
  const energy = Object.entries(analytics.byEnergy).map(([name, value]) => ({ name: name === "deep" ? "Deep focus" : name[0].toUpperCase() + name.slice(1), value }));
  return <div className="grid gap-4 lg:grid-cols-2">
    <ChartCard title="Recent completion trend" summary={`${analytics.recentCompletionTrend.reduce((sum, point) => sum + point.completed, 0)} tasks completed during the last seven days.`}><ResponsiveContainer width="100%" height={220}><LineChart data={analytics.recentCompletionTrend}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={28} /><Tooltip contentStyle={tooltipStyle} /><Line type="monotone" dataKey="completed" stroke="#65C9A8" strokeWidth={2.5} dot={{ r: 3, fill: "#65C9A8" }} /></LineChart></ResponsiveContainer></ChartCard>
    <ChartCard title="Tasks by priority" summary={priority.map((item) => `${item.name}: ${item.value}`).join(", ")}><ResponsiveContainer width="100%" height={220}><BarChart data={priority}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={28} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="value" radius={[5, 5, 0, 0]}>{priority.map((_, index) => <Cell key={index} fill={colors[index]} />)}</Bar></BarChart></ResponsiveContainer></ChartCard>
    <ChartCard title="Tasks by energy" summary={energy.map((item) => `${item.name}: ${item.value}`).join(", ")}><ResponsiveContainer width="100%" height={220}><BarChart data={energy} layout="vertical"><CartesianGrid stroke="var(--border)" horizontal={false} /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={78} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="value" fill="#7B8CFF" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></ChartCard>
    <ChartCard title="Tasks by board" summary={analytics.byBoard.map((item) => `${item.boardName}: ${item.count}`).join(", ") || "No board data yet."}><ResponsiveContainer width="100%" height={220}><BarChart data={analytics.byBoard.slice(0, 6)} layout="vertical"><CartesianGrid stroke="var(--border)" horizontal={false} /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="boardName" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={95} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="count" fill="#65C9A8" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></ChartCard>
  </div>;
}

function ChartCard({ title, summary, children }: { title: string; summary: string; children: React.ReactNode }) {
  return <Card><CardHeader><div><CardTitle>{title}</CardTitle><p className="sr-only">{summary}</p></div></CardHeader><CardContent className="pt-4">{children}</CardContent></Card>;
}
