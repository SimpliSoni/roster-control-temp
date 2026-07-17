import { ChangeDetectorRef, Component, Input, ViewChild } from '@angular/core';
import { RosterControl } from './components/roster-control/roster-control';
import { DsResult, ExternalCoreSimpleControl, RtOption } from 'external-den-core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RosterControl],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent implements ExternalCoreSimpleControl {
  @ViewChild(RosterControl) rosterControlComponent!: RosterControl;

  constructor(private cdr: ChangeDetectorRef) {
    console.log('APP COMPONENT CREATED');
  }

  @Input()
  onEventDataMapperResolved = (eventDataMapper: any, _data: RtOption<DsResult>) => {
    console.log('DEVUM APP EVENT:', eventDataMapper, _data);
    if (
      this.rosterControlComponent &&
      typeof (this.rosterControlComponent as any).handleEventDataMapperResolved === 'function'
    ) {
      (this.rosterControlComponent as any).handleEventDataMapperResolved(eventDataMapper, _data);
    }
  };

  @Input()
  setControlInstance = (instance: any) => {
    console.log('SET CONTROL INSTANCE', instance);
    if (this.rosterControlComponent) {
      this.rosterControlComponent.setControlInstance(instance);
    }
  };

  @Input()
  applyPropertyDefinitions = (_properties: any) => {
    console.log('APPLY PROPERTY DEFINITIONS', _properties);
    if (this.rosterControlComponent) {
      this.rosterControlComponent.applyPropertyDefinitions(_properties);
    }
  };

  @Input()
  applyConfigurationAttributes = (_attributes: any) => {
    console.log('APPLY CONFIGURATION ATTRIBUTES', _attributes);
    if (this.rosterControlComponent) {
      this.rosterControlComponent.applyConfigurationAttributes(_attributes);
    }
  };

  @Input()
  onDatasourceResolved = (datasource: any) => {
    console.log('DATASOURCE RESOLVED', datasource);
    console.log('onDatasourceResolved is working for getEmployeeShiftMappings');
    if (this.rosterControlComponent) {
      this.rosterControlComponent.onDatasourceResolved(datasource);
    }
  };
}
