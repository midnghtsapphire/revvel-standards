import re
import sys

def main():
    with open("mcp-servers/gemini-notebook-mcp-cli/uv.lock", "r") as f:
        content = f.read()

    # Update cryptography to 50.0.0
    content = re.sub(r'name = "cryptography"\nversion = "49\.0\.0"', r'name = "cryptography"\nversion = "50.0.0"', content)

    # Update authlib to 1.6.12
    content = re.sub(r'name = "authlib"\nversion = "1\.6\.10"', r'name = "authlib"\nversion = "1.6.12"', content)

    # Update idna to 3.15
    content = re.sub(r'name = "idna"\nversion = "3\.11"', r'name = "idna"\nversion = "3.15"', content)

    # Update pydantic-settings to 2.14.2
    content = re.sub(r'name = "pydantic-settings"\nversion = "2\.13\.1"', r'name = "pydantic-settings"\nversion = "2.14.2"', content)

    with open("mcp-servers/gemini-notebook-mcp-cli/uv.lock", "w") as f:
        f.write(content)

    print("Updated uv.lock")

if __name__ == "__main__":
    main()
