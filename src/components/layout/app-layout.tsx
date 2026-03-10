"use client";

import { AppHeader } from "./app-header";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen min-w-[1280px] flex-col bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-6">
        {children}
      </main>
    </div>
  );
}
