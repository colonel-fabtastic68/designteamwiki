from flask import Flask, request, jsonify
from flask_cors import CORS
from pinecone import Pinecone
from openai import OpenAI
import os
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Pinecone
pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY'))
index_name = os.getenv('PINECONE_INDEX_NAME', 'discord-knowledge')
index = pc.Index(index_name)

# Initialize OpenAI
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Embedding model configuration
EMBEDDING_MODEL = "text-embedding-3-small"
CHAT_MODEL = "gpt-4o-mini"

def get_embedding(text):
    """Generate embedding for the given text using OpenAI"""
    try:
        response = client.embeddings.create(
            input=text,
            model=EMBEDDING_MODEL
        )
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        raise

def search_knowledge_base(query, top_k=5):
    """Search the Pinecone knowledge base for relevant context"""
    try:
        # Generate embedding for the query
        query_embedding = get_embedding(query)
        
        # Search Pinecone
        results = index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True
        )
        
        logger.info(f"Pinecone returned {len(results.matches)} matches")
        
        # Extract relevant context from results
        contexts = []
        for match in results.matches:
            logger.info(f"Match score: {match.score}, metadata keys: {match.metadata.keys() if match.metadata else 'No metadata'}")
            
            # Lower threshold to 0.15 (15%) to be more inclusive with small datasets
            if match.score > 0.15:
                metadata = match.metadata or {}
                
                # Try different possible field names for content
                content = (metadata.get('content') or 
                          metadata.get('text') or 
                          metadata.get('message') or 
                          metadata.get('message_content') or '')
                
                # Try different possible field names for author
                author = (metadata.get('author') or 
                         metadata.get('author_name') or
                         metadata.get('username') or 
                         metadata.get('user') or 'Unknown')
                
                # Try different possible field names for channel
                channel = (metadata.get('channel') or 
                          metadata.get('channel_name') or
                          metadata.get('channel_id') or 'Unknown')
                
                logger.info(f"Content preview: {content[:100] if content else 'EMPTY'}")
                
                context = {
                    'content': content,
                    'author': author,
                    'channel': channel,
                    'timestamp': metadata.get('timestamp', ''),
                    'score': match.score
                }
                contexts.append(context)
        
        logger.info(f"Returning {len(contexts)} contexts")
        return contexts
    except Exception as e:
        logger.error(f"Error searching knowledge base: {e}")
        raise

def generate_response(query, contexts):
    """Generate a response using GPT based on the query and context"""
    try:
        # Build context string from search results
        context_str = "\n\n".join([
            f"From {ctx['author']} in #{ctx['channel']}:\n{ctx['content']}"
            for ctx in contexts
        ])
        
        # Create system message
        system_message = """You are a helpful assistant for the 49ers Racing Formula SAE team. 
You have access to Discord conversation history and team knowledge. 
Answer questions based on the provided context. If you don't have enough information, 
say so clearly. Be concise but helpful. Use technical terminology when appropriate, 
and provide specific details from the context when available."""
        
        # Create user message with context
        user_message = f"""Context from team Discord:
{context_str}

Question: {query}

Please provide a helpful answer based on the context above. If the context doesn't contain 
relevant information, let me know and provide general guidance if possible."""
        
        # Generate response using GPT
        response = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Error generating response: {e}")
        raise

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'Discord Knowledge API is running'
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    """Main chat endpoint"""
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({
                'error': 'No message provided'
            }), 400
        
        query = data['message']
        
        # Validate query
        if not query.strip():
            return jsonify({
                'error': 'Empty message'
            }), 400
        
        logger.info(f"Received query: {query}")
        
        # Search knowledge base
        contexts = search_knowledge_base(query)
        
        if not contexts:
            return jsonify({
                'response': "I couldn't find any relevant information in the Discord history about that topic. Could you please rephrase your question or ask about something else?",
                'sources': []
            })
        
        # Generate response
        response_text = generate_response(query, contexts)
        
        # Format sources
        sources = [
            {
                'author': ctx['author'],
                'channel': ctx['channel'],
                'timestamp': ctx['timestamp'],
                'relevance': round(ctx['score'] * 100, 1)
            }
            for ctx in contexts[:3]  # Return top 3 sources
        ]
        
        return jsonify({
            'response': response_text,
            'sources': sources
        })
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        return jsonify({
            'error': 'An error occurred processing your request. Please try again.'
        }), 500

@app.route('/api/stats', methods=['GET'])
def stats():
    """Get knowledge base statistics"""
    try:
        # Get index stats
        stats = index.describe_index_stats()
        
        return jsonify({
            'total_vectors': stats.total_vector_count,
            'dimension': stats.dimension,
            'index_name': index_name
        })
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        return jsonify({
            'error': 'Could not fetch statistics'
        }), 500

if __name__ == '__main__':
    # Check for required environment variables
    required_vars = ['PINECONE_API_KEY', 'OPENAI_API_KEY']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
        exit(1)
    
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    logger.info(f"Starting Flask server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)

