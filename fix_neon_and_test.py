import re

# 1. Fix neon-branch.yml multiple uses keys
file_path = ".github/workflows/neon-branch.yml"
with open(file_path, "r") as f:
    lines = f.readlines()

with open(file_path, "w") as f:
    for line in lines:
        if "uses: neondatabase/create-branch-action@ad7325f8b2fe61e29689926c29d153e8c98b7336" not in line:
            f.write(line)

# 2. Fix neon-branch-workflow.test.js syntax error (missing newline/EOF probably? or mismatched braces)
# Let's check the last 20 lines to see if it's missing a closing parenthesis
file_path = "tests/neon-branch-workflow.test.js"
with open(file_path, "r") as f:
    content = f.read()
    if not content.endswith("\n"):
        print("Missing newline in tests/neon-branch-workflow.test.js")
