import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Settings, ChevronRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListFlows } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FlowCreateDialog, FlowEditDialog } from "./flow-dialogs";

export function FlowSidebar({ currentFlowId }: { currentFlowId?: number }) {
  const { data: flows, isLoading } = useListFlows();
  const [, setLocation] = useLocation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editFlowId, setEditFlowId] = useState<number | null>(null);

  return (
    <div className="w-72 border-r border-white/10 glass-panel h-screen flex flex-col fixed left-0 top-0 overflow-hidden z-20">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-lg font-mono tracking-tight text-white">GOVERNANCE</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setCreateOpen(true)} className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-primary/10">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3 px-2">Decision Flows</div>
        
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md bg-white/5" />
          ))
        ) : flows?.length === 0 ? (
          <div className="text-sm text-muted-foreground px-2 italic">No flows created yet.</div>
        ) : (
          flows?.map((flow) => {
            const isActive = flow.id === currentFlowId;
            return (
              <div 
                key={flow.id}
                className={`group flex items-center justify-between p-3 rounded-md border transition-all duration-300 cursor-pointer ${
                  isActive 
                    ? "bg-primary/10 border-primary/30 text-primary shadow-[0_0_15px_rgba(255,215,0,0.1)]" 
                    : "glass-panel-hover border-transparent text-white/70"
                }`}
                onClick={() => setLocation(`/flow/${flow.id}`)}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-sm truncate font-bold">{flow.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{flow.nodeCount} nodes</div>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? "text-primary hover:bg-primary/20" : "text-white/50 hover:text-white"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditFlowId(flow.id);
                  }}
                >
                  <Settings className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })
        )}
      </div>

      <FlowCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editFlowId && (
        <FlowEditDialog 
          flowId={editFlowId} 
          open={!!editFlowId} 
          onOpenChange={(val) => !val && setEditFlowId(null)} 
        />
      )}
    </div>
  );
}
