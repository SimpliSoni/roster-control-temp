const secret = '317888e6-bf55-5192-9938-2185376f58fd';

async function run() {
  const headers = {
    'Content-Type': 'application/json',
    'orgcode': 'vikiai-dev',
    'appcode': 'theraphy',
    'sitecode': 'DefaultSiteCode',
    'identifiertype': 'external',
    'clientSecret': secret,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };
  const payload = {
    name: 'B Shift',
    startTime: '14:00:00',
    endTime: '22:00:00',
    weekDays: 'Monday,Tuesday,Wednesday,Thursday,Friday',
    isOperational: true,
    doesShiftFallOnNextDay: false,
    shiftInterval: '8 Hours'
  };
  try {
    const res = await fetch('https://vikiai-dev.devum.com/devum/theraphy/saveShift', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log('Response:', text);
  } catch (err) {
    console.error('Error saving shift:', err);
  }
}

run();
