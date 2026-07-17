# Devum Event Integration Guide (Reusable)

This document explains how to integrate Devum events in any web widget codebase. It uses our Angular implementation as a reference but is written to be reused across projects.

## Goals

- Keep drag and drop functional locally (ng serve).
- Emit Devum events through onEventDataMapperResolved when running inside Devum.
- Reuse the same payload shape for other event types.

## Key Concepts

- The Devum host injects an onEventDataMapperResolved callback into the widget. It is the bridge between the widget and Devum.
- Drag events are standard HTML5 Drag and Drop. Devum integration is added by sending a payload to onEventDataMapperResolved.
- Local development uses the same drag events, but the Devum callback is optional.

## Library and Dependency

We use the Devum interface types from the external-den-core dependency:

- Dependency: external-den-core (see package.json)
- Types used: ExternalCoreSimpleControl, DsResult, RtOption

These types define the shape of the Devum callback and data contracts. The actual callback function is provided by the Devum host at runtime.

## Where The Wiring Happens (Angular Example)

- Host callback is defined in: src/app/app.ts
- Child component uses the callback: src/app/components/location-details/location-details.ts
- The callback is passed in the template: src/app/app.html

## Current Event Flow (Drag)

1. User starts drag on the label.
2. onDragStart sets dataTransfer with a JSON payload using the MIME type application/drop-event-data.
3. onDragEnd logs a drag end payload.
4. The drop target reads the same MIME type, parses the JSON, and updates the UI.
5. If running in Devum, onEventDataMapperResolved is called with a payload that includes is_drag_active.

## Payload Shape (Baseline)

Devum expects a payload similar to:

{
  "value": {
    "id": null,
    "dsName": null,
    "data": [
      {
        "fieldName": "is_drag_active",
        "originalValue": true,
        "value": true,
        "uom": {},
        "referenceData": {}
      }
    ],
    "fks": [],
    "isWsResult": false,
    "_isDirectValue": false,
    "dataStateType": "INSERT"
  }
}

We also pass a drop-specific field when a label is dropped:

- fieldName: dropped_label
- value: the label string parsed from the drop payload

If Devum requires a different field name or structure, update the payload in location-details.ts.

## Drag Data Contract

The drop handler reads from the following fields (first match wins):

- assetName
- data[].fieldName == "assetName"
- label
- id

If Devum provides a different structure, update the parsing logic in onDropBoxDrop.

## Implementing Another Event Type (Reusable Pattern)

Use the same pattern as drag:

1. Identify the UI action (click, select, hover, drop, etc.).
2. Build a payload with the Devum structure.
3. Call onEventDataMapperResolved if it exists.
4. Optionally update local UI state.

Example template (framework-agnostic):

function emitDevumEvent(fields: Array<{ fieldName: string; value: any }>) {
  if (!this.onEventDataMapperResolved) return;

  const mapperPayload = {
    value: {
      id: null,
      dsName: null,
      data: fields.map(f => ({
        fieldName: f.fieldName,
        originalValue: f.value,
        value: f.value,
        uom: {},
        referenceData: {},
      })),
      fks: [],
      isWsResult: false,
      _isDirectValue: false,
      dataStateType: "INSERT",
    },
  };

  this.onEventDataMapperResolved(mapperPayload, {
    get: { data: fields.map(f => ({ fieldName: f.fieldName, value: f.value })) },
  });
}

## Example: Configuration + Event Mapper (Countdown)

This example shows how to handle configuration attributes and event mapper updates for a timer widget. It uses ExternalCoreSimpleControl from external-den-core and reacts to a mapped event (selectedTime).

```ts
import { Component, Input, signal, OnDestroy, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  DsResult,
  ExternalCoreSimpleControl,
  RtOption,
} from 'external-den-core';

enum WidgetConfig {
  inputTime = 'inputTime',
  timerMode = 'timerMode',
}

@Component({
  selector: 'app-countdown1',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './countdown.html',
})
export class countdown2 implements ExternalCoreSimpleControl, OnDestroy {
  constructor(private zone: NgZone) {}

  displayTime = signal('00:00:00');
  intervalId: any;
  inputTime = '00:00';
  timerMode: 'backward' | 'forward' = 'backward';

  startCountdown(): void {
    clearInterval(this.intervalId);
    if (!this.inputTime) return;

    const [hour, minute] = this.inputTime.split(':').map(Number);
    const targetTime = new Date();
    targetTime.setHours(hour, minute, 0, 0);

    const updateTimer = () => {
      const now = new Date();
      let difference = 0;

      if (this.timerMode === 'backward') {
        difference = Math.floor((targetTime.getTime() - now.getTime()) / 1000);
        if (difference <= 0) {
          clearInterval(this.intervalId);
          this.zone.run(() => this.displayTime.set('00:00:00'));
          return;
        }
      }

      if (this.timerMode === 'forward') {
        difference = Math.floor((now.getTime() - targetTime.getTime()) / 1000);
        if (difference < 0) difference = 0;
      }

      const hours = Math.floor(difference / 3600);
      const minutes = Math.floor((difference % 3600) / 60);
      const seconds = difference % 60;

      const timer = `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      this.zone.run(() => this.displayTime.set(timer));
    };

    updateTimer();
    this.intervalId = setInterval(updateTimer, 1000);
  }

  @Input()
  applyConfigurationAttributes = (attributes: any) => {
    const inputTimeAttr = attributes?.find(
      (x: any) => x.name === WidgetConfig.inputTime
    );
    const timerModeAttr = attributes?.find(
      (x: any) => x.name === WidgetConfig.timerMode
    );

    if (inputTimeAttr?.value) this.inputTime = inputTimeAttr.value;
    if (timerModeAttr?.value) this.timerMode = timerModeAttr.value;

    this.startCountdown();
  };

  @Input()
  onEventDataMapperResolved = (eventDataMapper: any, _data: RtOption<DsResult>) => {
    const response = typeof _data?.get === 'function' ? _data.get() : _data?.get;
    const rowData = response?.data?.[0];
    const selectedTime = rowData?.value || rowData?.originalValue;
    if (!selectedTime) return;

    this.inputTime = selectedTime.slice(0, 5);
    this.startCountdown();
  };

  @Input() setControlInstance = (_instance: any) => {};
  @Input() applyPropertyDefinitions = (_properties: any) => {};
  @Input() onDatasourceResolved = (_datasource: any) => {};

  ngOnDestroy(): void {
    clearInterval(this.intervalId);
  }
}
```

## Local vs Devum

- Local (ng serve):
  - Drag and drop works using native HTML5.
  - onEventDataMapperResolved is undefined unless Devum injects it.
  - Always guard with if (this.onEventDataMapperResolved).

- Devum:
  - The host should pass the callback to the widget.
  - The widget emits payloads as described above.
  - If the host uses a different MIME type or payload, update the parser.

## Troubleshooting

- Nothing happens on drop:
  - Check that dragstart sets application/drop-event-data.
  - Confirm the drop target uses preventDefault in dragover.
  - Verify parsed payload contains label fields.

- Devum does not react:
  - Confirm onEventDataMapperResolved is wired from host.
  - Validate payload matches Devum expectations.
  - Check Devum logs for rejected payloads.

## Files to Update (Angular Example)

- src/app/app.ts
- src/app/app.html
- src/app/components/location-details/location-details.ts
- src/app/components/location-details/location-details.html

## Applying This In Other Codebases

1. Add or expose a Devum callback (onEventDataMapperResolved) in the root component.
2. Pass the callback into child components that emit events.
3. Build the payload using the baseline schema above.
4. Always guard for local mode: if the callback is undefined, skip the emit.
5. Keep drag and drop using standard HTML5 APIs (dataTransfer + dragover preventDefault).

End.