import os
import glob

workflow_files = glob.glob('.github/workflows/*.yml')

for file in workflow_files:
    with open(file, 'r') as f:
        content = f.read()

    # Apply the try-catch wrapper logic to listLabelsOnIssue calls if not already wrapped
    if 'listLabelsOnIssue' in content:
        # Since replacing all specific variations in JS is complex via regex,
        # we can use a simpler approach: wrap the whole github-script in try-catch if it lacks it at the top level
        # A simpler way is to just do a string replace on common patterns

        # Pattern 1: const { data: labels } = await github.rest.issues.listLabelsOnIssue({ ... });
        import re
        content = re.sub(
            r'const { data: (\w+) } = await github\.rest\.issues\.listLabelsOnIssue\(([\s\S]*?)\);',
            r'''let \1 = [];
            try {
              const res = await github.rest.issues.listLabelsOnIssue(\2);
              \1 = res.data;
            } catch (e) {
              core.warning(`listLabelsOnIssue failed: ${e.message}`);
            }''',
            content
        )

        with open(file, 'w') as f:
            f.write(content)
