import u3
from flask import Flask, jsonify
from flask_cors import CORS
import time

app = Flask(__name__)
CORS(app)

# Global variable to store the LabJack device
labjack_device = None

def initialize_labjack():
    global labjack_device
    try:
        print("Attempting to initialize LabJack device...")
        labjack_device = u3.U3()
        print("LabJack device opened successfully")
        print(f"Serial Number: {labjack_device.configU3()['SerialNumber']}")
        
        # Configure AIN1
        labjack_device.configIO(FIOAnalog=0x02)
        print("AIN1 configured for analog input")
        
    except Exception as e:
        print(f"Error connecting to LabJack: {str(e)}")
        print(f"Error type: {type(e)}")
        labjack_device = None

def read_voltage():
    if labjack_device is None:
        print("LabJack device not initialized, returning mock value")
        return 2.5  # Mock value when device is not available
    
    try:
        # Read AIN1
        voltage = labjack_device.getAIN(1)
        print(f"Raw voltage reading: {voltage}")
        return voltage
    except Exception as e:
        print(f"Error reading voltage: {str(e)}")
        return 2.5  # Fallback to mock value

@app.route('/api/labjack/ain1', methods=['GET'])
def get_voltage():
    voltage = read_voltage()
    return jsonify({'voltage': voltage})

if __name__ == '__main__':
    initialize_labjack()
    app.run(port=5000) 