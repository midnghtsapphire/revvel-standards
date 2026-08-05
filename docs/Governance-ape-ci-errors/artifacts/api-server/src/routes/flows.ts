import { Router, type IRouter } from "express";
import { eq, asc, sql } from "drizzle-orm";
import { db, flowsTable, nodesTable } from "@workspace/db";
import {
  CreateFlowBody,
  GetFlowParams,
  UpdateFlowParams,
  UpdateFlowBody,
  DeleteFlowParams,
  GetFlowSummaryParams,
  CreateNodeParams,
  CreateNodeBody,
  UpdateNodeParams,
  UpdateNodeBody,
  DeleteNodeParams,
  ListFlowsResponse,
  GetFlowResponse,
  GetFlowSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/flows", async (_req, res): Promise<void> => {
  const flows = await db
    .select({
      id: flowsTable.id,
      name: flowsTable.name,
      description: flowsTable.description,
      createdAt: flowsTable.createdAt,
      nodeCount: sql<number>`count(${nodesTable.id})::int`,
    })
    .from(flowsTable)
    .leftJoin(nodesTable, eq(nodesTable.flowId, flowsTable.id))
    .groupBy(flowsTable.id)
    .orderBy(asc(flowsTable.createdAt));

  res.json(ListFlowsResponse.parse(flows));
});

router.post("/flows", async (req, res): Promise<void> => {
  const parsed = CreateFlowBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [flow] = await db.insert(flowsTable).values(parsed.data).returning();

  res.status(201).json(flow);
});

router.get("/flows/:id", async (req, res): Promise<void> => {
  const params = GetFlowParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [flow] = await db
    .select()
    .from(flowsTable)
    .where(eq(flowsTable.id, params.data.id));

  if (!flow) {
    res.status(404).json({ error: "Flow not found" });
    return;
  }

  const nodes = await db
    .select()
    .from(nodesTable)
    .where(eq(nodesTable.flowId, params.data.id))
    .orderBy(asc(nodesTable.sortOrder), asc(nodesTable.id));

  res.json(GetFlowResponse.parse({ ...flow, nodes }));
});

router.patch("/flows/:id", async (req, res): Promise<void> => {
  const params = UpdateFlowParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateFlowBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [flow] = await db
    .update(flowsTable)
    .set(parsed.data)
    .where(eq(flowsTable.id, params.data.id))
    .returning();

  if (!flow) {
    res.status(404).json({ error: "Flow not found" });
    return;
  }

  res.json(flow);
});

router.delete("/flows/:id", async (req, res): Promise<void> => {
  const params = DeleteFlowParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [flow] = await db
    .delete(flowsTable)
    .where(eq(flowsTable.id, params.data.id))
    .returning();

  if (!flow) {
    res.status(404).json({ error: "Flow not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/flows/:id/summary", async (req, res): Promise<void> => {
  const params = GetFlowSummaryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [flow] = await db
    .select({ id: flowsTable.id })
    .from(flowsTable)
    .where(eq(flowsTable.id, params.data.id));

  if (!flow) {
    res.status(404).json({ error: "Flow not found" });
    return;
  }

  const nodes = await db
    .select({ type: nodesTable.type })
    .from(nodesTable)
    .where(eq(nodesTable.flowId, params.data.id));

  const stats = {
    flowId: params.data.id,
    totalNodes: nodes.length,
    successCount: nodes.filter((n) => n.type === "success").length,
    failureCount: nodes.filter((n) => n.type === "failure").length,
    warningCount: nodes.filter((n) => n.type === "warning").length,
    checkCount: nodes.filter((n) => n.type === "check").length,
  };

  res.json(GetFlowSummaryResponse.parse(stats));
});

router.post("/flows/:flowId/nodes", async (req, res): Promise<void> => {
  const params = CreateNodeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [flow] = await db
    .select({ id: flowsTable.id })
    .from(flowsTable)
    .where(eq(flowsTable.id, params.data.flowId));

  if (!flow) {
    res.status(404).json({ error: "Flow not found" });
    return;
  }

  const parsed = CreateNodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [node] = await db
    .insert(nodesTable)
    .values({ ...parsed.data, flowId: params.data.flowId })
    .returning();

  res.status(201).json(node);
});

router.patch("/nodes/:id", async (req, res): Promise<void> => {
  const params = UpdateNodeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateNodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [node] = await db
    .update(nodesTable)
    .set(parsed.data)
    .where(eq(nodesTable.id, params.data.id))
    .returning();

  if (!node) {
    res.status(404).json({ error: "Node not found" });
    return;
  }

  res.json(node);
});

router.delete("/nodes/:id", async (req, res): Promise<void> => {
  const params = DeleteNodeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [node] = await db
    .delete(nodesTable)
    .where(eq(nodesTable.id, params.data.id))
    .returning();

  if (!node) {
    res.status(404).json({ error: "Node not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
