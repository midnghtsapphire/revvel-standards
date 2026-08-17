import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useDashboardMutations } from "@/hooks/use-dashboard";
import { type Node, NodeType } from "@workspace/api-client-react";

const nodeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  tidbit: z.string().min(1, "Tidbit is required"),
  type: z.enum([NodeType.start, NodeType.check, NodeType.success, NodeType.failure, NodeType.warning]),
  branchLabel: z.string().nullable().optional(),
  sortOrder: z.number().default(0),
});

type NodeFormValues = z.infer<typeof nodeSchema>;

export function NodeCreateDialog({ flowId, parentId, children }: { flowId: number, parentId: number | null, children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { createNode } = useDashboardMutations();
  
  const form = useForm<NodeFormValues>({
    resolver: zodResolver(nodeSchema),
    defaultValues: {
      title: "",
      tidbit: "",
      type: parentId ? "check" : "start",
      branchLabel: "",
      sortOrder: 0,
    },
  });

  const onSubmit = (values: NodeFormValues) => {
    createNode.mutate(
      { 
        flowId, 
        data: { 
          ...values, 
          parentId,
          branchLabel: values.branchLabel || null 
        } 
      },
      { onSuccess: () => { setOpen(false); form.reset(); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="glass-panel border-white/20 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary">Initialize Node</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70 font-mono">Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. AST Security Scan" className="bg-background/50 border-white/10 text-white" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70 font-mono">Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background/50 border-white/10 text-white">
                        <SelectValue placeholder="Select node type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="glass-panel border-white/20">
                      <SelectItem value="start">Start</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="failure">Failure</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {parentId && (
              <FormField
                control={form.control}
                name="branchLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70 font-mono">Branch Label (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Pass, Fail, Yes, No" className="bg-background/50 border-white/10 text-white" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="tidbit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70 font-mono">Tidbit</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Why does this step matter?" 
                      className="bg-background/50 border-white/10 text-white resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={createNode.isPending} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-mono">
              Deploy Node
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function NodeEditDialog({ node, open, onOpenChange }: { node: Node, open: boolean, onOpenChange: (open: boolean) => void }) {
  const { updateNode } = useDashboardMutations();
  
  const form = useForm<NodeFormValues>({
    resolver: zodResolver(nodeSchema),
    defaultValues: {
      title: node.title,
      tidbit: node.tidbit,
      type: node.type,
      branchLabel: node.branchLabel || "",
      sortOrder: node.sortOrder,
    },
  });

  useEffect(() => {
    form.reset({
      title: node.title,
      tidbit: node.tidbit,
      type: node.type,
      branchLabel: node.branchLabel || "",
      sortOrder: node.sortOrder,
    });
  }, [node, form]);

  const onSubmit = (values: NodeFormValues) => {
    updateNode.mutate(
      { 
        id: node.id, 
        data: { 
          ...values,
          branchLabel: values.branchLabel || null
        } 
      },
      { onSuccess: () => { onOpenChange(false); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border-white/20 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary">Configure Node: {node.title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70 font-mono">Title</FormLabel>
                  <FormControl>
                    <Input className="bg-background/50 border-white/10 text-white" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70 font-mono">Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background/50 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="glass-panel border-white/20">
                      <SelectItem value="start">Start</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="failure">Failure</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {node.parentId && (
              <FormField
                control={form.control}
                name="branchLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70 font-mono">Branch Label</FormLabel>
                    <FormControl>
                      <Input className="bg-background/50 border-white/10 text-white" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="tidbit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70 font-mono">Tidbit</FormLabel>
                  <FormControl>
                    <Textarea 
                      className="bg-background/50 border-white/10 text-white resize-none h-24" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={updateNode.isPending} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-mono">
              Apply Configuration
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
