import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-delete-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delete-confirm-modal.component.html',
  styleUrls: ['./delete-confirm-modal.component.css']
})
export class DeleteConfirmModalComponent {
  @Input() isOpen = false;
  @Input() message = '';
  @Input() affectedMessage = '';

  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}
