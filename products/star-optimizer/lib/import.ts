import type { StarRepoInput } from "./scoring";

type RepoListShape = { repos?: unknown };
type GraphQLEdge = { starredAt?: unknown; node?: unknown };
type GraphQLShape = {
  edges?: unknown;
  data?: {
    viewer?: {
      starredRepositories?: {
        edges?: unknown;
      };
    };
  };
  viewer?: {
    starredRepositories?: {
      edges?: unknown;
    };
  };
  starredRepositories?: {
    edges?: unknown;
  };
};

function normalizeList(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (raw && typeof raw === "object" && Array.isArray((raw as RepoListShape).repos)) {
    return (raw as RepoListShape).repos as unknown[];
  }

  const graph = raw as GraphQLShape | null;
  const edgeList =
    (Array.isArray(graph?.data?.viewer?.starredRepositories?.edges) &&
      graph.data.viewer.starredRepositories.edges) ||
    (Array.isArray(graph?.viewer?.starredRepositories?.edges) &&
      graph.viewer.starredRepositories.edges) ||
    (Array.isArray(graph?.starredRepositories?.edges) && graph.starredRepositories.edges) ||
    (Array.isArray(graph?.edges) && graph.edges) ||
    null;

  if (!edgeList) {
    return null;
  }

  return edgeList.map((edge) => {
    const typedEdge = edge as GraphQLEdge;
    const node =
      typedEdge.node && typeof typedEdge.node === "object"
        ? { ...(typedEdge.node as Record<string, unknown>) }
        : null;
    if (!node) {
      return edge;
    }
    if (typeof typedEdge.starredAt === "string" && typeof node.starredAt !== "string") {
      node.starredAt = typedEdge.starredAt;
    }
    return node;
  });
}

export function normalizeImported(raw: unknown): StarRepoInput[] {
  const list = normalizeList(raw);

  if (!list) {
    throw new Error(
      'JSON must be an array of repos, an object with a "repos" array, or a GitHub GraphQL starredRepositories payload.',
    );
  }

  return list.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Item ${index} is not an object.`);
    }
    const repo = item as Record<string, unknown>;
    const name =
      (typeof repo.nameWithOwner === "string" && repo.nameWithOwner) ||
      (typeof repo.full_name === "string" && repo.full_name) ||
      "";
    if (!name) {
      throw new Error(`Item ${index} is missing nameWithOwner/full_name.`);
    }
    const url =
      (typeof repo.url === "string" && repo.url) ||
      (typeof repo.html_url === "string" && repo.html_url) ||
      `https://github.com/${name}`;

    return {
      nameWithOwner: name,
      url,
      description: typeof repo.description === "string" ? repo.description : "",
      stargazerCount: Number(repo.stargazerCount ?? repo.stargazers_count ?? 0) || 0,
      pushedAt:
        typeof repo.pushedAt === "string"
          ? repo.pushedAt
          : typeof repo.pushed_at === "string"
            ? repo.pushed_at
            : null,
      starredAt:
        typeof repo.starredAt === "string"
          ? repo.starredAt
          : typeof repo.starred_at === "string"
            ? repo.starred_at
            : null,
      primaryLanguage:
        (repo.primaryLanguage as StarRepoInput["primaryLanguage"]) ??
        (typeof repo.language === "string" ? repo.language : null),
      releases: (repo.releases as StarRepoInput["releases"]) ?? { nodes: [] },
      topics: Array.isArray(repo.topics) ? (repo.topics as string[]) : null,
      repositoryTopics: repo.repositoryTopics as StarRepoInput["repositoryTopics"],
    };
  });
}
