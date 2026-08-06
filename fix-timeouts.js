const fs = require('fs');

function addTimeout(filepath, jobName) {
    let content = fs.readFileSync(filepath, 'utf8');
    const regex = new RegExp(`(${jobName}:\n\\s+runs-on: [^\n]+)`, 'g');
    content = content.replace(regex, '$1\n    timeout-minutes: 15');

    // also fix checkout action persist-credentials and v4 -> pin
    content = content.replace(/actions\/checkout@v4/g, 'actions/checkout@11d5960a326750d5838078e36cf38b85af677262\n        with:\n          persist-credentials: false');

    fs.writeFileSync(filepath, content);
}

addTimeout('.github/workflows/image-seo-pipeline.yml', 'build-pack');
addTimeout('.github/workflows/image-seo-qa.yml', 'qa');
addTimeout('.github/workflows/release-banner-social.yml', 'banner');
