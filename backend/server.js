const express = require('express');
const cors = require('cors');
let ljm;
try {
    ljm = require('labjack-nodejs');
} catch (error) {
    console.warn('LabJack module not available:', error.message);
    console.warn('Please install the LabJack LJM software from https://labjack.com/pages/support');
}

const app = express();
const port = 5000;

// Enable CORS for all routes
app.use(cors());

// Initialize LabJack
let device = null;

async function initializeLabJack() {
    try {
        if (!ljm) {
            console.warn('Running in mock mode - LabJack not available');
            return;
        }

        // Connect to the U3-HV
        device = await ljm.open('U3', 'USB', 'ANY');
        console.log('LabJack U3-HV connected successfully');

        // Configure AIN1 for U3-HV
        // For U3-HV, we need to:
        // 1. Set the channel to single-ended mode
        // 2. Set the gain to 1 (for ±10V range)
        // 3. Set the resolution to high
        await device.eWriteName('AIN1_NEGATIVE_CH', 199); // 199 = Single-ended mode
        await device.eWriteName('AIN1_RANGE', 10.0); // ±10V range
        await device.eWriteName('AIN1_RESOLUTION_INDEX', 0); // High resolution
        await device.eWriteName('AIN1_SETTLING_US', 0); // No settling time

        console.log('U3-HV AIN1 configured with:');
        console.log('- Mode: Single-ended');
        console.log('- Range: ±10V');
        console.log('- High resolution mode');
    } catch (error) {
        console.error('Error connecting to LabJack:', error);
        throw error;
    }
}

// Initialize LabJack on server start
if (ljm) {
    initializeLabJack().catch(error => {
        console.error('Failed to initialize LabJack:', error);
    });
} else {
    console.warn('LabJack initialization skipped - LJM software not available');
}

// API endpoint to read AIN1
app.get('/api/labjack/ain1', async (req, res) => {
    try {
        if (!ljm || !device) {
            // Mock response when LabJack is not available
            const mockValue = Math.random() * 5; // Random voltage between 0-5V
            res.json({ 
                voltage: mockValue,
                timestamp: new Date().toISOString(),
                mock: true,
                message: 'LabJack not available - returning mock data'
            });
            return;
        }

        // Read AIN1 (channel 1) with configuration
        const result = await device.eReadName('AIN1');
        
        // Get additional diagnostic information
        const negativeChannel = await device.eReadName('AIN1_NEGATIVE_CH');
        const range = await device.eReadName('AIN1_RANGE');
        const resolution = await device.eReadName('AIN1_RESOLUTION_INDEX');
        
        console.log('AIN1 Reading Details:');
        console.log(`- Raw reading: ${result}`);
        console.log(`- Negative channel: ${negativeChannel}`);
        console.log(`- Range: ${range}V`);
        console.log(`- Resolution index: ${resolution}`);

        res.json({ 
            voltage: result,
            timestamp: new Date().toISOString(),
            mock: false,
            details: {
                negativeChannel,
                range,
                resolution
            }
        });
    } catch (error) {
        console.error('Error reading AIN1:', error);
        res.status(500).json({ 
            error: error.message,
            details: 'Please ensure the LabJack device is properly connected and the LJM software is installed correctly.'
        });
    }
});

// Clean up on server shutdown
process.on('SIGINT', () => {
    if (device) {
        device.close();
    }
    process.exit();
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 