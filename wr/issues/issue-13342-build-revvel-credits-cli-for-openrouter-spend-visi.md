# WR: [WR] Build revvel-credits CLI for OpenRouter spend visibility

**Issue:** #13342  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Research Date:** 2026-05-06  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete

---

## Executive Summary

The `revvel-credits` CLI is an internal, lightweight tool built with Node.js to provide instant visibility into OpenRouter API spend and credit balances. It requires only the `OPENROUTER_API_KEY` environment variable and relies on native Node.js (v20+) `fetch` to keep the dependency footprint minimal. This ensures developers can execute a 5-second sanity check (`npx revvel-credits` or `npm i -g revvel-credits`) directly from the terminal.

---

## Step 1: Repository Discovery

### Repository Metadata

| Property | Value |
|----------|-------|
| Repository | [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards) |
| Created | 2026-05-06 |
| Last Updated | 2026-05-06 |
| Primary Language | JavaScript |
| Target Package | `revvel-credits` CLI |
| Internal Tooling | Yes |

### Current Status

- **Active Development:** Yes - this is a new tooling initiative
- **Open Issues:** Addresses Issue #13342
- **Deployment Status:** To be deployed globally via npm (`npm i -g revvel-credits`)
- **CI/CD Status:** Will require basic linting and syntax checking per `revvel-standards`

### Proposed Structure

```
tools/revvel-credits/
├── bin/
│   └── revvel-credits.js  # CLI entry point
├── package.json
├── README.md
└── .npmignore
```

### Key Technologies

- **Environment:** Node.js (v20+)
- **API Fetching:** Native Node.js `fetch` (no `axios` or heavy deps)
- **API Target:** OpenRouter `/api/v1/credits` endpoint

---

## Step 2: Tech Stack Analysis

### Approach & Implementation

#### Minimal Dependency Strategy
Since the goal is a rapid execution CLI tool with a small install footprint, the tool will avoid heavy frameworks like `commander` or `yargs` if basic `process.argv` parsing is sufficient, and will use the native `fetch` API available in Node.js 20+.

#### API Interaction
**Endpoint:** `GET https://openrouter.ai/api/v1/credits`
**Headers:** `Authorization: Bearer $OPENROUTER_API_KEY`

#### Expected Output Formatting
The CLI will extract and output the following in a clear, tabular or list format:
- **Total Credit Remaining:** (e.g., `$25.40`)
- **This-Month Spend:** (Extracted from the credits API response)
- **Last-7-Day Spend by Model:** (Formatted directly from the API response objects)

---

## Step 3: Requirements from revvel-standards

### Obsessive Autonomy Assessment

**Current Autonomy Level:** High

**Autonomous Capabilities:**
- The CLI tool operates entirely on local environment variables (`OPENROUTER_API_KEY`) without requiring external configuration files or setup wizards.

### Ship to Market Status

**Readiness Checklist:**
- [ ] Initialize `tools/revvel-credits` with `package.json` specifying `"bin": { "revvel-credits": "./bin/revvel-credits.js" }`
- [ ] Implement `fetch` to OpenRouter `/api/v1/credits`
- [ ] Parse and format response data (Total, This Month, Last 7 Days)
- [ ] Add basic error handling for missing `OPENROUTER_API_KEY`
- [ ] Test execution locally via `node ./bin/revvel-credits.js`
- [ ] Verify `npm i -g` installation behaves correctly
- [ ] Add README.md with usage instructions
- [ ] Ensure no heavy dependencies are added

---

## Step 4: Development & Implementation Plan

### Step-by-Step Build Plan

1. **Initialize Project:**
   Create the directory `tools/revvel-credits` and run `npm init -y`. Update `package.json` to include the `bin` mapping and set `"type": "module"`.

2. **Develop CLI Entry Point (`bin/revvel-credits.js`):**
   - Read the `OPENROUTER_API_KEY` from `process.env`.
   - If missing, throw a clear error: `Error: OPENROUTER_API_KEY environment variable is missing.`
   - Make a `GET` request to `https://openrouter.ai/api/v1/credits`.
   - Handle network errors and non-200 responses gracefully.

3. **Data Parsing & Formatting:**
   - Parse the JSON response.
   - Extract `total_usage`, `total_credits`, and format them as currency.
   - Iterate through model usage statistics (if provided by the endpoint) to summarize the last 7 days.
   - Use standard `console.log` with simple ASCII formatting for readability.

4. **Testing:**
   - Run manual tests simulating successful and failed API responses.
   - Verify Node 20+ compatibility.

---

## Step 5: Documentation Requirements

### README.md Template

```markdown
# revvel-credits

A fast, zero-dependency CLI tool for checking OpenRouter API spend and remaining credits directly from your terminal.

## Installation

```bash
npm install -g revvel-credits
```
*(Or run directly via `npx revvel-credits`)*

## Usage

Ensure your OpenRouter API key is exported in your environment:

```bash
export OPENROUTER_API_KEY="your-api-key"
```

Then run:

```bash
revvel-credits
```

## Output

Prints:
- Total remaining credit
- This month's spend
- Last 7 days of spend, broken down by model
```

---

## Step 6: Save This Prompt & Findings

### Implementation Tasks Created

**Issues Created:**
1. [Issue #13342]: Build revvel-credits CLI for OpenRouter spend visibility - P1

### Next Steps

1. [ ] Create `tools/revvel-credits` directory and `package.json`
2. [ ] Implement the OpenRouter API fetch logic in `bin/revvel-credits.js`
3. [ ] Test the CLI locally with a valid `OPENROUTER_API_KEY`
4. [ ] Commit the changes and submit the PR for review

---

## Recommendations

### Immediate Actions (P0)

1. **Implement `revvel-credits` CLI**
   - **Why:** Solves the immediate pain point of lack of cost visibility for OpenRouter usage across various repository workflows.
   - **How:** Write a lightweight Node.js script using native `fetch` and publish/link it via npm.
   - **Effort:** 1-2 hours

---

## Status Summary

**Research Status:** ✅ Complete
**Implementation Priority:** P1
**Effort Required:** 1-2 hours
**Ship-to-Market Ready:** Yes
**Approval Required:** @midnghtsapphire

---

**Last Updated:** 2026-05-06  
**Next Review:** After implementation
