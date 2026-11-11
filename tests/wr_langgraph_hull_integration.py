"""Explicit external HULL integration harness; see adapter MVI for invocation."""
import sys
import importlib
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
persistent_workflow = importlib.import_module("wr_langgraph").persistent_workflow


class HullIntegrationTests(unittest.TestCase):
    """Real existing HULL subprocess execution; no mock executor or providers."""

    def setUp(self):
        import os
        import json
        import hashlib
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        source = Path(os.environ.get('HULL_SOURCE', str(Path(__file__).resolve().parents[2] / 'oaudrey-hull-daily')))
        self.source = source
        sys.path.insert(0, str(source / 'orchestrator'))
        router_type = importlib.import_module('metal_orchestrator.router').SkillRouter
        self.skills = self.root / 'skills'
        rules = {}
        for name in ('build', 'test', 'heal', 'deploy'):
            folder = self.skills / name
            folder.mkdir(parents=True)
            manifest = folder / 'SKILL.md'
            manifest.write_text(f'---\nname: {name}\nmode: script\n---\nBenign fixture\n')
            code = "import sys; sys.exit(0)"
            if name == 'test':
                code = "from pathlib import Path; import sys; sys.exit(0 if Path('healed').exists() else 1)"
            if name == 'heal':
                code = "from pathlib import Path; Path('healed').touch()"
            rules[name] = {'manifest_sha256': hashlib.sha256(manifest.read_bytes()).hexdigest(),
                           'argv': [sys.executable, '-c', code], 'cwd': '.', 'timeout_seconds': 5}
        self.policy = self.root / 'policy.json'
        self.policy.write_text(json.dumps({'version': 1, 'workspace': str(self.root), 'skills': rules}))
        self.router = router_type(self.skills)
        self.router.discover()
        self.adapter = importlib.import_module('wr_langgraph').HullActions(
            self.router, {name: name for name in rules}, policy_path=self.policy,
            receipt_dir=self.root / 'receipts')
        self.db = str(self.root / 'state.sqlite')
        self.config = {'configurable': {'thread_id': 'hull-integration'}}

    def invoke(self, state=None, budget=3):
        with persistent_workflow(self.adapter.actions(), self.db, budget) as graph:
            return graph.invoke(state or {'issue': 18337}, self.config)

    def change_rule(self, name, **values):
        import json
        policy = json.loads(self.policy.read_text())
        policy['skills'][name].update(values)
        self.policy.write_text(json.dumps(policy))

    def test_real_healing_and_receipts_survive_approval_restart(self):
        from langgraph.types import Command
        import json
        result = self.invoke()
        self.assertIn('__interrupt__', result)
        self.assertEqual(2, result['attempts'])
        self.assertEqual(['build', 'test', 'heal', 'build', 'test'],
                         [receipt['action'] for receipt in result['receipts']])
        for reference in result['receipts']:
            receipt = json.loads(Path(reference['receipt_path']).read_text())
            self.assertEqual(0, receipt['bridge_provider_calls'])
            self.assertEqual(reference['status'], receipt['status'])
            self.assertIn('stdout_sha256', receipt)
        with persistent_workflow(self.adapter.actions(), self.db) as graph:
            completed = graph.invoke(Command(resume=True), self.config)
        self.assertEqual('deploy', completed['status'])
        self.assertEqual(6, len(completed['receipts']))

    def test_restart_after_failed_test_continues_at_heal(self):
        with persistent_workflow(self.adapter.actions(), self.db) as graph:
            stopped = graph.invoke({'issue': 18337}, self.config, interrupt_after=['test'])
        self.assertFalse(stopped['test_passed'])
        self.assertEqual(2, len(stopped['receipts']))
        with persistent_workflow(self.adapter.actions(), self.db) as graph:
            resumed = graph.invoke(None, self.config)
        self.assertIn('__interrupt__', resumed)
        self.assertEqual(['build', 'test', 'heal', 'build', 'test'],
                         [item['action'] for item in resumed['receipts']])

    def test_denied_review_does_not_execute_deploy(self):
        from langgraph.types import Command
        self.invoke()
        with persistent_workflow(self.adapter.actions(), self.db) as graph:
            result = graph.invoke(Command(resume={'approved': True}), self.config)
        self.assertFalse(result['approved'])
        self.assertNotIn('deploy', [item['action'] for item in result['receipts']])

    def test_changed_manifest_stops_before_test(self):
        (self.skills / 'build' / 'SKILL.md').write_text('changed')
        result = self.invoke()
        self.assertEqual('rejected', result['receipts'][0]['status'])
        self.assertEqual(1, len(result['receipts']))
        self.assertNotIn('__interrupt__', result)

    def test_failed_heal_stops_without_second_build(self):
        self.change_rule('heal', argv=[sys.executable, '-c', 'import sys; sys.exit(2)'])
        result = self.invoke()
        self.assertEqual(1, result['attempts'])
        self.assertEqual('heal', result['status'])
        self.assertEqual('HULL heal: failed', result['failure'])

    def test_timeout_cannot_enter_healing(self):
        self.change_rule('test', argv=[sys.executable, '-c', 'import time; time.sleep(5)'], timeout_seconds=0.1)
        result = self.invoke()
        self.assertEqual('timed_out', result['receipts'][-1]['status'])
        self.assertEqual(2, len(result['receipts']))
        self.assertNotIn('__interrupt__', result)

    def test_budget_exhaustion_never_requests_approval(self):
        result = self.invoke(budget=1)
        self.assertEqual(1, result['attempts'])
        self.assertFalse(result['test_passed'])
        self.assertNotIn('__interrupt__', result)

    def test_missing_healing_skill_fails_closed(self):
        del self.adapter.skills['heal']
        result = self.invoke()
        self.assertEqual('No approved healing skill', result['failure'])
        self.assertEqual(1, result['attempts'])

    def test_cli_requires_explicit_resume_for_existing_thread(self):
        import contextlib
        import io
        import json
        mapping = self.root / 'mapping.json'
        mapping.write_text(json.dumps(self.adapter.skills))
        arguments = ['--hull-source', str(self.source), '--skills-dir', str(self.skills),
                     '--mapping', str(mapping), '--policy', str(self.policy),
                     '--receipts', str(self.root / 'receipts'), '--database', self.db,
                     '--thread', 'cli-fixture']
        main = importlib.import_module('wr_langgraph').main
        with contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(0, main([*arguments, '--issue', '18337']))
        self.assertTrue(json.loads(output.getvalue())['awaiting_review'])
        with self.assertRaises(ValueError):
            main([*arguments, '--issue', '18337'])
        with self.assertRaises(ValueError):
            main([*arguments, '--resume', 'continue'])
        with contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(0, main([*arguments, '--resume', 'deny']))
        self.assertNotIn('deploy', [item['action'] for item in json.loads(output.getvalue())['receipts']])

    def test_mapping_validation_and_unknown_skill(self):
        adapter_type = type(self.adapter)
        with self.assertRaises(ValueError):
            adapter_type(self.router, {'build': 'build'}, policy_path=self.policy, receipt_dir=self.root)
        self.adapter.skills['build'] = 'unknown'
        result = self.invoke()
        self.assertEqual('rejected', result['receipts'][0]['status'])


if __name__ == '__main__':
    unittest.main()
