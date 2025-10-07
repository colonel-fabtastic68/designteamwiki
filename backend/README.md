# Discord Knowledge Chat Backend API

Flask backend API that provides chat functionality using Pinecone vector database and OpenAI for the 49ers Racing Wiki.

## Quick Start

1. **Install dependencies:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Create `.env` file:**
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   PINECONE_API_KEY=your_pinecone_api_key_here
   PINECONE_INDEX_NAME=discord-knowledge
   FLASK_ENV=development
   PORT=5000
   ```

3. **Run the server:**
   ```bash
   python app.py
   ```

   Server will start at `http://localhost:5000`

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for embeddings and chat | Yes |
| `PINECONE_API_KEY` | Pinecone API key for vector database | Yes |
| `PINECONE_INDEX_NAME` | Name of your Pinecone index | Yes |
| `FLASK_ENV` | Environment (development/production) | No |
| `PORT` | Server port (default: 5000) | No |

## API Endpoints

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "message": "Discord Knowledge API is running"
}
```

### POST /api/chat
Send a chat message and get AI response.

**Request:**
```json
{
  "message": "Your question here"
}
```

**Response:**
```json
{
  "response": "AI-generated response based on Discord knowledge",
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

### GET /api/stats
Get Pinecone index statistics.

**Response:**
```json
{
  "total_vectors": 12345,
  "dimension": 1536,
  "index_name": "discord-knowledge"
}
```

## Development

### Testing Locally

```bash
# Health check
curl http://localhost:5000/api/health

# Send a chat message
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are the latest updates?"}'

# Get stats
curl http://localhost:5000/api/stats
```

### Deployment

See `DISCORD_CHAT_SETUP.md` in the project root for detailed deployment instructions.

#### Quick Deploy to Cloud Run:

```bash
gcloud run deploy discord-knowledge-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets OPENAI_API_KEY=openai-api-key:latest,PINECONE_API_KEY=pinecone-api-key:latest \
  --set-env-vars PINECONE_INDEX_NAME=discord-knowledge
```

## Architecture

1. User sends a message via the React frontend
2. Flask API receives the message
3. OpenAI generates an embedding for the query
4. Pinecone searches for similar Discord messages
5. OpenAI generates a response using the context
6. Response is returned to the user with sources

## Configuration

### Embedding Model
Default: `text-embedding-3-small`

### Chat Model
Default: `gpt-4o-mini`

You can modify these in `app.py`:
```python
EMBEDDING_MODEL = "text-embedding-3-small"
CHAT_MODEL = "gpt-4o-mini"
```

### Search Configuration
- `top_k=5`: Number of results to retrieve from Pinecone
- `score > 0.7`: Minimum relevance score for including results
- `max_tokens=500`: Maximum response length

## Troubleshooting

### Import Errors
Make sure you're using Python 3.8+:
```bash
python --version
```

### Pinecone Connection Issues
Verify your API key and index name:
```python
from pinecone import Pinecone
pc = Pinecone(api_key="your-key")
print(pc.list_indexes())
```

### OpenAI Errors
Check your API key and quota:
```python
from openai import OpenAI
client = OpenAI(api_key="your-key")
print(client.models.list())
```

## License

Part of the 49ers Racing Wiki project.

