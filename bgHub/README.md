# BG Hub - Food Waste Tracking Kiosk

A full-stack application for tracking food waste in kiosk mode.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm run install-all
   ```

## Running the Application

### Development Mode
```bash
npm run dev
```
This will start both the backend server and frontend development server concurrently.

### Production Mode
1. Build the frontend:
   ```bash
   npm run build
   ```
2. Start the server:
   ```bash
   npm start
   ```

## Kiosk Mode Setup

To run the application in kiosk mode on Linux:

1. Install a kiosk browser (e.g., Chromium)
2. Configure your system to start the application in kiosk mode on boot
3. Set up the browser to open the application URL in fullscreen mode

## Environment Variables

Create a `.env` file in the root directory with the following variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/bghub
NODE_ENV=development
```

## Project Structure

- `client/` - React frontend application
- `server.js` - Express backend server
- `models/` - MongoDB models
- `routes/` - API routes
- `controllers/` - Route controllers 