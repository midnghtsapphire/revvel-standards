import os
import glob

def apply_patch(filepath, search, replace):
    with open(filepath, "r") as f:
        content = f.read()

    if search in content:
        content = content.replace(search, replace)
        with open(filepath, "w") as f:
            f.write(content)
        print(f"Patched {filepath}")

search = "uses: peter-evans/create-pull-request@v8.1.1"
replace = "uses: peter-evans/create-pull-request@271a8d0340265f705b14b6d32b9829c1cb33d45e # v8.1.1"

for filepath in glob.glob(".github/workflows/*.yml"):
    apply_patch(filepath, search, replace)
