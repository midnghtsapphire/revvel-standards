#!/bin/bash
#===============================================================================
# R&D Research Fleet - Self-Exploding Test Harness
# 
# Extracts, installs, and tests any product package (zip, tar.gz, app)
# Auto-runs quality gates and reports metrics
#
# Usage:
#   ./test-harness.sh <package-file> [options]
#
# Examples:
#   ./test-harness.sh product.tar.gz
#   ./test-harness.sh product.zip --skip-install --verbose
#   ./test-harness.sh app.dmg --test-only
#===============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Config
VERSION="1.0.0"
WORK_DIR="/tmp/rnd-fleet-test-$$"
VERBOSE=false
SKIP_INSTALL=false
TEST_ONLY=false
AUTO_FIX=false
TIMEOUT=300

# Metrics
declare -A METRICS
METRICS[extract_time]=0
METRICS[install_time]=0
METRICS[test_time]=0
METRICS[total_time]=0
METRICS[tests_passed]=0
METRICS[tests_failed]=0
METRICS[quality_score]=0

#===============================================================================
# HELP
#===============================================================================

show_help() {
    cat << EOF
R&D Research Fleet - Self-Exploding Test Harness v${VERSION}

USAGE:
    $0 <package-file> [options]

OPTIONS:
    -h, --help              Show this help
    -v, --verbose           Verbose output
    --skip-install          Skip installation step
    --test-only             Only run tests (no extract/install)
    --auto-fix              Attempt auto-fix on failures
    --timeout SECONDS       Set timeout (default: 300)
    --work-dir DIR          Set working directory (default: auto)
    --output FILE           Save report to file

EXAMPLES:
    $0 product.tar.gz
    $0 product.zip --verbose
    $0 app.dmg --skip-install --output report.json

EXIT CODES:
    0   All tests passed
    1   Tests failed
    2   Extraction failed
    3   Installation failed
    4   Invalid package
EOF
}

#===============================================================================
# LOGGING
#===============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_debug() {
    if [ "$VERBOSE" = true ]; then
        echo -e "[DEBUG] $1"
    fi
}

#===============================================================================
# PARSE ARGUMENTS
#===============================================================================

parse_args() {
    if [ $# -eq 0 ]; then
        show_help
        exit 0
    fi

    PACKAGE_FILE="$1"
    shift

    while [ $# -gt 0 ]; do
        case "$1" in
            -h|--help)
                show_help
                exit 0
                ;;
            -v|--verbose)
                VERBOSE=true
                ;;
            --skip-install)
                SKIP_INSTALL=true
                ;;
            --test-only)
                TEST_ONLY=true
                ;;
            --auto-fix)
                AUTO_FIX=true
                ;;
            --timeout)
                TIMEOUT="$2"
                shift
                ;;
            --work-dir)
                WORK_DIR="$2"
                shift
                ;;
            --output)
                OUTPUT_FILE="$2"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
        shift
    done

    # Validate package
    if [ ! -f "$PACKAGE_FILE" ]; then
        log_error "Package not found: $PACKAGE_FILE"
        exit 4
    fi
}

#===============================================================================
# EXTRACTION
#===============================================================================

extract_package() {
    local pkg="$1"
    local ext="${pkg##*.}"
    local start_time=$(date +%s)

    log_info "Extracting package: $pkg"

    mkdir -p "$WORK_DIR"
    cd "$WORK_DIR"

    case "$ext" in
        gz|tgz|tar.gz|tar)
            if [[ "$pkg" == *.tar.gz ]] || [[ "$pkg" == *.tgz" ]]; then
                tar -xzf "$pkg" || { log_error "Failed to extract tar.gz"; exit 2; }
            else
                tar -xzf "$pkg" || { log_error "Failed to extract tar"; exit 2; }
            fi
            ;;
        zip)
            unzip -q "$pkg" || { log_error "Failed to extract zip"; exit 2; }
            ;;
        bz2|tar.bz2|tbz2)
            tar -xjf "$pkg" || { log_error "Failed to extract bz2"; exit 2; }
            ;;
        xz|tar.xz)
            tar -xJf "$pkg" || { log_error "Failed to extract xz"; exit 2; }
            ;;
        7z)
            7z x "$pkg" -o"$WORK_DIR" -y || { log_error "Failed to extract 7z"; exit 2; }
            ;;
        rar)
            unrar x "$pkg" "$WORK_DIR" || { log_error "Failed to extract rar"; exit 2; }
            ;;
        deb)
            dpkg-deb -x "$pkg" "$WORK_DIR" || { log_error "Failed to extract deb"; exit 2; }
            ;;
        rpm)
            rpm2cpio "$pkg" | cpio -id || { log_error "Failed to extract rpm"; exit 2; }
            ;;
        dmg)
            # Mount DMG and copy contents
            hdiutil attach "$pkg" -mountpoint "$WORK_DIR/mnt" -nobrowse -quiet
            cp -R "$WORK_DIR/mnt/"* "$WORK_DIR/content/" 2>/dev/null || true
            hdiutil detach "$WORK_DIR/mnt" -quiet
            ;;
        app)
            # macOS app bundle - just copy
            cp -R "$pkg" "$WORK_DIR/appbundle/"
            ;;
        *)
            log_warn "Unknown extension: $ext, trying as generic archive"
            tar -xzf "$pkg" 2>/dev/null || unzip -q "$pkg" 2>/dev/null || {
                log_error "Could not extract $pkg"
                exit 2
            }
            ;;
    esac

    local end_time=$(date +%s)
    METRICS[extract_time]=$((end_time - start_time))
    log_success "Extracted in ${METRICS[extract_time]}s"

    # List extracted contents
    log_debug "Contents:"
    ls -la
}

#===============================================================================
# FILE ANALYSIS
#===============================================================================

analyze_contents() {
    log_info "Analyzing package contents..."

    # Count files by type
    FILES=$(find . -type f 2>/dev/null | wc -l)
    DIRS=$(find . -type d 2>/dev/null | wc -l)
    TOTAL_SIZE=$(du -sh . 2>/dev/null | cut -f1)

    log_info "Files: $FILES | Directories: $DIRS | Size: $TOTAL_SIZE"

    # Detect structure
    if [ -f "package.json" ]; then
        PACKAGE_TYPE="node"
        log_info "Detected: Node.js package"
    elif [ -f "requirements.txt" ] || [ -f "setup.py" ] || [ -f "pyproject.toml" ]; then
        PACKAGE_TYPE="python"
        log_info "Detected: Python package"
    elif [ -f "Cargo.toml" ]; then
        PACKAGE_TYPE="rust"
        log_info "Detected: Rust package"
    elif [ -f "go.mod" ]; then
        PACKAGE_TYPE="go"
        log_info "Detected: Go package"
    elif [ -f "*.xcodeproj" ] || [ -d "*.xcodeproj" ]; then
        PACKAGE_TYPE="xcode"
        log_info "Detected: Xcode project"
    elif [ -f "Makefile" ]; then
        PACKAGE_TYPE="make"
        log_info "Detected: Make-based project"
    elif [ -f "Dockerfile" ]; then
        PACKAGE_TYPE="docker"
        log_info "Detected: Docker image"
    elif [ -f "install.sh" ] || [ -f "setup.sh" ]; then
        PACKAGE_TYPE="script"
        log_info "Detected: Shell script package"
    else
        PACKAGE_TYPE="generic"
        log_info "Detected: Generic package"
    fi

    METRICS[files_count]=$FILES
    METRICS[dirs_count]=$DIRS
    METRICS[total_size]=$TOTAL_SIZE
    METRICS[package_type]=$PACKAGE_TYPE
}

#===============================================================================
# INSTALLATION
#===============================================================================

run_install() {
    if [ "$SKIP_INSTALL" = true ]; then
        log_warn "Skipping installation (--skip-install)"
        return 0
    fi

    local start_time=$(date +%s)
    log_info "Running installation..."

    local install_script=""
    local install_cmd=""

    # Find install script
    if [ -f "./install.sh" ]; then
        install_script="./install.sh"
    elif [ -f "./setup.sh" ]; then
        install_script="./setup.sh"
    elif [ -f "./install" ]; then
        install_script="./install"
    elif [ -f "./bootstrap.sh" ]; then
        install_script="./bootstrap.sh"
    fi

    # Detect install method
    if [ -n "$install_script" ]; then
        log_info "Running: $install_script"
        chmod +x "$install_script"
        if timeout "$TIMEOUT" bash "$install_script"; then
            log_success "Install script completed"
        else
            log_error "Install script failed"
            if [ "$AUTO_FIX" = true ]; then
                log_info "Attempting auto-fix..."
                attempt_auto_fix
            fi
            exit 3
        fi
    elif [ "$PACKAGE_TYPE" = "node" ]; then
        log_info "Installing Node.js dependencies..."
        npm install --silent 2>/dev/null || npm install || {
            log_error "npm install failed"
            exit 3
        }
        log_success "Node.js dependencies installed"
    elif [ "$PACKAGE_TYPE" = "python" ]; then
        log_info "Installing Python dependencies..."
        pip install -r requirements.txt 2>/dev/null || pip install -e . 2>/dev/null || {
            log_warn "pip install failed (may need venv)"
        }
    elif [ "$PACKAGE_TYPE" = "docker" ]; then
        log_info "Building Docker image..."
        docker build -t "rnd-test-$$" . || {
            log_error "Docker build failed"
            exit 3
        }
    fi

    local end_time=$(date +%s)
    METRICS[install_time]=$((end_time - start_time))
    log_success "Installation completed in ${METRICS[install_time]}s"
}

#===============================================================================
# TESTING
#===============================================================================

run_tests() {
    local start_time=$(date +%s)
    log_info "Running tests..."

    local tests_passed=0
    local tests_failed=0
    local test_output=""

    # Run tests based on package type
    case "$PACKAGE_TYPE" in
        node)
            if [ -f "package.json" ]; then
                # Run npm test
                if npm test 2>&1 | tee /tmp/test-output.txt; then
                    tests_passed=$((tests_passed + 1))
                else
                    tests_failed=$((tests_failed + 1))
                fi
            fi

            # ESLint check
            if command -v npx &> /dev/null && [ -f ".eslintrc*" ]; then
                log_info "Running ESLint..."
                npx eslint . --max-warnings=0 2>/dev/null && tests_passed=$((tests_passed + 1)) || tests_failed=$((tests_failed + 1))
            fi
            ;;

        python)
            if command -v pytest &> /dev/null; then
                log_info "Running pytest..."
                pytest -v 2>&1 | tee /tmp/test-output.txt && tests_passed=$((tests_passed + 1)) || tests_failed=$((tests_failed + 1))
            elif [ -f "test_*.py" ]; then
                python -m unittest discover 2>&1 && tests_passed=$((tests_passed + 1)) || tests_failed=$((tests_failed + 1))
            fi
            ;;

        rust)
            if command -v cargo &> /dev/null; then
                log_info "Running cargo test..."
                cargo test 2>&1 | tee /tmp/test-output.txt && tests_passed=$((tests_passed + 1)) || tests_failed=$((tests_failed + 1))
            fi
            ;;

        docker)
            log_info "Testing Docker container..."
            docker run --rm "rnd-test-$$" --help 2>&1 && tests_passed=$((tests_passed + 1)) || tests_failed=$((tests_failed + 1))
            ;;
    esac

    # Generic file checks
    log_info "Running file validation..."

    # Check for required files
    local required_files=("README.md" "LICENSE" "package.json" "requirements.txt" "setup.py")
    for req in "${required_files[@]}"; do
        if [ -f "$req" ]; then
            log_success "Found: $req"
            tests_passed=$((tests_passed + 1))
        else
            log_warn "Missing: $req"
            tests_failed=$((tests_failed + 1))
        fi
    done

    # Security checks
    log_info "Running security scan..."
    run_security_scan

    # Check for common issues
    log_info "Checking for common issues..."
    check_common_issues

    METRICS[tests_passed]=$tests_passed
    METRICS[tests_failed]=$tests_failed

    local end_time=$(date +%s)
    METRICS[test_time]=$((end_time - start_time))

    log_info "Tests: ${tests_passed} passed, ${tests_failed} failed (${METRICS[test_time]}s)"
}

#===============================================================================
# SECURITY SCAN
#===============================================================================

run_security_scan() {
    log_info "Security scanning..."

    local issues=0

    # Check for exposed secrets
    if grep -r "password\s*=" . 2>/dev/null | grep -v ".example" | grep -v "test" | grep -v "#"; then
        log_warn "Possible hardcoded password found"
        issues=$((issues + 1))
    fi

    if grep -r "api_key\s*=" . 2>/dev/null | grep -v ".example" | grep -v "test" | grep -v "#"; then
        log_warn "Possible hardcoded API key found"
        issues=$((issues + 1))
    fi

    if grep -r "token\s*=" . 2>/dev/null | grep -v ".example" | grep -v "test" | grep -v "#" | grep -v "auth_token"; then
        log_warn "Possible hardcoded token found"
        issues=$((issues + 1))
    fi

    # Check for suspicious shell commands
    if grep -r "curl\s*|.*sh" . 2>/dev/null; then
        log_warn "Suspicious pipe-to-shell pattern found"
        issues=$((issues + 1))
    fi

    METRICS[security_issues]=$issues

    if [ $issues -eq 0 ]; then
        log_success "No security issues found"
    else
        log_warn "Security issues found: $issues"
    fi
}

#===============================================================================
# COMMON ISSUES CHECK
#===============================================================================

check_common_issues() {
    local issues=0

    # Check for TODO comments
    TODO_COUNT=$(grep -r "TODO" . --include="*.js" --include="*.ts" --include="*.py" --include="*.sh" 2>/dev/null | grep -v "node_modules" | wc -l)
    if [ $TODO_COUNT -gt 0 ]; then
        log_warn "Found $TODO_COUNT TODO comments"
        issues=$((issues + 1))
    fi

    # Check for FIXME comments
    FIXME_COUNT=$(grep -r "FIXME" . --include="*.js" --include="*.ts" --include="*.py" --include="*.sh" 2>/dev/null | grep -v "node_modules" | wc -l)
    if [ $FIXME_COUNT -gt 0 ]; then
        log_warn "Found $FIXME_COUNT FIXME comments"
        issues=$((issues + 1))
    fi

    # Check for placeholder code
    if grep -r "placeholder" . --include="*.js" --include="*.ts" --include="*.py" -i 2>/dev/null | grep -v "node_modules" | wc -l | grep -q "[1-9]"; then
        log_warn "Found placeholder code"
        issues=$((issues + 1))
    fi

    METRICS[common_issues]=$issues
}

#===============================================================================
# AUTO-FIX
#===============================================================================

attempt_auto_fix() {
    log_info "Attempting auto-fix..."

    # Fix permissions
    find . -type f -name "*.sh" -exec chmod +x {} \;

    # Remove empty directories
    find . -type d -empty -delete 2>/dev/null || true

    # Fix line endings
    find . -type f \( -name "*.sh" -o -name "*.js" -o -name "*.py" \) -exec dos2unix {} \; 2>/dev/null || true

    log_success "Auto-fix attempted"
}

#===============================================================================
# QUALITY SCORING
#===============================================================================

calculate_quality_score() {
    log_info "Calculating quality score..."

    local score=100
    local deductions=0

    # Deduct for failed tests
    deductions=$((deductions + METRICS[tests_failed] * 5))

    # Deduct for security issues
    deductions=$((deductions + METRICS[security_issues] * 10))

    # Deduct for common issues
    deductions=$((deductions + METRICS[common_issues] * 3))

    # Deduct for TODO/FIXME
    deductions=$((deductions + TODO_COUNT * 2))
    deductions=$((deductions + FIXME_COUNT * 5))

    # Ensure non-negative
    score=$((score - deductions))
    [ $score -lt 0 ] && score=0

    METRICS[quality_score]=$score

    if [ $score -ge 90 ]; then
        log_success "Quality Score: $score/100 (A - Trusted)"
    elif [ $score -ge 80 ]; then
        log_success "Quality Score: $score/100 (B - Reliable)"
    elif [ $score -ge 70 ]; then
        log_warn "Quality Score: $score/100 (C - Watch)"
    elif [ $score -ge 60 ]; then
        log_error "Quality Score: $score/100 (D - Shaky)"
    else
        log_error "Quality Score: $score/100 (F - Quarantine)"
    fi
}

#===============================================================================
# GENERATE REPORT
#===============================================================================

generate_report() {
    local report_file="${OUTPUT_FILE:-/tmp/test-report-$$.json}"

    log_info "Generating report: $report_file"

    cat > "$report_file" << EOF
{
    "version": "${VERSION}",
    "timestamp": "$(date -Iseconds)",
    "package": "${PACKAGE_FILE}",
    "package_type": "${PACKAGE_TYPE}",
    "work_dir": "${WORK_DIR}",
    "metrics": {
        "extract_time": ${METRICS[extract_time]},
        "install_time": ${METRICS[install_time]},
        "test_time": ${METRICS[test_time]},
        "total_time": $((METRICS[extract_time] + METRICS[install_time] + METRICS[test_time])),
        "files_count": ${METRICS[files_count]:-0},
        "dirs_count": ${METRICS[dirs_count]:-0},
        "total_size": "${METRICS[total_size]:-unknown}",
        "tests_passed": ${METRICS[tests_passed]:-0},
        "tests_failed": ${METRICS[tests_failed]:-0},
        "security_issues": ${METRICS[security_issues]:-0},
        "common_issues": ${METRICS[common_issues]:-0},
        "quality_score": ${METRICS[quality_score]:-0}
    },
    "quality_grade": "$([ ${METRICS[quality_score]:-0} -ge 90 ] && echo "A" || [ ${METRICS[quality_score]:-0} -ge 80 ] && echo "B" || [ ${METRICS[quality_score]:-0} -ge 70 ] && echo "C" || [ ${METRICS[quality_score]:-0} -ge 60 ] && echo "D" || echo "F")",
    "todo_count": ${TODO_COUNT:-0},
    "fixme_count": ${FIXME_COUNT:-0},
    "passed": $([ ${METRICS[tests_failed]:-0} -eq 0 ] && echo "true" || echo "false")
}
EOF

    echo "$report_file"
}

#===============================================================================
# SUMMARY
#===============================================================================

print_summary() {
    echo ""
    echo "=============================================="
    echo "  TEST HARNESS SUMMARY"
    echo "=============================================="
    echo ""
    echo "  Package:     $PACKAGE_FILE"
    echo "  Type:        ${PACKAGE_TYPE:-unknown}"
    echo "  Files:       ${METRICS[files_count]:-0}"
    echo "  Size:        ${METRICS[total_size]:-unknown}"
    echo ""
    echo "  TIMING:"
    echo "    Extract:   ${METRICS[extract_time]}s"
    echo "    Install:   ${METRICS[install_time]}s"
    echo "    Tests:     ${METRICS[test_time]}s"
    echo "    Total:     $((METRICS[extract_time] + METRICS[install_time] + METRICS[test_time]))s"
    echo ""
    echo "  RESULTS:"
    echo "    Tests:     ${METRICS[tests_passed]:-0} passed, ${METRICS[tests_failed]:-0} failed"
    echo "    Security:  ${METRICS[security_issues]:-0} issues"
    echo "    Quality:   ${METRICS[quality_score]:-0}/100"
    echo ""
    echo "=============================================="

    if [ ${METRICS[tests_failed]:-0} -eq 0 ] && [ ${METRICS[quality_score]:-0} -ge 70 ]; then
        echo -e "  ${GREEN}✓ ALL TESTS PASSED${NC}"
        echo "=============================================="
        return 0
    else
        echo -e "  ${RED}✗ TESTS FAILED${NC}"
        echo "=============================================="
        return 1
    fi
}

#===============================================================================
# CLEANUP
#===============================================================================

cleanup() {
    if [ -d "$WORK_DIR" ] && [[ "$WORK_DIR" == /tmp/* ]]; then
        log_debug "Cleaning up work directory..."
        rm -rf "$WORK_DIR" 2>/dev/null || true
    fi
}

trap cleanup EXIT

#===============================================================================
# MAIN
#===============================================================================

main() {
    echo ""
    echo "=============================================="
    echo "  R&D RESEARCH FLEET - TEST HARNESS v${VERSION}"
    echo "=============================================="
    echo ""

    local start_total=$(date +%s)

    # Parse arguments
    parse_args "$@"

    # Extract
    if [ "$TEST_ONLY" = false ]; then
        extract_package "$PACKAGE_FILE"
        analyze_contents
        run_install
    else
        log_info "Test-only mode (skipping extract/install)"
    fi

    # Test
    run_tests

    # Score
    calculate_quality_score

    local end_total=$(date +%s)
    METRICS[total_time]=$((end_total - start_total))

    # Report
    generate_report
    print_summary

    exit $?
}

# Run
main "$@"
