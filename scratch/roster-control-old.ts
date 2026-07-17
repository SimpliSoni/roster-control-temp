import { KeyValuePipe } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { DsResult, ExternalCoreSimpleControl, RtOption } from 'external-den-core';
import { Employee, ShiftDef, DayHeader } from '../../models/calendar.model';
import { INITIAL_EMPLOYEES, DEFAULT_SHIFT_DEFS } from '../../models/mock-data';
import { EmployeeService } from '../../services/employee.service';

@Component({
  selector: 'app-roster-control',
  standalone: true,
  imports: [KeyValuePipe, FormsModule],
  templateUrl: './roster-control.html',
  styleUrls: ['./roster-control.css'],
})
export class RosterControl implements OnInit, ExternalCoreSimpleControl {
  @Input() onEventDataMapperResolved: any;

  // Employees data
  employees: Employee[] = [];
  isLoading = false;
  apiError: string | null = null;

  selectedHolidays: string[] = [];

  // Roster state
  currentView: 'day' | 'week' | 'month' = 'month';
  rosterDay = 10; // Default active day (using 26 to show demo seed data in week/day views initially)
  rosterMonth = 7; // July (1-indexed for logic as in script)
  rosterYear = 2026;
  rosterFilter = 'all';
  rosterSearch = '';
  rosterHeaders: DayHeader[] = [];

  // Multi-shift assignments: empId -> { "YYYY-MM-DD": [{shiftKey, altered},...] }
  rosterAssignments: {
    [empId: string]: { [dateStr: string]: Array<{ shiftKey: string; altered: boolean }> };
  } = {};

  SHIFT_DEFS: { [key: string]: ShiftDef } = { ...DEFAULT_SHIFT_DEFS };

  // Modals visibility state
  isModifyShiftOpen = false;
  isEmpDetailOpen = false;
  isDeleteConfirmOpen = false;
  isBulkAddOpen = false;

  // Edit / Add shift State
  currentEditEmpId = '';
  currentEditDateStr = '';
  currentEditShiftIdx: number | null = null;
  modifyShiftTitle = '';
  mshiftEmpName = '';
  mshiftEmpRole = '';
  mshiftDuration = '';
  selectedShiftKeyOption = '';

  // Employee Detail Calendar popup State
  empDetailEmp: Employee | null = null;
  empDetailMonth = 6;
  empDetailYear = 2026;
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

  // Delete confirm state
  deleteTarget: {
    empId: string;
    dateStr?: string;
    shiftIdx?: number;
    mode: 'single' | 'all';
  } | null = null;
  delConfirmMsg = '';
  delAffectedMsg = '';

  // Bulk Add state
  bulkDept = 'All';
  bulkShift = 'General';
  bulkFrom = '2026-06-10';
  bulkTo = '2026-06-14';
  bulkSelectedEmpIds: string[] = [];
  isBulkLoading = false;

  shiftUuidToKeyMap: { [uuid: string]: string } = {};
  shiftKeyToUuidMap: { [key: string]: string } = {};

  constructor(
    private cdr: ChangeDetectorRef,
    private employeeService: EmployeeService,
  ) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.apiError = null;

    forkJoin({
      shifts: this.employeeService.getShifts(),
      employees: this.employeeService.getEmployees()
    }).subscribe({
      next: ({ shifts, employees }) => {
        this.isLoading = false;

        // Process shifts
        if (shifts && Array.isArray(shifts)) {
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
        if (!employees || !Array.isArray(employees)) {
          employees = [];
        }
        const count = Math.max(employees.length, INITIAL_EMPLOYEES.length);
        this.employees = Array.from({ length: count }).map((_, index) => {
          const item = employees[index] || {};
          const fallback = INITIAL_EMPLOYEES[index] || {
            id: `EMP-${index + 1}`,
            name: `Employee ${index + 1}`,
            dept: 'Operations',
            role: 'Operator',
            gender: 'Male',
            shift: 'Morning',
            status: 'Active',
            expiry: '2026-12-31',
            backup: false,
            consent: true,
            initials: `E${index + 1}`,
            color: '#185FA5',
          };
          const idVal = item.employeeId || item.employeeld || fallback.id;
          const nameVal = item.name || fallback.name;
          return {
            ...fallback,
            ...item,
            dbId: item.id || idVal,
            id: idVal,
            name: nameVal,
          };
        });

        this.generateRosterHeaders();
        this.initBulkEmployeesSelected();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load the initial data from APIs, falling back to Mock Data', err);
        this.isLoading = false;
        this.apiError = 'Failed to load employees from API. Falling back to mock data.';

        this.employees = [...INITIAL_EMPLOYEES].map(e => ({ ...e, dbId: e.id }));
        this.generateRosterHeaders();
        this.initBulkEmployeesSelected();
        this.cdr.detectChanges();
      }
    });
  }

  getShiftColor(key: string): string {
    const presets: { [key: string]: string } = {
      General: '#4CAF50',
      A: '#2196F3',
      B: '#9C27B0',
      Night: '#3C3489',
      Leave: '#FAEEDA',
      Holiday: '#FCEBEB',
      Backup: '#E1F5EE',
    };
    return presets[key] || '#185FA5';
  }

  loadRosterAssignments(): void {
    if (!this.employees.length || !this.rosterHeaders.length) return;

    const startStr = this.rosterHeaders[0].dateStr;
    const endStr = this.rosterHeaders[this.rosterHeaders.length - 1].dateStr;

    this.employeeService.getEmployeeShiftMappings(startStr, endStr).subscribe({
      next: (mappings) => {
        if (mappings && Array.isArray(mappings) && mappings.length > 0) {
          const newAssignments: typeof this.rosterAssignments = {};

          this.employees.forEach((emp) => {
            newAssignments[emp.id] = {};
          });

          const getFKId = (fk: any): string => {
            if (!fk) return '';
            if (typeof fk === 'object') {
              return fk.id || fk._id || fk.$oid || '';
            }
            return String(fk);
          };

          mappings.forEach((mapping) => {
            const empFK = mapping.EmployeeId || mapping.EmployeeID || mapping.employeeId || mapping.employeeid || mapping.Employee || mapping.employeeld;
            const shiftFK = mapping.ShiftId || mapping.ShiftID || mapping.shiftId || mapping.shiftid || mapping.Shift;
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
                (e.name && empIdStr && e.name.trim().toLowerCase() === empIdStr.trim().toLowerCase())
            );
            if (!employee) return;
            const resolvedEmpId = employee.id;

            let resolvedShiftKey = 'General';
            if (this.shiftUuidToKeyMap[shiftIdStr]) {
              resolvedShiftKey = this.shiftUuidToKeyMap[shiftIdStr];
            } else {
              const keyFromLabel = Object.keys(this.SHIFT_DEFS).find(
                (k) => this.SHIFT_DEFS[k].label === shiftIdStr || k === shiftIdStr
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
              const isDateInHeaders = this.rosterHeaders.some(h => h.dateStr === dateStr);
              if (!isDateInHeaders) return;

              if (!newAssignments[resolvedEmpId]) {
                newAssignments[resolvedEmpId] = {};
              }
              if (!newAssignments[resolvedEmpId][dateStr]) {
                newAssignments[resolvedEmpId][dateStr] = [];
              }
              if (!newAssignments[resolvedEmpId][dateStr].some(s => s.shiftKey === resolvedShiftKey)) {
                newAssignments[resolvedEmpId][dateStr].push({
                  shiftKey: resolvedShiftKey,
                  altered: false
                });
              }
            });
          });

          this.rosterAssignments = newAssignments;
          this.cdr.detectChanges();
        } else {
          this.loadFromLocalStorageFallback();
        }
      },
      error: (err) => {
        console.error('Failed to load roster mappings from API, falling back to local storage', err);
        this.loadFromLocalStorageFallback();
      }
    });
  }

  loadFromLocalStorageFallback(): void {
    const saved = localStorage.getItem('roster_assignments');
    if (saved) {
      try {
        this.rosterAssignments = JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing roster assignments from localStorage', e);
        this.seedRosterData();
        this.saveRosterAssignments();
      }
    } else {
      this.seedRosterData();
      this.saveRosterAssignments();
    }
    this.cdr.detectChanges();
  }

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

  saveRosterAssignments(): void {
    localStorage.setItem('roster_assignments', JSON.stringify(this.rosterAssignments));
  }

  seedRosterData(): void {
    const yr = 2026;
    const mo = 6; // May
    const key = (d: number) => `${yr}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const id0 = this.employees[0].id;
    const id1 = this.employees[1].id;
    const id2 = this.employees[2].id;
    const id3 = this.employees[3].id;
    const id4 = this.employees[4].id;
    const id5 = this.employees[5].id;
    const id6 = this.employees[6].id;
    // const id7 = this.employees[7].id;

    this.rosterAssignments[id0] = {};
    for (let d = 26; d <= 31; d++)
      this.rosterAssignments[id0][key(d)] = [{ shiftKey: 'General', altered: false }];
    for (let d = 12; d <= 25; d++)
      this.rosterAssignments[id0][key(d)] = [{ shiftKey: 'A', altered: false }];

    this.rosterAssignments[id1] = {};
    for (let d = 1; d <= 15; d++)
      this.rosterAssignments[id1][key(d)] = [{ shiftKey: 'General', altered: false }];
    for (let d = 16; d <= 31; d++)
      this.rosterAssignments[id1][key(d)] = [{ shiftKey: 'B', altered: false }];
    this.rosterAssignments[id1][key(10)] = [
      { shiftKey: 'General', altered: false },
      { shiftKey: 'A', altered: false },
    ];
    this.rosterAssignments[id1][key(18)] = [{ shiftKey: 'Leave', altered: false }];

    this.rosterAssignments[id2] = {};
    for (let d = 1; d <= 10; d++)
      this.rosterAssignments[id2][key(d)] = [{ shiftKey: 'A', altered: false }];
    for (let d = 11; d <= 20; d++)
      this.rosterAssignments[id2][key(d)] = [{ shiftKey: 'Night', altered: false }];
    this.rosterAssignments[id2][key(15)] = [{ shiftKey: 'Holiday', altered: false }];
    this.rosterAssignments[id2][key(22)] = [
      { shiftKey: 'A', altered: false },
      { shiftKey: 'B', altered: false },
      { shiftKey: 'General', altered: false },
      // { shiftKey: 'Backup', altered: false }
    ];

    this.rosterAssignments[id3] = {};
    for (let d = 1; d <= 31; d++)
      this.rosterAssignments[id3][key(d)] = [{ shiftKey: 'General', altered: d % 7 === 0 }];

    this.rosterAssignments[id4] = {};
    for (let d = 5; d <= 25; d++)
      this.rosterAssignments[id4][key(d)] = [{ shiftKey: 'B', altered: false }];

    this.rosterAssignments[id5] = {};
    for (let d = 1; d <= 31; d++)
      this.rosterAssignments[id5][key(d)] = [{ shiftKey: 'Night', altered: false }];

    this.rosterAssignments[id6] = {};
    for (let d = 1; d <= 15; d++)
      this.rosterAssignments[id6][key(d)] = [{ shiftKey: 'Backup', altered: false }];
  }

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
      // day view
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

  goToday(): void {
    const t = new Date();
    this.rosterDay = t.getDate();
    this.rosterMonth = t.getMonth() + 1;
    this.rosterYear = t.getFullYear();
    this.generateRosterHeaders();
  }

  setView(view: 'day' | 'week' | 'month'): void{
    this.currentView = view;
    this.generateRosterHeaders();
  }

  filterRoster(f: string): void {
    this.rosterFilter = f;
  }

  // --- Modals logic ---
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

    this.selectedShiftKeyOption = 'Holiday';
    this.isModifyShiftOpen = true;
  }

  applyModifyShift(): void {
    if (!this.selectedShiftKeyOption) {
      alert('Please select a.');
      return;
    }

    const emp = this.employees.find((e) => e.id === this.currentEditEmpId);
    if (!emp) return;

    const dbEmpId = emp.dbId || emp.id;
    const dbShiftId = this.shiftKeyToUuidMap[this.selectedShiftKeyOption] || this.selectedShiftKeyOption;

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
          arr[this.currentEditShiftIdx] = { shiftKey: this.selectedShiftKeyOption, altered : true };
        } else {
          arr.push({ shiftKey: this.selectedShiftKeyOption, altered: false });
        }
        
        this.saveRosterAssignments();
        this.cdr.detectChanges();

        // Emit event to devum if it exists 
        this.emitDevumPayload(
          'modify_shift',
          this.currentEditEmpId,
          this.currentEditDateStr,
          this.selectedShiftKeyOption,
        );
      },
      error: (err) => {
        console.warn('Failed to save shift mapping on server, using fallback data local update', err);
        // Fallback to local data Update
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
        this.saveRosterAssignments();
        this.isModifyShiftOpen = false;
        this.cdr.detectChanges();

        this.emitDevumPayload(
          'modify_shift',
          this.currentEditEmpId,
          this.currentEditDateStr,
          this.selectedShiftKeyOption,
        );
      }
    });
  }

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

  openDeleteAllModal(): void {
    if (!this.empDetailEmp) return;
    this.deleteTarget = { empId: this.empDetailEmp.id, mode: 'all' };
    this.delConfirmMsg = `Delete all roster entries for ${this.empDetailEmp.name}?`;
    this.delAffectedMsg = 'This action will remove all Shift actions from the Employee';
    this.isEmpDetailOpen = false;
    this.isDeleteConfirmOpen = true;
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;

    const emp = this.employees.find((e) => e.id === this.deleteTarget!.empId);
    const dbEmpId = emp ? (emp.dbId || emp.id) : this.deleteTarget!.empId;

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

          this.saveRosterAssignments();
          this.cdr.detectChanges();

          this.emitDevumPayload(
            'delete_shift',
            this.deleteTarget!.empId,
            this.deleteTarget!.dateStr || '',
            '',
          );
        },
        error: (err) => {
          console.warn('Failed to delete shift mapping on server, using fallback data local update', err);
          const empId = this.deleteTarget!.empId;
          const dateStr = this.deleteTarget!.dateStr!;
          const shiftIdx = this.deleteTarget!.shiftIdx!;
          const arr = this.rosterAssignments[empId]?.[dateStr] || [];
          arr.splice(shiftIdx, 1);
          this.rosterAssignments[empId][dateStr] = arr;

          this.saveRosterAssignments();
          this.isDeleteConfirmOpen = false;
          this.cdr.detectChanges();

          this.emitDevumPayload(
            'delete_shift',
            empId,
            dateStr,
            '',
          );
        }
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

          this.saveRosterAssignments();
          this.cdr.detectChanges();

          this.emitDevumPayload(
            'delete_shift',
            this.deleteTarget!.empId,
            this.deleteTarget!.dateStr || '',
            '',
          );
        },
        error: (err) => {
          console.warn('Failed to delete all shift mappings on server, using fallback data local update', err);
          const empId = this.deleteTarget!.empId;
          this.rosterAssignments[empId] = {};

          this.saveRosterAssignments();
          this.isDeleteConfirmOpen = false;
          this.cdr.detectChanges();

          this.emitDevumPayload(
            'delete_shift',
            empId,
            this.deleteTarget!.dateStr || '',
            '',
          );
        }
      });
    }
  }

  openEmpDetail(empId: string): void {
    const emp = this.employees.find((e) => e.id === empId);
    if (!emp) return;
    this.empDetailEmp = emp;
    this.empDetailMonth = this.rosterMonth;
    this.empDetailYear = this.rosterYear;

    const empShifts = Object.values(this.rosterAssignments[empId] || {});
    const uniqueShifts = [...new Set(empShifts.flat().map((s) => s.shiftKey))].filter(
      (s) => !['Leave', 'Holiday'].includes(s),
    );
    this.empDetailShiftsLabel = uniqueShifts.join(', ') || '—';

    const dates = Object.keys(this.rosterAssignments[empId] || {}).sort();
    this.empDetailDurLabel = dates.length ? `${dates[0]} – ${dates[dates.length - 1]}` : '—';

    this.renderEmpDetCalendar();
    this.isEmpDetailOpen = true;
  }

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

    const firstDay = new Date(this.empDetailYear, this.empDetailMonth - 1, 1).getDay();
    const daysInMonth = new Date(this.empDetailYear, this.empDetailMonth, 0).getDate();
    const empData = this.rosterAssignments[this.empDetailEmp.id] || {};

    const tempCells = [];
    // Padding
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

  openEmpDetDay(dateStr: string): void {
    if (!dateStr || !this.empDetailEmp) return;
    this.isEmpDetailOpen = false;
    this.openAddShift(this.empDetailEmp.id, dateStr);
  }

  empDetPrev(): void {
    this.empDetailMonth--;
    if (this.empDetailMonth < 1) {
      this.empDetailMonth = 12;
      this.empDetailYear--;
    }
    this.renderEmpDetCalendar();
  }

  empDetNext(): void {
    this.empDetailMonth++;
    if (this.empDetailMonth > 12) {
      this.empDetailMonth = 1;
      this.empDetailYear++;
    }
    this.renderEmpDetCalendar();
  }

  initBulkEmployeesSelected(): void {
    this.bulkSelectedEmpIds = this.employees.map((e) => e.id);
  }

  isEmpSelected(id: string): boolean {
    return this.bulkSelectedEmpIds.includes(id);
  }

  toggleEmpSelection(id: string): void {
    const idx = this.bulkSelectedEmpIds.indexOf(id);
    if (idx > -1) {
      this.bulkSelectedEmpIds.splice(idx, 1);
    } else {
      this.bulkSelectedEmpIds.push(id);
    }
  }

  applyBulkAdd(): void {
    if (this.isBulkLoading) return;

    const checkedEmpIds = this.bulkSelectedEmpIds.filter((id) => {
      const emp = this.employees.find((e) => e.id === id);
      if (!emp) return false;
      return this.bulkDept === 'All' || emp.dept === this.bulkDept;
    });

    const dbShiftId = this.shiftKeyToUuidMap[this.bulkShift] || this.bulkShift;

    // Construct JSON Array of mapping objects
    const payload: any[] = [];
    checkedEmpIds.forEach((empId) => {
      const emp = this.employees.find(e => e.id === empId);
      const dbEmpId = emp ? (emp.dbId || emp.id) : empId;

      const fromDate = new Date(this.bulkFrom);
      const toDate = new Date(this.bulkTo);
      // Loop through date range
      for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        payload.push({
          action: 'SAVE',
          EmployeeId: dbEmpId,
          startDate: dateStr,
          endDate: dateStr,
          ShiftId: dbShiftId,
          // IntervalId : dbIntervalId,
          // activityID : dbIntervalId
        });
      }
    });

    this.isBulkLoading = true;
    this.employeeService.bulkSaveEmployeeShiftMapping(payload).subscribe({
      next: () => {
        this.isBulkLoading = false;
        // Perform the local update in memory on success
        checkedEmpIds.forEach((empId) => {
          if (!this.rosterAssignments[empId]) {
            this.rosterAssignments[empId] = {};
          }
          const fromDate = new Date(this.bulkFrom);
          const toDate = new Date(this.bulkTo);
          for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            if (!this.rosterAssignments[empId][dateStr]) {
              this.rosterAssignments[empId][dateStr] = [];
            }
            if (!this.rosterAssignments[empId][dateStr].find((s) => s.shiftKey === this.bulkShift)) {
              this.rosterAssignments[empId][dateStr].push({ shiftKey: this.bulkShift, altered: false });
            }
          }
        });

        this.saveRosterAssignments();
        this.isBulkAddOpen = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isBulkLoading = false;
        console.warn('Failed to apply bulk add on server, using fallback data local update', err);
        // fallback to local Data Update
        checkedEmpIds.forEach((empId) => {
          if (!this.rosterAssignments[empId]) {
            this.rosterAssignments[empId] = {};
          }
          const fromDate = new Date(this.bulkFrom);
          const toDate = new Date(this.bulkTo);
          for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            if (!this.rosterAssignments[empId][dateStr]) {
              this.rosterAssignments[empId][dateStr] = [];
            }
            if (!this.rosterAssignments[empId][dateStr].find((s) => s.shiftKey === this.bulkShift)) {
              this.rosterAssignments[empId][dateStr].push({ shiftKey: this.bulkShift, altered: false });
            }
          }
        });

        this.saveRosterAssignments();
        this.isBulkAddOpen = false;
        this.cdr.detectChanges();
      }
    });
  }

  ordinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  // --- Devum integration helper ---
  emitDevumPayload(action: string, empId: string, dateStr: string, shiftKey: string): void {
    console.log(`EMITTING TO DEVUM [${action}]:`, empId, dateStr, shiftKey);
    if (this.onEventDataMapperResolved) {
      const payload = {
        value: {
          id: `${empId}_${dateStr}`,
          dsName: 'RosterDS',
          data: [
            {
              fieldName: 'employee_id',
              value: empId,
              originalValue: empId,
              uom: {},
              referenceData: {},
            },
            {
              fieldName: 'date',
              value: dateStr,
              originalValue: dateStr,
              uom: {},
              referenceData: {},
            },
            {
              fieldName: 'shift_key',
              value: shiftKey,
              originalValue: shiftKey,
              uom: {},
              referenceData: {},
            },
            {
              fieldName: 'action',
              value: action,
              originalValue: action,
              uom: {},
              referenceData: {},
            },
            {
              // fieldName: 'action',
              // value: action,
              // originalValue: action,
              // uom: {},
              // referenceData: {}
            }
          ],
          fks: [],
          isWsResult: false,
          _isDirectValue: false,
          dataStateType: 'INSERT',
        },
      };

      const optionWrapper = {
        get: {
          data: [
            { fieldName: 'employee_id', value: empId },
            { fieldName: 'date', value: dateStr },
            { fieldName: 'shift_key', value: shiftKey },
            { fieldName: 'action', value: action },
            // { fieldName: 'right', value: action },
          ],
        },
      };

      this.onEventDataMapperResolved(payload, optionWrapper as RtOption<DsResult>);
    }
  }

  // ExternalCoreSimpleControl callbacks
  @Input()
  onDatasourceResolved = (datasource: any) => {
    console.log('Devum Datasource Resolved:', datasource);
  };

  @Input()
  setControlInstance = (instance: any) => {
    console.log('Devum Control Instance Set:', instance);
  };

  @Input()
  applyPropertyDefinitions = (properties: any) => {
    console.log('Devum Property Definitions Applied:', properties);
  };

  @Input()
  applyConfigurationAttributes = (attributes: any) => {
    console.log('Devum Configuration Attributes Applied:', attributes);
  };

  handleEventDataMapperResolved(eventDataMapper: any, _data: RtOption<DsResult>): void {
    console.log('Roster Control received event mapper update:', eventDataMapper, _data)
  }
}