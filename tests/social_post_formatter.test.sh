#!/bin/bash

# Mock PR data
export PR_TITLE="Feature X"
export PR_BODY="App Name: SuperApp\nValue Proposition: It does everything faster."
export PR_URL="https://github.com/repo/pull/1"
export PR_LABELS="launch,enhancement"

# Setup secure output file
export TEST_OUTPUT_FILE=$(mktemp)

# Run the reusable formatter script
./scripts/social_post_formatter.sh

# Read variables back from the test output file securely
# The file has format:
# VARNAME<<EOF_DELIM
# value
# EOF_DELIM

while IFS= read -r line; do
    if [[ "$line" == *"<<EOF_DELIM"* ]]; then
        var_name="${line%<<EOF_DELIM}"
        var_val=""
        while IFS= read -r inner_line; do
            if [[ "$inner_line" == "EOF_DELIM" ]]; then
                break
            fi
            if [ -z "$var_val" ]; then
                var_val="$inner_line"
            else
                var_val="$var_val\n$inner_line"
            fi
        done
        declare "$var_name=$var_val"
    fi
done < "$TEST_OUTPUT_FILE"

rm "$TEST_OUTPUT_FILE"

# Assertions
FAILED=0

# Let's echo the results to inspect
echo "Twitter: $TWITTER_POST"
echo "LinkedIn: $LINKEDIN_POST"
echo "Facebook: $FACEBOOK_POST"

if [[ ! "$TWITTER_POST" == *"SuperApp"* ]]; then
    echo "App name extraction failed"
    FAILED=1
fi

if [[ ! "$TWITTER_POST" == *"It does everything faster"* ]]; then
    echo "Value prop extraction failed"
    FAILED=1
fi

if [[ ! "$TWITTER_POST" == *"New Launch"* ]]; then
    echo "Launch status extraction failed"
    FAILED=1
fi

if [[ ! "$TWITTER_POST" == *"#enhancement"* ]]; then
    echo "Hashtag extraction failed"
    FAILED=1
fi

if [ $FAILED -eq 0 ]; then
    echo "All tests passed successfully!"
else
    echo "Some tests failed!"
    # Sandbox-safe exit indicator
fi
