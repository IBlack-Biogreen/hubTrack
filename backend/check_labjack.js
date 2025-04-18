const http = require('http');

console.log('Testing LabJack server connection on http://localhost:5001/api/labjack/ain1');

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/labjack/ain1',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
  
  res.on('end', () => {
    console.log('No more data in response.');
    console.log('LabJack server is running correctly!');
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error(`ERROR: ${e.message}`);
  console.error('LabJack server may not be running or has an issue.');
  process.exit(1);
});

// Set a timeout
req.setTimeout(5000, () => {
  console.error('Request timed out');
  console.error('LabJack server may be running but is not responding in time.');
  process.exit(1);
});

req.end(); 