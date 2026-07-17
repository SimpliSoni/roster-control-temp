# External control using modern Angular (web component)

#### Purpose

This guide shows how to build an external control as a Web Component using modern Angular (v17+). It focuses on standalone components, `createApplication`, and `@angular/elements` so the control can run inside or outside an Angular host.

#### Prerequisites

- Node.js (LTS recommended).
- Angular CLI (same major version as your project).
- Basic knowledge of Web Components and Angular.

## 1. Create a new Angular project

```bash
ng new external-control --standalone --routing=false --style=css
cd external-control
```

Angular v17+ creates a standalone app by default, so you can build a component without `NgModule`.

## 2. Add the external core dependency

If your control needs Devum/External-Core types, add the dependency to `package.json` and install:

```json
{
  "dependencies": {
    "external-den-core": "file:./dist/external-den-core"
  }
}
```

```bash
npm install
```

If you are using a different package name (for example `external-den-core`), replace it accordingly.

## 3. Create the control component (standalone)

```bash
ng generate component calendar-control --standalone
```

Example component shape (standalone + Devum callbacks):

```ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ExternalCoreSimpleControl, RtOption, DsResult } from 'external-den-core';

enum PropertyDefinitionEnum {
  value = 'value',
}

@Component({
  selector: 'calendar-control',
  standalone: true,
  template: '<label (click)="onClick()">{{ label }}</label>',
})
export class ExternalLabelComponent implements ExternalCoreSimpleControl {
  label = 'External Label';

  @Output() emitCustomEvent = new EventEmitter();

  @Input()
  onDatasourceResolved = (_data: RtOption<any>) => {};

  @Input()
  setControlInstance = (_instance: any) => {};

  @Input()
  applyPropertyDefinitions = (_properties: any) => {};

  @Input()
  applyConfigurationAttributes = (_attributes: any) => {};

  @Input()
  onEventDataMapperResolved = (_event: any, _data: RtOption<DsResult>) => {};

  onClick(): void {
    this.emitCustomEvent.emit({ event: 'click', data: null });
  }
}
```

The callbacks above are injected by the host. Always guard usage in local mode.

## 4. Register the component as a custom element

In `src/main.ts`, use `createApplication` and `createCustomElement`:

```ts
import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { appConfig } from './app/app.config';
import { ExternalLabelComponent } from './app/calendar-control/calendar-control.component';

(async () => {
  const app = await createApplication(appConfig);
  const element = createCustomElement(ExternalLabelComponent, {
    injector: app.injector,
  });

  if (!customElements.get('calendar-control-widget')) {
    customElements.define('calendar-control-widget', element);
  }
})();
```

Note: `@angular/elements` requires `@angular/compiler` to be available at runtime. Add `import '@angular/compiler';` in `main.ts` if your build setup requires it.

## 5. Build the web component

```bash
ng build --configuration production --output-hashing none
```

Angular outputs to `dist/<project>/browser` by default (for application builds). You can host those files directly, or create a single bundle for simpler distribution.

## 6. Optional: create a single bundle

If you want one JS file, concatenate the output:

```bash
npm install --save-dev concat fs-extra
```

Create `build-widget.js`:

```js
const fs = require('fs-extra');
const concat = require('concat');

(async function build() {
  const files = [
    './dist/external-control/browser/main.js',
    './dist/external-control/browser/polyfills.js',
  ];

  await fs.ensureDir('widget');
  await concat(files, 'widget/external-control-widget.js');
})();
```

Then add a script:

```json
{
  "scripts": {
    "build:widget": "ng build --configuration production --output-hashing none && node build-widget.js"
  }
}
```

Run:

```bash
npm run build:widget
```

## 7. Use the web component outside Angular

Example `index.html` (same folder as the compiled JS):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>External Label Widget</title>
  </head>
  <body>
    <calendar-control-widget></calendar-control-widget>
    <script src="main.js"></script>
    <script src="polyfills.js"></script>
  </body>
</html>
```

If you used the single bundle approach, include only `external-control-widget.js`.

## 8. Event integration (Devum)

- The host injects `onEventDataMapperResolved` into the control.
- Emit events by building a payload and calling the callback.
- Always guard for local mode:

```ts
if (this.onEventDataMapperResolved) {
  this.onEventDataMapperResolved(payload, dataOption);
}
```

For a full event payload example and drag-and-drop shape, see [docs/devum-event-integration.md](docs/devum-event-integration.md).

## Troubleshooting

- `customElements.define` throws: ensure you only define once and check `customElements.get()`.
- The element does not render: confirm the selector and build output paths.
- Devum does not react: verify the callback wiring and payload shape.
- Local mode errors: the host callbacks may be undefined, so guard calls.