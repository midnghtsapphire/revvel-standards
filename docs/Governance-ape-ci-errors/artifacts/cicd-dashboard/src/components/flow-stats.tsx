import React from "react";
import { useGetFlowSummary } from "@workspace/api-client-react";
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from "lucide-react";

export function FlowStats({ flowId }: { flowId: number }) {
  const { data: stats } = useGetFlowSummary(flowId);

  if (!stats) return null;

  return (
    <div className="glass-panel border-white/10 rounded-lg p-4 flex items-center justify-between gap-6 max-w-3xl mx-auto shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <div className="flex flex-col">
        <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">Total Nodes</span>
        <span className="text-2xl font-bold text-white font-mono">{stats.totalNodes}</span>
      </div>
      
      <div className="h-8 w-px bg-white/10" />
      
      <div className="flex items-center gap-6">
        <StatItem icon={<ShieldCheck className="w-4 h-4 text-primary" />} label="Checks" value={stats.checkCount} />
        <StatItem icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} label="Success" value={stats.successCount} />
        <StatItem icon={<XCircle className="w-4 h-4 text-rose-500" />} label="Failure" value={stats.failureCount} />
        <StatItem icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} label="Warning" value={stats.warningCount} />
      </div>
    </div>
  );
}

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="p-1.5 rounded-md bg-white/5 border border-white/10">
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-mono text-white/50 uppercase">{label}</span>
        <span className="text-sm font-bold text-white font-mono">{value}</span>
      </div>
    </div>
  );
}
