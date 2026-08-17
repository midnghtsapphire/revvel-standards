const fs = require('fs');
let txt = fs.readFileSync('.github/workflows/apisec-scan.yml', 'utf8');

// if it's invalid YAML due to indentation:
// check for the `sarif-result-file: "apisec-results.sarif"` and `sarif_file: ./apisec-results.sarif`
// and ensure `with:` matches
txt = txt.replace(/       - name: Import results/g, '      - name: Import results');
txt = txt.replace(/         uses: github\/codeql-action\/upload-sarif@v3/g, '        uses: github/codeql-action/upload-sarif@v3');
txt = txt.replace(/         with:/g, '        with:');
txt = txt.replace(/          sarif_file: .\/apisec-results.sarif/g, '          sarif_file: ./apisec-results.sarif');

// fix the first step too
txt = txt.replace(/       - name: APIsec scan/g, '      - name: APIsec scan');
txt = txt.replace(/         uses: apisec-inc\/apisec-run-scan@/g, '        uses: apisec-inc/apisec-run-scan@');

fs.writeFileSync('.github/workflows/apisec-scan.yml', txt);
