#!/bin/bash

# Kill any existing backend processes
pkill -f "python3 src/main.py"

# Wait for processes to terminate
sleep 2

# Clear conflicting environment variables
unset OPENAI_API_KEY
unset ANTHROPIC_API_KEY

# Start with clean environment
PYTHONPATH=/Users/maxwell/Projects/llm-compare/backend python3 src/main.py