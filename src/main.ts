import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import '@angular/compiler';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';

(async () => {
  const app = await createApplication(appConfig);
  const appElement = createCustomElement(AppComponent, { injector: app.injector });
  if (!customElements.get('roster-control')) {
    customElements.define('roster-control', appElement);
  }
})();

// keep the same name as the widget control