const secret = 'fc0fd918-d271-661a-46d8-95768c9a1d0e';

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
  try {
    const res = await fetch('https://vikiai-dev.devum.com/devum/theraphy/getEmployeeDetail', { headers });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Employees:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error fetching employees:', err);
  }
}

run();
