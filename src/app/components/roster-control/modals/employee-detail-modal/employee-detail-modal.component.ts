import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Employee, ShiftDef, CalendarCell } from '../../../../models/calendar.model';

@Component({
  selector: 'app-employee-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './employee-detail-modal.component.html',
  styleUrls: ['./employee-detail-modal.component.css']
})
export class EmployeeDetailModalComponent {
  @Input() isOpen = false;
  @Input() emp: Employee | null = null;
  @Input() shiftsLabel = '';
  @Input() durationLabel = '';
  @Input() monthLabel = '';
  @Input() calCells: CalendarCell[] = [];
  @Input() shiftDefs: { [key: string]: ShiftDef } = {};

  @Output() close = new EventEmitter<void>();
  @Output() deleteAll = new EventEmitter<void>();
  @Output() prevMonth = new EventEmitter<void>();
  @Output() nextMonth = new EventEmitter<void>();
  @Output() clickDay = new EventEmitter<string>();
}
