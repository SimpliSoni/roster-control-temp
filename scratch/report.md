# Roster Control API Integration Report

This report summarizes the changes made to the Roster Control integration to resolve stale mappings, bypass API caching, gracefully handle null/empty database records, and introduce robust test coverages in the `scratch/` directory.

---

## 1. Executive Summary
Following a database wipe, the application faced two primary issues:
1. **Stale Mappings**: Querying `/getEmployeeShiftMappings` returned orphaned records with `Employee: null` and `Shift: null` because master records had been deleted, but the junction mapping tables still contained references.
2. **API Caching**: Client browsers and API gateways cached GET requests, serving stale data even when new updates had occurred.

We resolved these issues by introducing:
* **Strict Caching Prevention**: Adding HTTP header directives (`Cache-Control`, `Pragma`, `Expires`) on all GET requests.
* **Resilient Relationship Parsing**: Normalizing foreign keys (handling both string IDs and relation objects/UUIDs like `{ id: '...' }`, `{ _id: '...' }`, or `{ $oid: '...' }`).
* **Client-Side Filtering & Mock Failover**: Filtering out any mapping record that contains a null/invalid employee or shift reference, and falling back to default mock catalogs on empty/error states.

---

## 2. Code Changes Summary

### 1. HTTP Auth Interceptor
* **File**: [auth-interceptor.ts](file:///c:/Users/karan.s/Documents/Projects/External-Control/roster-control/src/app/interceptors/auth-interceptor.ts)
* **Changes**: Added explicit caching prevention headers to prevent browsers and intermediate gateways from caching responses.
```typescript
'Cache-Control': 'no-cache, no-store, must-revalidate',
'Pragma': 'no-cache',
'Expires': '0'
```

### 2. Employee Service
* **File**: [employee.service.ts](file:///c:/Users/karan.s/Documents/Projects/External-Control/roster-control/src/app/services/employee.service.ts)
* **Changes**: Wrapped the GET mappings response stream in a RxJS pipeline to filter out any mappings where the referenced employee or shift resolves to `null` or is missing.

### 3. Roster Component
* **File**: [roster-control.ts](file:///c:/Users/karan.s/Documents/Projects/External-Control/roster-control/src/app/components/roster-control/roster-control.ts)
* **Changes**:
  * Implemented relation ID resolution (`getFKId()`) to support both string ID mappings and database object-relation structures (`{ id: "..." }`).
  * Discards any mapping record referencing an employee ID not present in the active roster.
  * Falls back to local storage and mock assignments if the API returns an empty mappings list or fails.

---

## 3. API Catalog & Schema Reference

Below are the 6 core API endpoints used by the roster widget along with their payload specifications. Note that **payload field names are strictly case-sensitive**.

### 1. `getEmployeeDetail` (GET)
* **Description**: Returns list of all active employee records.
* **Secret**: `fc0fd918-d271-661a-46d8-95768c9a1d0e`
* **Response Sample**:
```json
[
  {
    "id": "660fb9542aacbd33a4a6d251",
    "employeeId": "EMP-001",
    "name": "Rahul Mehta",
    "email": "rahul.mehta@company.com",
    "dept": "Operations",
    "role": "Senior Operator"
  }
]
```

### 2. `getShiftdetails61` (GET)
* **Description**: Returns defined shift records.
* **Secret**: `2a760882-0b23-93ac-24c3-215762cba798`
* **Response Sample**:
```json
[
  {
    "id": "53aed45e-5a5e-4ed1-8164-3282a75f1471",
    "name": "General Shift",
    "startTime": "09:00:00",
    "endTime": "18:00:00",
    "weekDays": "Monday,Tuesday,Wednesday,Thursday,Friday",
    "isOperational": true,
    "shiftInterval": "9 Hours"
  }
]
```

### 3. `saveShift` (POST)
* **Description**: Creates or updates a shift definition.
* **Secret**: `317888e6-bf55-5192-9938-2185376f58fd`
* **Request Payload**:
```json
{
  "name": "B Shift",
  "startTime": "14:00:00",
  "endTime": "22:00:00",
  "weekDays": "Monday,Tuesday,Wednesday,Thursday,Friday",
  "isOperational": true,
  "doesShiftFallOnNextDay": false,
  "shiftInterval": "8 Hours"
}
```
* **Response Sample**:
```json
{
  "name": "B Shift",
  "startTime": "14:00:00",
  "endTime": "22:00:00",
  "weekDays": "Monday,Tuesday,Wednesday,Thursday,Friday",
  "isOperational": true,
  "doesShiftFallOnNextDay": false,
  "shiftInterval": "8 Hours"
}
```

### 4. `getEmployeeShiftMappings` (GET)
* **Description**: Retrieves shift mappings within a given date range.
* **Secret**: `3c8dce4c-f68d-115b-e278-a04b8a67a14d`
* **Parameters**: `startDate` (e.g., `2026-07-09`), `endDate` (e.g., `2026-07-09`).
* **Response Sample**:
```json
[
  {
    "id": "09e8e87c-4c25-43a5-9604-e50b07f775b4",
    "startDate": "2026-07-09",
    "endDate": "2026-07-09",
    "EmployeeId": "660fb9542aacbd33a4a6d251",
    "ShiftId": "53aed45e-5a5e-4ed1-8164-3282a75f1471",
    "Employee": {
      "id": "660fb9542aacbd33a4a6d251",
      "name": "Ashok K"
    },
    "Shift": {
      "id": "53aed45e-5a5e-4ed1-8164-3282a75f1471",
      "name": "B Shift"
    }
  }
]
```

### 5. `saveEmployeeShiftMapping` (POST)
* **Description**: Saves or removes a single mapping record.
* **Secret**: `5c655a88-c9f2-becd-2640-b92202cdfcb3`
* **Request Payload**:
```json
{
  "action": "SAVE",
  "EmployeeId": "660fb9542aacbd33a4a6d251",
  "ShiftId": "53aed45e-5a5e-4ed1-8164-3282a75f1471",
  "startDate": "2026-07-09",
  "endDate": "2026-07-09"
}
```
* **Response Sample**:
```json
{
  "employeeIds": "660fb9542aacbd33a4a6d251",
  "startDate": "2026-07-09",
  "endDate": "2026-07-09",
  "shiftId": "53aed45e-5a5e-4ed1-8164-3282a75f1471"
}
```

### 6. `bulkSaveEmployeeShiftMappings` (POST)
* **Description**: Saves multiple mapping records in bulk.
* **Secret**: `1cc3901d-4d31-de73-cb9c-0f38127f41f7`
* **Request Payload**:
```json
[
  {
    "EmployeeId": "660fb9542aacbd33a4a6d251",
    "ShiftId": "53aed45e-5a5e-4ed1-8164-3282a75f1471",
    "startDate": "2026-07-09",
    "endDate": "2026-07-09"
  }
]
```
* **Response Sample**:
```json
[
  {
    "id": "8ff62e32-bcbe-41ef-8528-6bfad713f28b",
    "startDate": "2026-07-09",
    "endDate": "2026-07-09",
    "EmployeeId": "660fb9542aacbd33a4a6d251",
    "ShiftId": "53aed45e-5a5e-4ed1-8164-3282a75f1471",
    "enabled": true
  }
]
```

---

## 4. Scratch Folder Test Scripts
The `scratch/` folder contains exactly one dedicated test file per endpoint:
* [getEmployeeDetail.js](file:///c:/Users/karan.s/Documents/Projects/External-Control/roster-control/scratch/getEmployeeDetail.js) — Fetches employees.
* [getShiftdetails61.js](file:///c:/Users/karan.s/Documents/Projects/External-Control/roster-control/scratch/getShiftdetails61.js) — Fetches shift list.
* [saveShift.js](file:///c:/Users/karan.s/Documents/Projects/External-Control/roster-control/scratch/saveShift.js) — Saves shift definitions.
* [getEmployeeShiftMappings.js](file:///c:/Users/karan.s/Documents/Projects/External-Control/roster-control/scratch/getEmployeeShiftMappings.js) — Queries current date mappings (applying client-side null filtration).
* [saveEmployeeShiftMapping.js](file:///c:/Users/karan.s/Documents/Projects/External-Control/roster-control/scratch/saveEmployeeShiftMapping.js) — Tests single mapping persistence.
* [bulkSaveEmployeeShiftMappings.js](file:///c:/Users/karan.s/Documents/Projects/External-Control/roster-control/scratch/bulkSaveEmployeeShiftMappings.js) — Tests bulk mapping persistence.
