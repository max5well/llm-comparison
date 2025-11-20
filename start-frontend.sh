#!/bin/bash

echo "🚀 Starting LLM Compare Frontend Setup..."
echo ""

cd frontend

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo "✅ Dependencies already installed"
    echo "🎯 Starting development server..."
    npm run dev
else
    echo "📦 Installing dependencies..."
    echo ""

    # Try regular install first
    if npm install; then
        echo "✅ Dependencies installed successfully"
        echo "🎯 Starting development server..."
        npm run dev
    else
        echo "⚠️  Regular install failed. Trying with legacy peer deps..."
        if npm install --legacy-peer-deps; then
            echo "✅ Dependencies installed successfully"
            echo "🎯 Starting development server..."
            npm run dev
        else
            echo "❌ npm install failed. Trying alternative methods..."
            echo ""
            echo "Option 1: Fix npm cache permissions"
            echo "  sudo chown -R \$(whoami) ~/.npm"
            echo "  npm cache clean --force"
            echo "  npm install"
            echo ""
            echo "Option 2: Use yarn instead"
            echo "  npm install -g yarn"
            echo "  yarn install"
            echo "  yarn dev"
            echo ""
            echo "Please try one of the above options and run this script again."
            exit 1
        fi
    fi
fi
