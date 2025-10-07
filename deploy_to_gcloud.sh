#!/bin/bash

# Deploy Discord Knowledge Chat to Google Cloud
# This deploys both the Flask API and Discord bot

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Discord Knowledge Chat - Google Cloud Deployment${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: No Google Cloud project set${NC}"
    echo "Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo -e "${GREEN}Using project: $PROJECT_ID${NC}"
echo ""

# Prompt for secrets
echo -e "${YELLOW}Step 1: Setting up secrets...${NC}"
read -p "Do you want to create/update secrets? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Enter your API keys (they will be stored securely in Secret Manager):"
    echo ""
    
    read -p "OpenAI API Key: " OPENAI_KEY
    read -p "Pinecone API Key: " PINECONE_KEY
    read -p "Discord Bot Token: " DISCORD_TOKEN
    
    echo ""
    echo "Creating secrets..."
    
    # Create or update secrets
    echo -n "$OPENAI_KEY" | gcloud secrets create openai-api-key --data-file=- 2>/dev/null || \
    echo -n "$OPENAI_KEY" | gcloud secrets versions add openai-api-key --data-file=-
    
    echo -n "$PINECONE_KEY" | gcloud secrets create pinecone-api-key --data-file=- 2>/dev/null || \
    echo -n "$PINECONE_KEY" | gcloud secrets versions add pinecone-api-key --data-file=-
    
    echo -n "$DISCORD_TOKEN" | gcloud secrets create discord-token --data-file=- 2>/dev/null || \
    echo -n "$DISCORD_TOKEN" | gcloud secrets versions add discord-token --data-file=-
    
    echo -e "${GREEN}✓ Secrets created/updated${NC}"
    
    # Grant access
    PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
    for secret in openai-api-key pinecone-api-key discord-token; do
        gcloud secrets add-iam-policy-binding $secret \
            --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
            --role="roles/secretmanager.secretAccessor" \
            --quiet 2>/dev/null || true
    done
    
    echo -e "${GREEN}✓ Permissions granted${NC}"
else
    echo -e "${YELLOW}Skipping secret creation (assuming they already exist)${NC}"
fi

echo ""
echo -e "${YELLOW}Step 2: Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com --quiet
gcloud services enable run.googleapis.com --quiet
gcloud services enable secretmanager.googleapis.com --quiet
echo -e "${GREEN}✓ APIs enabled${NC}"

# Deploy Flask Backend
echo ""
echo -e "${YELLOW}Step 3: Deploying Flask Backend API...${NC}"
cd backend

gcloud run deploy discord-knowledge-api \
    --source . \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --set-secrets OPENAI_API_KEY=openai-api-key:latest,PINECONE_API_KEY=pinecone-api-key:latest \
    --set-env-vars PINECONE_INDEX_NAME=clu-discord,FLASK_ENV=production,PORT=8080 \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --timeout 60 \
    --quiet

API_URL=$(gcloud run services describe discord-knowledge-api --region us-central1 --format="value(status.url)")
echo ""
echo -e "${GREEN}✓ Flask API deployed!${NC}"
echo -e "${BLUE}API URL: $API_URL${NC}"

cd ..

# Deploy Discord Bot
echo ""
echo -e "${YELLOW}Step 4: Deploying Discord Bot...${NC}"
cd discord-bot

gcloud run deploy discord-bot \
    --source . \
    --platform managed \
    --region us-central1 \
    --no-allow-unauthenticated \
    --set-secrets OPENAI_API_KEY=openai-api-key:latest,PINECONE_API_KEY=pinecone-api-key:latest,DISCORD_TOKEN=discord-token:latest \
    --set-env-vars PINECONE_INDEX_NAME=clu-discord \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 1 \
    --max-instances 1 \
    --timeout 3600 \
    --quiet

echo -e "${GREEN}✓ Discord bot deployed!${NC}"

cd ..

# Summary
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}Deployment Complete! 🎉${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${YELLOW}Flask API URL:${NC} $API_URL"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Update your frontend .env with:"
echo "   REACT_APP_CHAT_API_URL=$API_URL"
echo ""
echo "2. Rebuild and deploy frontend:"
echo "   REACT_APP_CHAT_API_URL=$API_URL npm run build"
echo "   firebase deploy --only hosting"
echo ""
echo "3. Test the API:"
echo "   curl $API_URL/api/health"
echo ""
echo "4. View logs:"
echo "   gcloud run logs tail discord-bot --region us-central1"
echo "   gcloud run logs tail discord-knowledge-api --region us-central1"
echo ""
echo -e "${YELLOW}Estimated Monthly Cost:${NC} ~$10-15"
echo "  - Flask API: ~$0-5/month (scales to zero)"
echo "  - Discord Bot: ~$8-12/month (always on)"
echo ""
echo -e "${GREEN}Your Discord bot is now running 24/7! 🚀${NC}"

