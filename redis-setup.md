# Redis Configuration for IntelliScanAI
# 
# To run Redis locally on Windows:
# 1. Download Redis from: https://github.com/microsoftarchive/redis/releases
# 2. Extract and run: redis-server.exe
# 3. Or use Docker: docker run -d -p 6379:6379 redis:alpine
#
# To run Redis on Linux/Mac:
# 1. Install Redis: sudo apt-get install redis-server (Ubuntu) or brew install redis (Mac)
# 2. Start Redis: redis-server
#
# Default Redis Configuration:
# Host: localhost
# Port: 6379
# No password (for development)
#
# Production considerations:
# - Set a strong password
# - Configure Redis persistence
# - Set up Redis cluster for high availability
# - Configure memory limits

# Quick Docker command for development:
# docker run -d --name redis-intelliscan -p 6379:6379 redis:alpine

# Test connection:
# redis-cli ping
# Should return: PONG
