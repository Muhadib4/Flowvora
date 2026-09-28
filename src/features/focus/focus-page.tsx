"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarClock, ExternalLink, Focus, Pause, Play, RotateCcw, Square, Timer, Zap } from "lucide-react";
import BoardBackgroundRenderer from "@/components/react-bits/BoardBackgroundRenderer";
import { JellyRadio } from "@/components/react-bits/JellyRadio";
import { SpringCheck } from "@/components/react-bits/SpringCheck";
import { FlowvoraLogo } from "@/components/brand";
import { Badge, Button, Card, EmptyState, Progress, Textarea } from "@/components/ui";
import { getChecklistProgress, selectCurrentFocus } from "@/domain/derived";
import { useFlowvoraStore } from "@/store/flowvora-store";

function remainingSeconds(timer: ReturnType<typeof useFlowvoraStore.getState>["data"]["focusTimer"], now: number) {
  if (timer.status !== "running" || !timer.endsAt) return timer.remainingSeconds;
  return Math.max(0, Math.ceil((Date.parse(timer.endsAt) - now) / 1000));
}

export function FocusPage() {
  const data = useFlowvoraStore((state) => state.data);
  const startTimer = useFlowvoraStore((state) => state.startTimer);
  const pauseTimer = useFlowvoraStore((state) => state.pauseTimer);
  const resumeTimer = useFlowvoraStore((state) => state.resumeTimer);
  const resetTimer = useFlowvoraStore((state) => state.resetTimer);
  const updateTask = useFlowvoraStore((state) => state.updateTask);
  const updateChecklistItem = useFlowvoraStore((state) => state.updateChecklistItem);
  const setCurrentFocus = useFlowvoraStore((state) => state.setCurrentFocus);
  const [tick, setTick] = useState(() => Date.now());
  const [preset, setPreset] = useState(String(Math.round(data.focusTimer.durationSeconds / 60)));
  const task = selectCurrentFocus(data);
  const board = task ? data.boardsById[task.boardId] : undefined;
  const progress = task ? getChecklistProgress(task.checklist) : { completed: 0, total: 0, percent: 0 };
  const remaining = remainingSeconds(data.focusTimer, tick);
  const timerProgress = data.focusTimer.durationSeconds ? Math.max(0, Math.min(100, (remaining / data.focusTimer.durationSeconds) * 100)) : 0;
  useEffect(() => {
    if (data.focusTimer.status !== "running") return;
    const id = window.setInterval(() => setTick(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [data.focusTimer.status]);
  const minutes = Math.floor(remaining / 60); const seconds = remaining % 60;
  const timerLabel = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  const choosePreset = (value: string) => {
    let number = Number(value);
    if (value === "custom") { const entered = window.prompt("Focus length in minutes", "35"); number = Math.max(1, Math.min(240, Number(entered) || 35)); }
    setPreset(String(number)); resetTimer(number);
  };

  return (
    <main id="main-content" className="relative min-h-dvh overflow-hidden bg-[#0b0d10] text-[#f5f7fa]">
      <BoardBackgroundRenderer background={{ type: "lightRays", colors: ["#6f7ee6", "#65c9a8", "#28304b"], intensity: 0.45, speed: 0.35 }} motionEnabled={data.settings.motionBackgrounds} reducedMotion={data.settings.motionPreference === "reduce"} overlayOpacity={0.6} />
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-4 sm:px-8 sm:py-6">
        <header className="flex items-center justify-between"><Button asChild variant="ghost" className="border-white/10 text-[#c5ccd6] hover:bg-white/5 hover:text-white"><Link href="/dashboard"><ArrowLeft />Dashboard</Link></Button><FlowvoraLogo /><span className="hidden text-xs text-[#7f8998] sm:block">Distraction-minimized focus</span></header>
        {!task || !board ? <div className="grid flex-1 place-items-center"><EmptyState icon={Focus} title="Choose a Current Focus" description="Set any task as focus from a board, Dashboard, or Daily Flow." action={<Button asChild variant="primary"><Link href="/dashboard">Return to dashboard</Link></Button>} className="w-full max-w-lg border-white/10 bg-[#11151b]/90" /></div> : <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1fr_380px]">
          <section className="mx-auto w-full max-w-2xl text-center lg:text-left"><div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[#9aa4b2] lg:justify-start"><Badge tone="accent">Current Focus</Badge><span>{board.name}</span>{task.dueDate ? <><span>·</span><CalendarClock className="size-3.5" /><span>{task.dueDate}</span></> : null}</div><h1 className="mt-5 text-balance text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">{task.title}</h1>{task.description ? <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#9aa4b2] lg:mx-0">{task.description}</p> : null}<div className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start"><Badge tone={task.priority === "urgent" ? "danger" : "warning"} className="capitalize">{task.priority} priority</Badge>{task.energy ? <Badge><Zap className="size-3" />{task.energy} energy</Badge> : null}<Button asChild size="sm" variant="ghost" className="border-white/10 text-[#9aa4b2]"><Link href={`/boards/${board.id}`}>Open board<ExternalLink /></Link></Button></div>
            {task.checklist.length > 0 ? <Card className="mt-8 border-white/10 bg-[#11151b]/82 p-5 text-left backdrop-blur"><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold">Checklist</h2><span className="text-xs text-[#7f8998]">{progress.completed}/{progress.total} · {progress.percent}%</span></div><Progress value={progress.percent} /><div className="mt-4 grid gap-3">{task.checklist.toSorted((a, b) => a.position - b.position).map((item) => <SpringCheck key={item.id} checked={item.completed} onCheckedChange={(completed) => updateChecklistItem(task.id, item.id, { completed })} label={item.title} />)}</div></Card> : null}
            <div className="mt-6 text-left"><label className="mb-2 block text-xs font-medium text-[#9aa4b2]">Focus notes</label><Textarea key={task.id} defaultValue={task.notes} onBlur={(event) => updateTask(task.id, { notes: event.target.value })} placeholder="Capture the next thought without leaving focus mode…" className="min-h-24 border-white/10 bg-[#11151b]/82 text-[#f5f7fa] placeholder:text-[#697586]" /></div>
          </section>
          <aside className="mx-auto w-full max-w-[380px] rounded-2xl border border-white/10 bg-[#11151b]/88 p-6 text-center shadow-2xl backdrop-blur-xl"><div className="mx-auto grid size-60 place-items-center rounded-full" style={{ background: `conic-gradient(#7b8cff ${timerProgress}%, #252c36 0)` }}><div className="grid size-[226px] place-items-center rounded-full bg-[#0f1318]"><div><Timer className="mx-auto mb-2 size-5 text-[#697586]" /><div className="font-mono text-5xl font-semibold tracking-[-0.06em]">{timerLabel}</div><p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#697586]">{remaining === 0 ? "Session complete" : data.focusTimer.status}</p></div></div></div><div className="mt-6"><JellyRadio options={[{ value: "25", label: "25" }, { value: "45", label: "45" }, { value: "60", label: "60" }, { value: "custom", label: "Custom" }]} value={(["25", "45", "60"].includes(preset) ? preset : "custom")} onValueChange={choosePreset} size="sm" ariaLabel="Timer length" /></div><div className="mt-5 flex justify-center gap-2">{data.focusTimer.status === "running" ? <Button variant="primary" onClick={pauseTimer}><Pause />Pause</Button> : data.focusTimer.status === "paused" ? <Button variant="primary" onClick={resumeTimer}><Play />Resume</Button> : <Button variant="primary" onClick={() => startTimer(Number(preset) || data.settings.focusDurationMinutes)}><Play />Start</Button>}<Button variant="secondary" size="icon" onClick={() => resetTimer(Number(preset) || undefined)} aria-label="Reset timer"><RotateCcw /></Button></div><p className="mt-5 text-xs leading-5 text-[#697586]">The timer never starts automatically. Its end time persists while you navigate.</p><div className="mt-6 border-t border-white/10 pt-5"><Button variant="ghost" className="text-[#9aa4b2]" onClick={() => setCurrentFocus(null)}><Square />End focus</Button></div></aside>
        </div>}
      </div>
    </main>
  );
}
