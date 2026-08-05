import sys
import json
import os

def process_news(file_path):
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        sys.exit(1)

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError:
        print("Error: Could not decode JSON.")
        sys.exit(1)

    if "error" in data and data["error"]:
        print(f"API Error: {data['error']}")

    articles = data.get("articles", [])
    if not articles:
        print("No articles found.")
        return

    print(f"Successfully processed {len(articles)} articles:")
    for idx, article in enumerate(articles[:10], start=1):
        title = article.get("title", "No Title")
        print(f"{idx}. {title}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        process_news("headlines.json")
    else:
        process_news(sys.argv[1])
