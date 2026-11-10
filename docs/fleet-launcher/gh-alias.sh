# One-time setup on any machine with an authenticated gh:
#   gh fleet <name> [args]      e.g.  gh fleet biome   |   gh fleet research "solid-state battery recyclers"
gh alias set --shell fleet 'name="$1"; shift; gh workflow run fleet-dispatch.yml -R midnghtsapphire/revvel-standards --ref main -f fleet="$name" -f args="$*" && sleep 3 && gh run list -R midnghtsapphire/revvel-standards --workflow fleet-dispatch.yml --limit 1'
# List fleets:
gh alias set --shell fleets 'gh api repos/midnghtsapphire/revvel-standards/contents/.github/fleets.yml -H "Accept: application/vnd.github.raw" | grep -E "^  [a-z-]+:$" | tr -d " :"'
