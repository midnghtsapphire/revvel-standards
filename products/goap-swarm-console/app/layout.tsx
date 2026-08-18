import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GOAP Swarm Console — Goal-Oriented Multi-Agent Planner",
  description:
    "Interactive GOAP planner and swarm orchestrator with awareness, precog, guilt escalation, stigmergic trails, and research-backed evaluation of multi-agent architectures.",
  keywords: [
    "goal oriented action planning",
    "multi agent swarm orchestration",
    "GOAP agent planner",
    "self healing AI agents",
    "stigmergy multi agent systems",
    "autonomous agent coordination SaaS",
    "OpenRouter swarm routing",
    "AI agent task allocator",
  ],
  openGraph: {
    title: "GOAP Swarm Console — Goal-Oriented Multi-Agent Planner",
    description:
      "Plan, simulate, and assign multi-agent GOAP swarms. Research-evaluated rules from WR-16500 with a working symbolic planner.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
