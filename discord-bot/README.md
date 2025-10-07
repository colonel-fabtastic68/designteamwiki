# 49ers Racing Discord Bot

Automatically scrapes Discord messages and stores them in Pinecone for AI-powered search.

## Features

- 🤖 Listens to all Discord messages in real-time
- 📝 Automatically stores messages in Pinecone vector database
- 🔍 Enables AI-powered search through Discord history
- 🔄 Auto-restart on failure
- 📊 Built-in commands (!search, !stats, !ping)

## Quick Start

### 1. Install Dependencies

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment

Your `.env` file is already configured with:
- Discord bot token
- OpenAI API key
- Pinecone credentials

### 3. Run the Bot

**Option A: Foreground (for testing)**
```bash
python bot.py
```

**Option B: Background (keeps running)**
```bash
./start_bot_background.sh
```

**Option C: Always running (survives restarts)**

See `DEPLOYMENT.md` for full setup guide.

## Bot Commands

- `!search <query>` - Search the knowledge base
- `!stats` - Show Pinecone database statistics
- `!ping` - Check bot responsiveness

## How It Works

1. Bot connects to Discord with message intent enabled
2. For each message, it:
   - Generates an embedding using OpenAI
   - Stores the embedding + metadata in Pinecone
   - Logs the action
3. Messages are instantly searchable via the web chat interface

## File Structure

```
discord-bot/
├── bot.py                        # Main bot code
├── requirements.txt              # Python dependencies
├── .env                          # API keys (DO NOT COMMIT)
├── run_bot.sh                    # Auto-restart runner
├── start_bot_background.sh       # Start in background
├── stop_bot.sh                   # Stop background bot
├── com.49ersracing.discordbot.plist # macOS LaunchAgent
├── DEPLOYMENT.md                 # Full deployment guide
└── README.md                     # This file
```

## Management

### Start Bot
```bash
./start_bot_background.sh
```

### Stop Bot
```bash
./stop_bot.sh
```

### View Logs
```bash
tail -f bot_output.log
tail -f discord_bot.log
```

### Check Status
```bash
# Check if process is running
ps aux | grep bot.py

# Or check PID file
cat bot.pid
```

## Integration with Web Chat

The bot stores messages in the **same Pinecone index** (`clu-discord`) that the Flask API reads from. This means:

1. Bot scrapes Discord → stores in Pinecone
2. User asks question on website → Flask API queries Pinecone
3. GPT generates response based on Discord messages
4. User gets answer with source citations

## Deployment Options

See `DEPLOYMENT.md` for detailed guides on:

1. **macOS LaunchAgent** - Run always on your Mac
2. **Google Cloud** - Run 24/7 on cloud server (~$6/mo)
3. **Docker** - Containerized deployment
4. **PM2** - Process manager for Node.js

## Troubleshooting

### Bot won't start
- Check `.env` has all required variables
- Verify API keys are valid
- Check Python version (need 3.8+)

### Messages not being stored
- Verify Pinecone index exists
- Check OpenAI API key is valid
- Look for errors in `discord_bot.log`

### Bot keeps crashing
- Check Discord bot permissions
- Ensure Message Content Intent is enabled
- Review error logs

## Discord Bot Setup

If you need to recreate the bot in Discord Developer Portal:

1. Go to https://discord.com/developers/applications
2. Create New Application
3. Go to "Bot" section
4. Enable these intents:
   - MESSAGE CONTENT INTENT ✅
   - SERVER MEMBERS INTENT (optional)
   - MESSAGE CONTENT INTENT (required)
5. Copy bot token to `.env`
6. Generate invite URL in OAuth2 → URL Generator:
   - Scopes: `bot`
   - Bot Permissions: `Read Messages/View Channels`, `Send Messages`
7. Use URL to add bot to your server

## Monitoring

### Check recent activity
```bash
tail -20 discord_bot.log
```

### Count messages stored today
```bash
grep "$(date +%Y-%m-%d)" discord_bot.log | grep "Stored message" | wc -l
```

### View Pinecone stats
```bash
curl http://localhost:5001/api/stats
```

## Security

- Never commit `.env` to git
- Rotate API keys periodically  
- Use Secret Manager in production
- Limit bot permissions to minimum required

## Cost

- Discord bot: **Free**
- OpenAI embeddings: ~$0.02 per 1000 messages
- Pinecone storage: Varies by plan
- **Total**: Negligible for typical usage

## Support

For issues:
1. Check logs first
2. Verify all API keys
3. Ensure bot has proper Discord permissions
4. Review `DEPLOYMENT.md` for deployment-specific issues

---

Built for 49ers Racing Formula SAE Team by Baker Cobb

