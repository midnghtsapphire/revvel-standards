🧹 [code health improvement] Refactor doppler server _setup_tools

🎯 **What:** Extracted the MCP tool schemas from being inline within the `list_tools` async function out to a module-level `TOOLS` constant.
💡 **Why:** This makes the file more modular, easier to read, and simpler to manage schemas without nesting them deeply inside an async closure.
✅ **Verification:** Ran the test suite for both doppemcp instances and ensured all tests passed successfully.
✨ **Result:** The doppler server tools are cleaner, and tool definitions are properly decoupled from the routing logic.
