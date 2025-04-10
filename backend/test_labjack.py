import u3
import time

def test_labjack():
    try:
        # Try to open the device
        print("Attempting to open LabJack U3...")
        d = u3.U3()
        print("Device opened successfully")
        print(f"Serial Number: {d.configU3()['SerialNumber']}")
        
        # Configure AIN1
        print("\nConfiguring AIN1...")
        d.configIO(FIOAnalog=0x02)
        
        # Try to read AIN1
        print("\nTrying to read AIN1...")
        for i in range(5):
            voltage = d.getAIN(1)
            print(f"Reading {i+1}: {voltage}V")
            time.sleep(1)
            
    except Exception as e:
        print(f"\nError: {str(e)}")
        print(f"Error type: {type(e)}")

if __name__ == "__main__":
    test_labjack() 