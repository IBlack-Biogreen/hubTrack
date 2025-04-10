# HubTrack Backend

This is the backend server for the HubTrack application, responsible for communicating with the LabJack device.

## Setup Instructions

1. Install Node.js and npm if you haven't already
2. Navigate to the backend directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```

## API Endpoints

### GET /api/labjack/ain1
Returns the current voltage reading from AIN1 channel of the LabJack device.

Response format:
```json
{
  "value": 2.5,  // Voltage reading in volts
  "timestamp": "2024-03-21T12:34:56.789Z"
}
```

## Error Handling

The server includes error handling for:
- LabJack device connection issues
- Invalid requests
- Server errors

## Dependencies

- express: Web server framework
- cors: Cross-Origin Resource Sharing middleware
- labjack-nodejs: LabJack device communication library 