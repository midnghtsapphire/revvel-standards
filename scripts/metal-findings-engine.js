const fs = require("fs");
const path = require("path");
const Ajv = require("ajv/dist/2020");
const addFormats = require("ajv-formats");

const SCHEMA_PATH = path.join(__dirname, "..", "schemas", "metal-findings.schema.json");

/**
 * Validates metal findings against the JSON schema.
 * Emits an engine artifact in CONTRACT-compatible format.
 */
function metalFindingsEngine({ state, env, options = {} }) {
  const findingsPath = options.findingsPath || path.join(process.cwd(), "metal-findings.json");

  if (!fs.existsSync(findingsPath)) {
    return {
      step_id: "metal-findings-validation",
      engine_label: "metal-findings-engine",
      status: "failed",
      error: `Findings file not found at ${findingsPath}`,
    };
  }

  let findingsData;
  try {
    findingsData = JSON.parse(fs.readFileSync(findingsPath, "utf8"));
  } catch (err) {
    return {
      step_id: "metal-findings-validation",
      engine_label: "metal-findings-engine",
      status: "failed",
      error: `Invalid JSON in findings file: ${err.message}`,
    };
  }

  const schemaStr = fs.readFileSync(SCHEMA_PATH, "utf8");
  const schema = JSON.parse(schemaStr);

  const ajv = new Ajv({ strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(findingsData);

  if (!valid) {
    return {
      step_id: "metal-findings-validation",
      engine_label: "metal-findings-engine",
      status: "failed",
      error: `Schema validation failed: ${ajv.errorsText(validate.errors)}`,
    };
  }

  // Findings validated successfully
  return {
    step_id: "metal-findings-validation",
    engine_label: "metal-findings-engine",
    status: "ok",
    next_engine: "deliver",
    artifacts: [findingsPath],
    evidence: [`Validated ${findingsData.findings.length} findings for ${findingsData.product_slug}`]
  };
}

module.exports = {
  metalFindingsEngine,
};