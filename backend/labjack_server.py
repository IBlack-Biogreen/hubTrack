import u3
from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
import time
import threading
from datetime import datetime, timedelta
from collections import deque

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
        print("Attempting to initialize LabJack device...")
        # Open the U3-HV device
        labjack_device = u3.U3()
        print("LabJack device opened successfully")
        print(f"Serial Number: {labjack_device.configU3()['SerialNumber']}")
        
        # Configure AIN1 for analog input
        labjack_device.configIO(FIOAnalog=0x02)  # Set FIO1 to analog
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
        # Read AIN1 (FIO1)
        voltage = labjack_device.getAIN(1)
        return voltage
    except Exception as e:
        print(f"Error reading voltage: {str(e)}")
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
    global current_second_readings
    last_second = datetime.now().second
    
    while not stop_thread:
        current_time = datetime.now()
        voltage = read_voltage()
        
        # Check if we've moved to a new second
        if current_time.second != last_second:
            calculate_second_average()
            last_second = current_time.second
        
        current_second_readings.append(voltage)
        time.sleep(reading_interval)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/labjack/ain1', methods=['GET'])
def get_voltage():
    weight = get_weight(last_second_average)
    return jsonify({
        'voltage': last_second_average,
        'weight': weight,
        'timestamp': last_average_time.isoformat() if last_average_time else None
    })

@app.route('/api/labjack/history', methods=['GET'])
def get_history():
    # Convert deque to list for JSON serialization and include weight
    history = [{
        'voltage': v,
        'weight': get_weight(v),
        'timestamp': t.isoformat()
    } for v, t in voltage_buffer]
    return jsonify(history)

@app.route('/api/labjack/tare', methods=['POST'])
def tare():
    global tare_voltage
    tare_voltage = last_second_average
    return jsonify({'success': True, 'tare_voltage': tare_voltage})

@app.route('/api/labjack/scale', methods=['POST'])
def set_scale():
    global scale_factor
    try:
        new_scale = float(request.json['scale'])
        scale_factor = new_scale
        return jsonify({'success': True, 'scale_factor': scale_factor})
    except (KeyError, ValueError) as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/labjack/config', methods=['GET'])
def get_config():
    return jsonify({
        'tare_voltage': tare_voltage,
        'scale_factor': scale_factor
    })

if __name__ == '__main__':
    initialize_labjack()
    
    # Start the background reading thread
    reading_thread = threading.Thread(target=continuous_reading)
    reading_thread.daemon = True  # Thread will exit when main program exits
    reading_thread.start()
    
    try:
        app.run(port=5000)
    except KeyboardInterrupt:
        stop_thread = True
        reading_thread.join()
        if labjack_device:
            labjack_device.close() 