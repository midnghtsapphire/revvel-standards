import json
with open("projects/agent-generated/tiktok-affiliate-engine/build/full-app/package.json", "r") as f:
    pkg = json.load(f)

pkg["overrides"] = {
    "postcss": "$postcss",
    "eslint": "8.57.1",
    "glob": "^10.4.5"
}

with open("projects/agent-generated/tiktok-affiliate-engine/build/full-app/package.json", "w") as f:
    json.dump(pkg, f, indent=2)
