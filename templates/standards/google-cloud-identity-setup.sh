#!/bin/bash
# Google Cloud Identity & Workforce Identity Federation Setup Script
#
# This script automates the setup of Workforce Identity Federation with Google Cloud.
# It configures the workforce pool, provider, and enables required APIs.
#
# Prerequisites:
# - gcloud CLI installed and authenticated
# - Appropriate IAM permissions (Workforce Identity Admin, Project IAM Admin)
# - IdP metadata URL or configuration details
#
# Usage:
#   ./google-cloud-identity-setup.sh --project PROJECT_ID --idp [entra-oidc|entra-saml]
#
# References:
# - See docs/Master_Inventory/GOOGLE_CLOUD_IDENTITY_STANDARD.md for full context

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
PROJECT_ID=""
IDP_TYPE=""
WORKFORCE_POOL_ID="workforce-pool-1"
PROVIDER_ID="identity-provider-1"
LOCATION="global"

# Help function
show_help() {
    cat << EOF
Google Cloud Identity & Workforce Identity Federation Setup

Usage: $0 --project PROJECT_ID --idp IDP_TYPE [OPTIONS]

Required Arguments:
  --project PROJECT_ID        Google Cloud Project ID
  --idp IDP_TYPE             Identity provider type:
                             - entra-oidc: Microsoft Entra ID with OIDC
                             - entra-saml: Microsoft Entra ID with SAML

Optional Arguments:
  --pool-id POOL_ID          Workforce pool ID (default: workforce-pool-1)
  --provider-id PROVIDER_ID  Provider ID (default: identity-provider-1)
  --location LOCATION        Location (default: global)
  --help                     Show this help message

Examples:
  # Setup Microsoft Entra ID with OIDC
  $0 --project my-project-123 --idp entra-oidc

EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --project)
            PROJECT_ID="$2"
            shift 2
            ;;
        --idp)
            IDP_TYPE="$2"
            shift 2
            ;;
        --pool-id)
            WORKFORCE_POOL_ID="$2"
            shift 2
            ;;
        --provider-id)
            PROVIDER_ID="$2"
            shift 2
            ;;
        --location)
            LOCATION="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Unknown option $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Validate required arguments
if [[ -z "$PROJECT_ID" ]]; then
    echo -e "${RED}Error: --project is required${NC}"
    show_help
    exit 1
fi

if [[ -z "$IDP_TYPE" ]]; then
    echo -e "${RED}Error: --idp is required${NC}"
    show_help
    exit 1
fi

# Validate IDP type
case $IDP_TYPE in
    entra-oidc|entra-saml)
        ;;
    *)
        echo -e "${RED}Error: Invalid IDP type '$IDP_TYPE'${NC}"
        echo "Valid options: entra-oidc, entra-saml"
        exit 1
        ;;
esac

echo -e "${GREEN}=== Google Cloud Identity Setup ===${NC}"
echo "Project ID: $PROJECT_ID"
echo "IDP Type: $IDP_TYPE"
echo "Workforce Pool ID: $WORKFORCE_POOL_ID"
echo "Provider ID: $PROVIDER_ID"
echo ""

# Set active project
echo -e "${YELLOW}Setting active project...${NC}"
gcloud config set project "$PROJECT_ID"

# Enable required APIs
echo -e "${YELLOW}Enabling required APIs...${NC}"
gcloud services enable \
    iam.googleapis.com \
    cloudidentity.googleapis.com \
    iamcredentials.googleapis.com \
    sts.googleapis.com

echo -e "${GREEN}✓ APIs enabled${NC}"

# Create workforce pool
echo -e "${YELLOW}Creating workforce identity pool...${NC}"
if gcloud iam workforce-pools describe "$WORKFORCE_POOL_ID" --location="$LOCATION" &>/dev/null; then
    echo -e "${YELLOW}Workforce pool already exists, skipping creation${NC}"
else
    gcloud iam workforce-pools create "$WORKFORCE_POOL_ID" \
        --location="$LOCATION" \
        --description="Workforce Identity Pool for $IDP_TYPE" \
        --display-name="$WORKFORCE_POOL_ID"
    echo -e "${GREEN}✓ Workforce pool created${NC}"
fi

# Get attribute mappings based on IDP type
case $IDP_TYPE in
    entra-oidc)
        ATTRIBUTE_MAPPING="google.subject=assertion.email,google.groups=assertion.groups"
        echo ""
        echo -e "${YELLOW}Attribute Mapping for Microsoft Entra ID (OIDC):${NC}"
        echo "  google.subject = assertion.email"
        echo "  google.groups = assertion.groups"
        echo ""
        echo -e "${YELLOW}⚠️  Important: Configure group claim in Entra ID application${NC}"
        echo "  1. Go to Entra ID admin center → Enterprise Applications"
        echo "  2. Select your application"
        echo "  3. Go to Single sign-on → Attributes & Claims"
        echo "  4. Add group claim and select 'All groups'"
        echo ""
        ;;
    entra-saml)
        ATTRIBUTE_MAPPING="google.subject=assertion.attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'][0],google.groups=assertion.attributes['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups']"
        echo ""
        echo -e "${YELLOW}Attribute Mapping for Microsoft Entra ID (SAML):${NC}"
        echo "  google.subject = assertion.attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'][0]"
        echo "  google.groups = assertion.attributes['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups']"
        echo ""
        ;;
esac

# Prompt for IdP metadata
echo -e "${YELLOW}Creating workforce identity provider...${NC}"

# Check if provider already exists
if gcloud iam workforce-pools providers describe "$PROVIDER_ID" \
    --workforce-pool="$WORKFORCE_POOL_ID" \
    --location="$LOCATION" &>/dev/null; then
    echo -e "${YELLOW}Provider '$PROVIDER_ID' already exists, skipping creation${NC}"
else
    echo ""
    echo "To complete provider setup, you need your IdP configuration:"

    if [[ "$IDP_TYPE" == *"oidc"* ]]; then
        echo "  - Issuer URI"
        echo "  - Client ID"
        echo ""
        read -p "Enter Issuer URI: " ISSUER_URI
        read -p "Enter Client ID: " CLIENT_ID
        
        if [[ -z "$ISSUER_URI" ]] || [[ -z "$CLIENT_ID" ]]; then
            echo -e "${RED}Error: Issuer URI and Client ID are required${NC}"
            exit 1
        fi
        
        # Create OIDC provider
        gcloud iam workforce-pools providers create-oidc "$PROVIDER_ID" \
            --workforce-pool="$WORKFORCE_POOL_ID" \
            --location="$LOCATION" \
            --display-name="$PROVIDER_ID" \
            --description="OIDC provider for $IDP_TYPE" \
            --issuer-uri="$ISSUER_URI" \
            --client-id="$CLIENT_ID" \
            --attribute-mapping="$ATTRIBUTE_MAPPING"
        
    else
        echo "  - IdP Metadata URL (or path to downloaded XML file)"
        echo ""
        read -p "Enter IdP Metadata URL or file path: " IDP_METADATA
        
        if [[ -z "$IDP_METADATA" ]]; then
            echo -e "${RED}Error: IdP metadata is required${NC}"
            exit 1
        fi
        
        # Create SAML provider
        if [[ "$IDP_METADATA" == http* ]]; then
            # URL provided
            gcloud iam workforce-pools providers create-saml "$PROVIDER_ID" \
                --workforce-pool="$WORKFORCE_POOL_ID" \
                --location="$LOCATION" \
                --display-name="$PROVIDER_ID" \
                --description="SAML provider for $IDP_TYPE" \
                --idp-metadata-url="$IDP_METADATA" \
                --attribute-mapping="$ATTRIBUTE_MAPPING"
        else
            # File path provided
            gcloud iam workforce-pools providers create-saml "$PROVIDER_ID" \
                --workforce-pool="$WORKFORCE_POOL_ID" \
                --location="$LOCATION" \
                --display-name="$PROVIDER_ID" \
                --description="SAML provider for $IDP_TYPE" \
                --idp-metadata-path="$IDP_METADATA" \
                --attribute-mapping="$ATTRIBUTE_MAPPING"
        fi
    fi

    echo -e "${GREEN}✓ Workforce identity provider created${NC}"
    echo ""
fi

# Get provider resource name
PROVIDER_NAME="locations/$LOCATION/workforcePools/$WORKFORCE_POOL_ID/providers/$PROVIDER_ID"

echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
echo "Workforce Pool ID: $WORKFORCE_POOL_ID"
echo "Provider ID: $PROVIDER_ID"
echo "Provider Resource Name: $PROVIDER_NAME"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Configure your IdP application to use this provider"
echo "2. Test authentication with a pilot user"
echo "3. Configure IAM bindings to grant access to Google Cloud resources"

if [[ "$IDP_TYPE" == "entra-"* ]]; then
    echo "4. Consider setting up SCIM provisioning for automatic user/group sync"
    echo "   See: https://cloud.google.com/iam/docs/configure-scim-ms-entra"
fi

echo ""
echo "Reference: docs/Master_Inventory/GOOGLE_CLOUD_IDENTITY_STANDARD.md"
echo ""
