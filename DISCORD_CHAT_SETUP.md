# Discord Knowledge Chat Integration

This document explains how to set up and deploy the Discord knowledge chat feature that allows users to query your Discord history using AI.

## Architecture Overview

The system consists of three main components:

1. **Discord Bot** (Python) - Scrapes Discord messages and stores embeddings in Pinecone
2. **Backend API** (Python Flask) - Handles chat requests and queries Pinecone/OpenAI
3. **Frontend Chat UI** (React) - User interface for the chat feature

## Prerequisites

- Python 3.8+
- Node.js 16+
- Pinecone account with an index created
- OpenAI API key
- Google Cloud account (for deployment)

## Local Development Setup

### Step 1: Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create a virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create a `.env` file** in the `backend` directory with your credentials:
   ```env
   # OpenAI Configuration
   OPENAI_API_KEY=sk-your-openai-api-key-here
   
   # Pinecone Configuration
   PINECONE_API_KEY=your-pinecone-api-key-here
   PINECONE_INDEX_NAME=discord-knowledge
   
   # Flask Configuration
   FLASK_ENV=development
   PORT=5000
   ```

5. **Start the Flask server:**
   ```bash
   python app.py
   ```
   
   The API will be available at `http://localhost:5000`

### Step 2: Frontend Setup

1. **In the project root directory, create a `.env` file** (or `.env.local`):
   ```env
   REACT_APP_CHAT_API_URL=http://localhost:5000
   ```

2. **Start the React development server:**
   ```bash
   npm start
   ```
   
   The app will be available at `http://localhost:3000`

3. **Test the integration:**
   - Navigate to the Dashboard
   - Click the purple chat icon in the bottom right corner
   - Try asking a question about your Discord history

## API Endpoints

### Health Check
```
GET /api/health
```
Returns the health status of the API.

### Chat
```
POST /api/chat
Content-Type: application/json

{
  "message": "Your question here"
}
```

Response:
```json
{
  "response": "AI-generated response",
  "sources": [
    {
      "author": "Username",
      "channel": "channel-name",
      "timestamp": "2024-01-01T12:00:00",
      "relevance": 85.5
    }
  ]
}
```

### Statistics
```
GET /api/stats
```
Returns Pinecone index statistics.

## Deployment to Google Cloud

### Option 1: Cloud Run (Recommended)

#### Deploy Backend

1. **Create a `Dockerfile` in the backend directory:**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Use gunicorn for production
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 app:app
```

2. **Create a `.dockerignore` file:**
```
venv/
*.pyc
__pycache__/
.env
.env.local
```

3. **Deploy to Cloud Run:**
```bash
cd backend

# Set your project ID
gcloud config set project YOUR_PROJECT_ID

# Build and deploy
gcloud run deploy discord-knowledge-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars OPENAI_API_KEY=your-key-here,PINECONE_API_KEY=your-key-here,PINECONE_INDEX_NAME=discord-knowledge
```

**IMPORTANT:** It's better to use Secret Manager for sensitive data:

```bash
# Create secrets
echo -n "your-openai-key" | gcloud secrets create openai-api-key --data-file=-
echo -n "your-pinecone-key" | gcloud secrets create pinecone-api-key --data-file=-

# Deploy with secrets
gcloud run deploy discord-knowledge-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets OPENAI_API_KEY=openai-api-key:latest,PINECONE_API_KEY=pinecone-api-key:latest \
  --set-env-vars PINECONE_INDEX_NAME=discord-knowledge
```

4. **Note the deployed URL** (e.g., `https://discord-knowledge-api-xxxxx.run.app`)

#### Update Frontend Configuration

1. **Update your Firebase configuration** or build-time environment:
   ```bash
   # For production builds
   REACT_APP_CHAT_API_URL=https://discord-knowledge-api-xxxxx.run.app npm run build
   ```

2. **Update Firebase hosting configuration** (if needed) to allow the API domain.

### Option 2: App Engine

1. **Create `app.yaml` in the backend directory:**

```yaml
runtime: python311

env_variables:
  PINECONE_INDEX_NAME: "discord-knowledge"

# Use Secret Manager for sensitive data
env_variables:
  OPENAI_API_KEY: "your-key-here"
  PINECONE_API_KEY: "your-key-here"

automatic_scaling:
  min_instances: 0
  max_instances: 10
  target_cpu_utilization: 0.6
```

2. **Deploy:**
```bash
cd backend
gcloud app deploy
```

### Option 3: Compute Engine (24/7 Server)

If you need a persistent server:

1. **Create a Compute Engine instance:**
```bash
gcloud compute instances create discord-chat-backend \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --image-family=debian-11 \
  --image-project=debian-cloud
```

2. **SSH into the instance and set up:**
```bash
gcloud compute ssh discord-chat-backend --zone=us-central1-a

# Install Python and dependencies
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv git

# Clone your repo or copy files
git clone YOUR_REPO_URL
cd YOUR_REPO/backend

# Set up virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file with your credentials
nano .env

# Run with gunicorn
gunicorn --bind 0.0.0.0:5000 --workers 2 --timeout 120 app:app
```

3. **Set up systemd service for automatic restart:**
```bash
sudo nano /etc/systemd/system/discord-chat.service
```

Add:
```ini
[Unit]
Description=Discord Knowledge Chat API
After=network.target

[Service]
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/YOUR_REPO/backend
Environment="PATH=/home/YOUR_USERNAME/YOUR_REPO/backend/venv/bin"
ExecStart=/home/YOUR_USERNAME/YOUR_REPO/backend/venv/bin/gunicorn --bind 0.0.0.0:5000 --workers 2 --timeout 120 app:app
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable discord-chat
sudo systemctl start discord-chat
```

4. **Configure firewall:**
```bash
gcloud compute firewall-rules create allow-discord-chat \
  --allow tcp:5000 \
  --source-ranges 0.0.0.0/0
```

## Cost Considerations

### Expected Costs per Query

- **OpenAI Embeddings** (text-embedding-3-small): ~$0.00002 per query
- **OpenAI Chat** (gpt-4o-mini): ~$0.0001-0.0003 per query (depending on context size)
- **Pinecone**: Varies by plan, typically $0.10-$0.15 per 1M queries on serverless
- **Cloud Run**: $0.00002400 per request + CPU/memory usage

**Estimated cost per query:** $0.0003-0.0005 (less than $0.50 per 1000 queries)

### Cost Optimization Tips

1. **Implement rate limiting** to prevent abuse
2. **Cache common queries** using Redis or similar
3. **Use smaller embedding models** if accuracy allows
4. **Limit context size** in GPT responses
5. **Set Cloud Run min instances to 0** to avoid idle costs

## Security Best Practices

1. **Use Secret Manager** for all API keys
2. **Implement authentication** (Firebase Auth integration recommended)
3. **Add rate limiting** to prevent abuse:
   ```python
   from flask_limiter import Limiter
   
   limiter = Limiter(
       app,
       key_func=lambda: request.headers.get('X-User-ID', 'anonymous')
   )
   
   @app.route('/api/chat', methods=['POST'])
   @limiter.limit("10 per minute")
   def chat():
       # ... existing code
   ```

4. **Restrict CORS** to your domain only:
   ```python
   CORS(app, origins=['https://your-domain.web.app'])
   ```

5. **Add request validation** and sanitization

## Monitoring and Logging

### Cloud Logging

View logs in Google Cloud Console:
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=discord-knowledge-api" --limit 50
```

### Set up Alerts

Create alerts for:
- High error rates
- Latency > 2 seconds
- Cost thresholds

## Troubleshooting

### Common Issues

1. **"Failed to get response from server"**
   - Check backend is running: `curl http://localhost:5000/api/health`
   - Verify CORS configuration
   - Check browser console for detailed errors

2. **"No relevant information found"**
   - Verify Pinecone index has data
   - Check index name matches in .env
   - Test Pinecone connection: `curl http://localhost:5000/api/stats`

3. **Slow responses**
   - Reduce `top_k` parameter in search (currently 5)
   - Use smaller context in GPT prompts
   - Consider caching frequent queries

4. **High costs**
   - Implement rate limiting
   - Cache responses
   - Monitor usage in OpenAI dashboard

### Testing the API Directly

```bash
# Health check
curl http://localhost:5000/api/health

# Stats
curl http://localhost:5000/api/stats

# Chat query
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the team working on?"}'
```

## Maintenance

### Updating the Discord Bot

If you make changes to how Discord messages are scraped:
1. Re-run the scraping script
2. Update embeddings in Pinecone
3. No changes needed to the API

### Updating the Model

To use a different OpenAI model:
1. Change `CHAT_MODEL` in `app.py`
2. Adjust `max_tokens` and `temperature` as needed
3. Test thoroughly before deploying

## Future Enhancements

Consider adding:
- **Conversation history** - Store chat sessions in Firestore
- **User feedback** - Allow users to rate responses
- **Admin dashboard** - Monitor usage and costs
- **Advanced filters** - Filter by channel, date, author
- **Multi-language support** - Translate queries/responses
- **Voice input** - Allow voice questions
- **Suggested questions** - Show common queries

## Support

For issues or questions:
1. Check the logs in Google Cloud Console
2. Verify all environment variables are set correctly
3. Test each component individually
4. Review the Pinecone and OpenAI dashboards for API errors

## License

This integration is part of the 49ers Racing Wiki project.

