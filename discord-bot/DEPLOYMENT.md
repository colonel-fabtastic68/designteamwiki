# Discord Bot Deployment Guide

This guide explains how to keep your Discord bot running perpetually to continuously scrape and index messages in Pinecone.

## Quick Start (Local Testing)

```bash
cd discord-bot

# Make scripts executable
chmod +x run_bot.sh start_bot_background.sh stop_bot.sh

# Start the bot
./start_bot_background.sh

# View logs
tail -f bot_output.log

# Stop the bot
./stop_bot.sh
```

## Option 1: macOS Launch Agent (Always Running on Mac)

This keeps the bot running on your Mac, even after restarts.

### Setup

1. **Edit the plist file** with your correct username path if needed:
   ```bash
   nano com.49ersracing.discordbot.plist
   ```

2. **Make run script executable**:
   ```bash
   chmod +x run_bot.sh
   ```

3. **Copy to LaunchAgents**:
   ```bash
   cp com.49ersracing.discordbot.plist ~/Library/LaunchAgents/
   ```

4. **Load the agent**:
   ```bash
   launchctl load ~/Library/LaunchAgents/com.49ersracing.discordbot.plist
   ```

5. **Start it**:
   ```bash
   launchctl start com.49ersracing.discordbot
   ```

### Management Commands

```bash
# Check status
launchctl list | grep discordbot

# View logs
tail -f ~/Documents/Projects/DesignSite/discord-bot/bot_output.log

# Stop
launchctl stop com.49ersracing.discordbot

# Start
launchctl start com.49ersracing.discordbot

# Unload (disable autostart)
launchctl unload ~/Library/LaunchAgents/com.49ersracing.discordbot.plist

# Reload after editing plist
launchctl unload ~/Library/LaunchAgents/com.49ersracing.discordbot.plist
launchctl load ~/Library/LaunchAgents/com.49ersracing.discordbot.plist
```

## Option 2: Google Cloud Compute Engine (Recommended for Production)

Run the bot 24/7 on a cheap cloud server.

### Setup

1. **Create a Compute Engine instance**:
   ```bash
   gcloud compute instances create discord-bot \
     --zone=us-central1-a \
     --machine-type=e2-micro \
     --image-family=debian-11 \
     --image-project=debian-cloud \
     --boot-disk-size=10GB
   ```

2. **SSH into the instance**:
   ```bash
   gcloud compute ssh discord-bot --zone=us-central1-a
   ```

3. **Install dependencies**:
   ```bash
   sudo apt-get update
   sudo apt-get install -y python3 python3-pip python3-venv git
   ```

4. **Clone or copy your bot**:
   ```bash
   # Option A: Clone from git
   git clone YOUR_REPO_URL
   cd discord-bot
   
   # Option B: Copy files manually
   # Use gcloud compute scp to copy files
   ```

5. **Create .env file with your credentials**:
   ```bash
   cat > .env << EOL
   DISCORD_TOKEN=your_token_here
   OPENAI_API_KEY=your_key_here
   PINECONE_API_KEY=your_key_here
   PINECONE_INDEX_NAME=clu-discord
   EOL
   ```

6. **Set up virtual environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

7. **Create systemd service**:
   ```bash
   sudo nano /etc/systemd/system/discord-bot.service
   ```
   
   Add this content:
   ```ini
   [Unit]
   Description=49ers Racing Discord Bot
   After=network.target
   
   [Service]
   Type=simple
   User=YOUR_USERNAME
   WorkingDirectory=/home/YOUR_USERNAME/discord-bot
   Environment="PATH=/home/YOUR_USERNAME/discord-bot/venv/bin"
   ExecStart=/home/YOUR_USERNAME/discord-bot/venv/bin/python bot.py
   Restart=always
   RestartSec=10
   
   [Install]
   WantedBy=multi-user.target
   ```

8. **Enable and start service**:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable discord-bot
   sudo systemctl start discord-bot
   ```

9. **Check status**:
   ```bash
   sudo systemctl status discord-bot
   ```

10. **View logs**:
    ```bash
    sudo journalctl -u discord-bot -f
    ```

### Cost
- **e2-micro**: ~$6-7/month (always free tier eligible for 1 instance)
- Runs 24/7 perpetually

## Option 3: Docker with Restart Policy

### Create Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY bot.py .
COPY .env .

CMD ["python", "bot.py"]
```

### Build and run

```bash
# Build
docker build -t discord-bot .

# Run with auto-restart
docker run -d \
  --name discord-bot \
  --restart unless-stopped \
  discord-bot

# View logs
docker logs -f discord-bot

# Stop
docker stop discord-bot

# Start
docker start discord-bot
```

## Option 4: PM2 Process Manager

Great for keeping multiple processes running.

### Setup

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOL
module.exports = {
  apps: [{
    name: 'discord-bot',
    script: 'bot.py',
    interpreter: 'python3',
    cwd: '/Users/bakercobb/Documents/Projects/DesignSite/discord-bot',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      PYTHONUNBUFFERED: '1'
    }
  }]
};
EOL

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot (macOS)
pm2 startup

# View logs
pm2 logs discord-bot

# Monitor
pm2 monit

# Stop
pm2 stop discord-bot

# Restart
pm2 restart discord-bot
```

## Monitoring

### Check if bot is running

```bash
# macOS (LaunchAgent)
launchctl list | grep discordbot

# Linux (systemd)
sudo systemctl status discord-bot

# Docker
docker ps | grep discord-bot

# PM2
pm2 status
```

### View logs

```bash
# Local files
tail -f discord-bot/bot_output.log
tail -f discord-bot/discord_bot.log

# System logs (Linux)
sudo journalctl -u discord-bot -f

# Docker
docker logs -f discord-bot

# PM2
pm2 logs discord-bot
```

## Troubleshooting

### Bot keeps restarting

1. Check logs for errors
2. Verify all API keys are correct in .env
3. Make sure Discord bot has proper permissions
4. Check internet connectivity

### Bot not connecting to Discord

- Verify DISCORD_TOKEN is correct
- Check bot permissions in Discord Developer Portal
- Ensure intents are enabled (Message Content Intent)

### Messages not being stored in Pinecone

- Verify PINECONE_API_KEY is correct
- Check Pinecone index exists
- Verify OPENAI_API_KEY is valid
- Check logs for embedding errors

## Recommended Setup

For **development/testing**: Use `start_bot_background.sh` script

For **production on your Mac**: Use macOS LaunchAgent

For **production 24/7**: Use Google Cloud Compute Engine with systemd

## Security Notes

1. Never commit `.env` files to git
2. Use `.gitignore` to exclude:
   - `.env`
   - `*.log`
   - `venv/`
   - `bot.pid`
3. Rotate API keys periodically
4. Use Secret Manager in production

## Cost Comparison

| Method | Cost | Uptime | Reliability |
|--------|------|--------|-------------|
| Local Mac | Free | Only when Mac is on | Medium |
| LaunchAgent | Free | Always (when Mac on) | Good |
| GCP e2-micro | ~$6/mo | 24/7 | Excellent |
| Docker local | Free | When host is on | Good |
| PM2 local | Free | When host is on | Good |

## Next Steps

1. Choose your deployment method
2. Set it up following the guide above
3. Monitor logs to ensure messages are being indexed
4. Test the chat feature on your website
5. Scale up by adding more Discord servers/channels

For questions or issues, check the logs first!

