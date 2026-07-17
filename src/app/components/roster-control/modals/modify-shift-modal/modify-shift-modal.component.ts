import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShiftDef } from '../../../../models/calendar.model';

@Component({
  selector: 'app-modify-shift-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, KeyValuePipe],
  templateUrl: './modify-shift-modal.component.html',
  styleUrls: ['./modify-shift-modal.component.css']
})
export class ModifyShiftModalComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() empName = '';
  @Input() empRole = '';
  @Input() duration = '';
  private _selectedShiftKey = '';

  @Input()
  set selectedShiftKey(value: string) {
    this._selectedShiftKey = value;
  }
  get selectedShiftKey(): string {
    return this._selectedShiftKey;
  }

  @Input() shiftDefs: { [key: string]: ShiftDef } = {};

  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<string>();
}
