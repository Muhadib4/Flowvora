"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Activity, CheckCircle2, CircleAlert, Clock3, Gauge, PlusCircle } from "lucide-react";
import { Card } from "@/components/ui";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { getFlowvoraAnalytics } from "@/domain/derived";
import { useFlowvoraStore } from "@/store/flowvora-store";

const AnalyticsCharts = dynamic(() => import("./analytics-charts").then((module) => module.AnalyticsCharts), { ssr: false, loading: () => <div className="grid gap-4 lg:grid-cols-2"><div className="h-80 animate-pulse rounded-xl bg-surface-strong" /><div className="h-80 animate-pulse rounded-xl bg-surface-strong" /></div> });

export function AnalyticsPage() {
  const data = useFlowvoraStore((state) => state.data);
  const analytics = useMemo(() => getFlowvoraAnalytics(data, new Date()), [data]);
  const metrics = [
    { label: "Tasks created", value: analytics.tasksCreated, icon: PlusCircle }, { label: "Tasks completed", value: analytics.tasksCompleted, icon: CheckCircle2 },
    { label: "Completion rate", value: `${analytics.completionRate}%`, icon: Gauge }, { label: "Overdue", value: analytics.overdue, icon: CircleAlert },
    { label: "Stuck", value: analytics.stuck, icon: Clock3 }, { label: "Average task age", value: `${analytics.averageTaskAgeDays}d`, icon: Activity },
  ];
  return <PageContainer><PageHeader title="Analytics" description="Practical workflow signals derived from your real tasks. No hidden scoring or synthetic data." /><div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{metrics.map(({ label, value, icon: Icon }) => <Card key={label} className="p-4"><Icon className="size-4 text-muted" /><strong className="mt-4 block text-xl font-semibold tracking-tight">{value}</strong><span className="mt-1 block text-[11px] text-muted">{label}</span></Card>)}</div><div className="mt-6"><AnalyticsCharts analytics={analytics} /></div></PageContainer>;
}
