# API Relationship and ID Resolution Debugging Guide

This guide outlines a generic, reproducible methodology for diagnosing and resolving issues where a resource persistence API (such as `POST /save`) returns a successful status code (like `200 OK`) but fails to link data correctly or silently persists fields as `null` in the database.

---

## 1. The Problem: Silent Null Writes
In many service architectures, the API endpoints acting as writes/upserts do not throw validation errors if they receive invalid foreign key references. Instead:
- They return `200 OK` or `201 Created` with a echo of the input.
- Internally, the database mapper fails to resolve the reference and silently stores `null` or empty values for the relation columns.

This typically happens when there is a mismatch between what the API expects (e.g., internal Database Object ID / UUID) and what the frontend sends (e.g., user-facing human-readable codes or names).

---

## 2. Investigation & Discovery Methodology

To identify the exact payload format and ID resolution expected by the backend, follow this multi-step process:

### Step 1: Analyze an Existing Populated Mapping
Query a `GET` endpoint for existing data. Look at a successfully populated record to check the names of the relation fields:
```json
{
  "id": "1418e78e-b63e-4402-9468-c56a0b97d418",
  "startDate": "2026-06-01",
  "endDate": "2026-06-01",
  "Shift": "Night Shift",
  "Employee": "Rudra"
}
```
*Note down: Does the GET response return human-readable names or internal database IDs? In this case, "Rudra" and "Night Shift" indicate relation lookups are active.*

### Step 2: Retrieve the Model Catalogs
Fetch the complete lists of both referenced entities (e.g. Employees and Shifts) from their respective read endpoints. For each, extract:
1. The internal Database ID (e.g. MongoDB `_id` / UUID).
2. The user-facing code (e.g., `EMP-010`).
3. The human-readable name/label (e.g., `Ashok K`).

### Step 3: Execute a Permutation Test Matrix
Create a scratch script that makes sequential `POST` requests to the write API using a list of permutations. By assigning each permutation to a unique date (or mock resource name), you can safely isolate the results.

#### The Test Matrix Template
| Test Date | Payload Field Name | Value Type | Description |
|---|---|---|---|
| Day 1 | `EmployeeId` / `ShiftId` | Object ID / UUID | Internal database-level primary keys |
| Day 2 | `EmployeeId` / `ShiftId` | Code / Label | User-facing codes (e.g. EMP-010) |
| Day 3 | `EmployeeId` / `ShiftId` | Name / Name | Human-readable names (e.g. Ashok K) |
| Day 4 | `employee` / `shift` | Object ID / UUID | Lowercase singular field name variation |
| Day 5 | `employeeIds` / `shiftId` | Array of IDs / ID | Plural and singular mixture |

#### Sample Node.js Test Matrix Implementation
```javascript
const saveUrl = 'https://api.example.com/saveMapping';
const getUrl = 'https://api.example.com/getMappings?start=2026-06-10&end=2026-06-15';
const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ...' };

const tests = [
  { date: '2026-06-10', desc: 'Object ID + UUID', payload: { EmployeeId: '660fb9542a...', ShiftId: '53aed45e-5a...' } },
  { date: '2026-06-11', desc: 'Code + Name', payload: { EmployeeId: 'EMP-010', ShiftId: 'B Shift' } },
  { date: '2026-06-12', desc: 'Lowercase Singular', payload: { employeeId: '660fb9542a...', shiftId: '53aed45e-5a...' } }
];

async function run() {
  // 1. Submit Test Payloads
  for (const t of tests) {
    const res = await fetch(saveUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...t.payload, startDate: t.date, endDate: t.date })
    });
    console.log(`Date: ${t.date} (${t.desc}) -> HTTP Status: ${res.status}`);
  }

  // 2. Fetch Results and Check DB Persistence
  const res = await fetch(getUrl, { headers });
  const mappings = await res.json();
  console.log('Database Mappings Result:', JSON.stringify(mappings, null, 2));
}
run();
```

### Step 4: Verify Database State
After running the script, inspect the GET response:
- Identify which date contains non-null values for the relation fields.
- The matching date reveals the exact field naming syntax (case-sensitivity) and ID type required.

---

## 3. Playbook for AI Agents

When tasking an AI agent with verifying or fixing API integrations in any workspace, the agent should follow this playbook:

1. **Verify Interceptors**: First verify that client credentials / headers are not commented out or misconfigured for the endpoint under test.
2. **Never Assume Field Syntax**: APIs are case-sensitive. Run a permutation matrix script rather than guessing field names.
3. **Use Mock Dates/Resources**: When testing API mutations in a live or dev database, use distinct, sequential mock dates or isolated test names to avoid polluting existing data and to make GET verification straightforward.
4. **Wire Frontend Correctly**: Once the correct ID schema is verified, ensure the frontend component maps its local entities to the database keys (e.g. `emp.dbId` instead of `emp.id`) before sending payloads to the service layer.

---

## 4. Diagnosing Unique Index/Upsert Behaviors

When calling a `POST` save mapping endpoint multiple times for the same combination of entity and date (e.g., employee + day), you may find the API updates/overwrites the existing record rather than inserting a second mapping. To diagnose if there is a way to bypass this:

1. **Test ID Field Variations**: Send a new UUID under different identifier parameters (such as `id`, `Id`, `_id`, or entity-specific keys). If the database still updates the existing mapping's ID rather than inserting a new row, the backend is hardcoded to execute an upsert matching on the compound key `(EmployeeId + startDate)`.
2. **Test Action Field Variations**: Submit requests with different `action` parameters (like `INSERT` or `CREATE` instead of `SAVE`). If the server still overwrites the existing row, the backend schema strictly permits only a single relation mapping per entity per day.
3. **Determine Frontend Strategy**: In such scenarios, the frontend can either:
   - Restrict additions to unoccupied cells to prevent accidental overwrites, or
   - Keep the `+ Add` button enabled as a quick action shortcut that sends the overwrite/update request to the backend.
