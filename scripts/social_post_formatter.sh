#!/bin/bash

# A reusable formatting script for social media posts.
# Expects PR_TITLE, PR_BODY, PR_URL, and PR_LABELS in the environment.

# Default App Name to PR title
APP_NAME="${PR_TITLE}"

# Try to extract a specific App Name from the body if present (e.g. "App Name: MyCoolApp")
# Use 'printf' or avoid echo -e to prevent unintended escape sequence expansion
EXTRACTED_APP=$(printf "%b\n" "${PR_BODY}" | grep -i "^App Name:" | sed 's/^App Name:[[:space:]]*//i' | head -n 1 || true)
if [ -n "$EXTRACTED_APP" ]; then
   APP_NAME="$EXTRACTED_APP"
fi

# Default value prop
VALUE_PROP="Check out the new features and bug fixes."

# Try to extract Value Proposition from the body (e.g. "Value Proposition: Blazing fast.")
EXTRACTED_VP=$(printf "%b\n" "${PR_BODY}" | grep -i "^Value Proposition:" | sed 's/^Value Proposition:[[:space:]]*//i' | head -n 1 || true)
if [ -n "$EXTRACTED_VP" ]; then
   VALUE_PROP="$EXTRACTED_VP"
fi

# Launch Status logic based on labels or title keywords
LAUNCH_STATUS="Update"
if printf "%b\n" "${PR_LABELS}" | grep -iq "launch"; then
    LAUNCH_STATUS="Launch"
elif printf "%b\n" "${PR_TITLE}" | grep -iq "launch\|v1\.0"; then
    LAUNCH_STATUS="Launch"
fi

# Hashtags derived from labels
HASHTAGS="#GitHub #OpenSource"
IFS=',' read -ra LABEL_ARRAY <<< "${PR_LABELS}"
for label in "${LABEL_ARRAY[@]}"; do
   # Basic sanitation for hashtag: remove spaces and special characters
   clean_label=$(printf "%b\n" "$label" | sed 's/[^a-zA-Z0-9]//g')
   if [ -n "$clean_label" ]; then
       HASHTAGS="$HASHTAGS #$clean_label"
   fi
done

TWITTER_POST="🚀 New ${LAUNCH_STATUS}: ${APP_NAME} 🌟 Value: ${VALUE_PROP} 🔗 ${PR_URL} ${HASHTAGS}"
LINKEDIN_POST="🚀 We are excited to announce a new ${LAUNCH_STATUS}: ${APP_NAME}! 🌟 Value Proposition: ${VALUE_PROP} 🔗 View on GitHub: ${PR_URL} ${HASHTAGS} #Tech"
FACEBOOK_POST="🚀 We've just merged a new ${LAUNCH_STATUS}: ${APP_NAME}! 🎉 ${VALUE_PROP} 🔗 ${PR_URL} ${HASHTAGS}"

# If $GITHUB_OUTPUT is set, append to it using secure heredocs.
if [ -n "$GITHUB_OUTPUT" ]; then
    {
        echo "twitter_post<<EOF_DELIM"
        echo "$TWITTER_POST"
        echo "EOF_DELIM"

        echo "linkedin_post<<EOF_DELIM"
        echo "$LINKEDIN_POST"
        echo "EOF_DELIM"

        echo "facebook_post<<EOF_DELIM"
        echo "$FACEBOOK_POST"
        echo "EOF_DELIM"
    } >> "$GITHUB_OUTPUT"
else
    # In tests, we can write to a temporary file.
    if [ -n "$TEST_OUTPUT_FILE" ]; then
        {
            echo "TWITTER_POST<<EOF_DELIM"
            echo "$TWITTER_POST"
            echo "EOF_DELIM"

            echo "LINKEDIN_POST<<EOF_DELIM"
            echo "$LINKEDIN_POST"
            echo "EOF_DELIM"

            echo "FACEBOOK_POST<<EOF_DELIM"
            echo "$FACEBOOK_POST"
            echo "EOF_DELIM"
        } >> "$TEST_OUTPUT_FILE"
    fi
fi
