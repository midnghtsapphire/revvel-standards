import os
import sys

def audit_readme():
    if not os.path.exists("README.md"):
        print("README.md not found!")
        sys.exit(1)

    with open("README.md", "r") as f:
        content = f.read()

    if "# " not in content:
        print("README.md must contain an H1 title.")
        sys.exit(1)

    print("README.md audit passed!")
    sys.exit(0)

if __name__ == "__main__":
    audit_readme()
