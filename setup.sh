#!/bin/bash

echo "🚀 Setting up RESET 2026..."

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install API dependencies
echo "📦 Installing API dependencies..."
cd apps/api
npm install

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit apps/api/.env and add your DATABASE_URL and other secrets!"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit apps/api/.env with your Railway database URLs"
echo "2. Run 'cd apps/api && npm run db:push' to create database tables"
echo "3. Run 'npm run dev:api' to start the API server"
echo ""
echo "📚 See README.md for full documentation"
