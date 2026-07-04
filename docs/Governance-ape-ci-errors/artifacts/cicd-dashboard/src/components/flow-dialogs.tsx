import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useDashboardMutations } from "@/hooks/use-dashboard";
import { useListFlows } from "@workspace/api-client-react";
import { Trash2 } from "lucide-react";
import { useLocation } from "wouter";

const flowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string(),
});

type FlowFormValues = z.infer<typeof flowSchema>;

export function FlowCreateDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { createFlow } = useDashboardMutations();
  const [, setLocation] = useLocation();
  
  const form = useForm<FlowFormValues>({
    resolver: zodResolver(flowSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = (values: FlowFormValues) => {
    createFlow.mutate(
      { data: values },
      { 
        onSuccess: (data) => { 
          onOpenChange(false); 
          form.reset(); 
          setLocation(`/flow/${data.id}`);
        } 
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border-white/20 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary">Initialize New Flow</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70 font-mono">Flow Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Build Failure Diagnosis" className="bg-background/50 border-white/10 text-white" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70 font-mono">Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Purpose of this decision tree" 
                      className="bg-background/50 border-white/10 text-white resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={createFlow.isPending} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-mono">
              Execute Creation
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function FlowEditDialog({ flowId, open, onOpenChange }: { flowId: number, open: boolean, onOpenChange: (open: boolean) => void }) {
  const { updateFlow, deleteFlow } = useDashboardMutations();
  const { data: flows } = useListFlows();
  const [, setLocation] = useLocation();
  
  const flow = flows?.find(f => f.id === flowId);

  const form = useForm<FlowFormValues>({
    resolver: zodResolver(flowSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (flow) {
      form.reset({
        name: flow.name,
        description: flow.description,
      });
    }
  }, [flow, form]);

  if (!flow) return null;

  const onSubmit = (values: FlowFormValues) => {
    updateFlow.mutate(
      { id: flowId, data: values },
      { onSuccess: () => { onOpenChange(false); } }
    );
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this flow? This action cannot be undone.")) {
      deleteFlow.mutate(
        { id: flowId },
        { onSuccess: () => { onOpenChange(false); setLocation("/"); } }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border-white/20 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary flex items-center justify-between">
            <span>Configure Flow</span>
            <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8">
              <Trash2 className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70 font-mono">Flow Name</FormLabel>
                  <FormControl>
                    <Input className="bg-background/50 border-white/10 text-white" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70 font-mono">Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      className="bg-background/50 border-white/10 text-white resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={updateFlow.isPending} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-mono">
              Apply Configuration
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
