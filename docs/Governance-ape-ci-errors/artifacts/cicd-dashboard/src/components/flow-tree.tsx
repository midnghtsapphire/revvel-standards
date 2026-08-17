import React, { useState, useMemo } from "react";
import { type Node, NodeType } from "@workspace/api-client-react";
import { Plus, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NodeCreateDialog, NodeEditDialog } from "./node-dialogs";
import { useDashboardMutations } from "@/hooks/use-dashboard";

interface FlowTreeProps {
  nodes: Node[];
  flowId: number;
  onNodeSelect: (node: Node) => void;
}

export function FlowTree({ nodes, flowId, onNodeSelect }: FlowTreeProps) {
  const rootNodes = useMemo(() => nodes.filter(n => !n.parentId).sort((a, b) => a.sortOrder - b.sortOrder), [nodes]);

  if (!nodes || nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <div className="glass-panel p-8 rounded-lg max-w-md border-primary/20 border">
          <div className="text-primary mb-4 w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(255,215,0,0.2)]">
            <Plus className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white font-mono mb-2">Initialize Flow</h3>
          <p className="text-sm text-white/60 mb-6 font-sans">
            Your decision tree is empty. Create a starting node to begin mapping your CI/CD diagnostic workflow.
          </p>
          <NodeCreateDialog flowId={flowId} parentId={null}>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono w-full">
              Create Root Node
            </Button>
          </NodeCreateDialog>
        </div>
      </div>
    );
  }

  return (
    <div className="org-tree p-12">
      <ul>
        {rootNodes.map(node => (
          <TreeNode key={node.id} node={node} allNodes={nodes} flowId={flowId} onNodeSelect={onNodeSelect} />
        ))}
      </ul>
    </div>
  );
}

function TreeNode({ node, allNodes, flowId, onNodeSelect }: { node: Node, allNodes: Node[], flowId: number, onNodeSelect: (n: Node) => void }) {
  const children = useMemo(() => allNodes.filter(n => n.parentId === node.id).sort((a, b) => a.sortOrder - b.sortOrder), [allNodes, node.id]);
  const [editOpen, setEditOpen] = useState(false);
  const { deleteNode } = useDashboardMutations();

  const glowClass = {
    start: "node-glow-start border-white/30 text-white",
    check: "node-glow-warning border-primary/30 text-primary",
    success: "node-glow-success border-emerald-500/50 text-emerald-400",
    failure: "node-glow-failure border-rose-500/50 text-rose-400",
    warning: "node-glow-warning border-amber-500/50 text-amber-400",
  }[node.type] || "node-glow-start";

  const typeIcon = {
    start: "◉",
    check: "◇",
    success: "✓",
    failure: "✕",
    warning: "⚠"
  }[node.type];

  return (
    <li>
      <div className="relative group inline-block">
        {node.branchLabel && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-background border border-primary text-primary text-[10px] font-mono px-2 py-0.5 rounded shadow-[0_0_10px_rgba(255,215,0,0.2)] whitespace-nowrap z-10">
            {node.branchLabel}
          </div>
        )}
        
        <div 
          onClick={() => onNodeSelect(node)}
          className={`glass-panel w-48 text-left rounded-md border transition-all duration-300 cursor-pointer animate-in zoom-in-95 fade-in ${glowClass}`}
        >
          <div className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-mono tracking-wider opacity-70 flex items-center gap-1">
                {typeIcon} {node.type}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-5 w-5 text-white/50 hover:text-white -mr-1">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass-panel border-white/10 font-mono text-xs">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}>
                    <Edit2 className="w-3 h-3 mr-2" /> Edit Node
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={(e) => { e.stopPropagation(); deleteNode.mutate({ id: node.id }); }}>
                    <Trash2 className="w-3 h-3 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <h4 className="font-bold text-sm leading-tight text-white font-sans mb-2">{node.title}</h4>
            <p className="text-[10px] text-white/60 line-clamp-2 font-mono leading-relaxed">
              {node.tidbit}
            </p>
          </div>
          
          <div className="border-t border-white/10 bg-white/5 p-1 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <NodeCreateDialog flowId={flowId} parentId={node.id}>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] font-mono text-primary hover:text-primary hover:bg-primary/20 w-full" onClick={(e) => e.stopPropagation()}>
                <Plus className="w-3 h-3 mr-1" /> Add Branch
              </Button>
            </NodeCreateDialog>
          </div>
        </div>

        <NodeEditDialog 
          node={node}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      </div>

      {children.length > 0 && (
        <ul>
          {children.map(child => (
            <TreeNode key={child.id} node={child} allNodes={allNodes} flowId={flowId} onNodeSelect={onNodeSelect} />
          ))}
        </ul>
      )}
    </li>
  );
}
