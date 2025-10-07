# 🚀 Discord Knowledge Chat - Deployment Status

**Last Updated**: October 7, 2025 - 05:30 AM PST

## ✅ ALL SYSTEMS OPERATIONAL

### Production Services

| Service | Status | URL | Details |
|---------|--------|-----|---------|
| **Discord Bot** | ✅ Running | Cloud Run (us-central1) | Revision: discord-bot-00006-dnj |
| **Flask API** | ✅ Running | https://discord-knowledge-api-320082173652.us-central1.run.app | Serving requests |
| **Frontend** | ✅ Live | https://freightlaw.web.app | Latest build deployed |
| **Pinecone DB** | ✅ Active | Index: clu-discord | 13+ vectors |

### Service Details

#### Discord Bot
- **Container**: Cloud Run (always-on, min-instances: 1)
- **Connected to**: Cobbland Discord Server
- **Channels**: #general, #electronics
- **Function**: Scrapes all messages → OpenAI embedding → Pinecone storage
- **Health Check**: https://discord-bot-320082173652.us-central1.run.app/health
- **Bot ID**: 1424956779107848253

#### Flask Backend API
- **Endpoints**:
  - `/api/health` - Health check
  - `/api/chat` - Chat with Discord knowledge base
  - `/api/stats` - Pinecone statistics
- **Tech Stack**: Python Flask, OpenAI, Pinecone
- **Model**: GPT-4o-mini for responses, text-embedding-3-small for vectors

#### Frontend
- **Tech**: React + Firebase Hosting
- **Component**: DiscordKnowledgeChat (purple chat icon, bottom-right)
- **Features**: Dark mode support, source citations, minimizable

#### Pinecone Database
- **Index**: clu-discord
- **Dimensions**: 1536
- **Current Vectors**: 13
- **Embedding Model**: text-embedding-3-small

---

## 🔧 Management Commands

### Check Bot Status
```bash
gcloud run services describe discord-bot --region us-central1 --project freightlaw
```

### View Bot Logs (Real-time)
```bash
gcloud run services logs tail discord-bot --region us-central1 --project freightlaw
```

### View Recent Bot Activity
```bash
gcloud run services logs read discord-bot --region us-central1 --project freightlaw --limit 20
```

### Check API Status
```bash
curl https://discord-knowledge-api-320082173652.us-central1.run.app/api/health
```

### Get Pinecone Stats
```bash
curl https://discord-knowledge-api-320082173652.us-central1.run.app/api/stats
```

### Test Chat API
```bash
curl -X POST https://discord-knowledge-api-320082173652.us-central1.run.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "what has the team been discussing?"}'
```

---

## 🔄 Restart Bot (if needed)
```bash
gcloud run services update discord-bot \
  --region us-central1 \
  --project freightlaw \
  --update-env-vars="RESTART_TIME=$(date +%s)"
```

---

## 💰 Monthly Costs

- Discord Bot (Cloud Run): ~$10/month (always-on)
- Flask API (Cloud Run): ~$2/month (scales to zero)
- **Total**: ~$12/month

---

## 📝 Important Notes

1. **Message Content Intent**: Must remain enabled in Discord Developer Portal
   - Go to: https://discord.com/developers/applications
   - Select your app → Bot → Privileged Gateway Intents
   - Ensure "MESSAGE CONTENT INTENT" is toggled ON

2. **All API Keys**: Stored in Google Cloud Secret Manager
   - DISCORD_TOKEN
   - PINECONE_API_KEY
   - OPENAI_API_KEY

3. **Automatic Processing**: 
   - Every Discord message is automatically processed within 2-3 seconds
   - No manual intervention required

4. **Frontend Environment**:
   - Production uses: `REACT_APP_CHAT_API_URL=https://discord-knowledge-api-320082173652.us-central1.run.app`
   - Set in `.env.local` for local development

---

## 🧪 Testing

### Test Discord → Pinecone Flow
1. Send message in Discord
2. Wait 5 seconds
3. Run: `gcloud run services logs read discord-bot --region us-central1 --project freightlaw --limit 5`
4. Should see: "Message received" → "Pinecone upsert" → "Stored message"

### Test Chat Interface
1. Open: https://freightlaw.web.app
2. Login to wiki
3. Click purple chat icon (bottom-right)
4. Ask: "what has the team been discussing?"
5. Should retrieve recent Discord messages

---

## 📂 Key Files

- `backend/app.py` - Flask API
- `backend/requirements.txt` - Python dependencies
- `discord-bot/bot.py` - Discord bot
- `discord-bot/requirements.txt` - Bot dependencies
- `src/components/DiscordKnowledgeChat.js` - React chat component

---

## 🚨 Troubleshooting

### Bot Not Receiving Messages
1. Check Message Content Intent (see Important Notes)
2. Restart bot: `gcloud run services update discord-bot ...`
3. Check logs for errors

### API Not Responding
1. Check service status: `gcloud run services describe discord-knowledge-api`
2. Check logs: `gcloud run services logs read discord-knowledge-api`

### Frontend Chat Not Working
1. Verify API URL in `.env.local` or build environment
2. Check browser console for errors
3. Verify API is responding: `curl .../api/health`

---

**System is fully operational and ready for 24/7 usage!** 🎉

