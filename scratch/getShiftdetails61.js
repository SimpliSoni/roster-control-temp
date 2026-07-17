const secret = '2a760882-0b23-93ac-24c3-215762cba798';

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
    const res = await fetch('https://vikiai-dev.devum.com/devum/theraphy/getShiftdetails61?_cb=' + Date.now(), { headers });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Shifts:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error fetching shifts:', err);
  }
}

run();
