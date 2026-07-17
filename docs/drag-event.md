
### 1. Is "drag and drop" a variable?
There is no single variable named "drag and drop." Instead:
*   **`isDragging`**: A boolean variable used in both app.ts and location-details.ts to track the active drag state.
*   **`is_drag_active`**: A string key used within the event data payloads to signal to the system that a drag operation is in progress.
*   **`application/drop-event-data`**: The MIME type used to store and retrieve the dragged object's data via the `dataTransfer` object.

### 2. How is it implemented?
The implementation uses the **native HTML5 Drag and Drop API** rather than a complex library. Here’s the flow:
*   **`onDragStart`**: Triggered when a user starts dragging an item. it sets `isDragging = true` and encodes the item's data (ID and Name) into the `dataTransfer` object.
*   **`onDragOver`**: Prevents the default browser behavior to allow a drop to occur.
*   **`drop`**: Triggered when the item is released over a valid target (like a location). It retrieves the data, parses it, performs validation (e.g., checking if the asset is already allocated), and then calls a backend service (location-details.ts) to map the asset to the location.
*   **`onDragEnd`**: Resets `isDragging` to `false`.

### 3. Usage of `oneventdatamapper`
You are correct. The codebase relies on `onEventDataMapperResolved`, which is part of the `ExternalCoreSimpleControl` interface defined in the package.json dependency.

In app.ts, this function is implemented as an `@Input` callback:
*   It listens for "Devum" events.
*   It checks for the `is_drag_active` field in the event data to update the local `isDragging` state.
*   This suggests that the drag-and-drop state is synchronized with a host platform or other external widgets through this mapper.