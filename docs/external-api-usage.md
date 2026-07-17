# External API Usage (Generic Pattern + Example)

#### Purpose

This document describes a generic pattern for consuming external APIs in a widget or UI layer. It also includes a concrete example from this repository (locations + assets) so the same approach can be reused in other codebases.

---

## 1. High-level flow (generic)

1. The UI requests one or more endpoints (parallel if possible).
2. A request interceptor injects shared auth headers and endpoint-specific secrets.
3. The UI merges data sets into the shape it needs for rendering.
4. User actions trigger mutation endpoints, and the UI rolls back on failure.

---

## 2. External endpoints (generic)

All endpoints are typically built from a base URL such as `environment.apiUrl`.

Common categories:

- **List/read endpoints:** `GET /<resource>`
- **Create/update endpoints:** `POST /<resource>`
- **Mapping endpoints:** `POST /<resource>/map` or similar
- **Delete endpoints:** `POST /<resource>/delete` or `DELETE /<resource>`

### Example endpoints (this repo)

- **Locations table:** `GET /devum/theraphy/getLocationDetails`
- **Assets table:** `GET /devum/theraphy/getAssestsDetails`
- **Map asset to location:** `POST /devum/theraphy/MapAssetToLocation`
- **Remove asset:** `POST /devum/theraphy/deleteAssetsService`

Example payload (map/remove):

```json
{
  "locationId": "<location-id>",
  "id": "<asset-id>"
}
```

---

## 3. Auth headers and endpoint secrets (generic)

Most Devum-compatible APIs require a fixed set of headers plus an endpoint-specific secret.

Typical shared headers:

- `orgcode`
- `appcode`
- `sitecode`
- `identifiertype`

Then a request interceptor injects a `clientSecret` based on the URL or route key.

### Example mapping (this repo)

- `getAssestsDetails` -> asset list secret
- `getLocationDetails` -> location list secret
- `MapAssetToLocation` -> map secret
- `deleteAssetsService` -> remove secret

If a new endpoint is added, update the interceptor with the new `clientSecret` mapping.

---

## 4. Where the calls happen (generic)

Typical layering:

- **UI component:** orchestrates calls, merges data, handles optimistic updates.
- **Service layer:** owns endpoint URLs and `HttpClient` calls.
- **Interceptor:** injects headers and endpoint-specific secrets.

### Example wiring (this repo)

- `LocationDetails` component: loads locations and assets, builds `assignedAssets`, performs mapping calls.
- `LocationService`: location + map + remove endpoints.
- `AssetService`: asset endpoint.
- `authInterceptor`: adds headers and secrets.

---

## 5. Data merge rules (generic)

When multiple lists are fetched:

- Use stable IDs to join records (string-normalized where needed).
- Build a derived view model (`assignedAssets`, `linkedItems`, etc.).
- Keep derived data in memory to avoid re-computing during UI interactions.

### Example merge (this repo)

- `location.mapAssets` is a comma-separated list of asset IDs.
- Each ID is matched against the asset list.
- Matched assets become `assignedAssets` sorted by `assetName`.

---

## 6. Optimistic updates (generic)

When a user action triggers a mutation:

1. Apply the change to the local UI first (optimistic update).
2. Call the API to persist the change.
3. Roll back if the request fails.

### Example mutation (this repo)

On drop:

- The asset is attached to the location in the UI.
- `MapAssetToLocation` is called.
- The UI rolls back if the API fails.

---

## 7. Common troubleshooting

- **401 or 403:** confirm the `clientSecret` for the endpoint in the interceptor.
- **No data:** verify the base URL and route suffix.
- **Merge issues:** confirm join keys match exactly and normalize IDs to strings.
- **UI mismatch:** check optimistic update + rollback logic.

---

## 8. Related files (example)

- `src/app/interceptors/auth-interceptor.ts`
- `src/app/components/location-details/location-details.ts`
- `src/app/components/location-details/location-service.ts`
- `src/app/services/asset.ts`
- `src/app/app.ts`