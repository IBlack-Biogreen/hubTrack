@echo off
echo Starting LabJack Python script...
start /B python labjack_server.py

echo Starting Node.js server...
node server.js 