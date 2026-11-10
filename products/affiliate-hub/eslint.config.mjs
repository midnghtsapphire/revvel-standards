import { buildConfig } from "@revvel/eslint-config";
import { fileURLToPath } from "node:url";

// 2026-11-10 Codex WR #18330: retain original cwd-dependent config.
// export default buildConfig();
export default buildConfig({ baseDirectory: fileURLToPath(new URL(".", import.meta.url)) });
