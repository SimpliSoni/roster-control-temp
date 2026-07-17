const secret = '3c8dce4c-f68d-115b-e278-a04b8a67a14d';

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
  const url = 'https://vikiai-dev.devum.com/devum/theraphy/getEmployeeShiftMappings?startDate=2026-07-09&endDate=2026-07-09&_cb=' + Date.now();
  try {
    const res = await fetch(url, { headers });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    const filtered = Array.isArray(data) ? data.filter(m => {
      if (!m) return false;
      if (m.Employee === null || m.Shift === null || m.EmployeeId === null || m.ShiftId === null || m.EmployeeID === null || m.ShiftID === null || m.employeeId === null || m.shiftId === null) {
        return false;
      }
      return true;
    }) : data;
    console.log('Mappings:', JSON.stringify(filtered, null, 2));
  } catch (err) {
    console.error('Error fetching mappings:', err);
  }
}

run();
