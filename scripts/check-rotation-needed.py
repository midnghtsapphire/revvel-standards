#!/usr/bin/env python3
"""Check which secrets need rotation based on TTL metadata."""

import argparse
import json
import re
from datetime import datetime, timedelta
from pathlib import Path


def parse_metadata(file_path: Path) -> dict:
    """Parse rotation metadata file."""
    secrets = {}
    
    if not file_path.exists():
        return secrets
    
    content = file_path.read_text()
    current_secret = None
    
    for line in content.split("\n"):
        # Match secret header
        if line.startswith("## ") and not line.startswith("### "):
            current_secret = line[3:].strip()
            secrets[current_secret] = {}
        
        # Match last rotated date
        elif current_secret and "Last Rotated:" in line:
            match = re.search(r"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)", line)
            if match:
                secrets[current_secret]["last_rotated"] = match.group(1)
    
    return secrets


def check_rotation_needed(secrets: dict, days_threshold: int) -> list:
    """Return list of secrets that need rotation."""
    now = datetime.utcnow()
    needs_rotation = []
    
    for secret_name, metadata in secrets.items():
        if "last_rotated" not in metadata:
            # Never rotated - needs rotation
            needs_rotation.append(secret_name)
            continue
        
        last_rotated = datetime.fromisoformat(
            metadata["last_rotated"].replace("Z", "+00:00")
        )
        days_since_rotation = (now - last_rotated).days
        
        if days_since_rotation >= days_threshold:
            needs_rotation.append(secret_name)
    
    return needs_rotation


def main():
    parser = argparse.ArgumentParser(description="Check which secrets need rotation")
    parser.add_argument("--metadata-file", required=True, help="Path to metadata file")
    parser.add_argument("--days-threshold", type=int, default=60, help="Days threshold")
    parser.add_argument("--output", required=True, help="Output JSON file")
    
    args = parser.parse_args()
    
    metadata_path = Path(args.metadata_file)
    secrets = parse_metadata(metadata_path)
    needs_rotation = check_rotation_needed(secrets, args.days_threshold)
    
    output_path = Path(args.output)
    output_path.write_text(json.dumps(needs_rotation))
    
    # Note: We print secret names for debugging, but not values
    # Secret names themselves are not sensitive data
    print(f"Found {len(needs_rotation)} secrets needing rotation:")
    for secret_name in needs_rotation:
        print(f"  - {secret_name}")


if __name__ == "__main__":
    main()
