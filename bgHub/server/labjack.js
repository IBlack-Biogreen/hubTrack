const ljm = require('labjack-nodejs');

let device = null;

async function initializeLabJack() {
  try {
    device = await ljm.open('ANY', 'ANY', 'ANY');
    console.log('LabJack U3-HV connected successfully');
    return true;
  } catch (err) {
    console.error('Error connecting to LabJack:', err);
    return false;
  }
}

async function readAIN1() {
  if (!device) {
    const initialized = await initializeLabJack();
    if (!initialized) {
      throw new Error('Failed to initialize LabJack');
    }
  }

  try {
    const result = await device.eReadName('AIN1');
    return {
      voltage: result,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('Error reading AIN1:', err);
    throw err;
  }
}

module.exports = {
  initializeLabJack,
  readAIN1
}; 