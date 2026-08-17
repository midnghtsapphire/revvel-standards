import asyncio
import os
import sys

# Add the social-mcp directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.abspath(os.path.join(current_dir, "..")))

from social_mcp.server import SocialMediaMCP

async def verify():
    print("Verifying SocialMediaMCP...")
    app = SocialMediaMCP()

    tools_to_test = [
        "social_platforms_list",
        "social_profile_find",
        "social_profile_claim",
        "social_domains_check",
        "social_domains_available",
        "social_profile_get",
        "social_profile_update",
        "social_post_create",
        "social_posts_list",
        "social_analytics",
        "social_missing_find",
        "social_health"
    ]

    for tool_name in tools_to_test:
        print(f"Testing {tool_name}...")
        try:
            args = {}
            if tool_name == "social_profile_find":
                args = {"query": "test"}
            elif tool_name == "social_profile_claim":
                args = {"platform": "twitter", "username": "test"}
            elif tool_name == "social_domains_check":
                args = {"domain": "test.com"}
            elif tool_name == "social_domains_available":
                args = {"brand_name": "test"}
            elif tool_name == "social_profile_get":
                args = {"platform": "twitter", "username": "test"}
            elif tool_name == "social_profile_update":
                args = {"platform": "twitter", "username": "test"}
            elif tool_name == "social_post_create":
                args = {"platform": "twitter", "content": "test"}
            elif tool_name == "social_posts_list":
                args = {"platform": "twitter", "username": "test"}
            elif tool_name == "social_analytics":
                args = {"platform": "twitter", "username": "test"}
            elif tool_name == "social_missing_find":
                args = {"brand_name": "test"}

            result = await app._handle_tool(tool_name, args)
            if isinstance(result, dict) and "error" in result:
                print(f"Error in {tool_name}: {result['error']}")
                sys.exit(1)
            print(f"Success: {tool_name}")
        except Exception as e:
            print(f"Exception in {tool_name}: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

    print("Verification completed successfully!")

if __name__ == "__main__":
    asyncio.run(verify())
