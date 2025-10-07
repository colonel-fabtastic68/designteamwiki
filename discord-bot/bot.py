import discord
from discord.ext import commands
import os
from dotenv import load_dotenv
from pinecone import Pinecone
from openai import OpenAI
import asyncio
from datetime import datetime
import logging
from aiohttp import web
import threading

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('discord_bot.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize Discord bot with all necessary intents
intents = discord.Intents.default()
intents.message_content = True
intents.messages = True
intents.guilds = True
intents.guild_messages = True  # Ensure we receive guild messages
bot = commands.Bot(command_prefix='!', intents=intents)

# Initialize Pinecone
pc = Pinecone(api_key=os.getenv('PINECONE_API_KEY'))
index_name = os.getenv('PINECONE_INDEX_NAME', 'clu-discord')
index = pc.Index(index_name)

# Initialize OpenAI
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Embedding model
EMBEDDING_MODEL = "text-embedding-3-small"

def get_embedding(text):
    """Generate embedding for text using OpenAI"""
    try:
        response = client.embeddings.create(
            input=text,
            model=EMBEDDING_MODEL
        )
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        return None

async def store_message_in_pinecone(message):
    """Store a Discord message in Pinecone"""
    try:
        # Skip bot messages
        if message.author.bot:
            return
        
        # Skip empty messages
        if not message.content.strip():
            return
        
        # Generate embedding
        embedding = get_embedding(message.content)
        if not embedding:
            logger.error(f"Failed to generate embedding for message {message.id}")
            return
        
        # Prepare metadata
        metadata = {
            'message_id': str(message.id),
            'author': message.author.name,
            'channel': message.channel.name if hasattr(message.channel, 'name') else 'DM',
            'content': message.content[:1000],  # Limit content length
            'timestamp': message.created_at.isoformat(),
            'guild': message.guild.name if message.guild else 'DM'
        }
        
        # Store in Pinecone
        upsert_response = index.upsert(
            vectors=[{
                'id': str(message.id),
                'values': embedding,
                'metadata': metadata
            }]
        )
        
        logger.info(f"Pinecone upsert response: {upsert_response}")
        logger.info(f"Stored message {message.id} from {message.author.name} in #{metadata['channel']}")
        
        # Verify it was stored
        try:
            stats = index.describe_index_stats()
            logger.info(f"Current total vectors in Pinecone: {stats.total_vector_count}")
        except Exception as stats_error:
            logger.error(f"Error getting stats: {stats_error}")
        
    except Exception as e:
        logger.error(f"Error storing message in Pinecone: {e}")

@bot.event
async def on_ready():
    """Called when bot is ready"""
    logger.info(f'{bot.user} has connected to Discord!')
    logger.info(f'Bot is in {len(bot.guilds)} guilds')
    logger.info(f'Bot Application ID: {bot.user.id}')
    logger.info(f'Intents: {bot.intents}')
    
    # Log guilds and channels
    for guild in bot.guilds:
        logger.info(f'  - {guild.name} (id: {guild.id})')
        logger.info(f'    Channels bot can see: {len(guild.text_channels)}')
        for channel in guild.text_channels[:5]:  # Log first 5 channels
            perms = channel.permissions_for(guild.me)
            logger.info(f'      #{channel.name} - Can read: {perms.read_messages}, Can send: {perms.send_messages}')

@bot.event
async def on_message(message):
    """Called for every message"""
    # Log ALL messages received for debugging
    channel_name = message.channel.name if hasattr(message.channel, 'name') else 'DM'
    logger.info(f"📨 Message received in #{channel_name} from {message.author.name}: {message.content[:50]}...")
    
    # Store message in Pinecone
    await store_message_in_pinecone(message)
    
    # Process commands
    await bot.process_commands(message)

@bot.command(name='search')
async def search_command(ctx, *, query):
    """Search the knowledge base"""
    await ctx.send(f"Searching for: {query}")
    # The actual search happens through the Flask API

@bot.command(name='stats')
async def stats_command(ctx):
    """Get Pinecone statistics"""
    try:
        stats = index.describe_index_stats()
        await ctx.send(f"📊 Knowledge Base Stats:\n"
                      f"Total vectors: {stats.total_vector_count}\n"
                      f"Dimension: {stats.dimension}")
    except Exception as e:
        await ctx.send(f"Error getting stats: {e}")
        logger.error(f"Error in stats command: {e}")

@bot.command(name='ping')
async def ping_command(ctx):
    """Check if bot is responsive"""
    await ctx.send(f'🏓 Pong! Latency: {round(bot.latency * 1000)}ms')

@bot.event
async def on_command_error(ctx, error):
    """Handle command errors"""
    if isinstance(error, commands.CommandNotFound):
        return
    logger.error(f"Command error: {error}")
    await ctx.send(f"An error occurred: {error}")

async def health_check(request):
    """Health check endpoint for Cloud Run"""
    return web.Response(text='OK', status=200)

async def start_health_server():
    """Start a simple HTTP server for Cloud Run health checks"""
    app = web.Application()
    app.router.add_get('/', health_check)
    app.router.add_get('/health', health_check)
    
    port = int(os.getenv('PORT', 8080))
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', port)
    await site.start()
    logger.info(f"Health check server running on port {port}")

def main():
    """Main function to run the bot"""
    token = os.getenv('DISCORD_TOKEN')
    
    if not token:
        logger.error("DISCORD_TOKEN not found in environment variables")
        return
    
    if not os.getenv('PINECONE_API_KEY'):
        logger.error("PINECONE_API_KEY not found in environment variables")
        return
    
    if not os.getenv('OPENAI_API_KEY'):
        logger.error("OPENAI_API_KEY not found in environment variables")
        return
    
    logger.info("Starting Discord bot...")
    
    # Start health check server in the bot's event loop
    async def run_bot():
        async with bot:
            await start_health_server()
            await bot.start(token)
    
    asyncio.run(run_bot())

if __name__ == '__main__':
    main()

