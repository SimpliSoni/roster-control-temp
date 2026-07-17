import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  DsResult,
  ExternalCoreSimpleControl,
  RtOption,
  ControlPropertyDefinitionValue,
} from 'external-den-core';
import { Employee, Shift, ShiftDef, DayHeader } from '../../models/calendar.model';
import { EmployeeService } from '../../services/employee.service';
import { forkJoin } from 'rxjs';
// Standalone subcomponents
import { RosterTableComponent } from './roster-table/roster-table.component';
import { ModifyShiftModalComponent } from './modals/modify-shift-modal/modify-shift-modal.component';
import { DeleteConfirmModalComponent } from './modals/delete-confirm-modal/delete-confirm-modal.component';
import { BulkAddModalComponent } from './modals/bulk-add-modal/bulk-add-modal.component';
import { EmployeeDetailModalComponent } from './modals/employee-detail-modal/employee-detail-modal.component';

@Component({
  selector: 'app-roster-control',
  standalone: true,
  imports: [
    FormsModule,
    RosterTableComponent,
    ModifyShiftModalComponent,
    DeleteConfirmModalComponent,
    BulkAddModalComponent,
    EmployeeDetailModalComponent,
  ],
  templateUrl: './roster-control.html',
  styleUrls: ['./roster-control.css'],
})
/**
 * RosterControl Component
 *
 * Manages employee rosters, shift assignments, bulk additions, modifications,
 * and views across day, week, and month calendars. Resolves datasource parameters
 * from the parent framework and coordinates updates to shift assignments.
 */
export class RosterControl implements OnInit, ExternalCoreSimpleControl {
  /** Event mapper callback invoked when shift maps are altered. */
  @Input() onEventDataMapperResolved: any;

  /** List of loaded employees to be displayed on the roster. */
  @Input() employees: Employee[] = [];

  /** Indicates whether initial or update operations are loading. */
  isLoading = false;

  /** Stores API error message if loading or modifications fail. */
  apiError: string | null = null;

  /** Array of configured holiday date strings (YYYY-MM-DD). */
  selectedHolidays: string[] = [];

  /** The active calendar view mode. */
  currentView: 'day' | 'week' | 'month' = 'month';

  /** Current day, month, and year for the roster workspace. */
  rosterDay = new Date().getDate();
  rosterMonth = new Date().getMonth() + 1;
  rosterYear = new Date().getFullYear();

  /** Active filter state for displaying employees (e.g., 'all', 'allotted', 'unallotted'). */
  rosterFilter = 'all';

  /** Search string filter for filtering employees by name or ID. */
  rosterSearch = '';

  /** Headers representing individual columns in the calendar grid. */
  rosterHeaders: DayHeader[] = [];

  /** Multi-shift assignments cache map: employeeId -> { YYYY-MM-DD: Array of shift assignments } */
  rosterAssignments: {
    [empId: string]: { [dateStr: string]: Array<{ shiftKey: string; altered: boolean }> };
  } = {};

  /** Configured shift definition details by key. */
  SHIFT_DEFS: { [key: string]: ShiftDef } = {};

  /** Visibilities of the respective detail/action modals. */
  isModifyShiftOpen = false;
  isEmpDetailOpen = false;
  isDeleteConfirmOpen = false;
  isBulkAddOpen = false;

  /** State variables keeping track of currently edited shift parameters. */
  currentEditEmpId = '';
  currentEditDateStr = '';
  currentEditShiftIdx: number | null = null;
  modifyShiftTitle = '';
  mshiftEmpName = '';
  mshiftEmpRole = '';
  mshiftDuration = '';
  selectedShiftKeyOption = '';

  /** Employee details modal state and grid cache. */
  empDetailEmp: Employee | null = null;
  empDetailMonth = new Date().getMonth() + 1;
  empDetailYear = new Date().getFullYear();
  empDetailShiftsLabel = '';
  empDetailDurLabel = '';
  empDetailMonthLabel = '';
  empDetailCalCells: Array<{
    dayNum: number;
    dateStr: string;
    bg: string;
    fc: string;
    border: string;
    shifts: Array<{ shiftKey: string; altered: boolean }>;
    titleText: string;
  }> = [];

  /** Active delete operation parameters and text configuration. */
  deleteTarget: {
    empId: string;
    dateStr?: string;
    shiftIdx?: number;
    mode: 'single' | 'all';
  } | null = null;
  delConfirmMsg = '';
  delAffectedMsg = '';

  /** Bulk operation submission state. */
  isBulkLoading = false;

  /** Key-UUID mappings for shifting records. */
  shiftUuidToKeyMap: { [uuid: string]: string } = {};
  shiftKeyToUuidMap: { [key: string]: string } = {};

  /** Raw cache responses. */
  shiftDetails: any[] = [];
  getEmployeeShiftMappings: any[] = [];
  private getEmployeeShiftMappingsPropertyName: string = '';
  dataSource: any;

  constructor(
    private cdr: ChangeDetectorRef,
    private employeeService: EmployeeService,
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.isLoading = true;
    this.apiError = null;

    forkJoin({
      employees: this.employeeService.getEmployees(),
      shifts: this.employeeService.getShifts(),
    }).subscribe({
      next: ({ employees, shifts }) => {
        this.isLoading = false;

        // Process shifts
        if (shifts && Array.isArray(shifts)) {
          this.SHIFT_DEFS = {};
          this.shiftDetails = shifts;

          shifts.forEach((shift) => {
            const key = shift.name.replace(' Shift', '');
            if (shift.id) {
              this.shiftUuidToKeyMap[shift.id] = key;
              this.shiftKeyToUuidMap[key] = shift.id;
            }
            this.shiftUuidToKeyMap[shift.name] = key;

            const formatTime = (t: string) => {
              if (!t) return '';
              const parts = t.split(':');
              return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : t;
            };

            const startTimeFormatted = formatTime(shift.startTime);
            const endTimeFormatted = formatTime(shift.endTime);
            const timeLabel =
              startTimeFormatted && endTimeFormatted
                ? `${startTimeFormatted} – ${endTimeFormatted}`
                : '';

            const oldDef = this.SHIFT_DEFS[key];
            this.SHIFT_DEFS[key] = {
              label: shift.name,
              time: timeLabel,
              cls: oldDef?.cls || `shift-${key.toLowerCase()}`,
              bg: oldDef?.bg || this.getShiftColor(key),
              color: oldDef?.color || '#fff',
            };
          });
        }

        // Process employees
        if (employees && Array.isArray(employees)) {
          this.employees = employees.map((emp: any) => ({
            ...emp,
            dbId: emp.id || emp.employeeId || '',
            id: emp.employeeId || emp.id || '',
            name: emp.name || 'Unnamed Employee',
            dept: emp.dept || 'Operations',
            role: emp.role || 'Operator',
            gender: emp.gender || 'Male',
            shift: emp.shift || 'General',
            status: emp.status || 'Active',
            expiry: emp.expiry || '',
            backup: emp.backup || false,
            consent: emp.consent !== undefined ? emp.consent : true,
          }));
        } else {
          this.employees = [];
        }

        // this.generateRosterHeaders();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load initial data from APIs:', err);
        this.isLoading = false;
        this.apiError = 'Failed to load employees/shifts from APIs.';
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Returns a matching color code for the shift type.
   * @param key Shift category/key.
   */
  getShiftColor(key: string): string {
    const presets: { [key: string]: string } = {
      First: '#2196F3',
      Second: '#4CAF50',
      Third: '#9C27B0',
      Leave: '#FAEEDA',
      Holiday: '#FCEBEB',
      Backup: '#E1F5EE',
    };
    return presets[key] || '#185FA5';
  }

  /**
   * Triggers parsing and cache loading of shift assignments.
   */
  loadRosterAssignments(): void {
    if (!this.employees.length || !this.rosterHeaders.length) return;
    console.log('loadRosterAssignments: Populating mappings from framework datasource.');

    if (!Array.isArray(this.dataSource)) {
      return;
    }

    const newAssignments: typeof this.rosterAssignments = {};

    // Initialize shift assignments object for each employee
    this.employees.forEach((emp) => {
      newAssignments[emp.id] = {};
    });
    const rosterList = this.dataSource;

    rosterList.forEach((item: any) => {
      const jsonData = this.normalizeRosterRow(item);

      if (jsonData) {
        const empId =
          this.getRowFieldValue(item, ['employeenumber', 'employeeNumber', 'employeeid', 'employeeId', 'id']) ||
          jsonData.employeenumber ||
          jsonData.employeeNumber ||
          jsonData.employeeid ||
          jsonData.employeeId ||
          jsonData.id ||
          '';
        const empName =
          this.getRowFieldValue(item, ['employeename', 'employeeName', 'name', 'fullName', 'role']) ||
          jsonData.employeename ||
          jsonData.employeeName ||
          jsonData.name ||
          jsonData.role ||
          'Unnamed Employee';

        // Match the employee by employeeId / dbId / name
        const employee = this.employees.find(
          (e) =>
            e.id === empId ||
            e.employeeId === empId ||
            e.dbId === empId ||
            (e.name && empName && e.name.trim().toLowerCase() === empName.trim().toLowerCase()),
        );
        if (!employee) return;
        const resolvedEmpId = employee.id;

        const details =
          this.asArray(
            this.getRowFieldValue(item, ['Details', 'details', 'shiftdata', 'shiftData']) ||
              jsonData.Details ||
              jsonData.details ||
              jsonData.shiftdata ||
              jsonData.shiftData,
          ) || [];

        if (Array.isArray(details)) {
          details.forEach((detail: any) => {
            const shiftIdStr = detail.shiftid;
            if (!shiftIdStr) return;

            let resolvedShiftKey = 'General';

            // Find matching shift from nested shiftdata to get its name
            let resolvedShiftName = '';
            if (detail.shiftdata && Array.isArray(detail.shiftdata)) {
              const matchingShift = detail.shiftdata.find(
                (sd: any) => sd.id === shiftIdStr || sd.shiftid === shiftIdStr,
              );
              if (matchingShift) {
                resolvedShiftName = matchingShift.shiftname || matchingShift.name || '';
              }
            }

            if (this.shiftUuidToKeyMap[shiftIdStr]) {
              resolvedShiftKey = this.shiftUuidToKeyMap[shiftIdStr];
            } else if (resolvedShiftName && this.shiftUuidToKeyMap[resolvedShiftName]) {
              resolvedShiftKey = this.shiftUuidToKeyMap[resolvedShiftName];
            } else {
              const searchStr = resolvedShiftName || shiftIdStr;
              const cleanSearch = searchStr.replace(' Shift', '').trim().toLowerCase();
              const keyFromLabel = Object.keys(this.SHIFT_DEFS).find((k) => {
                const label = this.SHIFT_DEFS[k].label || '';
                return (
                  label.toLowerCase() === searchStr.toLowerCase() ||
                  k.toLowerCase() === searchStr.toLowerCase() ||
                  label.replace(' Shift', '').toLowerCase() === cleanSearch ||
                  k.toLowerCase() === cleanSearch
                );
              });
              if (keyFromLabel) {
                resolvedShiftKey = keyFromLabel;
              } else if (this.SHIFT_DEFS[searchStr]) {
                resolvedShiftKey = searchStr;
              }
            }

            // Extract day from the mock date and construct date for current rosterMonth & rosterYear
            const dateParts = detail.date.split('T')[0].split('-');
            if (dateParts.length < 3) return;
            const day = parseInt(dateParts[2], 10);
            const mappedDateStr = `${this.rosterYear}-${String(this.rosterMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            const isDateInHeaders = this.rosterHeaders.some((h) => h.dateStr === mappedDateStr);
            if (!isDateInHeaders) return;

            if (!newAssignments[resolvedEmpId]) {
              newAssignments[resolvedEmpId] = {};
            }
            if (!newAssignments[resolvedEmpId][mappedDateStr]) {
              newAssignments[resolvedEmpId][mappedDateStr] = [];
            }
            if (
              !newAssignments[resolvedEmpId][mappedDateStr].some(
                (s) => s.shiftKey === resolvedShiftKey,
              )
            ) {
              newAssignments[resolvedEmpId][mappedDateStr].push({
                shiftKey: resolvedShiftKey,
                altered: false,
              });
            }
          });
        }
      }
    });

    this.rosterAssignments = newAssignments;
    this.cdr.detectChanges();
  }

  /**
   * Converts a datasource row into a plain object, handling DsResult and DsResultValue[] shapes.
   */
  private normalizeRosterRow(item: any): any {
    if (!item) return null;

    if (typeof item.data === 'string') {
      try {
        return JSON.parse(item.data);
      } catch (e) {
        console.error('Error parsing datasource row string:', e);
        return null;
      }
    }

    if (Array.isArray(item.data)) {
      const normalized: any = {};
      item.data.forEach((field: any) => {
        if (!field || !field.fieldName) return;

        const value = field.value !== undefined ? field.value : field.originalValue;
        const fieldName = String(field.fieldName);
        const shortName = fieldName.split('.').pop() || fieldName;

        normalized[fieldName] = value;
        normalized[shortName] = value;
        normalized[shortName.toLowerCase()] = value;
      });
      return normalized;
    }

    if (item.data && typeof item.data === 'object') {
      return item.data;
    }

    if (typeof item === 'object') {
      return item;
    }

    return null;
  }

  /**
   * Resolves a value from a datasource row using multiple possible field names.
   */
  private getRowFieldValue(item: any, fieldNames: string[]): any {
    if (!item) return undefined;

    const normalizedRow = this.normalizeRosterRow(item);
    if (!normalizedRow) return undefined;

    for (const fieldName of fieldNames) {
      const directValue = normalizedRow[fieldName];
      if (directValue !== undefined) return directValue;

      const lowerFieldName = fieldName.toLowerCase();
      const matchedKey = Object.keys(normalizedRow).find(
        (key) => key.toLowerCase() === lowerFieldName || key.toLowerCase().endsWith(`.${lowerFieldName}`),
      );
      if (matchedKey) return normalizedRow[matchedKey];
    }

    return undefined;
  }

  /**
   * Normalizes a value into an array when the datasource stores JSON strings.
   */
  private asArray(value: any): any[] | null {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : null;
      } catch (e) {
        console.error('Error parsing array-like datasource value:', e);
        return null;
      }
    }
    return null;
  }

  /**
   * Processes employee shift mapping records. Maps keys to local model caches.
   * @param mappings Shift assignment details parsed from API datasource.
   */
  processShiftMappings(mappings: any[]): void {
    this.getEmployeeShiftMappings = mappings;
    const newAssignments: typeof this.rosterAssignments = {};

    // Initialize shift assignments object for each employee
    this.employees.forEach((emp) => {
      newAssignments[emp.id] = {};
    });

    if (mappings && Array.isArray(mappings) && mappings.length > 0) {
      const getFKId = (fk: any): string => {
        if (!fk) return '';
        if (typeof fk === 'object') {
          return fk.id || fk._id || fk.$oid || '';
        }
        return String(fk);
      };

      mappings.forEach((mapping) => {
        const empFK =
          (mapping as any).EmployeeId ||
          (mapping as any).EmployeeID ||
          mapping.employeeId ||
          (mapping as any).employeeid ||
          (mapping as any).Employee ||
          (mapping as any).employeeld;
        const shiftFK =
          (mapping as any).ShiftId ||
          (mapping as any).ShiftID ||
          mapping.shiftId ||
          (mapping as any).shiftid ||
          (mapping as any).Shift;
        const startDateStr = mapping.startDate;
        const endDateStr = mapping.endDate;

        const empIdStr = getFKId(empFK);
        const shiftIdStr = getFKId(shiftFK);

        if (!empIdStr || !shiftIdStr || !startDateStr || !endDateStr) return;

        const employee = this.employees.find(
          (e) =>
            e.dbId === empIdStr ||
            e.id === empIdStr ||
            e.employeeId === empIdStr ||
            (e.name && empIdStr && e.name.trim().toLowerCase() === empIdStr.trim().toLowerCase()),
        );
        if (!employee) return;
        const resolvedEmpId = employee.id;

        let resolvedShiftKey = 'General';
        if (this.shiftUuidToKeyMap[shiftIdStr]) {
          resolvedShiftKey = this.shiftUuidToKeyMap[shiftIdStr];
        } else {
          const keyFromLabel = Object.keys(this.SHIFT_DEFS).find(
            (k) => this.SHIFT_DEFS[k].label === shiftIdStr || k === shiftIdStr,
          );
          if (keyFromLabel) {
            resolvedShiftKey = keyFromLabel;
          } else if (this.SHIFT_DEFS[shiftIdStr]) {
            resolvedShiftKey = shiftIdStr;
          } else {
            return;
          }
        }

        const dates = this.getDatesInRange(startDateStr, endDateStr);
        dates.forEach((dateStr) => {
          const isDateInHeaders = this.rosterHeaders.some((h) => h.dateStr === dateStr);
          if (!isDateInHeaders) return;

          if (!newAssignments[resolvedEmpId]) {
            newAssignments[resolvedEmpId] = {};
          }
          if (!newAssignments[resolvedEmpId][dateStr]) {
            newAssignments[resolvedEmpId][dateStr] = [];
          }
          if (
            !newAssignments[resolvedEmpId][dateStr].some((s) => s.shiftKey === resolvedShiftKey)
          ) {
            newAssignments[resolvedEmpId][dateStr].push({
              shiftKey: resolvedShiftKey,
              altered: false,
            });
          }
        });
      });
    }

    this.rosterAssignments = newAssignments;
    this.cdr.detectChanges();
  }

  /**
   * Returns a list of date strings (YYYY-MM-DD) representing all dates in the range inclusive.
   * @param startDate Range start date string.
   * @param endDate Range end date string.
   */
  getDatesInRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  /**
   * Generates calendar headers depending on the selected view (day, week, month).
   * Populates `rosterHeaders` with dates, names of days, and markers identifying "today".
   */
  generateRosterHeaders(): void {
    const today = new Date();
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const tempHeaders: DayHeader[] = [];

    if (this.currentView === 'month') {
      const daysInMonth = new Date(this.rosterYear, this.rosterMonth, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(this.rosterYear, this.rosterMonth - 1, d);
        const dow = dayNames[dateObj.getDay()];
        const dateStr = `${this.rosterYear}-${String(this.rosterMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday =
          today.getDate() === d &&
          today.getMonth() === this.rosterMonth - 1 &&
          today.getFullYear() === this.rosterYear;

        tempHeaders.push({
          dayNum: d,
          dow,
          isToday,
          dateStr,
        });
      }
    } else if (this.currentView === 'week') {
      const dateObj = new Date(this.rosterYear, this.rosterMonth - 1, this.rosterDay);
      const dayOfWeek = dateObj.getDay();
      const startOfWeek = new Date(dateObj);
      startOfWeek.setDate(dateObj.getDate() - dayOfWeek);

      for (let i = 0; i < 7; i++) {
        const current = new Date(startOfWeek);
        current.setDate(startOfWeek.getDate() + i);

        const d = current.getDate();
        const m = current.getMonth() + 1;
        const y = current.getFullYear();
        const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday =
          today.getDate() === d &&
          today.getMonth() === current.getMonth() &&
          today.getFullYear() === y;

        tempHeaders.push({
          dayNum: d,
          dow: dayNames[current.getDay()],
          isToday,
          dateStr,
        });
      }
    } else {
      const dateObj = new Date(this.rosterYear, this.rosterMonth - 1, this.rosterDay);
      const d = dateObj.getDate();
      const m = dateObj.getMonth() + 1;
      const y = dateObj.getFullYear();
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday =
        today.getDate() === d &&
        today.getMonth() === dateObj.getMonth() &&
        today.getFullYear() === y;

      tempHeaders.push({
        dayNum: d,
        dow: dayNames[dateObj.getDay()],
        isToday,
        dateStr,
      });
    }
    this.rosterHeaders = tempHeaders;
    this.loadRosterAssignments();
  }

  /**
   * Retrieves the human-readable description for the active roster interval label.
   */
  get monthLabel(): string {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    if (this.currentView === 'month') {
      return `${monthNames[this.rosterMonth - 1]} ${this.rosterYear}`;
    } else if (this.currentView === 'week') {
      if (this.rosterHeaders.length === 0) return '';
      const first = new Date(this.rosterHeaders[0].dateStr);
      const last = new Date(this.rosterHeaders[this.rosterHeaders.length - 1].dateStr);
      const firstMonth = monthNames[first.getMonth()].substring(0, 3);
      const lastMonth = monthNames[last.getMonth()].substring(0, 3);
      if (first.getFullYear() !== last.getFullYear()) {
        return `${firstMonth} ${first.getDate()}, ${first.getFullYear()} – ${lastMonth} ${last.getDate()}, ${last.getFullYear()}`;
      }
      if (first.getMonth() !== last.getMonth()) {
        return `${firstMonth} ${first.getDate()} – ${lastMonth} ${last.getDate()}, ${first.getFullYear()}`;
      }
      return `${firstMonth} ${first.getDate()} – ${last.getDate()}, ${first.getFullYear()}`;
    } else {
      if (this.rosterHeaders.length === 0) return '';
      const d = new Date(this.rosterHeaders[0].dateStr);
      return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    }
  }

  /**
   * Filters the master employee list by search keyword and allotment status.
   */
  get filteredEmployees(): Employee[] {
    const searchVal = this.rosterSearch.toLowerCase();
    return this.employees.filter((e) => {
      if (
        searchVal &&
        !e.name.toLowerCase().includes(searchVal) &&
        !e.id.toLowerCase().includes(searchVal)
      ) {
        return false;
      }
      const hasAny = this.rosterHeaders.some((header) => {
        const assignments = this.rosterAssignments[e.id]?.[header.dateStr] || [];
        return assignments.length > 0;
      });
      if (this.rosterFilter === 'allotted') {
        return hasAny;
      }
      if (this.rosterFilter === 'unallotted') {
        return !hasAny;
      }
      return true;
    });
  }

  /**
   * Navigates the roster view back by one interval (day, week, or month).
   */
  prevMonth(): void {
    if (this.currentView === 'month') {
      this.rosterMonth--;
      if (this.rosterMonth < 1) {
        this.rosterMonth = 12;
        this.rosterYear--;
      }
    } else if (this.currentView === 'week') {
      const d = new Date(this.rosterYear, this.rosterMonth - 1, this.rosterDay - 7);
      this.rosterDay = d.getDate();
      this.rosterMonth = d.getMonth() + 1;
      this.rosterYear = d.getFullYear();
    } else {
      const d = new Date(this.rosterYear, this.rosterMonth - 1, this.rosterDay - 1);
      this.rosterDay = d.getDate();
      this.rosterMonth = d.getMonth() + 1;
      this.rosterYear = d.getFullYear();
    }
    this.generateRosterHeaders();
  }

  /**
   * Navigates the roster view forward by one interval (day, week, or month).
   */
  nextMonth(): void {
    if (this.currentView === 'month') {
      this.rosterMonth++;
      if (this.rosterMonth > 12) {
        this.rosterMonth = 1;
        this.rosterYear++;
      }
    } else if (this.currentView === 'week') {
      const d = new Date(this.rosterYear, this.rosterMonth - 1, this.rosterDay + 7);
      this.rosterDay = d.getDate();
      this.rosterMonth = d.getMonth() + 1;
      this.rosterYear = d.getFullYear();
    } else {
      const d = new Date(this.rosterYear, this.rosterMonth - 1, this.rosterDay + 1);
      this.rosterDay = d.getDate();
      this.rosterMonth = d.getMonth() + 1;
      this.rosterYear = d.getFullYear();
    }
    this.generateRosterHeaders();
  }

  /**
   * Resets active roster date configuration to the current local date.
   */
  goToday(): void {
    const t = new Date();
    this.rosterDay = t.getDate();
    this.rosterMonth = t.getMonth() + 1;
    this.rosterYear = t.getFullYear();
    this.generateRosterHeaders();
  }

  /**
   * Updates current roster view perspective.
   * @param view Calendar view mode.
   */
  setView(view: 'day' | 'week' | 'month'): void {
    this.currentView = view;
    this.generateRosterHeaders();
  }

  /**
   * Applies an allotment filter constraint to the list of employees.
   * @param f Filter selection.
   */
  filterRoster(f: string): void {
    this.rosterFilter = f;
  }

  /**
   * Opens the shift modification modal popup.
   */
  openModifyShift(empId: string, dateStr: string, shiftIdx: number): void {
    this.currentEditEmpId = empId;
    this.currentEditDateStr = dateStr;
    this.currentEditShiftIdx = shiftIdx;

    const emp = this.employees.find((e) => e.id === empId);
    if (!emp) return;

    const d = new Date(dateStr);
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    this.modifyShiftTitle = `Modify Shift for ${d.getDate()}${this.ordinal(d.getDate())} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    this.mshiftEmpName = emp.name;
    this.mshiftEmpRole = emp.role;
    this.mshiftDuration = `${dateStr} – ${dateStr}`;

    const current = (this.rosterAssignments[empId]?.[dateStr] || [])[shiftIdx];
    this.selectedShiftKeyOption = current ? current.shiftKey : '';
    this.isModifyShiftOpen = true;
  }

  /**
   * Opens the shift addition modal popup.
   */
  openAddShift(empId: string, dateStr: string): void {
    this.currentEditEmpId = empId;
    this.currentEditDateStr = dateStr;
    this.currentEditShiftIdx = null;

    const emp = this.employees.find((e) => e.id === empId);
    if (!emp) return;

    const d = new Date(dateStr);
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    this.modifyShiftTitle = `Add Shift for ${d.getDate()}${this.ordinal(d.getDate())} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    this.mshiftEmpName = emp.name;
    this.mshiftEmpRole = emp.role;
    this.mshiftDuration = dateStr;

    const keys = Object.keys(this.SHIFT_DEFS);
    this.selectedShiftKeyOption = keys.length > 0 ? keys[0] : '';
    this.isModifyShiftOpen = true;
  }

  /**
   * Applies the modified or added shift value by invoking save mapping API on server.
   */
  applyModifyShift(): void {
    if (!this.selectedShiftKeyOption) {
      alert('Please select a shift.');
      return;
    }

    const emp = this.employees.find((e) => e.id === this.currentEditEmpId);
    if (!emp) return;

    const dbEmpId = emp.dbId || emp.id;
    const dbShiftId =
      this.shiftKeyToUuidMap[this.selectedShiftKeyOption] || this.selectedShiftKeyOption;

    const payload = {
      action: 'SAVE',
      EmployeeId: dbEmpId,
      startDate: this.currentEditDateStr,
      endDate: this.currentEditDateStr,
      ShiftId: dbShiftId,
    };

    this.employeeService.saveEmployeeShiftMapping(payload).subscribe({
      next: () => {
        this.isModifyShiftOpen = false;

        if (!this.rosterAssignments[this.currentEditEmpId]) {
          this.rosterAssignments[this.currentEditEmpId] = {};
        }
        if (!this.rosterAssignments[this.currentEditEmpId][this.currentEditDateStr]) {
          this.rosterAssignments[this.currentEditEmpId][this.currentEditDateStr] = [];
        }
        const arr = this.rosterAssignments[this.currentEditEmpId][this.currentEditDateStr];
        if (this.currentEditShiftIdx !== null) {
          arr[this.currentEditShiftIdx] = { shiftKey: this.selectedShiftKeyOption, altered: true };
        } else {
          arr.push({ shiftKey: this.selectedShiftKeyOption, altered: false });
        }

        this.cdr.detectChanges();

        this.emitDevumPayload(
          'modify_shift',
          this.currentEditEmpId,
          this.currentEditDateStr,
          this.selectedShiftKeyOption,
        );
      },
      error: (err) => {
        console.error('Failed to save shift mapping on server:', err);
        alert('Failed to save shift mapping on the server. Please try again.');
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Opens delete confirmation modal for a specific shift.
   */
  openDeleteShift(empId: string, dateStr: string, shiftIdx: number): void {
    this.deleteTarget = { empId, dateStr, shiftIdx, mode: 'single' };
    const d = new Date(dateStr);
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    this.delConfirmMsg = 'Are you really sure to delete this shift entry??';
    this.delAffectedMsg = `Only ${d.getDate()} ${monthNames[d.getMonth()]} roster will get deleted`;
    this.isDeleteConfirmOpen = true;
  }

  /**
   * Opens delete confirmation modal to wipe all shifts assigned to an employee.
   */
  openDeleteAllModal(): void {
    if (!this.empDetailEmp) return;
    this.deleteTarget = { empId: this.empDetailEmp.id, mode: 'all' };
    this.delConfirmMsg = `Delete all roster entries for ${this.empDetailEmp.name}?`;
    this.delAffectedMsg = 'This action will remove all Shift actions from the Employee';
    this.isEmpDetailOpen = false;
    this.isDeleteConfirmOpen = true;
  }

  /**
   * Confirms deletion targeting either a single shift or all shifts assigned to the employee.
   */
  confirmDelete(): void {
    if (!this.deleteTarget) return;

    const emp = this.employees.find((e) => e.id === this.deleteTarget!.empId);
    const dbEmpId = emp ? emp.dbId || emp.id : this.deleteTarget!.empId;

    if (
      this.deleteTarget.mode === 'single' &&
      this.deleteTarget.dateStr !== undefined &&
      this.deleteTarget.shiftIdx !== undefined
    ) {
      const payload = {
        action: 'DELETE',
        EmployeeId: dbEmpId,
        startDate: this.deleteTarget.dateStr,
        endDate: this.deleteTarget.dateStr,
      };

      this.employeeService.saveEmployeeShiftMapping(payload).subscribe({
        next: () => {
          this.isDeleteConfirmOpen = false;
          const empId = this.deleteTarget!.empId;
          const dateStr = this.deleteTarget!.dateStr!;
          const shiftIdx = this.deleteTarget!.shiftIdx!;
          const arr = this.rosterAssignments[empId]?.[dateStr] || [];
          arr.splice(shiftIdx, 1);
          this.rosterAssignments[empId][dateStr] = arr;

          this.cdr.detectChanges();

          this.emitDevumPayload(
            'delete_shift',
            this.deleteTarget!.empId,
            this.deleteTarget!.dateStr || '',
            '',
          );
        },
        error: (err) => {
          console.error('Failed to delete shift mapping on server:', err);
          alert('Failed to delete shift mapping on the server. Please try again.');
          this.isDeleteConfirmOpen = false;
          this.cdr.detectChanges();
        },
      });
    } else if (this.deleteTarget.mode === 'all') {
      const payload = {
        action: 'DELETE',
        EmployeeId: dbEmpId,
        startDate: '2000-01-01',
        endDate: '2099-12-31',
      };

      this.employeeService.saveEmployeeShiftMapping(payload).subscribe({
        next: () => {
          this.isDeleteConfirmOpen = false;
          const empId = this.deleteTarget!.empId;
          this.rosterAssignments[empId] = {};

          this.cdr.detectChanges();

          this.emitDevumPayload(
            'delete_shift',
            this.deleteTarget!.empId,
            this.deleteTarget!.dateStr || '',
            '',
          );
        },
        error: (err) => {
          console.error('Failed to delete all shift mappings on server:', err);
          alert('Failed to delete shift mappings on the server. Please try again.');
          this.isDeleteConfirmOpen = false;
          this.cdr.detectChanges();
        },
      });
    }
  }

  /**
   * Opens the detailed employee calendar modal.
   * @param empId Employee identification string.
   */
  openEmpDetail(empId: string): void {
    const emp = this.employees.find((e) => e.id === empId);
    if (!emp) return;
    this.empDetailEmp = emp;
    this.empDetailMonth = this.rosterMonth;
    this.empDetailYear = this.rosterYear;
    this.renderEmpDetCalendar();
    this.isEmpDetailOpen = true;
  }

  /**
   * Renders calendar grid cells for selected employee detail view.
   */
  renderEmpDetCalendar(): void {
    if (!this.empDetailEmp) return;
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    this.empDetailMonthLabel = `${monthNames[this.empDetailMonth - 1]} ${this.empDetailYear}`;

    const empId = this.empDetailEmp.id;
    const dates = Object.keys(this.rosterAssignments[empId] || {})
      .filter((d) => {
        const parts = d.split('-');
        return (
          parts.length === 3 &&
          parseInt(parts[0], 10) === this.empDetailYear &&
          parseInt(parts[1], 10) === this.empDetailMonth
        );
      })
      .sort();

    this.empDetailDurLabel = dates.length ? `${dates[0]} – ${dates[dates.length - 1]}` : '—';

    const empShifts = dates.map((d) => this.rosterAssignments[empId][d] || []);
    const uniqueShifts = [...new Set(empShifts.flat().map((s) => s.shiftKey))].filter(
      (s) => !['Leave', 'Holiday'].includes(s),
    );
    this.empDetailShiftsLabel = uniqueShifts.join(', ') || '—';

    const firstDay = new Date(this.empDetailYear, this.empDetailMonth - 1, 1).getDay();
    const daysInMonth = new Date(this.empDetailYear, this.empDetailMonth, 0).getDate();
    const empData = this.rosterAssignments[this.empDetailEmp.id] || {};

    const tempCells = [];
    for (let i = 0; i < firstDay; i++) {
      tempCells.push({
        dayNum: 0,
        dateStr: '',
        bg: '',
        fc: '',
        border: '',
        shifts: [],
        titleText: '',
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${this.empDetailYear}-${String(this.empDetailMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const shifts = empData[dateStr] || [];
      const isHoliday = this.selectedHolidays.includes(dateStr);
      let bg = '#f8fafc';
      let border = '1px solid #e2e8f0';
      let fc = '#1a1a1a';

      if (shifts.length > 0) {
        const def = this.SHIFT_DEFS[shifts[0].shiftKey] || this.SHIFT_DEFS['General'];
        bg = def.bg;
        fc = def.color;
        border = 'none';
      }
      if (isHoliday) {
        bg = '#FCEBEB';
        fc = '#A32D2D';
      }
      const titleText =
        shifts.map((s) => this.SHIFT_DEFS[s.shiftKey]?.label || s.shiftKey).join(', ') ||
        'No shift';

      tempCells.push({
        dayNum: d,
        dateStr,
        bg,
        fc,
        border,
        shifts,
        titleText,
      });
    }
    this.empDetailCalCells = tempCells;
  }

  /**
   * Redirects detailed calendar click to shift adding.
   * @param dateStr Target calendar date string.
   */
  openEmpDetDay(dateStr: string): void {
    if (!dateStr || !this.empDetailEmp) return;
    this.isEmpDetailOpen = false;
    this.openAddShift(this.empDetailEmp.id, dateStr);
  }

  /**
   * Navigates detailed calendar month back.
   */
  empDetPrev(): void {
    this.empDetailMonth--;
    if (this.empDetailMonth < 1) {
      this.empDetailMonth = 12;
      this.empDetailYear--;
    }
    this.renderEmpDetCalendar();
  }

  /**
   * Navigates detailed calendar month forward.
   */
  empDetNext(): void {
    this.empDetailMonth++;
    if (this.empDetailMonth > 12) {
      this.empDetailMonth = 1;
      this.empDetailYear++;
    }
    this.renderEmpDetCalendar();
  }

  /**
   * Applies bulk shift assignments to all matching employees in the department over a selected date range.
   */
  applyBulkAdd(data: {
    dept: string;
    shift: string;
    from: string;
    to: string;
    empIds: string[];
  }): void {
    if (this.isBulkLoading) return;

    const checkedEmpIds = data.empIds.filter((id) => {
      const emp = this.employees.find((e) => e.id === id);
      if (!emp) return false;
      return data.dept === 'All' || emp.dept === data.dept;
    });

    const dbShiftId = this.shiftKeyToUuidMap[data.shift] || data.shift;

    const payload: any[] = [];
    checkedEmpIds.forEach((empId) => {
      const emp = this.employees.find((e) => e.id === empId);
      const dbEmpId = emp ? emp.dbId || emp.id : empId;

      const fromDate = new Date(data.from);
      const toDate = new Date(data.to);
      for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        payload.push({
          action: 'SAVE',
          EmployeeId: dbEmpId,
          startDate: dateStr,
          endDate: dateStr,
          ShiftId: dbShiftId,
        });
      }
    });

    this.isBulkLoading = true;
    this.employeeService.bulkSaveEmployeeShiftMapping(payload).subscribe({
      next: () => {
        this.isBulkLoading = false;
        checkedEmpIds.forEach((empId) => {
          if (!this.rosterAssignments[empId]) {
            this.rosterAssignments[empId] = {};
          }
          const fromDate = new Date(data.from);
          const toDate = new Date(data.to);
          for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            if (!this.rosterAssignments[empId][dateStr]) {
              this.rosterAssignments[empId][dateStr] = [];
            }
            if (!this.rosterAssignments[empId][dateStr].find((s) => s.shiftKey === data.shift)) {
              this.rosterAssignments[empId][dateStr].push({ shiftKey: data.shift, altered: false });
            }
          }
        });

        this.isBulkAddOpen = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isBulkLoading = false;
        console.error('Failed to apply bulk add on server:', err);
        alert('Failed to apply bulk shift assignments on the server. Please try again.');
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Helper returns ordinal suffix of numeric values.
   */
  ordinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  /**
   * Emits updated shift action payload wrapper targeting the parent event mapper framework.
   */
  emitDevumPayload(action: string, empId: string, dateStr: string, shiftKey: string): void {}

  // --- ExternalCoreSimpleControl Callback Implementations ---

  /**
   * Triggers when the parent datasource successfully resolves employee shift mappings.
   */
  @Input()
  onDatasourceResolved = (data: RtOption<any>) => {
    console.log('Devum Datasource Resolved (API data driven fallback):', data);

    const resolved = data?.get;
    this.dataSource = Array.isArray(resolved?.results)
      ? resolved.results
      : Array.isArray(resolved)
        ? resolved
        : resolved
          ? [resolved]
          : [];
    if (this.rosterHeaders.length) {
      this.loadRosterAssignments();
    }
  };

  /**
   * Parent callback setting the instance of simple control container wrapper.
   */
  @Input()
  setControlInstance = (instance: any) => {
    console.log('Devum Control Instance Set:', instance);
  };

  /**
   * Applies metadata property settings defined in the controller configuration.
   */
  @Input()
  applyPropertyDefinitions = (propertyDefinitions: ControlPropertyDefinitionValue[]) => {
    console.log('Devum Property Definitions Applied (Raw):', propertyDefinitions);
    try {
      console.log(
        'Devum Property Definitions Applied (JSON):',
        JSON.stringify(propertyDefinitions),
      );
    } catch (e) {
      console.log('Devum Property Definitions Applied (Stringify Failed)');
    }
    const propertyData = propertyDefinitions.find(
      (property) =>
        property.controlAttributeName === 'getEmployeeShiftMappings' ||
        property.controlAttributeName === 'rosterData',
    ) as ControlPropertyDefinitionValue;
    if (propertyData) {
      this.getEmployeeShiftMappingsPropertyName = propertyData.dsPropertyName as string;
      console.log(
        `Matched control attribute mapping: '${propertyData.controlAttributeName}' -> '${propertyData.dsPropertyName}'`,
      );
      if (propertyData.dsPropertyName) {
        this.isLoading = true;
      }
    } else if (propertyDefinitions && propertyDefinitions.length > 0) {
      this.getEmployeeShiftMappingsPropertyName = propertyDefinitions[0].dsPropertyName as string;
      console.log(
        `No specific attribute matched. Fell back to first property: '${propertyDefinitions[0].controlAttributeName}' -> '${propertyDefinitions[0].dsPropertyName}'`,
      );
      if (propertyDefinitions[0].dsPropertyName) {
        this.isLoading = true;
      }
    } else {
      console.warn('Property definitions array is empty or undefined.');
      this.isLoading = false;
    }
    this.cdr.detectChanges();
  };

  /**
   * Applies configurations and global layout parameter values.
   */
  @Input()
  applyConfigurationAttributes = (attributes: any) => {
    console.log('Devum Configuration Attributes Applied:', attributes);
  };

  /**
   * Core callback bridge updating local state bindings from external source mappings.
   */
  handleEventDataMapperResolved(eventDataMapper: any, _data: RtOption<DsResult>): void {
    console.log('Roster Control received event mapper update:', eventDataMapper, _data);
  }

  // --- Subcomponents Event Bridge Handlers ---

  handleAddShift(event: { empId: string; dateStr: string }): void {
    this.openAddShift(event.empId, event.dateStr);
  }

  handleModifyShift(event: { empId: string; dateStr: string; index: number }): void {
    this.openModifyShift(event.empId, event.dateStr, event.index);
  }

  handleDeleteShift(event: { empId: string; dateStr: string; index: number }): void {
    this.openDeleteShift(event.empId, event.dateStr, event.index);
  }

  applyModifyShiftFromSub(selectedOption: string): void {
    this.selectedShiftKeyOption = selectedOption;
    this.applyModifyShift();
  }

  applyBulkAddFromSub(data: {
    dept: string;
    shift: string;
    from: string;
    to: string;
    empIds: string[];
  }): void {
    this.applyBulkAdd(data);
  }
}
