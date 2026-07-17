export interface Employee {
  employeeId: string;
  name: string;
  email: string;
  contactNo: string;
  joiningDate: string;
  image: string;
  address: string;
  idNumber: string;
  dbId?: string;
  id: string;

  // UI component fields
  dept: string;
  role: string;
  gender: string;
  shift: string;
  status: string;
  expiry: string;
  backup: boolean;
  consent: boolean;
}

export interface Shift {
  id?: string;
  name: string;
  startTime: string;
  endTime: string;
  weekDays: string;
  isOperational: boolean;
  doesShiftFallOnNextDay: boolean;
  shiftInterval: string;
}

export interface EmployeeShiftMapping {
  employeeId: string;
  startDate: string;
  endDate: string;
  shiftId: string;
}

export interface DayHeader {
  dayNum: number;
  dow: string;
  isToday: boolean;
  dateStr: string;
}

export interface ShiftDef {
  label: string;
  time: string;
  cls: string;
  bg: string;
  color: string;
}

export interface CalendarCell {
  dayNum: number;
  dateStr: string;
  bg: string;
  fc: string;
  border: string;
  shifts: Array<{ shiftKey: string; altered: boolean }>;
  titleText: string;
}

export interface ShiftData {
  id: string;
  shiftname: string;
  shiftstarttime?: string | null;
  shiftendtime?: string | null;
}

export interface RosterDetail {
  date: string;
  shiftid: string;
  shiftdata: ShiftData[] | string;
  id?: string;
}

export interface RosterJsonData {
  role?: string;
  id: string;
  date?: string;
  employeename: string;
  employeenumber: string;
  Details: RosterDetail[];
}

export interface RosterItem {
  jsonData: RosterJsonData | string;
  tsDate?: string;
  exception?: any;
  key?: string;
  groupBy?: any;
}

export interface RosterResponse {
  className: string;
  data: {
    list: RosterItem[];
  };
}

