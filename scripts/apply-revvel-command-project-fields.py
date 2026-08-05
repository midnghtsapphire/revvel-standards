#!/usr/bin/env python3
"""Create Revvel Command project (optional) + governance field catalog via GH_TOKEN PAT."""
import json, os, subprocess, sys

def gql(query, variables=None):
    open("/tmp/gql.json", "w").write(json.dumps({"query": query, "variables": variables or {}}))
    r = subprocess.run(["gh", "api", "graphql", "--input", "/tmp/gql.json"], capture_output=True, text=True)
    try:
        data = json.loads(r.stdout or "{}")
    except Exception:
        print(r.stderr or r.stdout, file=sys.stderr)
        raise SystemExit(r.returncode or 1)
    if r.returncode != 0 and not data.get("data"):
        print(r.stderr or r.stdout, file=sys.stderr)
        raise SystemExit(r.returncode)
    return data

def main():
    owner = os.environ.get("OWNER", "midnghtsapphire")
    mode = os.environ.get("MODE") or "create_project_and_apply"
    title = os.environ.get("PROJECT_TITLE") or "Revvel Command"
    num = int(os.environ.get("PROJECT_NUMBER") or "5")

    uid = json.loads(subprocess.check_output(["gh", "api", "user"]))["node_id"]
    print("owner_node", uid)

    project = None
    if mode == "create_project_and_apply":
        qlist = """
        query($login:String!) {
          user(login:$login) {
            projectsV2(first:50) { nodes { id number title url } }
          }
        }
        """
        listed = gql(qlist, {"login": owner})
        nodes = (listed.get("data") or {}).get("user", {}).get("projectsV2", {}).get("nodes") or []
        for n in nodes:
            if n and n.get("title") == title:
                project = n
                print(f"Found existing project: #{n['number']} {n['url']}")
                break
        if not project:
            mut = """
            mutation($ownerId:ID!, $title:String!) {
              createProjectV2(input:{ownerId:$ownerId, title:$title}) {
                projectV2 { id number title url }
              }
            }
            """
            res = gql(mut, {"ownerId": uid, "title": title})
            if res.get("errors"):
                print(json.dumps(res["errors"], indent=2), file=sys.stderr)
                raise SystemExit(2)
            project = res["data"]["createProjectV2"]["projectV2"]
            print(f"Created project: #{project['number']} {project['url']}")
    else:
        q = """
        query($login:String!, $number:Int!) {
          user(login:$login) { projectV2(number:$number) { id number title url } }
        }
        """
        res = gql(q, {"login": owner, "number": num})
        project = res["data"]["user"]["projectV2"]

    project_id = project["id"]
    qf = """
    query($id:ID!) {
      node(id:$id) {
        ... on ProjectV2 {
          id title url number
          fields(first:100) {
            nodes {
              ... on ProjectV2Field { id name dataType }
              ... on ProjectV2SingleSelectField { id name dataType options { id name } }
              ... on ProjectV2IterationField { id name dataType }
            }
          }
        }
      }
    }
    """
    fr = gql(qf, {"id": project_id})
    proj = fr["data"]["node"]
    existing = {n["name"] for n in proj["fields"]["nodes"] if n and n.get("name")}
    print(f"Project #{proj.get('number')} {proj['title']} fields={len(existing)}")

    colors = ["BLUE", "GREEN", "YELLOW", "ORANGE", "RED", "PURPLE", "PINK", "GRAY"]
    selects = {
        "Work Kind": ["WR", "Bug", "Feature", "Research", "Automation", "Security", "Content", "Infra", "Revenue"],
        "Pipeline Stage": ["Triage", "Spec", "Research", "Build", "Formal Verify", "Human Review", "Ship", "Done", "Parked"],
        "Agent": ["OpenRouter", "Copilot", "Codex", "Devin", "Jules", "Human", "Non-LLM Specialist"],
        "Privilege Tier": ["Intern", "Associate", "Senior", "Principal", "Emergency"],
        "Formal Verdict": ["pass", "fail", "needs_reaudit", "structural_conflict", "duplicate_risk", "unscored"],
        "Breakthrough": ["none", "minor", "major", "paradigm"],
        "Automation Surface": ["actions", "n8n", "make", "zapier", "gumloop", "openrouter", "other", "none"],
        "Human Gate": ["required", "satisfied", "waived"],
        "Outside Work Eligible": ["no", "candidate", "approved"],
        "Priority Scale": ["P0", "P1", "P2", "P3"],
    }
    numbers = ["Agreement BPS", "Risk Score", "Loyalty Score", "BNAT Score", "Speed Score", "Canonical Score", "Feature Adoption"]
    texts = ["Revenue Link", "WR ID"]
    dates = ["Due"]

    created, skipped, failed = [], [], []

    def create(data_type, name, options=None):
        if name in existing:
            skipped.append(name)
            print(f"SKIP {name}")
            return
        if data_type == "SINGLE_SELECT":
            opts = [{"name": o, "color": colors[i % len(colors)], "description": ""} for i, o in enumerate(options or [])]
            mut = """
            mutation($projectId:ID!, $name:String!, $opts:[ProjectV2SingleSelectFieldOptionInput!]!) {
              createProjectV2Field(input:{projectId:$projectId dataType:SINGLE_SELECT name:$name singleSelectOptions:$opts}) {
                projectV2Field { ... on ProjectV2SingleSelectField { id name options { id name } } }
              }
            }"""
            res = gql(mut, {"projectId": project_id, "name": name, "opts": opts})
        else:
            mut = """
            mutation($projectId:ID!, $name:String!, $dt:ProjectV2CustomFieldType!) {
              createProjectV2Field(input:{projectId:$projectId dataType:$dt name:$name}) {
                projectV2Field { ... on ProjectV2Field { id name dataType } }
              }
            }"""
            res = gql(mut, {"projectId": project_id, "name": name, "dt": data_type})
        if res.get("errors"):
            failed.append({"name": name, "errors": res["errors"]})
            print(f"FAIL {name}: {res['errors'][0].get('message')}")
        else:
            field = res["data"]["createProjectV2Field"]["projectV2Field"]
            created.append({"name": name, "id": field.get("id"), "options": field.get("options")})
            existing.add(name)
            print(f"OK {name}: {field.get('id')}")

    for n, o in selects.items():
        create("SINGLE_SELECT", n, o)
    for n in numbers:
        create("NUMBER", n)
    for n in texts:
        create("TEXT", n)
    for n in dates:
        create("DATE", n)

    fr = gql(qf, {"id": project_id})
    fields = []
    for n in fr["data"]["node"]["fields"]["nodes"]:
        if not n:
            continue
        entry = {"id": n.get("id"), "name": n.get("name"), "dataType": n.get("dataType")}
        if n.get("options"):
            entry["options"] = n["options"]
        fields.append(entry)

    os.makedirs("config", exist_ok=True)
    snapshot = {
        "project_id": project_id,
        "project_number": proj.get("number") or project.get("number"),
        "project_title": proj.get("title") or title,
        "project_url": proj.get("url") or project.get("url"),
        "owner": owner,
        "created": created,
        "skipped": skipped,
        "failed": failed,
        "fields": fields,
    }
    open("config/revvel-command-project-fields.json", "w").write(json.dumps(snapshot, indent=2))
    open("field-apply-result.json", "w").write(json.dumps(snapshot, indent=2))
    print(json.dumps({
        "url": snapshot["project_url"],
        "number": snapshot["project_number"],
        "created": len(created),
        "skipped": len(skipped),
        "failed": len(failed),
    }, indent=2))
    if failed:
        raise SystemExit(1)

if __name__ == "__main__":
    main()
