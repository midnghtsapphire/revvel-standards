#!/usr/bin/env node
"use strict";

/**
 * OpenRouter Routing Evaluation Harness
 * 
 * Compares behavior across routing profiles by running the same prompt through:
 * - repo_surgery
 * - cheap_batch_edits
 * - hard_debug
 * 
 * Generates a markdown report comparing:
 * - Response length (proxy for detail)
 * - Model used
 * - Response time
 * - Subjective quality notes
 * 
 * Usage:
 *   export OPENROUTER_API_KEY="your-key-here"
 *   node scripts/openrouter-routing-eval.js "Fix the memory leak in the user session handler"
 */

const { routedChat } = require("./openrouter-routing");
const fs = require("fs");
const path = require("path");

const PROFILES = ["repo_surgery", "cheap_batch_edits", "hard_debug"];

async function evaluateProfile(profile, prompt, systemPrompt) {
  const startTime = Date.now();
  
  try {
    const result = await routedChat({
      profile,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    return {
      profile,
      success: true,
      modelUsed: result.modelUsed,
      responseLength: result.text.length,
      responseTime,
      text: result.text,
      requestedModels: result.requestedModels,
    };
  } catch (err) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    return {
      profile,
      success: false,
      error: err.message,
      responseTime,
    };
  }
}

function generateMarkdownReport(results, prompt, systemPrompt) {
  const timestamp = new Date().toISOString();
  
  const lines = [
    "# OpenRouter Routing Evaluation Report",
    "",
    `**Generated:** ${timestamp}`,
    "",
    "## Test Configuration",
    "",
    "**System Prompt:**",
    "```",
    systemPrompt,
    "```",
    "",
    "**User Prompt:**",
    "```",
    prompt,
    "```",
    "",
    "## Summary Comparison",
    "",
    "| Profile | Model Used | Response Time | Response Length | Status |",
    "|---------|-----------|---------------|-----------------|--------|",
  ];
  
  for (const result of results) {
    if (result.success) {
      lines.push(
        `| ${result.profile} | ${result.modelUsed || "unknown"} | ${result.responseTime}ms | ${result.responseLength} chars | ✅ Success |`
      );
    } else {
      lines.push(
        `| ${result.profile} | - | ${result.responseTime}ms | - | ❌ Failed |`
      );
    }
  }
  
  lines.push("");
  lines.push("## Detailed Analysis");
  lines.push("");
  
  for (const result of results) {
    lines.push(`### Profile: ${result.profile}`);
    lines.push("");
    
    if (result.success) {
      lines.push(`- **Model Used:** ${result.modelUsed || "unknown"}`);
      lines.push(`- **Requested Models (fallback chain):** ${result.requestedModels.join(" → ")}`);
      lines.push(`- **Response Time:** ${result.responseTime}ms`);
      lines.push(`- **Response Length:** ${result.responseLength} characters`);
      lines.push("");
      lines.push("**Response:**");
      lines.push("```");
      lines.push(result.text);
      lines.push("```");
    } else {
      lines.push(`- **Status:** Failed`);
      lines.push(`- **Error:** ${result.error}`);
      lines.push(`- **Response Time:** ${result.responseTime}ms`);
    }
    
    lines.push("");
  }
  
  lines.push("## Observations");
  lines.push("");
  lines.push("### Response Length");
  lines.push("");
  
  const successfulResults = results.filter(r => r.success);
  if (successfulResults.length > 0) {
    const sorted = [...successfulResults].sort((a, b) => b.responseLength - a.responseLength);
    lines.push(`- **Most detailed:** ${sorted[0].profile} (${sorted[0].responseLength} chars)`);
    lines.push(`- **Most concise:** ${sorted[sorted.length - 1].profile} (${sorted[sorted.length - 1].responseLength} chars)`);
  } else {
    lines.push("- No successful responses to compare");
  }
  
  lines.push("");
  lines.push("### Response Time");
  lines.push("");
  
  if (successfulResults.length > 0) {
    const sorted = [...successfulResults].sort((a, b) => a.responseTime - b.responseTime);
    lines.push(`- **Fastest:** ${sorted[0].profile} (${sorted[0].responseTime}ms)`);
    lines.push(`- **Slowest:** ${sorted[sorted.length - 1].profile} (${sorted[sorted.length - 1].responseTime}ms)`);
  } else {
    lines.push("- No successful responses to compare");
  }
  
  lines.push("");
  lines.push("### Model Selection");
  lines.push("");
  
  const modelCounts = {};
  for (const result of successfulResults) {
    const model = result.modelUsed || "unknown";
    modelCounts[model] = (modelCounts[model] || 0) + 1;
  }
  
  if (Object.keys(modelCounts).length > 0) {
    for (const [model, count] of Object.entries(modelCounts)) {
      lines.push(`- **${model}:** ${count} request(s)`);
    }
  } else {
    lines.push("- No successful responses to analyze");
  }
  
  lines.push("");
  lines.push("### Quality Assessment");
  lines.push("");
  lines.push("_This section requires manual review of the responses above._");
  lines.push("");
  lines.push("**Criteria to evaluate:**");
  lines.push("- **Correctness:** Does the response accurately address the prompt?");
  lines.push("- **Independence:** Does the response show initiative and suggest improvements?");
  lines.push("- **Completeness:** Does the response cover all aspects of the task?");
  lines.push("- **Code Quality:** Is the generated code idiomatic and well-structured?");
  lines.push("- **Explanations:** Are explanations clear and helpful?");
  lines.push("");
  lines.push("**Notes:**");
  lines.push("- [Add your observations here after reviewing the responses]");
  lines.push("");
  lines.push("## Cost Sensitivity");
  lines.push("");
  lines.push("Different models have different costs per token. Based on typical OpenRouter pricing:");
  lines.push("");
  lines.push("- **DeepSeek V3.2:** Low cost (~$0.14 per 1M input tokens)");
  lines.push("- **Claude 3.7 Sonnet:** Medium cost (~$3 per 1M input tokens)");
  lines.push("- **GPT-5.2 Codex:** Higher cost (pricing varies)");
  lines.push("");
  lines.push("For cost-sensitive batch operations, prefer `cheap_batch_edits` profile.");
  lines.push("For critical bug fixes where quality matters most, prefer `repo_surgery` or `hard_debug`.");
  lines.push("");
  lines.push("## Recommendations");
  lines.push("");
  lines.push("Based on this evaluation:");
  lines.push("");
  lines.push("1. **Use `repo_surgery` for:** [Add recommendations based on response quality]");
  lines.push("2. **Use `cheap_batch_edits` for:** [Add recommendations based on cost/quality balance]");
  lines.push("3. **Use `hard_debug` for:** [Add recommendations based on debugging effectiveness]");
  lines.push("");
  
  return lines.join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log("Usage: node scripts/openrouter-routing-eval.js <prompt>");
    console.log();
    console.log("Example:");
    console.log('  node scripts/openrouter-routing-eval.js "Fix the memory leak in the session handler"');
    console.log();
    console.log("This will run the prompt through all three routing profiles and generate a comparison report.");
    process.exit(0);
  }
  
  const prompt = args.join(" ");
  
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("❌ Error: OPENROUTER_API_KEY environment variable is not set");
    console.error("\nSet it by running:");
    console.error("  export OPENROUTER_API_KEY='your-key-here'\n");
    process.exit(1);
  }
  
  const systemPrompt = "You are an expert software engineer. Provide a detailed, practical response with code examples where appropriate.";
  
  console.log("=".repeat(80));
  console.log("OpenRouter Routing Evaluation Harness");
  console.log("=".repeat(80));
  console.log();
  console.log("Running the same prompt through all routing profiles...");
  console.log();
  console.log(`Prompt: ${prompt}`);
  console.log();
  console.log("=" .repeat(80));
  console.log();
  
  const results = [];
  
  for (const profile of PROFILES) {
    console.log(`\nEvaluating profile: ${profile}`);
    console.log("-".repeat(80));
    
    const result = await evaluateProfile(profile, prompt, systemPrompt);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ Success (${result.modelUsed}, ${result.responseTime}ms, ${result.responseLength} chars)`);
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }
  }
  
  console.log();
  console.log("=" .repeat(80));
  console.log("Generating report...");
  console.log("=" .repeat(80));
  
  const report = generateMarkdownReport(results, prompt, systemPrompt);
  
  const outputDir = path.join(__dirname, "..", "logs");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = path.join(outputDir, `openrouter-routing-eval-${timestamp}.md`);
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, report);
  
  console.log();
  console.log(`✅ Report saved to: ${outputPath}`);
  console.log();
  console.log("Review the report to compare:");
  console.log("  - Response quality and detail");
  console.log("  - Model selection and fallback behavior");
  console.log("  - Response time and efficiency");
  console.log("  - Cost-effectiveness for different task types");
  console.log();
}

// Run if called directly
if (require.main === module) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}

module.exports = { evaluateProfile, generateMarkdownReport };
