import os
import sys
import json
import urllib.request
import urllib.error

def fetch_news():
    api_key = os.environ.get("NEWS_API_KEY")
    if not api_key:
        print(json.dumps({"error": "NEWS_API_KEY is not set", "articles": []}))
        return

    url = f"https://newsapi.org/v2/top-headlines?country=us&apiKey={api_key}"

    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'GetNewsFirst/1.0'})
        with urllib.request.urlopen(req) as response:
            data = response.read()
            print(data.decode('utf-8'))
    except urllib.error.URLError as e:
        print(json.dumps({"error": str(e), "articles": []}))
def fetch_news():
    api_key = os.environ.get("NEWS_API_KEY")
    if not api_key:
        print("NEWS_API_KEY is not set", file=sys.stderr)
        sys.exit(1)

    url = f"https://newsapi.org/v2/top-headlines?country=us&apiKey={api_key}"

    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'GetNewsFirst/1.0'})
        with urllib.request.urlopen(req, timeout=30) as response:
            data = response.read()
            sys.stdout.write(data.decode('utf-8'))
    except urllib.error.URLError as e:
        print(f"Failed to fetch news: {e}", file=sys.stderr)
        sys.exit(1)
if __name__ == "__main__":
    fetch_news()
