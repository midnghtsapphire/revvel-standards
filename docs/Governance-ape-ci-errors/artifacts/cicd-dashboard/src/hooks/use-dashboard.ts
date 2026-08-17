import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useCreateFlow,
  useUpdateFlow,
  useDeleteFlow,
  useCreateNode,
  useUpdateNode,
  useDeleteNode,
  getListFlowsQueryKey,
  getGetFlowQueryKey,
  getGetFlowSummaryQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export function useDashboardMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createFlow = useCreateFlow({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFlowsQueryKey() });
        toast({ title: "Flow created successfully" });
      },
      onError: () => {
        toast({ title: "Failed to create flow", variant: "destructive" });
      },
    },
  });

  const updateFlow = useUpdateFlow({
    mutation: {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: getListFlowsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetFlowQueryKey(variables.id) });
        toast({ title: "Flow updated successfully" });
      },
      onError: () => {
        toast({ title: "Failed to update flow", variant: "destructive" });
      },
    },
  });

  const deleteFlow = useDeleteFlow({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFlowsQueryKey() });
        toast({ title: "Flow deleted successfully" });
      },
      onError: () => {
        toast({ title: "Failed to delete flow", variant: "destructive" });
      },
    },
  });

  const createNode = useCreateNode({
    mutation: {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: getGetFlowQueryKey(variables.flowId) });
        queryClient.invalidateQueries({ queryKey: getGetFlowSummaryQueryKey(variables.flowId) });
        toast({ title: "Node created successfully" });
      },
      onError: () => {
        toast({ title: "Failed to create node", variant: "destructive" });
      },
    },
  });

  const updateNode = useUpdateNode({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getGetFlowQueryKey(data.flowId) });
        queryClient.invalidateQueries({ queryKey: getGetFlowSummaryQueryKey(data.flowId) });
        toast({ title: "Node updated successfully" });
      },
      onError: () => {
        toast({ title: "Failed to update node", variant: "destructive" });
      },
    },
  });

  const deleteNode = useDeleteNode({
    mutation: {
      onSuccess: () => {
        // We'd ideally need the flowId here to invalidate specifically, 
        // but invalidating all flows or a broader pattern might be needed.
        queryClient.invalidateQueries({ queryKey: ["/api/flows"] });
        toast({ title: "Node deleted successfully" });
      },
      onError: () => {
        toast({ title: "Failed to delete node", variant: "destructive" });
      },
    },
  });

  return {
    createFlow,
    updateFlow,
    deleteFlow,
    createNode,
    updateNode,
    deleteNode,
  };
}
