# Google Cloud Deployment Guide

Deploy both the Flask API and Discord bot to Google Cloud for 24/7 operation.

## Prerequisites

1. Google Cloud project (you already have this for your website)
2. gcloud CLI installed and authenticated
3. Billing enabled on your project

## Quick Deploy (All-in-One)

```bash
# Run this script to deploy everything
./deploy_to_gcloud.sh
```

## Manual Deployment

### Step 1: Set Your Project

```bash
# Set your project ID
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### Step 2: Store Secrets

```bash
# Store API keys securely
echo -n "YOUR_OPENAI_KEY" | gcloud secrets create openai-api-key --data-file=-
echo -n "YOUR_PINECONE_KEY" | gcloud secrets create pinecone-api-key --data-file=-
echo -n "YOUR_DISCORD_TOKEN" | gcloud secrets create discord-token --data-file=-

# Grant access to Cloud Run
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding openai-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding pinecone-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding discord-token \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Step 3: Deploy Flask Backend API

```bash
cd backend

# Deploy to Cloud Run
gcloud run deploy discord-knowledge-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets OPENAI_API_KEY=openai-api-key:latest,PINECONE_API_KEY=pinecone-api-key:latest \
  --set-env-vars PINECONE_INDEX_NAME=clu-discord,FLASK_ENV=production \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10
```

**Copy the API URL** from the output (e.g., `https://discord-knowledge-api-xxxxx.run.app`)

### Step 4: Deploy Discord Bot

```bash
cd ../discord-bot

# Deploy to Cloud Run (with always-on instance)
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
  --max-instances 1
```

### Step 5: Update Frontend

```bash
cd ..

# Rebuild frontend with production API URL
REACT_APP_CHAT_API_URL=https://discord-knowledge-api-xxxxx.run.app npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

## Cost Estimates

### Flask Backend API (Cloud Run)
- **Min instances: 0** (scales to zero when not in use)
- **Cost**: ~$0-5/month depending on usage
- Request pricing: $0.40 per million requests
- First 2 million requests/month are free

### Discord Bot (Cloud Run)
- **Min instances: 1** (always running to listen to Discord)
- **Cost**: ~$8-12/month
- 512MB RAM, 1 CPU, always on

### Total Monthly Cost: ~$10-15/month

## Architecture

```
Discord → Bot (Cloud Run) → Pinecone
                          ↓
Users → React (Firebase) → Flask API (Cloud Run) → Pinecone → OpenAI
```

## Management Commands

### View Logs

```bash
# Flask API logs
gcloud run logs read discord-knowledge-api --region us-central1 --limit 50

# Discord bot logs
gcloud run logs read discord-bot --region us-central1 --limit 50

# Stream logs (follow)
gcloud run logs tail discord-bot --region us-central1
```

### Check Status

```bash
# List services
gcloud run services list

# Get API URL
gcloud run services describe discord-knowledge-api --region us-central1 --format="value(status.url)"
```

### Update Secrets

```bash
# Update OpenAI key
echo -n "NEW_KEY" | gcloud secrets versions add openai-api-key --data-file=-

# Cloud Run will automatically pick up new secret version
```

### Redeploy

```bash
# Backend
cd backend && gcloud run deploy discord-knowledge-api --source .

# Bot
cd discord-bot && gcloud run deploy discord-bot --source .
```

## Monitoring

### Set Up Alerts

1. Go to Cloud Console → Monitoring → Alerting
2. Create alert for:
   - High error rate
   - High latency (>2s)
   - Cost threshold

### Dashboard

```bash
# Open Cloud Console
gcloud console
```

Navigate to:
- **Cloud Run** to see services
- **Logs Explorer** to view logs
- **Monitoring** to see metrics

## Troubleshooting

### Bot not connecting to Discord

```bash
# Check logs
gcloud run logs tail discord-bot --region us-central1

# Verify secret
gcloud secrets versions access latest --secret=discord-token
```

### API returning errors

```bash
# Check logs
gcloud run logs tail discord-knowledge-api --region us-central1

# Test health endpoint
curl https://YOUR-API-URL.run.app/api/health
```

### High costs

1. Check Cloud Run metrics for unexpected traffic
2. Reduce Discord bot instance size if needed
3. Consider caching frequent queries

## Alternative: Compute Engine (Cheaper for Always-On)

If bot costs are too high, use a small VM instead:

```bash
# Create tiny VM (~$6/month)
gcloud compute instances create discord-bot-vm \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --image-family=debian-11 \
  --image-project=debian-cloud

# SSH and setup
gcloud compute ssh discord-bot-vm --zone=us-central1-a

# Then follow manual setup in discord-bot/DEPLOYMENT.md
```

## Security Best Practices

1. ✅ Use Secret Manager (not environment variables)
2. ✅ Restrict Flask API to specific origins
3. ✅ Set up Cloud Armor for DDoS protection (optional)
4. ✅ Enable VPC for internal communication
5. ✅ Rotate secrets regularly

## Next Steps

1. Deploy both services using commands above
2. Update frontend with production API URL
3. Test chat feature on live website
4. Set up monitoring alerts
5. Monitor costs in first week

---

Need help? Check logs first, then verify all secrets are set correctly.

