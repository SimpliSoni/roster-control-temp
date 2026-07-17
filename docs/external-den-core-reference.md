# external-den-core reference (Devum integration)

#### Purpose

This document provides a compact reference for the exported types, classes, and helpers in `external-den-core`. It is intended to give AI and developers enough context to build or review Devum-compatible external controls without digging into the dependency source.

#### Package name in this repo

- `package.json` uses: `external-den-core` (file:./dist/external-den-core)
- The package metadata inside that folder is named: `external-den-core`

When importing, use what your project depends on:

```ts
import { ExternalCoreSimpleControl, RtOption, DsResult } from 'external-den-core';
```

If your app depends on `external-den-core` directly, replace the import path accordingly.

---

## Export surface (public-api)

From `public-api.d.ts`:

- `LogService`
- `ExternalCoreSimpleAngularControlInfo`
- `ExternalCoreSimpleControl`
- `ControlPropertyDefinitionValue`
- `DsResultValue`
- `RtOption`, `RtNone`
- `DsResult`, `DsResultBuilder`
- `ControlInstanceWrapper`
- `AttributeInstance`, `AttributeInstanceHolder`, `UsableAttributeValue`
- `StandardEvents`, `DesktopEvents`, `MobileEvents`, `SubEventType`, `DataSourceParamHandlerEvent`
- `ExternalCoreHelper`, `WindowConstant`

---

## Core interface for Devum controls

### `ExternalCoreSimpleControl`

This is the minimal contract your component implements so the Devum host can inject data and configuration.

```ts
export interface ExternalCoreSimpleControl {
  onDatasourceResolved(data: RtOption<any>): any;
  applyPropertyDefinitions(propertyDefinitions: ControlPropertyDefinitionValue[]): any;
  applyConfigurationAttributes(configurationAttributeValues: UsableAttributeValue<unknown>[]): any;
  setControlInstance(data: ControlInstanceWrapper): any;
}
```

Typical usage in Angular (standalone or module) is to expose these as `@Input()` callbacks so the host can set them.

### `ExternalCoreSimpleAngularControlInfo`

```ts
class ExternalCoreSimpleAngularControlInfo {
  constructor(viewContainerRef: ViewContainerRef, parentInstance: ControlInstanceWrapper)
}
```

Use when the host needs to pass view/container metadata for dynamic control insertion.

---

## Data binding primitives

### `RtOption<T>`

A lightweight option type used throughout the SDK.

Key API:
- `isDefined`, `isEmpty`
- `get` (throws if empty)
- `getOrElse(fn)`, `getOrElseV2(value)`, `getOrElseUndefined`, `getOrElseNull`
- `map(fn)`
- `toArray`
- `static parse(val)`

Helpers:
- `RtSome(value)`
- `RtNone()`

### `DsResultValue`

Represents one field in a Devum data row.

```ts
class DsResultValue {
  fieldName: string;
  originalValue: any;
  value: any;
  uom: RtOption<string>;
  referenceData: RtOption<unknown>;
  get hasValue(): boolean;
  get displayValue(): string;
  asFullyQualifiedDsResultValue(dsName: string): DsResultValue;
}
```

### `DsResult`

Represents a full data row for a data source.

Key API:
- `markAsWsResult`, `markAsNew`, `markAsUpdated`, `markAsDeleted`, `markAsApplied`
- `isNew`, `isUpdated`, `isDeleted`, `isDirectValue`, `isChanged`
- `getValueByKey(key)`
- `applyDsResults(newData)`
- `getChangedState(dsResults)`
- `static empty(keys)`
- `asFullyQualifiedDsResult(dsName)`

### `DsResultBuilder`

```ts
DsResultBuilder.createNew(id, dsName, [{ fieldName, value }])
```

### `DsResultArray`

Represents a paged list of results with helpers for merge/update operations.

Key API:
- `applyDsResults(newData, pageSize)`
- `overrideResults(results)`
- `concatDsResults(newData)`
- `markAllAsApplied`, `markAsUpdated`
- `getValueByMasterJoinKey(masterKeyValue, fkName, keys)`

---

## Property definition and configuration

### `ControlPropertyDefinitionValue`

Defines binding between control attributes and data source fields.

```ts
class ControlPropertyDefinitionValue {
  controlAttributeName: string;
  value?: any;
  dsPropertyName?: string | string[];
  uomBinding?: UomBinding;
  displayBindingType?: DisplayBindingType;
  cssTemplate?: string;
  jsTemplate?: string;
  static parse(value: ControlPropertyDefinitionValue): ControlPropertyDefinitionValue;
}
```

### `DisplayBindingType`

- `VALUE`
- `DISPLAY_VALUE`
- `UOM`

### `UomBinding`

```ts
class UomBinding {
  direct: any;
  uomOptions: any;
  rounding: number;
  static parse(uomBinding: UomBinding): UomBinding;
}
```

### `UsableAttributeValue<T>`

```ts
class UsableAttributeValue<T> {
  name: string;
  value: T;
  attributeType: string;
  withUpdatedValue(newValue: T): UsableAttributeValue<T>;
  as<U2>(): U2;
}
```

---

## Control instance metadata

### `ControlInstanceWrapper`

Wraps a `ControlInstance` and provides typed access to control metadata.

Key API:
- `getPropertyDefinition(propertyName)`
- `getConfigurationProperty(propertyName)`
- `allAttributeValues` (get/set)
- `propertyDefinitions` (get/set)
- `clone()`

### `ControlInstance` (core fields)

- `instanceId`, `parentInstanceId`, `ctrlType`, `controlName`, `pageName`
- `selectedDataSourceServiceInstanceId`, `dsDependentControlInstanceId`
- `allAttributeValues`, `propertyDefinitions`
- `controlConditionGroup`, `sequenceNo`, `identifier`

---

## Events and interaction

### `StandardEvents`, `DesktopEvents`, `MobileEvents`

Enumerations of common event names (e.g., `click`, `change`, `mouse_down`, `swipe_left`, `geolocation`).

### `SubEventType`

Represents an event with sub-properties (e.g., inactivity duration):

```ts
class SubEventType {
  constructor(id: string, eventProps: Map<string, any>);
  prop<T>(propertyName: string): T;
}
```

### `DataSourceParamHandlerEvent`

Static sets for ADD/REMOVE event groups and `validate(event)` helper.

---

## Helpers and utilities

### `ExternalCoreHelper`

Provides access to Devum context values (token, org/site/app data) using storage keys.

Key API:
- `getCognitoToken()`, `getApiKey()`
- `getSiteId()`, `getSiteCode()`
- `getAppCode()`
- `getIsAdmin()`, `getIsAppAdmin()`
- `getCurrentOrgTime()`
- `getApplicationConfig()`

### `WindowConstant`

Sets and reads app/site code on the `window` object.

Key API:
- `setAppCode(appCode)`
- `setSiteCode(siteCode)`
- `setAppAndSiteCode(appCode, siteCode)`
- `getAppAndSiteCode()`
- `getAppCode()`, `getSiteCode()`

### `LogService`

Client-side logging and error reporting.

Key API:
- `log(message, stack, category?, data?)`
- `warn(message, stack, category?, data?)`
- `error(message, stack, category?, data?)`
- `info(message)`
- `getLogSubscriptionAsObservable()`
- `getFileDetails(stack)`

---

## Storage keys

`WebStorageEnum` enumerates all Devum storage keys such as:

- `SITE_ID`, `SITE_CODE`, `APP_CODE`
- `API_KEY`, `ACCESS_TOKEN`
- `USER_PROFILE`, `USER_ROLES`, `USER_NAME`
- `CURRENT_ORG_TIME`, `ORG_SETTINGS`

Use `ExternalCoreHelper` instead of accessing these directly when possible.

---

## Devum integration patterns

### 1. Implement the control interface

```ts
export class MyWidget implements ExternalCoreSimpleControl {
  @Input() onDatasourceResolved = (data: RtOption<any>) => {};
  @Input() applyPropertyDefinitions = (_defs: ControlPropertyDefinitionValue[]) => {};
  @Input() applyConfigurationAttributes = (_attrs: UsableAttributeValue<unknown>[]) => {};
  @Input() setControlInstance = (_instance: ControlInstanceWrapper) => {};
}
```

### 2. Guard host callbacks in local mode

```ts
if (this.onEventDataMapperResolved) {
  this.onEventDataMapperResolved(payload, dataOption);
}
```

### 3. Use DsResult payloads for Devum events

- Build payloads using `DsResultValue` and `DsResultBuilder`.
- Keep field names aligned with your Devum event definitions.

See [docs/devum-event-integration.md](docs/devum-event-integration.md) for the baseline event payload shape.

---

## Reference source

This document is generated from the TypeScript declaration files under:

- `node_modules/external-den-core/src/*.d.ts`

If the package updates, re-check those files and refresh this reference.