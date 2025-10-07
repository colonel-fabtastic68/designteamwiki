#!/bin/bash

# Stop Discord Bot

cd "$(dirname "$0")"

echo "Stopping Discord bot..."

if [ -f bot.pid ]; then
    PID=$(cat bot.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "Bot stopped (PID: $PID)"
        rm bot.pid
    else
        echo "Bot not running (stale PID file)"
        rm bot.pid
    fi
else
    echo "No PID file found, trying to kill by process name..."
    pkill -f "python.*bot.py"
    echo "Done"
fi

