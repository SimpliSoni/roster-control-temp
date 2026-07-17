const secret = '1cc3901d-4d31-de73-cb9c-0f38127f41f7';

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
  const payload = [
    {
      EmployeeId: '660fb9542aacbd33a4a6d251',
      ShiftId: '53aed45e-5a5e-4ed1-8164-3282a75f1471',
      startDate: '2026-07-09',
      endDate: '2026-07-09'
    }
  ];
  try {
    const res = await fetch('https://vikiai-dev.devum.com/devum/theraphy/bulkSaveEmployeeShiftMappings', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log('Response:', text);
  } catch (err) {
    console.error('Error saving mapping:', err);
  }
}

run();
