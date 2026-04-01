#!/bin/bash
# ============================================================
# REVVEL STANDARD CI/CD BOOTSTRAP SCRIPT
# ============================================================
# Run this script from the root of your new app repository
# to automatically copy the deploy templates and configure them.
#
# Usage: ./bootstrap-deploy.sh <app_name> <droplet_ip> <app_dir>
# Example: ./bootstrap-deploy.sh growlingeyes 164.90.148.7 growlingeyes
# ============================================================

set -e

APP_NAME=$1
DROPLET_IP=$2
APP_DIR_NAME=$3

if [ -z "$APP_NAME" ] || [ -z "$DROPLET_IP" ] || [ -z "$APP_DIR_NAME" ]; then
  echo "Usage: ./bootstrap-deploy.sh <app_name> <droplet_ip> <app_dir_name>"
  echo "Example: ./bootstrap-deploy.sh growlingeyes 164.90.148.7 growlingeyes"
  exit 1
fi

echo "🚀 Bootstrapping Revvel CI/CD Pipeline for $APP_NAME..."

# Create workflows directory
mkdir -p .github/workflows

# Download the latest standard deploy.yml template
echo "📥 Downloading deploy.yml template..."
curl -s https://raw.githubusercontent.com/midnghtsapphire/revvel-standards/main/templates/cicd/deploy.yml > .github/workflows/deploy.yml

# Download the manual deploy.sh template
echo "📥 Downloading deploy.sh template..."
curl -s https://raw.githubusercontent.com/midnghtsapphire/revvel-standards/main/templates/cicd/deploy.sh > deploy.sh
chmod +x deploy.sh

# Replace placeholders in deploy.yml
echo "⚙️ Configuring deploy.yml..."
sed -i.bak "s/YOUR_APP_NAME/$APP_NAME/g" .github/workflows/deploy.yml
sed -i.bak "s/YOUR_DROPLET_IP/$DROPLET_IP/g" .github/workflows/deploy.yml
sed -i.bak "s/YOUR_APP_DIR/$APP_DIR_NAME/g" .github/workflows/deploy.yml
rm -f .github/workflows/deploy.yml.bak

# Replace placeholders in deploy.sh
echo "⚙️ Configuring deploy.sh..."
sed -i.bak "s/YOUR_APP_NAME/$APP_NAME/g" deploy.sh
sed -i.bak "s/YOUR_DROPLET_IP/$DROPLET_IP/g" deploy.sh
sed -i.bak "s/YOUR_APP/$APP_DIR_NAME/g" deploy.sh
rm -f deploy.sh.bak

echo ""
echo "✅ CI/CD Pipeline files generated successfully!"
echo ""
echo "NEXT STEPS:"
echo "1. Go to your GitHub repo settings: Settings -> Secrets -> Actions"
echo "2. Add a new secret named SSH_PRIVATE_KEY containing your droplet's deploy key"
echo "3. Add any other required secrets (e.g., DATABASE_URL, STRIPE_SECRET_KEY)"
echo "4. Commit and push these files:"
echo "   git add .github/workflows/deploy.yml deploy.sh"
echo "   git commit -m \"ci: add standard revvel deploy pipeline\""
echo "   git push origin main"
echo ""
echo "Every push to main will now auto-deploy to $DROPLET_IP."
