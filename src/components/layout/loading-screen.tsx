import { FlowvoraLogo } from "@/components/brand";

export function LoadingScreen() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="flex flex-col items-center gap-5 text-center">
        <FlowvoraLogo />
        <div className="h-1 w-32 overflow-hidden rounded-full bg-surface-strong">
          <div className="h-full w-1/2 animate-[loadingBar_1.2s_ease-in-out_infinite] rounded-full bg-accent" />
        </div>
        <p className="text-sm text-secondary">Preparing your workspace…</p>
      </div>
    </main>
  );
}
