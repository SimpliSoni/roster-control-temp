# External-Den-Core PACKAGE Documentation for AI

This document provides a compact reference for the exported types, classes, and helpers in `external-den-core`. It is intended to give AI and developers enough context to build or review Devum-compatible external controls without digging into the dependency source.

---

## 1. Core Integration Interface

The primary interface for creating custom controls in the Devum ecosystem.

### `ExternalCoreSimpleControl` (Interface)
Custom Angular components must implement this interface to interact with the Devum runtime.

- **`onDatasourceResolved(data: RtOption<any>): any`**: Called when the data source provides new data. This is typically where you update your component's internal state.
- **`applyPropertyDefinitions(propertyDefinitions: ControlPropertyDefinitionValue[]): any`**: Receives metadata about how control properties are mapped to data source fields.
- **`applyConfigurationAttributes(configurationAttributeValues: UsableAttributeValue<unknown>[]): any`**: Receives custom configuration attributes (e.g., styles, custom settings).
- **`setControlInstance(data: ControlInstanceWrapper): any`**: Provides the full wrapper for the control instance, allowing access to ID, parent info, and attribute collections.

---

## 2. Data Handling & Result Types

Devum uses specialized types to handle data source results and optional values.

### `RtOption<T>` (Class)
A functional "Option" or "Maybe" type used to represent values that might be missing (`null` or `undefined`).

- `isDefined`: Boolean, true if value exists.
- `isEmpty`: Boolean, true if value is missing.
- `get`: Returns the value (throws if empty).
- `getOrElse(fn: () => T)`: Returns value or result of function.
- `map<B>(fn: (t: T) => B)`: Transforms the value if it exists.
- `RtSome(value)` / `RtNone()`: Factory functions to create instances.

### `DsResult` (Class)
Represents a single row or record from a data source.

- `id`: Unique identifier of the record.
- `dsName`: Name of the source data source.
- `data`: Array of `DsResultValue` objects.
- `dataStateType`: Enum (`APPLIED`, `INSERT`, `UPDATE`, `DELETE`).
- `getValueByKey(key: string)`: Retrieves a `DsResultValue` for a specific field name.

### `DsResultValue` (Class)
Represents a single field value within a `DsResult`.

- `fieldName`: The name of the field.
- `value`: The processed value.
- `originalValue`: The raw value from the source.
- `uom`: `RtOption<string>` containing Units of Measure if applicable.
- `displayValue`: Formatted string representation for display.

### `DsResultArray` (Class)
A collection of `DsResult` objects (e.g., for lists or tables).

- `results`: `DsResult[]`.
- `totalResults`: Count of all matching records.
- `toList()`: Converts results to a 2D array of `DsResultValue`.

---

## 3. Control Configuration & Attributes

How controls are configured in the Devum designer.

### `ControlInstanceWrapper` (Class)
A wrapper around the raw `ControlInstance` entity, providing helper methods.

- `instanceId`: Unique ID for this control instance.
- `ctrlType`: String representing the control type (e.g., "Button", "Gauge").
- `allAttributeValues`: List of `AttributeInstance` (CSS and Configuration).
- `propertyDefinitions`: List of `ControlPropertyDefinitionValue` (Data bindings).
- `getConfigurationProperty(propertyName: string)`: Helper to find a specific attribute by name.
- `getPropertyDefinition(propertyName: string)`: Helper to find a data binding by name.

### `AttributeInstance<T>` (Class)
Represents a specific configuration or CSS attribute.

- `name`: Attribute name.
- `value`: Current value.
- `attributeType`: Enum (`CSS`, `CONFIGURATION`).

### `ControlPropertyDefinitionValue` (Class)
Maps a control's internal property to a data source field.

- `controlAttributeName`: The name of the property on the control.
- `dsPropertyName`: The field name(s) in the data source.
- `displayBindingType`: How to bind (`VALUE`, `DISPLAY_VALUE`, `UOM`).

---

## 4. Event System

Enumerations for standard interactions in Devum.

### `StandardEvents` (Enum)
Common events usable across all platforms:
- `CLICK`, `CHANGE`, `DBLCLICK`, `LOAD`, `TOGGLE`, `CHECKED`, `SELECTED`, `INPUT`, `QR_SCAN`, etc.

### `DesktopEvents` & `MobileEvents` (Enums)
Specific events for different environments:
- Desktop: `MOUSE_ENTER`, `MOUSE_LEAVE`, `GEO_LOCATION`.
- Mobile: `TAP`, `SWIPE_LEFT`, `DID_ENTER_REGION`.

---

## 5. Utilities & Services

### `LogService` (Class)
Standard logging service for reporting errors and info to Devum.

- `log(message, stack, category?, data?)`
- `error(message, stack, category?, data?)`
- `warn(message, stack, category?, data?)`
- `info(message)`

### `IdentityGenerator` (Static Class)
- `guid()`: Generates a unique string ID.

---

## 6. Implementation Pattern Example

When implementing `ExternalCoreSimpleControl`, use this pattern:

```typescript
import { 
  ExternalCoreSimpleControl, 
  RtOption, 
  DsResultArray, 
  ControlPropertyDefinitionValue 
} from 'external-den-core';

export class MyCustomControl implements ExternalCoreSimpleControl {
  
  onDatasourceResolved(data: RtOption<any>): void {
    if (data.isDefined) {
      const result = data.get;
      // Handle DsResult or DsResultArray
    }
  }

  applyPropertyDefinitions(props: ControlPropertyDefinitionValue[]): void {
    // Save or react to binding changes
  }

  applyConfigurationAttributes(attrs: any[]): void {
    // Apply styles or config
  }

  setControlInstance(wrapper: any): void {
    // Access control metadata
  }
}
```
