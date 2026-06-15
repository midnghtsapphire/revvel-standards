import re

with open('wr/issues/issue-1234-create-a-job-for-getnewsfirst-or-better-name.md', 'r') as f:
    lines = f.readlines()

new_lines = []
in_objective = False
for line in lines:
    if line.startswith('### Objective'):
        new_lines.append(line)
        new_lines.append('\n```yaml\n')
        in_objective = True
        continue

    if in_objective and line.startswith('only use screen shot content that relates'):
        new_lines.append('```\n\n')
        new_lines.append(line)
        in_objective = False
        continue

    new_lines.append(line)

with open('wr/issues/issue-1234-create-a-job-for-getnewsfirst-or-better-name.md', 'w') as f:
    f.writelines(new_lines)
