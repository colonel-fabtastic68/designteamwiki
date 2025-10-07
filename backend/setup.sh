#!/bin/bash

# Discord Knowledge Chat Backend Setup Script
# This script helps you set up the backend for the first time

set -e

echo "================================================"
echo "Discord Knowledge Chat Backend Setup"
echo "================================================"
echo ""

# Check Python version
echo "Checking Python version..."
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
REQUIRED_VERSION="3.8"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Python 3.8+ is required. You have Python $PYTHON_VERSION"
    exit 1
fi
echo "✓ Python $PYTHON_VERSION detected"
echo ""

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi
echo ""

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate
echo "✓ Virtual environment activated"
echo ""

# Install dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt
echo "✓ Dependencies installed"
echo ""

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found!"
    echo ""
    read -p "Would you like to create one now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "Please enter your API keys:"
        echo ""
        
        read -p "OpenAI API Key: " OPENAI_KEY
        read -p "Pinecone API Key: " PINECONE_KEY
        read -p "Pinecone Index Name (default: discord-knowledge): " PINECONE_INDEX
        PINECONE_INDEX=${PINECONE_INDEX:-discord-knowledge}
        
        cat > .env << EOL
# OpenAI Configuration
OPENAI_API_KEY=$OPENAI_KEY

# Pinecone Configuration
PINECONE_API_KEY=$PINECONE_KEY
PINECONE_INDEX_NAME=$PINECONE_INDEX

# Flask Configuration
FLASK_ENV=development
PORT=5000
EOL
        
        echo ""
        echo "✓ .env file created"
    else
        echo ""
        echo "⚠️  Please create a .env file manually with your API keys"
        echo "   See backend/README.md for required variables"
        exit 1
    fi
else
    echo "✓ .env file exists"
fi
echo ""

# Test the setup
echo "================================================"
echo "Testing API..."
echo "================================================"
echo ""

echo "Starting Flask server in the background..."
python app.py > /dev/null 2>&1 &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 5

# Run tests
if command -v python3 &> /dev/null; then
    if [ -f "test_api.py" ]; then
        python3 test_api.py
        TEST_RESULT=$?
    else
        echo "⚠️  test_api.py not found, skipping tests"
        TEST_RESULT=0
    fi
else
    echo "⚠️  Python3 not found, skipping tests"
    TEST_RESULT=0
fi

# Stop the server
echo ""
echo "Stopping test server..."
kill $SERVER_PID 2>/dev/null || true
sleep 1

echo ""
echo "================================================"
echo "Setup Complete!"
echo "================================================"
echo ""

if [ $TEST_RESULT -eq 0 ]; then
    echo "Your backend is ready to use!"
    echo ""
    echo "To start the server:"
    echo "  1. Activate the virtual environment: source venv/bin/activate"
    echo "  2. Run the server: python app.py"
    echo ""
    echo "Then start your React app in a separate terminal:"
    echo "  cd .."
    echo "  npm start"
else
    echo "⚠️  Some tests failed. Please check the output above."
    echo ""
    echo "Common issues:"
    echo "  - Incorrect API keys in .env"
    echo "  - Pinecone index doesn't exist or has no data"
    echo "  - Network connectivity issues"
fi

echo ""
echo "For more information, see:"
echo "  - backend/README.md"
echo "  - QUICKSTART_CHAT.md"
echo "  - DISCORD_CHAT_SETUP.md"
echo ""

