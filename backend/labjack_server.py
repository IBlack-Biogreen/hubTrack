import u3
from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
import time
import threading
from datetime import datetime, timedelta
from collections import deque
import logging
import sys
import os
import argparse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('labjack_server.log')
    ]
)

# Parse command line arguments
parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=5001, help='Port to run the server on')
args = parser.parse_args()

app = Flask(__name__, template_folder='templates')
CORS(app)

# Global variables
labjack_device = None
voltage_buffer = deque(maxlen=3000)  # Store 5 minutes of readings at 10Hz
current_second_readings = []  # Buffer for current second's readings
last_second_average = 2.5  # Default mock value
last_average_time = None
reading_interval = 0.1  # 100ms between readings
stop_thread = False

# Tare and scale variables
tare_voltage = 0.0
scale_factor = 24.5  # lbs per volt

def initialize_labjack():
    global labjack_device
    try:
        logging.info("Attempting to initialize LabJack device...")
        
        # First, try to close any existing connections
        try:
            if labjack_device:
                labjack_device.close()
        except:
            pass
            
        # Open the U3-HV device
        labjack_device = u3.U3()
        logging.info("LabJack device opened successfully")
        config = labjack_device.configU3()
        logging.info(f"Serial Number: {config['SerialNumber']}")
        logging.info(f"Firmware Version: {config['FirmwareVersion']}")
        
        # Configure AIN1 for analog input
        labjack_device.configIO(FIOAnalog=0x02)  # Set FIO1 to analog
        logging.info("AIN1 configured for analog input")
        
        # Configure AIN1 for single-ended input with gain of 1
        labjack_device.getCalibrationData()
        logging.info("Calibration data loaded")
        
        # Print initial reading for debugging
        initial_reading = labjack_device.getAIN(1)
        logging.info(f"Initial AIN1 reading: {initial_reading}V")
        
    except Exception as e:
        logging.error(f"Error connecting to LabJack: {str(e)}")
        logging.error(f"Error type: {type(e)}")
        logging.error(f"Error details: {e.__dict__ if hasattr(e, '__dict__') else 'No additional details'}")
        
        # If the error is that the device is already open, try to close it and reopen
        if hasattr(e, 'errorCode') and e.errorCode == 1010:
            logging.info("Attempting to close and reopen the LabJack device...")
            try:
                # Try to find and close the existing connection
                import subprocess
                subprocess.run(['taskkill', '/F', '/IM', 'python.exe'], capture_output=True)
                time.sleep(2)  # Wait for processes to close
                
                # Try to initialize again
                labjack_device = u3.U3()
                logging.info("Successfully reopened LabJack device after closing existing connection")
                return
            except Exception as reopen_error:
                logging.error(f"Failed to reopen LabJack device: {str(reopen_error)}")
        
        labjack_device = None
        # Try to list available LabJack devices
        try:
            devices = u3.listAll(3)
            logging.info(f"Available LabJack devices: {devices}")
        except Exception as list_error:
            logging.error(f"Error listing LabJack devices: {str(list_error)}")

def read_voltage():
    if labjack_device is None:
        logging.warning("LabJack device not initialized, returning mock value")
        return 2.5  # Mock value when device is not available
    
    try:
        # Read AIN1 (FIO1)
        voltage = labjack_device.getAIN(1)
        logging.debug(f"Raw voltage reading: {voltage}V")
        return voltage
    except Exception as e:
        logging.error(f"Error reading voltage: {str(e)}")
        return 2.5  # Fallback to mock value

def get_weight(voltage):
    """Convert voltage to weight in pounds, accounting for tare"""
    return (voltage - tare_voltage) * scale_factor

def calculate_second_average():
    global current_second_readings, last_second_average, last_average_time
    if current_second_readings:
        last_second_average = sum(current_second_readings) / len(current_second_readings)
        last_average_time = datetime.now()
        voltage_buffer.append((last_second_average, last_average_time))
        current_second_readings = []

def continuous_reading():
    global current_second_readings, last_second_average, last_average_time
    last_second = datetime.now().second
    consecutive_errors = 0
    max_consecutive_errors = 3
    
    while not stop_thread:
        try:
            current_time = datetime.now()
            voltage = read_voltage()
            
            # Reset error counter on successful reading
            consecutive_errors = 0
            
            # Update last_second_average immediately
            last_second_average = voltage
            last_average_time = current_time
            
            # Add the reading to the current second's buffer
            current_second_readings.append(voltage)
            
            # Log every 5th reading to avoid flooding the logs
            if len(current_second_readings) % 5 == 0:
                logging.info(f"Current voltage reading: {voltage}V")
            
            # Check if we've moved to a new second
            if current_time.second != last_second:
                calculate_second_average()
                last_second = current_time.second
                logging.info(f"Second average: {last_second_average}V")
            
            # Sleep for 200ms between readings (5Hz)
            time.sleep(0.2)
            
        except Exception as e:
            consecutive_errors += 1
            logging.error(f"Error in continuous reading thread: {str(e)}")
            logging.error(f"Error type: {type(e)}")
            logging.error(f"Error details: {e.__dict__ if hasattr(e, '__dict__') else 'No additional details'}")
            
            if consecutive_errors >= max_consecutive_errors:
                logging.error("Too many consecutive errors, attempting to reinitialize LabJack...")
                try:
                    if labjack_device:
                        labjack_device.close()
                    initialize_labjack()
                    consecutive_errors = 0
                except Exception as init_error:
                    logging.error(f"Failed to reinitialize LabJack: {str(init_error)}")
            
            # Wait a bit longer after an error
            time.sleep(0.5)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/labjack/ain1', methods=['GET'])
def get_voltage():
    try:
        weight = get_weight(last_second_average)
        response = {
            'voltage': last_second_average,
            'weight': weight,
            'timestamp': last_average_time.isoformat() if last_average_time else None
        }
        logging.debug(f"Sending response: {response}")
        return jsonify(response)
    except Exception as e:
        logging.error(f"Error in get_voltage: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/labjack/history', methods=['GET'])
def get_history():
    try:
        # Convert deque to list for JSON serialization and include weight
        history = [{
            'voltage': v,
            'weight': get_weight(v),
            'timestamp': t.isoformat()
        } for v, t in voltage_buffer]
        logging.debug(f"Sending history with {len(history)} entries")
        return jsonify(history)
    except Exception as e:
        logging.error(f"Error in get_history: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/labjack/tare', methods=['POST'])
def tare():
    try:
        global tare_voltage
        # Check if tare_voltage is provided in request
        if request.json and 'tare_voltage' in request.json:
            tare_voltage = float(request.json['tare_voltage'])
        else:
            # Use current reading if no tare_voltage provided
            tare_voltage = last_second_average
        logging.info(f"Tare set to {tare_voltage}V")
        return jsonify({'success': True, 'tare_voltage': tare_voltage})
    except Exception as e:
        logging.error(f"Error in tare: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/labjack/scale', methods=['POST'])
def set_scale():
    try:
        global scale_factor
        new_scale = float(request.json['scale'])
        scale_factor = new_scale
        logging.info(f"Scale factor set to {scale_factor}")
        return jsonify({'success': True, 'scale_factor': scale_factor})
    except (KeyError, ValueError) as e:
        logging.error(f"Error in set_scale: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        logging.error(f"Error in set_scale: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/labjack/config', methods=['GET'])
def get_config():
    try:
        response = {
            'tare_voltage': tare_voltage,
            'scale_factor': scale_factor
        }
        logging.debug(f"Sending config: {response}")
        return jsonify(response)
    except Exception as e:
        logging.error(f"Error in get_config: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST')
    return response

if __name__ == '__main__':
    # Set Flask's logging level to INFO to see more details
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.INFO)
    
    # Only initialize LabJack if we're not in a reload
    if not os.environ.get('WERKZEUG_RUN_MAIN'):
        logging.info("Initializing LabJack...")
        initialize_labjack()
        
        # Start the background reading thread
        reading_thread = threading.Thread(target=continuous_reading)
        reading_thread.daemon = True  # Thread will exit when main program exits
        reading_thread.start()
    
    try:
        logging.info(f"Server running on http://localhost:{args.port}")
        app.run(port=args.port, debug=False)  # Disable debug mode
    except KeyboardInterrupt:
        logging.info("\nShutting down server...")
        stop_thread = True
        if reading_thread:
            reading_thread.join()
        if labjack_device:
            labjack_device.close() 