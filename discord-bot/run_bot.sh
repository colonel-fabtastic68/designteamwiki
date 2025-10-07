#!/bin/bash

# Discord Bot Runner Script
# This script runs the bot with automatic restart on failure

cd "$(dirname "$0")"

# Colors for output
RED='\033[0:31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Discord Bot...${NC}"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/update dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
pip install -q -r requirements.txt

# Run bot with automatic restart
while true; do
    echo -e "${GREEN}[$(date)] Starting bot...${NC}"
    python bot.py
    
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo -e "${YELLOW}[$(date)] Bot stopped gracefully${NC}"
        break
    else
        echo -e "${RED}[$(date)] Bot crashed with exit code $EXIT_CODE${NC}"
        echo -e "${YELLOW}[$(date)] Restarting in 5 seconds...${NC}"
        sleep 5
    fi
done

