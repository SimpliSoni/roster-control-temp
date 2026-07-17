import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Employee, ShiftDef, DayHeader } from '../../../models/calendar.model';

@Component({
  selector: 'app-roster-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './roster-table.component.html',
  styleUrls: ['./roster-table.component.css']
})
export class RosterTableComponent {
  @Input() currentView: 'day' | 'week' | 'month' = 'month';
  @Input() rosterHeaders: DayHeader[] = [];
  @Input() filteredEmployees: Employee[] = [];
  @Input() rosterAssignments: {
    [empId: string]: { [dateStr: string]: Array<{ shiftKey: string; altered: boolean }> };
  } = {};
  @Input() selectedHolidays: string[] = [];
  @Input() SHIFT_DEFS: { [key: string]: ShiftDef } = {};

  @Output() clickEmployee = new EventEmitter<string>();
  @Output() addShift = new EventEmitter<{ empId: string; dateStr: string }>();
  @Output() modifyShift = new EventEmitter<{ empId: string; dateStr: string; index: number }>();
  @Output() deleteShift = new EventEmitter<{ empId: string; dateStr: string; index: number }>();
}
