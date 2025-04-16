#!/bin/bash

# Start the LabJack Python script in the background
echo "Starting LabJack Python script..."
python labjack_server.py &

# Start the Node.js server
echo "Starting Node.js server..."
node server.js 