#!/usr/bin/env python3
"""
Simple test script for the Discord Knowledge Chat API
Run this to verify your backend is working correctly
"""

import requests
import json
import sys

# API base URL - adjust if your server is running on a different port
API_BASE_URL = "http://localhost:5000"

def test_health():
    """Test the health check endpoint"""
    print("Testing health check endpoint...")
    try:
        response = requests.get(f"{API_BASE_URL}/api/health")
        if response.status_code == 200:
            print("✓ Health check passed")
            print(f"  Response: {response.json()}")
            return True
        else:
            print(f"✗ Health check failed with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("✗ Could not connect to server. Make sure it's running on port 5000")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_stats():
    """Test the stats endpoint"""
    print("\nTesting stats endpoint...")
    try:
        response = requests.get(f"{API_BASE_URL}/api/stats")
        if response.status_code == 200:
            data = response.json()
            print("✓ Stats endpoint working")
            print(f"  Total vectors: {data.get('total_vectors', 'N/A')}")
            print(f"  Dimension: {data.get('dimension', 'N/A')}")
            print(f"  Index name: {data.get('index_name', 'N/A')}")
            return True
        else:
            print(f"✗ Stats endpoint failed with status {response.status_code}")
            print(f"  Response: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_chat(message="What is the team working on?"):
    """Test the chat endpoint"""
    print(f"\nTesting chat endpoint with message: '{message}'")
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/chat",
            json={"message": message},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            data = response.json()
            print("✓ Chat endpoint working")
            print(f"\n  Response: {data.get('response', 'N/A')}")
            
            sources = data.get('sources', [])
            if sources:
                print(f"\n  Sources ({len(sources)}):")
                for i, source in enumerate(sources, 1):
                    print(f"    {i}. {source.get('author', 'Unknown')} in #{source.get('channel', 'Unknown')}")
                    print(f"       Relevance: {source.get('relevance', 0)}%")
            else:
                print("  No sources returned")
            return True
        else:
            print(f"✗ Chat endpoint failed with status {response.status_code}")
            print(f"  Response: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("Discord Knowledge Chat API Test Suite")
    print("=" * 60)
    
    # Test health
    health_ok = test_health()
    if not health_ok:
        print("\n⚠️  Server is not responding. Please check:")
        print("  1. Is the Flask server running? (python app.py)")
        print("  2. Is it running on port 5000?")
        print("  3. Check for errors in the server terminal")
        sys.exit(1)
    
    # Test stats
    stats_ok = test_stats()
    if not stats_ok:
        print("\n⚠️  Stats endpoint failed. Please check:")
        print("  1. Is your Pinecone API key correct in .env?")
        print("  2. Is your Pinecone index name correct?")
        print("  3. Does the index exist in Pinecone?")
    
    # Test chat
    chat_ok = test_chat()
    if not chat_ok:
        print("\n⚠️  Chat endpoint failed. Please check:")
        print("  1. Are your API keys correct in .env?")
        print("  2. Does your Pinecone index have data?")
        print("  3. Check the server terminal for error messages")
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print(f"Health Check: {'✓ PASS' if health_ok else '✗ FAIL'}")
    print(f"Stats:        {'✓ PASS' if stats_ok else '✗ FAIL'}")
    print(f"Chat:         {'✓ PASS' if chat_ok else '✗ FAIL'}")
    
    if health_ok and stats_ok and chat_ok:
        print("\n🎉 All tests passed! Your API is ready to use.")
        print("\nNext steps:")
        print("  1. Start your React app (npm start)")
        print("  2. Navigate to the Dashboard")
        print("  3. Click the purple chat icon to start chatting!")
    else:
        print("\n❌ Some tests failed. Please fix the issues above.")
        sys.exit(1)

if __name__ == "__main__":
    main()

