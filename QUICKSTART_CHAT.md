# Quick Start: Discord Knowledge Chat

Get the Discord knowledge chat feature running in 5 minutes!

## Prerequisites

- Python 3.8+
- Node.js 16+
- OpenAI API key
- Pinecone API key and index with your Discord data

## Step 1: Backend Setup (2 minutes)

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOL
OPENAI_API_KEY=your_openai_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=discord-knowledge
FLASK_ENV=development
PORT=5000
EOL

# Edit the .env file with your actual keys
nano .env  # or use your preferred editor

# Start the server
python app.py
```

You should see: `Starting Flask server on port 5000`

## Step 2: Frontend Setup (1 minute)

Open a new terminal window:

```bash
# In the project root directory
# Create .env.local file for React
cat > .env.local << EOL
REACT_APP_CHAT_API_URL=http://localhost:5000
EOL

# Start React development server
npm start
```

The app will open at `http://localhost:3000`

## Step 3: Test It! (1 minute)

1. Navigate to the Dashboard
2. Look for the **purple chat icon** in the bottom right corner
3. Click it to open the chat
4. Try asking a question like:
   - "What is the team working on?"
   - "Tell me about the chassis design"
   - "What did [member name] say about [topic]?"

## Troubleshooting

### Backend won't start

1. Check Python version: `python --version` (need 3.8+)
2. Verify .env file has actual API keys (not placeholders)
3. Test Pinecone connection:
   ```bash
   python -c "from pinecone import Pinecone; pc = Pinecone(api_key='YOUR_KEY'); print(pc.list_indexes())"
   ```

### Chat shows "Failed to get response"

1. Verify backend is running: `curl http://localhost:5000/api/health`
2. Check browser console for errors (F12)
3. Check backend terminal for error messages

### "No relevant information found"

1. Verify your Pinecone index has data:
   ```bash
   curl http://localhost:5000/api/stats
   ```
2. Check the index name matches in your .env file

## Next Steps

- Read `DISCORD_CHAT_SETUP.md` for deployment instructions
- Add authentication to restrict access
- Implement rate limiting for production use
- Monitor costs in OpenAI and Pinecone dashboards

## Cost Estimate

- Development/Testing: ~$0.50/day with moderate use
- Production: ~$0.30-0.50 per 1000 queries

## Support

Check the logs in your backend terminal for detailed error messages.

