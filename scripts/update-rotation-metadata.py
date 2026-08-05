#!/usr/bin/env python3
"""Update secret rotation metadata."""

import argparse
from datetime import datetime, timedelta
from pathlib import Path


def update_metadata(file_path: Path, secret_name: str, status: str):
    """Update rotation metadata for a secret."""
    now = datetime.utcnow()
    next_rotation = now + timedelta(days=60)
    
    if not file_path.exists():
        file_path.parent.mkdir(parents=True, exist_ok=True)
        content = f"# Secret Rotation Log\n\nLast Updated: {now.isoformat()}Z\n\n"
    else:
        content = file_path.read_text()
    
    # Update last updated timestamp
    lines = content.split("\n")
    for i, line in enumerate(lines):
        if line.startswith("Last Updated:"):
            lines[i] = f"Last Updated: {now.isoformat()}Z"
            break
    content = "\n".join(lines)
    
    # Find or create secret section
    secret_marker = f"## {secret_name}"
    
    if secret_marker in content:
        # Update existing section
        lines = content.split("\n")
        in_section = False
        new_lines = []
        skip_next = False
        
        for line in lines:
            if skip_next:
                skip_next = False
                continue
                
            if line == secret_marker:
                in_section = True
                new_lines.append(line)
                new_lines.append(f"- **Last Rotated:** {now.isoformat()}Z")
                new_lines.append(f"- **Next Rotation:** {next_rotation.isoformat()}Z (60 days)")
                skip_next = True  # Skip old rotation info
                continue
            elif in_section and line.startswith("## "):
                in_section = False
            elif in_section and (line.startswith("- **Last Rotated:**") or line.startswith("- **Next Rotation:**")):
                continue
            
            new_lines.append(line)
        
        content = "\n".join(new_lines)
    else:
        # Add new section
        content += f"\n{secret_marker}\n"
        content += f"- **Last Rotated:** {now.isoformat()}Z\n"
        content += f"- **Next Rotation:** {next_rotation.isoformat()}Z (60 days)\n"
        content += f"- **Rotation Count:** 1\n"
        content += f"- **Last Status:** {status}\n"
        content += f"- **History:**\n"
        content += f"  - {now.strftime('%Y-%m-%d')}: Automatic rotation\n"
    
    file_path.write_text(content)
    # Note: Secret name is not sensitive data, only the value is
    print(f"✓ Updated metadata for {secret_name}")


def main():
    parser = argparse.ArgumentParser(description="Update secret rotation metadata")
    parser.add_argument("--secret", required=True, help="Secret name (not the value)")
    parser.add_argument("--status", required=True, help="Rotation status")
    parser.add_argument("--metadata-file", required=True, help="Path to metadata file")
    
    args = parser.parse_args()
    
    metadata_path = Path(args.metadata_file)
    # Note: secret argument is the secret name, not the secret value
    # Secret names are identifiers and not sensitive data
    update_metadata(metadata_path, args.secret, args.status)


if __name__ == "__main__":
    main()
