const fs = require('fs');
const filepath = 'wr/issues/issue-14008-fix-orphaned-pipe-row-breaking-competitor-comparis.md';
let content = fs.readFileSync(filepath, 'utf8');

// The first match left some more boilerplate:
content = content.replace(/## Executive Summary\n\n\[2-3 sentence summary of repository purpose, current state, and key recommendations\]/g, '');

content = content.replace(/\[Accepted\/Rejected\]/g, 'N/A');
content = content.replace(/P0 \/ P1 \/ P2/g, 'P0');
content = content.replace(/\[Detailed description moved to Executive Summary\]/g, 'N/A');

fs.writeFileSync(filepath, content, 'utf8');
