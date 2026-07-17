import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Employee } from '../../../../models/calendar.model';

@Component({
  selector: 'app-bulk-add-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bulk-add-modal.component.html',
  styleUrls: ['./bulk-add-modal.component.css']
})
export class BulkAddModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() employees: Employee[] = [];
  @Input() isLoading = false;
  @Input() shiftDefs: { [key: string]: any } = {};

  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<{
    dept: string;
    shift: string;
    from: string;
    to: string;
    empIds: string[];
  }>();

  bulkShift = '';
  bulkFrom = new Date().toISOString().split('T')[0];
  bulkTo = new Date().toISOString().split('T')[0];

  ngOnChanges(): void {
    if (this.isOpen && this.shiftDefs) {
      const keys = Object.keys(this.shiftDefs);
      if (keys.length > 0 && (!this.bulkShift || !keys.includes(this.bulkShift))) {
        this.bulkShift = keys[0];
      }
    }
  }

  applyBulkAdd(): void {
    const matchingEmpIds = this.employees.map((e) => e.employeeId);

    if (matchingEmpIds.length === 0) {
      alert('No employees available to apply bulk shifts.');
      return;
    }

    this.submit.emit({
      dept: 'All',
      shift: this.bulkShift,
      from: this.bulkFrom,
      to: this.bulkTo,
      empIds: matchingEmpIds,
    });
  }
}
