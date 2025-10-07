# Discord Bot Troubleshooting

## Bot Not Receiving Messages

If the bot isn't receiving messages, check these settings:

### 1. Discord Developer Portal - Privileged Gateway Intents

**CRITICAL**: The bot needs the "Message Content Intent" enabled.

1. Go to: https://discord.com/developers/applications
2. Select your application: **CLU 1.0** (or your bot's name)
3. Go to **Bot** section (left sidebar)
4. Scroll down to **Privileged Gateway Intents**
5. **ENABLE these intents**:
   - ✅ **MESSAGE CONTENT INTENT** (MOST IMPORTANT!)
   - ✅ **SERVER MEMBERS INTENT**
   - ✅ **PRESENCE INTENT** (optional)
6. Click **Save Changes** at the bottom

### 2. Bot Permissions in Discord Server

The bot needs these permissions in your Discord server:

1. Go to your Discord server settings
2. Go to **Roles**
3. Find the bot's role
4. Ensure it has:
   - ✅ **Read Messages/View Channels**
   - ✅ **Send Messages**
   - ✅ **Read Message History**
   - ✅ **Use Slash Commands** (optional)

### 3. Channel Permissions

If the bot works in some channels but not others:

1. Right-click the channel → **Edit Channel**
2. Go to **Permissions**
3. Check if the bot's role is **allowed** to:
   - ✅ View Channel
   - ✅ Read Message History
   - ✅ Send Messages

### 4. Check Bot is Online

1. In Discord, check if the bot shows as **Online** (green circle)
2. If offline or away, the bot isn't running

### 5. Test Commands

In Discord, try:
- `!ping` - Bot should respond with "Pong!"
- `!stats` - Shows Pinecone database stats

### 6. Check Logs

```bash
# View latest bot logs
gcloud run services logs read discord-bot --region us-central1 --project freightlaw --limit 50

# Watch logs in real-time
gcloud run services logs tail discord-bot --region us-central1 --project freightlaw
```

### Common Issues

#### Bot receives messages in #general but not other channels
- Check channel-specific permissions (step 3 above)
- Ensure the bot can "View Channel" and "Read Messages"

#### Bot was working, then stopped
- **MESSAGE CONTENT INTENT** might have been disabled
- Bot token might have been regenerated (need to update secret)
- Bot might have been kicked/banned from server

#### Bot shows online but doesn't respond
- Check if MESSAGE CONTENT INTENT is enabled
- Restart the bot: redeploy on Cloud Run

---

## Quick Fix Checklist

1. ☐ MESSAGE CONTENT INTENT enabled in Discord Developer Portal
2. ☐ Bot shows as Online in Discord
3. ☐ Bot has proper role permissions
4. ☐ Channel permissions allow bot access
5. ☐ Try `!ping` command to verify bot responds
6. ☐ Check Cloud Run logs for errors

