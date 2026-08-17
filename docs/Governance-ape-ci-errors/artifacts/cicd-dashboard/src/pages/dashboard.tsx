import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetFlow, useListFlows, getGetFlowQueryKey, type Node } from "@workspace/api-client-react";
import { FlowSidebar } from "@/components/flow-sidebar";
import { FlowTree } from "@/components/flow-tree";
import { FlowStats } from "@/components/flow-stats";
import { NodeDetailDrawer } from "@/components/node-detail-drawer";
import { Loader2, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import madApeHero from "@/assets/mad-ape-hero.png";

export function Dashboard() {
  const params = useParams();
  const { data: flows, isLoading: flowsLoading } = useListFlows();
  const [, setLocation] = useLocation();

  // Parse ID from URL or default to first flow
  const currentFlowId = params.id 
    ? parseInt(params.id, 10) 
    : (flows && flows.length > 0 ? flows[0].id : undefined);

  useEffect(() => {
    if (!params.id && currentFlowId) {
      // Redirect to the first flow if none selected in URL
      setLocation(`/flow/${currentFlowId}`);
    }
  }, [params.id, currentFlowId, setLocation]);

  const { data: flowData, isLoading: flowLoading } = useGetFlow(
    currentFlowId!, 
    { query: { enabled: !!currentFlowId, queryKey: getGetFlowQueryKey(currentFlowId!) } }
  );

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  if (flowsLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <FlowSidebar currentFlowId={currentFlowId} />
      
      <main className="flex-1 ml-72 relative h-screen overflow-hidden flex flex-col">
        {/* Ambient background noise/grid */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-20" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255, 255, 255, 0.15) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        
        {currentFlowId && flowData ? (
          <>
            <div className="z-10 relative p-6 flex flex-col gap-2 bg-background/80 backdrop-blur-sm border-b border-white/10 shrink-0 overflow-hidden min-h-[420px]">
              <img
                src={madApeHero}
                alt="Enraged gorilla roaring at a banana just out of reach"
                className="pointer-events-none select-none absolute top-0 right-6 h-[420px] w-auto object-contain object-top opacity-95 drop-shadow-[0_0_60px_rgba(255,215,0,0.3)] z-0"
              />
              <div className="relative z-10 max-w-[55%]">
                <h1 className="text-3xl font-bold font-sans text-white tracking-tight">{flowData.name}</h1>
                {flowData.description && (
                  <p className="text-sm text-white/60 font-mono max-w-4xl">{flowData.description}</p>
                )}
                <div className="mt-4">
                  <FlowStats flowId={currentFlowId} />
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto z-10 relative custom-scrollbar">
              <div className="min-w-max p-8 pb-32">
                <FlowTree 
                  nodes={flowData.nodes} 
                  flowId={currentFlowId} 
                  onNodeSelect={setSelectedNode} 
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center z-10 p-8 text-center">
            <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
              <GitBranch className="w-12 h-12 text-white/40" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 font-mono">No Flow Selected</h2>
            <p className="text-white/60 max-w-md font-sans mb-8">
              Select a decision tree from the governance sidebar or initialize a new flow to begin mapping CI/CD diagnostics.
            </p>
          </div>
        )}
      </main>

      <NodeDetailDrawer 
        node={selectedNode} 
        open={!!selectedNode} 
        onOpenChange={(val) => !val && setSelectedNode(null)} 
      />
    </div>
  );
}
