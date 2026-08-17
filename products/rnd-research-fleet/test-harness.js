#!/usr/bin/env node
/**
 * R&D Research Fleet - Self-Exploding Test Harness (Node.js)
 * 
 * Advanced testing for zip, tar.gz, and application packages
 * Auto-runs quality gates, security scans, and reports metrics
 */

import { createWriteStream, createReadStream, existsSync, statSync, readFileSync, writeFileSync, readdirSync, statSync as stat, rmSync, mkdirSync, execSync } from 'fs';
import { extract } from 'tar';
import { unzip } from 'unzipper';
import { join, basename, extname, dirname } from 'path';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const NC = '\x1b[0m';

// Config
const VERSION = '1.0.0';
let WORK_DIR = `/tmp/rnd-fleet-test-${Date.now()}`;
let VERBOSE = false;
let SKIP_INSTALL = false;
let TEST_ONLY = false;
let AUTO_FIX = false;

// Metrics
const metrics = {
    extractTime: 0,
    installTime: 0,
    testTime: 0,
    totalTime: 0,
    testsPassed: 0,
    testsFailed: 0,
    securityIssues: 0,
    commonIssues: 0,
    qualityScore: 0,
    filesCount: 0,
    dirsCount: 0,
    packageType: 'unknown'
};

//===============================================================================
// LOGGING
//===============================================================================

const log = {
    info: (msg) => console.log(`${BLUE}[INFO]${NC} ${msg}`),
    success: (msg) => console.log(`${GREEN}[PASS]${NC} ${msg}`),
    error: (msg) => console.log(`${RED}[FAIL]${NC} ${msg}`),
    warn: (msg) => console.log(`${YELLOW}[WARN]${NC} ${msg}`),
    debug: (msg) => VERBOSE && console.log(`[DEBUG] ${msg}`)
};

//===============================================================================
// HELP
//===============================================================================

function showHelp() {
    console.log(`
R&D Research Fleet - Self-Exploding Test Harness v${VERSION}

USAGE:
    node test-harness.js <package-file> [options]

OPTIONS:
    -h, --help              Show this help
    -v, --verbose           Verbose output
    --skip-install          Skip installation step
    --test-only             Only run tests (no extract/install)
    --auto-fix              Attempt auto-fix on failures
    --work-dir DIR          Set working directory
    --output FILE           Save report to file (JSON)

EXAMPLES:
    node test-harness.js product.tar.gz
    node test-harness.js product.zip --verbose
    node test-harness.js app.dmg --skip-install --output report.json

EXIT CODES:
    0   All tests passed
    1   Tests failed
    2   Extraction failed
    3   Installation failed
    4   Invalid package
`);
}

//===============================================================================
// PARSE ARGUMENTS
//===============================================================================

let packageFile = '';
let outputFile = '';

function parseArgs(args) {
    if (args.length < 3) {
        showHelp();
        process.exit(0);
    }

    packageFile = args[2];

    for (let i = 3; i < args.length; i++) {
        const arg = args[i];
        if (arg === '-h' || arg === '--help') {
            showHelp();
            process.exit(0);
        } else if (arg === '-v' || arg === '--verbose') {
            VERBOSE = true;
        } else if (arg === '--skip-install') {
            SKIP_INSTALL = true;
        } else if (arg === '--test-only') {
            TEST_ONLY = true;
        } else if (arg === '--auto-fix') {
            AUTO_FIX = true;
        } else if (arg === '--work-dir' && args[i + 1]) {
            WORK_DIR = args[++i];
        } else if (arg === '--output' && args[i + 1]) {
            outputFile = args[++i];
        }
    }

    if (!existsSync(packageFile)) {
        log.error(`Package not found: ${packageFile}`);
        process.exit(4);
    }
}

//===============================================================================
// EXTRACTION
//===============================================================================

async function extractPackage(pkg) {
    const startTime = Date.now();
    log.info(`Extracting package: ${pkg}`);

    mkdirSync(WORK_DIR, { recursive: true });
    process.chdir(WORK_DIR);

    const ext = extname(pkg).toLowerCase();

    try {
        if (ext === '.gz' || ext === '.tgz' || pkg.endsWith('.tar.gz')) {
            await extract({ file: pkg, cwd: WORK_DIR });
        } else if (ext === '.zip') {
            await pipeline(
                createReadStream(pkg),
                unzip.Extract({ path: WORK_DIR })
            );
        } else if (ext === '.tar' || ext === '.bz2' || ext === '.xz') {
            await extract({ file: pkg, cwd: WORK_DIR });
        } else if (ext === '.7z' || ext === '.rar') {
            // Fall back to shell
            try {
                execSync(`7z x "${pkg}" -o"${WORK_DIR}" -y`, { stdio: 'pipe' });
            } catch {
                log.warn('7z/rar extraction requires 7z binary');
            }
        } else {
            // Try as tar
            try {
                await extract({ file: pkg, cwd: WORK_DIR });
            } catch {
                log.error(`Could not extract ${pkg}`);
                process.exit(2);
            }
        }
    } catch (err) {
        log.error(`Extraction failed: ${err.message}`);
        process.exit(2);
    }

    metrics.extractTime = (Date.now() - startTime) / 1000;
    log.success(`Extracted in ${metrics.extractTime}s`);
    
    // List contents
    log.debug('Contents:');
    console.log(execSync('ls -la', { encoding: 'utf8' }));
}

//===============================================================================
// FILE ANALYSIS
//===============================================================================

function analyzeContents() {
    log.info('Analyzing package contents...');

    function countFiles(dir) {
        let files = 0;
        let dirs = 0;
        
        try {
            const items = readdirSync(dir);
            for (const item of items) {
                const fullPath = join(dir, item);
                try {
                    const stat = statSync(fullPath);
                    if (stat.isDirectory()) {
                        dirs++;
                        const sub = countFiles(fullPath);
                        files += sub.files;
                        dirs += sub.dirs;
                    } else {
                        files++;
                    }
                } catch {}
            }
        } catch {}
        
        return { files, dirs };
    }

    const counts = countFiles(WORK_DIR);
    metrics.filesCount = counts.files;
    metrics.dirsCount = counts.dirs;

    const size = execSync(`du -sh "${WORK_DIR}"`, { encoding: 'utf8' }).split('\t')[0];
    
    log.info(`Files: ${metrics.filesCount} | Directories: ${metrics.dirsCount} | Size: ${size}`);

    // Detect type
    const files = readdirSync(WORK_DIR);
    
    if (files.includes('package.json')) {
        metrics.packageType = 'node';
        log.info('Detected: Node.js package');
    } else if (files.some(f => f === 'requirements.txt' || f === 'setup.py' || f === 'pyproject.toml')) {
        metrics.packageType = 'python';
        log.info('Detected: Python package');
    } else if (files.includes('Cargo.toml')) {
        metrics.packageType = 'rust';
        log.info('Detected: Rust package');
    } else if (files.includes('go.mod')) {
        metrics.packageType = 'go';
        log.info('Detected: Go package');
    } else if (files.some(f => f.endsWith('.xcodeproj'))) {
        metrics.packageType = 'xcode';
        log.info('Detected: Xcode project');
    } else if (files.includes('Makefile')) {
        metrics.packageType = 'make';
        log.info('Detected: Make-based project');
    } else if (files.includes('Dockerfile') || files.includes('docker-compose.yml')) {
        metrics.packageType = 'docker';
        log.info('Detected: Docker project');
    } else if (files.includes('install.sh') || files.includes('setup.sh')) {
        metrics.packageType = 'script';
        log.info('Detected: Shell script package');
    } else {
        metrics.packageType = 'generic';
        log.info('Detected: Generic package');
    }
}

//===============================================================================
// INSTALLATION
//===============================================================================

async function runInstall() {
    if (SKIP_INSTALL) {
        log.warn('Skipping installation (--skip-install)');
        return;
    }

    const startTime = Date.now();
    log.info('Running installation...');

    const installScripts = ['install.sh', 'setup.sh', 'install', 'bootstrap.sh'];
    let installed = false;

    for (const script of installScripts) {
        const scriptPath = join(WORK_DIR, script);
        if (existsSync(scriptPath)) {
            log.info(`Running: ${script}`);
            try {
                execSync(`chmod +x "${scriptPath}" && bash "${scriptPath}"`, { 
                    stdio: 'inherit',
                    timeout: 300000 
                });
                installed = true;
                break;
            } catch (err) {
                log.error(`Install script failed`);
                if (AUTO_FIX) {
                    log.info('Attempting auto-fix...');
                    attemptAutoFix();
                }
                process.exit(3);
            }
        }
    }

    if (!installed) {
        switch (metrics.packageType) {
            case 'node':
                log.info('Installing Node.js dependencies...');
                try {
                    execSync('npm install', { stdio: 'inherit', cwd: WORK_DIR });
                    installed = true;
                } catch {
                    log.warn('npm install failed');
                }
                break;
            case 'python':
                log.info('Installing Python dependencies...');
                try {
                    execSync('pip install -r requirements.txt', { stdio: 'inherit', cwd: WORK_DIR });
                    installed = true;
                } catch {
                    log.warn('pip install failed');
                }
                break;
        }
    }

    metrics.installTime = (Date.now() - startTime) / 1000;
    log.success(`Installation completed in ${metrics.installTime}s`);
}

//===============================================================================
// TESTING
//===============================================================================

function runTests() {
    const startTime = Date.now();
    log.info('Running tests...');

    // Run package-specific tests
    switch (metrics.packageType) {
        case 'node':
            runNodeTests();
            break;
        case 'python':
            runPythonTests();
            break;
        case 'rust':
            runRustTests();
            break;
    }

    // Generic file checks
    log.info('Running file validation...');
    
    const requiredFiles = ['README.md', 'LICENSE', 'package.json', 'requirements.txt', 'setup.py', 'Makefile'];
    for (const req of requiredFiles) {
        const reqPath = join(WORK_DIR, req);
        if (existsSync(reqPath)) {
            log.success(`Found: ${req}`);
            metrics.testsPassed++;
        } else {
            log.warn(`Missing: ${req}`);
            metrics.testsFailed++;
        }
    }

    // Security scan
    runSecurityScan();
    
    // Common issues
    checkCommonIssues();

    metrics.testTime = (Date.now() - startTime) / 1000;
    log.info(`Tests: ${metrics.testsPassed} passed, ${metrics.testsFailed} failed (${metrics.testTime}s)`);
}

function runNodeTests() {
    const pkgJson = join(WORK_DIR, 'package.json');
    if (!existsSync(pkgJson)) return;

    try {
        log.info('Running npm test...');
        execSync('npm test', { stdio: 'inherit', cwd: WORK_DIR });
        metrics.testsPassed++;
    } catch {
        metrics.testsFailed++;
    }

    // ESLint
    if (existsSync(join(WORK_DIR, '.eslintrc.js')) || existsSync(join(WORK_DIR, '.eslintrc.json'))) {
        log.info('Running ESLint...');
        try {
            execSync('npx eslint . --max-warnings=0', { stdio: 'inherit', cwd: WORK_DIR });
            metrics.testsPassed++;
        } catch {
            metrics.testsFailed++;
        }
    }
}

function runPythonTests() {
    try {
        log.info('Running pytest...');
        execSync('pytest -v', { stdio: 'inherit', cwd: WORK_DIR });
        metrics.testsPassed++;
    } catch {
        metrics.testsFailed++;
    }
}

function runRustTests() {
    try {
        log.info('Running cargo test...');
        execSync('cargo test', { stdio: 'inherit', cwd: WORK_DIR });
        metrics.testsPassed++;
    } catch {
        metrics.testsFailed++;
    }
}

//===============================================================================
// SECURITY SCAN
//===============================================================================

function runSecurityScan() {
    log.info('Security scanning...');

    const patterns = [
        { regex: /password\s*=/gi, name: 'hardcoded password' },
        { regex: /api_key\s*=/gi, name: 'hardcoded API key' },
        { regex: /token\s*=\s*['"][^'"]+['"]/gi, name: 'hardcoded token' },
        { regex: /secret\s*=/gi, name: 'hardcoded secret' }
    ];

    function scanDir(dir, depth = 0) {
        if (depth > 10) return;
        
        try {
            const items = readdirSync(dir);
            for (const item of items) {
                if (item === 'node_modules' || item === '.git') continue;
                
                const fullPath = join(dir, item);
                try {
                    const stat = statSync(fullPath);
                    if (stat.isDirectory()) {
                        scanDir(fullPath, depth + 1);
                    } else if (/\.(js|ts|py|sh|json|env)$/i.test(item)) {
                        const content = readFileSync(fullPath, 'utf8');
                        for (const pattern of patterns) {
                            if (pattern.regex.test(content)) {
                                log.warn(`Possible ${pattern.name} in ${fullPath.replace(WORK_DIR, '.')}`);
                                metrics.securityIssues++;
                            }
                            pattern.regex.lastIndex = 0;
                        }
                    }
                } catch {}
            }
        } catch {}
    }

    scanDir(WORK_DIR);

    if (metrics.securityIssues === 0) {
        log.success('No security issues found');
    } else {
        log.warn(`Security issues found: ${metrics.securityIssues}`);
    }
}

//===============================================================================
// COMMON ISSUES
//===============================================================================

function checkCommonIssues() {
    function grepCount(pattern, extensions) {
        let count = 0;
        function search(dir, depth = 0) {
            if (depth > 10) return;
            try {
                const items = readdirSync(dir);
                for (const item of items) {
                    if (item === 'node_modules' || item === '.git') continue;
                    const fullPath = join(dir, item);
                    try {
                        const stat = statSync(fullPath);
                        if (stat.isDirectory()) {
                            search(fullPath, depth + 1);
                        } else if (extensions.some(ext => item.endsWith(ext))) {
                            const content = readFileSync(fullPath, 'utf8');
                            const matches = content.match(new RegExp(pattern, 'gi'));
                            if (matches) count += matches.length;
                        }
                    } catch {}
                }
            } catch {}
        }
        search(WORK_DIR);
        return count;
    }

    const todoCount = grepCount('TODO', ['.js', '.ts', '.py', '.sh', '.md']);
    const fixmeCount = grepCount('FIXME', ['.js', '.ts', '.py', '.sh', '.md']);
    const placeholderCount = grepCount('placeholder', ['.js', '.ts', '.py']);

    if (todoCount > 0) {
        log.warn(`Found ${todoCount} TODO comments`);
        metrics.commonIssues++;
    }
    if (fixmeCount > 0) {
        log.warn(`Found ${fixmeCount} FIXME comments`);
        metrics.commonIssues++;
    }
    if (placeholderCount > 0) {
        log.warn(`Found ${placeholderCount} placeholder references`);
        metrics.commonIssues++;
    }
}

//===============================================================================
// AUTO-FIX
//===============================================================================

function attemptAutoFix() {
    log.info('Attempting auto-fix...');
    
    try {
        // Fix permissions
        execSync('find . -type f -name "*.sh" -exec chmod +x {} \\;', { cwd: WORK_DIR });
        
        // Remove empty directories
        execSync('find . -type d -empty -delete 2>/dev/null || true', { cwd: WORK_DIR });
        
        log.success('Auto-fix attempted');
    } catch (err) {
        log.warn(`Auto-fix warning: ${err.message}`);
    }
}

//===============================================================================
// QUALITY SCORING
//===============================================================================

function calculateQualityScore() {
    log.info('Calculating quality score...');

    let score = 100;
    
    score -= metrics.testsFailed * 5;
    score -= metrics.securityIssues * 10;
    score -= metrics.commonIssues * 3;
    
    score = Math.max(0, score);
    metrics.qualityScore = score;

    if (score >= 90) {
        log.success(`Quality Score: ${score}/100 (A - Trusted)`);
    } else if (score >= 80) {
        log.success(`Quality Score: ${score}/100 (B - Reliable)`);
    } else if (score >= 70) {
        log.warn(`Quality Score: ${score}/100 (C - Watch)`);
    } else if (score >= 60) {
        log.error(`Quality Score: ${score}/100 (D - Shaky)`);
    } else {
        log.error(`Quality Score: ${score}/100 (F - Quarantine)`);
    }
}

//===============================================================================
// REPORT
//===============================================================================

function generateReport() {
    const reportFile = outputFile || `/tmp/test-report-${Date.now()}.json`;
    
    const report = {
        version: VERSION,
        timestamp: new Date().toISOString(),
        package: packageFile,
        packageType: metrics.packageType,
        workDir: WORK_DIR,
        metrics: {
            extractTime: metrics.extractTime,
            installTime: metrics.installTime,
            testTime: metrics.testTime,
            totalTime: metrics.totalTime,
            filesCount: metrics.filesCount,
            dirsCount: metrics.dirsCount,
            testsPassed: metrics.testsPassed,
            testsFailed: metrics.testsFailed,
            securityIssues: metrics.securityIssues,
            commonIssues: metrics.commonIssues,
            qualityScore: metrics.qualityScore
        },
        qualityGrade: metrics.qualityScore >= 90 ? 'A' : 
                      metrics.qualityScore >= 80 ? 'B' :
                      metrics.qualityScore >= 70 ? 'C' :
                      metrics.qualityScore >= 60 ? 'D' : 'F',
        passed: metrics.testsFailed === 0 && metrics.qualityScore >= 70
    };

    writeFileSync(reportFile, JSON.stringify(report, null, 2));
    log.info(`Report saved: ${reportFile}`);
    
    return reportFile;
}

//===============================================================================
// SUMMARY
//===============================================================================

function printSummary() {
    console.log('');
    console.log('==============================================');
    console.log('  TEST HARNESS SUMMARY');
    console.log('==============================================');
    console.log('');
    console.log(`  Package:     ${packageFile}`);
    console.log(`  Type:        ${metrics.packageType}`);
    console.log(`  Files:       ${metrics.filesCount}`);
    console.log('');
    console.log('  TIMING:');
    console.log(`    Extract:   ${metrics.extractTime}s`);
    console.log(`    Install:   ${metrics.installTime}s`);
    console.log(`    Tests:     ${metrics.testTime}s`);
    console.log(`    Total:     ${metrics.totalTime}s`);
    console.log('');
    console.log('  RESULTS:');
    console.log(`    Tests:     ${metrics.testsPassed} passed, ${metrics.testsFailed} failed`);
    console.log(`    Security:  ${metrics.securityIssues} issues`);
    console.log(`    Quality:   ${metrics.qualityScore}/100`);
    console.log('');
    console.log('==============================================');

    if (metrics.testsFailed === 0 && metrics.qualityScore >= 70) {
        console.log(`  ${GREEN}✓ ALL TESTS PASSED${NC}`);
        console.log('==============================================');
        return 0;
    } else {
        console.log(`  ${RED}✗ TESTS FAILED${NC}`);
        console.log('==============================================');
        return 1;
    }
}

//===============================================================================
// MAIN
//===============================================================================

async function main(args) {
    console.log('');
    console.log('==============================================');
    console.log(`  R&D RESEARCH FLEET - TEST HARNESS v${VERSION}`);
    console.log('==============================================');
    console.log('');

    const startTotal = Date.now();

    parseArgs(args);

    if (!TEST_ONLY) {
        await extractPackage(packageFile);
        analyzeContents();
        await runInstall();
    }

    runTests();
    calculateQualityScore();

    metrics.totalTime = (Date.now() - startTotal) / 1000;

    generateReport();
    const exitCode = printSummary();

    // Cleanup
    try {
        if (WORK_DIR.startsWith('/tmp/')) {
            rmSync(WORK_DIR, { recursive: true, force: true });
        }
    } catch {}

    process.exit(exitCode);
}

main(process.argv);
