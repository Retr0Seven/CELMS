@echo off
echo Stopping any existing node processes...
taskkill /f /im node.exe

echo Starting PostgreSQL database...
docker-compose up -d db

echo Starting API server...
start cmd /k "cd celms-api && npm start"

echo Starting React client...
start cmd /k "cd celms-client && npm start"

echo CELMS system has been started.
echo API server running on port 3001
echo Client running on port 3000