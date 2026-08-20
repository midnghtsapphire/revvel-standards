const fs = require('fs');

let content = fs.readFileSync('.github/workflows/ossar.yml', 'utf8');

content = content.replace(
`    - name: Enable Windows Long Paths
      run: |
        Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\FileSystem' -Name 'LongPathsEnabled' -Value 1
        git config --system core.longpaths true`,
`    - name: Enable Windows Long Paths
      run: pwsh -Command "Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\FileSystem' -Name 'LongPathsEnabled' -Value 1; git config --system core.longpaths true"`
);


content = content.replace(
`    - name: Verify OSSAR Execution
      if: always()
      run: |
        if (-not ('\${{ steps.ossar.outputs.sarifFile }}')) {
            Write-Host "::error title=ToolCrashException::SARIF file path is empty."
            [Environment]::Exit(1)
        }
        if (-not (Test-Path '\${{ steps.ossar.outputs.sarifFile }}')) {
            Write-Host "::error title=ToolCrashException::SARIF file not found"
            [Environment]::Exit(1)
        }
        $sarifContent = Get-Content '\${{ steps.ossar.outputs.sarifFile }}' -Raw
        if ($sarifContent -notmatch 'bandit') {
            Write-Host "::error title=ToolCrashException::Bandit was not found in the SARIF output. Tool likely crashed before running."
            [Environment]::Exit(1)
        }
        $outcome = '\${{ steps.ossar.outcome }}'
        if ($outcome -eq 'failure') {
            Write-Host "::error title=Security Findings Detected::OSSAR found security violations."
            [Environment]::Exit(1)
        }`,
`    - name: Verify OSSAR Execution
      if: always()
      run: pwsh -Command "if (-not ('\${{ steps.ossar.outputs.sarifFile }}')) { Write-Host '::error title=ToolCrashException::SARIF file path is empty.'; [Environment]::Exit(1) }; if (-not (Test-Path '\${{ steps.ossar.outputs.sarifFile }}')) { Write-Host '::error title=ToolCrashException::SARIF file not found'; [Environment]::Exit(1) }; \\$sarifContent = Get-Content '\${{ steps.ossar.outputs.sarifFile }}' -Raw; if (\\$sarifContent -notmatch 'bandit') { Write-Host '::error title=ToolCrashException::Bandit was not found in the SARIF output. Tool likely crashed before running.'; [Environment]::Exit(1) }; \\$outcome = '\${{ steps.ossar.outcome }}'; if (\\$outcome -eq 'failure') { Write-Host '::error title=Security Findings Detected::OSSAR found security violations.'; [Environment]::Exit(1) }"`
);


fs.writeFileSync('.github/workflows/ossar.yml', content);
