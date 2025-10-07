#!/bin/bash

# Start Discord Bot in Background
# This runs the bot in the background using nohup

cd "$(dirname "$0")"

echo "Starting Discord bot in background..."

# Kill any existing bot processes
pkill -f "python.*bot.py" 2>/dev/null

# Start bot in background
nohup ./run_bot.sh > bot_output.log 2>&1 &

PID=$!
echo "Bot started with PID: $PID"
echo $PID > bot.pid

echo "To view logs: tail -f bot_output.log"
echo "To stop bot: ./stop_bot.sh"

