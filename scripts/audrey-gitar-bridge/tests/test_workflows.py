"""Offline contract tests for the exact integrated workflows; stdlib harness."""
import json
import os
from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[3]
WORKFLOWS = ROOT / ".github" / "workflows"
CHECKOUT = "actions/checkout@11d5960a326750d5838078e36cf38b85af677262"


def workflow(name):
    return (WORKFLOWS / name).read_text()


def step_source(text, name):
    match = re.search(r"^      - name: " + re.escape(name) + r"\n(.*?)(?=^      - name: |\Z)", text, re.M | re.S)
    if not match:
        raise AssertionError("Missing workflow step " + name)
    return match.group(1)


def node_json(source):
    # Evaluate repository-owned workflow JS only, with an in-memory API stub.
    # No shell, GitHub calls, secrets, or event/artifact-supplied code.
    result = subprocess.run(["node", "-e", source], text=True, capture_output=True,
                            check=True, timeout=20, env={"PATH": os.environ["PATH"]})
    return json.loads(result.stdout)


class WorkflowContractTests(unittest.TestCase):
    def test_wr_inputs_append_optional_false_defaults_and_preserve_manual_only_trigger(self):
        source = workflow("wr-pr-creation.yml")
        header = source.split("permissions:", 1)[0]
        self.assertIn("name: WR PR Creation", header)
        self.assertIn("issue_number:\n        description:", header)
        self.assertNotIn("work_request_number:", header)
        self.assertNotIn("requested_by:", header)
        for name in ("draft_only", "suppress_direct_jules"):
            match = re.search(r"^      " + name + r":\n((?:        .*\n)+)", header, re.M)
            self.assertIsNotNone(match)
            self.assertIn("required: false", match.group(1))
            self.assertIn("type: boolean", match.group(1))
            self.assertIn("default: false", match.group(1))
        self.assertNotRegex(header, r"^  (issues|issue_comment|pull_request|repository_dispatch):", re.M)

    def test_actual_pulls_create_payload_is_draft_only_when_requested(self):
        step = step_source(workflow("wr-pr-creation.yml"), "Create Pull Request")
        script = step.split("          script: |\n", 1)[1]
        script = "\n".join(line[12:] if line.startswith("            ") else line for line in script.splitlines())
        records = node_json("""
            const results = [];
            const core = {info() {}, setOutput() {}};
            const github = {rest: {pulls: {create: async payload => {
                results.push(payload); return {data: {number: 12, html_url: 'offline'}};
            }}}};
            process.env.ISSUE_NUMBER = '7'; process.env.ISSUE_TITLE = '[WR] Review';
            process.env.BRANCH_NAME = 'trusted-branch'; process.env.WR_FILE = 'wr/issues/7.md';
            const script = """ + json.dumps(script) + """;
            const execute = new (Object.getPrototypeOf(async function(){}).constructor)('context', 'github', 'core', script);
            (async () => {
                for (const value of [undefined, false, 'false', true, 'true', '1']) {
                    const context = {repo: {owner: 'offline', repo: 'repo'}, payload: {inputs: {draft_only: value}}};
                    await execute(context, github, core);
                }
                console.log(JSON.stringify(results));
            })().catch(error => {console.error(error); process.exit(1);});
        """)
        self.assertEqual([record["draft"] for record in records], [False, False, False, True, True, False])
        for record in records:
            self.assertEqual(record["head"], "trusted-branch")
            self.assertEqual(record["base"], "main")
            self.assertEqual(record["title"], "[WR] Review")

    def test_actual_jules_condition_preserves_key_gate_and_honors_optout(self):
        step = step_source(workflow("wr-pr-creation.yml"), "Request Jules review")
        condition = re.search(r"^        if: (.*)$", step, re.M).group(1)
        self.assertEqual(condition, "env.JULES_API_KEY != '' && !inputs.suppress_direct_jules")
        self.assertIn("# if: env.JULES_API_KEY != ''", step)
        self.assertIn("uses: BeksOmega/jules-action@v1.0.0", step)
        results = node_json("""
            const result = [];
            for (const key of ['', 'offline-key']) {
                for (const optout of [undefined, false, true]) {
                    const env = {JULES_API_KEY: key}, inputs = {suppress_direct_jules: optout};
                    result.push(Boolean(""" + condition + """));
                }
            }
            console.log(JSON.stringify(result));
        """)
        self.assertEqual(results, [False, False, False, True, True, False])

    def test_wr_existing_cloud_and_coding_gate_are_unchanged(self):
        source = workflow("wr-pr-creation.yml")
        self.assertIn("(needs.detect-completion.outputs.should_create_pr == 'true') &&\n"
                      "      (vars.REVVEL_LLM_ALLOW_CLOUD == '1' && vars.REVVEL_SWITCH_CODING_AGENTS != '0')", source)

    def test_controller_is_exact_dispatch_adapter_not_a_second_command_router(self):
        source = workflow("audrey-bridge.yml")
        self.assertIn("repository_dispatch:\n    types: [agent_requested]", source)
        self.assertIn("github.event.client_payload.agent == 'gitar-bridge'", source)
        self.assertIn("REVVEL_LLM_ALLOW_CLOUD: ${{ vars.REVVEL_LLM_ALLOW_CLOUD }}", source)
        self.assertIn("REVVEL_SWITCH_CODING_AGENTS: ${{ vars.REVVEL_SWITCH_CODING_AGENTS }}", source)
        self.assertIn("AUTO_START: ${{ vars.AUTO_START || 'false' }}", source)
        self.assertIn("WORK_REQUEST_WORKFLOW: ${{ vars.WORK_REQUEST_WORKFLOW || 'wr-pr-creation.yml' }}", source)
        self.assertIn("issue_comment:\n    types: [created, edited, deleted]", source)
        self.assertNotIn("github.event.comment.body", source)
        self.assertNotIn("github.event.client_payload.instructions", source)
        self.assertIn("scripts/audrey-gitar-bridge/audrey_bridge.py --apply event", source)

    def test_gateway_excludes_only_gitar_bridge(self):
        source = workflow("agent-request-delivery.yml")
        self.assertIn("if: github.event.client_payload.agent != 'gitar-bridge'", source)
        for original in ("AGENT: ${{ github.event.client_payload.agent }}", "post_status \"delivered\"",
                         "post_status \"needs-adapter\"", "REQUEST_JSON: ${{ toJSON(github.event.client_payload) }}"):
            self.assertIn(original, source)

    def test_new_privileged_workflow_checkouts_use_pinned_trusted_default_branch(self):
        for name in ("audrey-bridge.yml", "audrey-facebook-publish.yml"):
            source = workflow(name)
            checkouts = re.findall(r"- uses: (actions/checkout@[^\s]+).*?\n        with:\n(.*?)(?=^      -|\Z)", source, re.M | re.S)
            self.assertEqual(len(checkouts), 2)
            for ref, configuration in checkouts:
                self.assertEqual(ref, CHECKOUT)
                self.assertIn("ref: ${{ github.event.repository.default_branch }}", configuration)
                self.assertIn("persist-credentials: false", configuration)
            self.assertNotIn("python3 audrey_bridge.py", source)

    def test_publisher_retains_manual_exact_payload_review_and_compatible_queue(self):
        source = workflow("audrey-facebook-publish.yml")
        self.assertIn("vars.ENABLE_AUDREY_BRIDGE == 'true' && vars.FACEBOOK_PUBLISH_ENABLED == 'true'", source)
        self.assertIn("environment: facebook-publication", source)
        self.assertIn("needs: prepare", source)
        self.assertIn("approval_digest: ${{ steps.payload.outputs.approval_digest }}", source)
        self.assertIn("APPROVAL_DIGEST: ${{ needs.prepare.outputs.approval_digest }}", source)
        self.assertIn("APPROVED_FACEBOOK_PAGE_ID: ${{ vars.APPROVED_FACEBOOK_PAGE_ID }}", source)
        self.assertIn("Read the JSON message and numeric Page ID", source)
        self.assertIn("cancel-in-progress: false", source)
        self.assertIn("# queue: max", source)
        self.assertNotRegex(source, r"^  queue:", re.M)
        self.assertIn("manual workflow_dispatch requeue", source)

    def test_review_relay_is_data_only_and_consumed_by_trusted_controller(self):
        source = workflow("audit-review-events.yml")
        self.assertNotIn("actions/checkout@", source)
        self.assertNotIn("${{ secrets.", source)
        self.assertIn("Path(os.environ['GITHUB_EVENT_PATH']).read_text()", source)
        self.assertIn("path: review-event/event.json", source)
        controller = workflow("audrey-bridge.yml")
        self.assertIn("run-id: ${{ github.event.workflow_run.id }}", controller)
        self.assertIn("--apply relay --event-file review-artifact/event.json", controller)
        self.assertNotRegex(controller, r"(?:bash|python3|sh) review-artifact/")

    def test_existing_ci_is_additive_and_new_job_is_offline_and_pinned(self):
        source = workflow("agent-command-window-ci.yml")
        self.assertIn("uses: actions/checkout@v7", source)
        self.assertIn("node --test .github/tests/agent-command-router.test.mjs", source)
        self.assertIn("uses: " + CHECKOUT, source)
        self.assertIn("python3 -m unittest discover -s scripts/audrey-gitar-bridge/tests -v", source)
        self.assertNotIn("continue-on-error", source)
        for path in ("scripts/audrey-gitar-bridge/**", ".github/workflows/audrey-bridge.yml",
                     ".github/workflows/audrey-facebook-publish.yml", ".github/workflows/audit-review-events.yml",
                     ".github/workflows/wr-pr-creation.yml"):
            self.assertEqual(source.count("- " + path), 2)
