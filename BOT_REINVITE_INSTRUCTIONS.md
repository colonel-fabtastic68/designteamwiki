# 🚨 Bot Re-Invite Required

The bot isn't receiving messages because it was likely invited without the proper OAuth2 scopes.

## Quick Fix: Re-Invite the Bot

### Step 1: Get Your Bot's Application ID

1. Go to: https://discord.com/developers/applications
2. Click your bot application
3. Copy the **Application ID** (it's near the top)

### Step 2: Generate Invite Link

Use this URL format (replace `YOUR_APPLICATION_ID`):

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_APPLICATION_ID&permissions=76800&scope=bot%20applications.commands
```

**With your permissions (76800):**
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_APPLICATION_ID&permissions=76800&scope=bot%20applications.commands
```

### Step 3: Re-Invite the Bot

1. Open the URL above in your browser
2. Select your server ("Cobbland")
3. Click **Authorize**
4. Complete the CAPTCHA

### Step 4: Test

After re-inviting, send ANY message in a channel the bot can see.

Then check logs:
```bash
gcloud run services logs read discord-bot --region us-central1 --project freightlaw --limit 20
```

You should now see:
```
📨 Message received in #channel-name from your_name: your message...
```

---

## Alternative: Use Discord Developer Portal

1. Go to: https://discord.com/developers/applications
2. Click your bot
3. Go to **OAuth2 → URL Generator**
4. Check **SCOPES**:
   - ✅ `bot`
   - ✅ `applications.commands`
5. Check **BOT PERMISSIONS**:
   - ✅ Read Messages/View Channels
   - ✅ Send Messages  
   - ✅ Read Message History
6. Copy the generated URL at the bottom
7. Open in browser and re-authorize

---

## Why This Happened

When the bot was first invited, it might have been invited with just `bot` scope without `applications.commands`, or the OAuth2 invite didn't include proper intents. Re-inviting with the correct scopes fixes this.

The bot will keep its role and permissions, this just updates its OAuth2 authorization.

