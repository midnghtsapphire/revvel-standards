import React from "react";
import { type Node } from "@workspace/api-client-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldAlert, Info, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface NodeDetailDrawerProps {
  node: Node | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NodeDetailDrawer({ node, open, onOpenChange }: NodeDetailDrawerProps) {
  if (!node) return null;

  const glowClass = {
    start: "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]",
    check: "text-primary drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]",
    success: "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]",
    failure: "text-rose-400 drop-shadow-[0_0_8px_rgba(225,29,72,0.5)]",
    warning: "text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]",
  }[node.type] || "text-white";

  const TypeIcon = {
    start: Info,
    check: ShieldAlert,
    success: CheckCircle2,
    failure: XCircle,
    warning: AlertTriangle
  }[node.type] || Info;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="glass-panel border-l border-white/10 w-[400px] sm:w-[540px] text-white p-0 flex flex-col z-[100]">
        <div className="p-6 border-b border-white/10 bg-black/20">
          <SheetHeader>
            <div className="flex items-center gap-2 mb-2">
              <TypeIcon className={`w-5 h-5 ${glowClass}`} />
              <span className={`text-xs uppercase font-mono tracking-widest ${glowClass}`}>
                {node.type} Node
              </span>
            </div>
            <SheetTitle className="text-2xl font-sans text-white">{node.title}</SheetTitle>
            <SheetDescription className="hidden">Node details and metadata</SheetDescription>
          </SheetHeader>
        </div>
        
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-8">
            <div>
              <h4 className="text-xs uppercase font-mono text-white/50 tracking-wider mb-2 flex items-center gap-2">
                <Info className="w-3 h-3" /> Context / Tidbit
              </h4>
              <div className="glass-panel bg-white/5 p-4 rounded-md border-white/10 font-mono text-sm leading-relaxed text-white/90">
                {node.tidbit}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs uppercase font-mono text-white/50 tracking-wider mb-1">Branch Label</h4>
                <div className="font-mono text-sm">{node.branchLabel || "—"}</div>
              </div>
              <div>
                <h4 className="text-xs uppercase font-mono text-white/50 tracking-wider mb-1">Sort Order</h4>
                <div className="font-mono text-sm">{node.sortOrder}</div>
              </div>
              <div className="col-span-2">
                <h4 className="text-xs uppercase font-mono text-white/50 tracking-wider mb-1 flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Created
                </h4>
                <div className="font-mono text-sm">{new Date(node.createdAt).toLocaleString()}</div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-white/10">
              <h4 className="text-xs uppercase font-mono text-white/50 tracking-wider mb-2">System Metadata</h4>
              <pre className="p-3 bg-black/40 rounded-md text-[10px] font-mono text-white/60 overflow-x-auto border border-white/5">
                {JSON.stringify({
                  id: node.id,
                  flowId: node.flowId,
                  parentId: node.parentId,
                  type: node.type
                }, null, 2)}
              </pre>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
