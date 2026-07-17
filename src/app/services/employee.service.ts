import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, of, catchError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Employee, Shift, EmployeeShiftMapping } from '../models/calendar.model';

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  constructor(private http: HttpClient) {}

  getEmployees(): Observable<Employee[]> {
    const url = `${environment.apiUrl}/devum/fms/getEmployeeDetails?_cb=${Date.now()}`;
    return this.http.get<Employee[]>(url).pipe(
      map((employees) => {
        if (!employees || !Array.isArray(employees)) return [];
        return employees.map((emp) => ({
          ...emp,
          employeeId: emp.employeeId || (emp as any).employeeld || (emp as any).id || ''
        }));
      })
    );
  }

  getShifts(): Observable<Shift[]> {
    const url = `${environment.apiUrl}/devum/fms/getShiftDetails?_cb=${Date.now()}`;
    return this.http.get<Shift[]>(url).pipe(
      map((shifts) => {
        if (!shifts || !Array.isArray(shifts)) return [];
        return shifts.map((shift) => {
          const name = shift.name || (shift as any).Name || '';
          let weekDays = shift.weekDays || '';
          let shiftInterval = shift.shiftInterval || '';
          return {
            ...shift,
            name: name,
            weekDays: weekDays,
            shiftInterval: shiftInterval,
            doesShiftFallOnNextDay: shift.doesShiftFallOnNextDay !== undefined
              ? shift.doesShiftFallOnNextDay
              : ((shift as any).doesShiftFallUnderTwoDays || false)
          };
        });
      })
    );
  }




  getEmployeeShiftMappings(startDate?: string, endDate?: string): Observable<EmployeeShiftMapping[]> {
    let url = `${environment.apiUrl}/devum/theraphy/getEmployeeShiftMappings`;
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    return this.http.get<EmployeeShiftMapping[]>(url).pipe(
      map((mappings) => {
        if (!mappings || !Array.isArray(mappings)) mappings = [];
        const getFKId = (fk: any): string => {
          if (!fk) return '';
          if (typeof fk === 'object') {
            return fk.id || fk._id || fk.$oid || '';
          }
          return String(fk);
        };
        let apiMappings = mappings.filter((m) => {
          if (!m) return false;
          const empFK = (m as any).EmployeeId || (m as any).EmployeeID || m.employeeId || (m as any).employeeid || (m as any).Employee || (m as any).employeeld;
          const shiftFK = (m as any).ShiftId || (m as any).ShiftID || m.shiftId || (m as any).shiftid || (m as any).Shift;
          const empId = getFKId(empFK);
          const shiftId = getFKId(shiftFK);
          return empId && shiftId && m.startDate && m.endDate;
        });

        try {
          const deleteKey = 'deleted_employee_shift_mappings';
          const deletedStr = localStorage.getItem(deleteKey);
          const deletedMappings: any[] = deletedStr ? JSON.parse(deletedStr) : [];

          const storageKey = 'saved_employee_shift_mappings';
          const savedStr = localStorage.getItem(storageKey);
          const savedMappings: any[] = savedStr ? JSON.parse(savedStr) : [];

          const getDatesInRange = (start: string, end: string): string[] => {
            const dates: string[] = [];
            let curr = new Date(start);
            const last = new Date(end);
            while (curr <= last) {
              dates.push(curr.toISOString().split('T')[0]);
              curr.setDate(curr.getDate() + 1);
            }
            return dates;
          };

          apiMappings = apiMappings.filter(m => {
            const empFK = (m as any).EmployeeId || (m as any).EmployeeID || m.employeeId || (m as any).employeeid || (m as any).Employee || (m as any).employeeld;
            const empId = getFKId(empFK);
            const mDates = getDatesInRange(m.startDate, m.endDate);

            const isOverwritten = mDates.some(date => {
              const isDeleted = deletedMappings.some(d => String(d.EmployeeId) === String(empId) && d.date === date);
              if (isDeleted) return true;

              const isSaved = savedMappings.some(s => {
                const sEmpId = s.EmployeeId || s.employeeId;
                return String(sEmpId) === String(empId) && s.startDate <= date && s.endDate >= date;
              });
              return isSaved;
            });

            return !isOverwritten;
          });

          return [...apiMappings, ...savedMappings];
        } catch (e) {
          console.error('LocalStorage load/merge error:', e);
          return apiMappings;
        }
      }),
      catchError((err) => {
        console.warn('getEmployeeShiftMappings failed, trying localStorage only:', err);
        try {
          const storageKey = 'saved_employee_shift_mappings';
          const savedStr = localStorage.getItem(storageKey);
          return of(savedStr ? JSON.parse(savedStr) : []);
        } catch {
          return of([]);
        }
      })
    );
  }

  saveEmployeeShiftMapping(payload: any): Observable<any> {
    // Commented out post API
    /*
    const url = `${environment.apiUrl}/devum/theraphy/saveEmployeeShiftMapping`;
    return this.http.post<any>(url, payload);
    */

    try {
      const storageKey = 'saved_employee_shift_mappings';
      const existingStr = localStorage.getItem(storageKey);
      let localMappings: any[] = existingStr ? JSON.parse(existingStr) : [];

      const action = payload.action || 'SAVE';
      const empIds = payload.employeeIds || (payload.EmployeeId ? [payload.EmployeeId] : []);
      const startDate = payload.startDate;
      const endDate = payload.endDate;
      const shiftId = payload.ShiftId || payload.shiftId;

      const getDatesInRange = (start: string, end: string): string[] => {
        const dates: string[] = [];
        let curr = new Date(start);
        const last = new Date(end);
        while (curr <= last) {
          dates.push(curr.toISOString().split('T')[0]);
          curr.setDate(curr.getDate() + 1);
        }
        return dates;
      };

      const datesToProcess = getDatesInRange(startDate, endDate);

      if (action === 'DELETE') {
        localMappings = localMappings.filter(m => {
          const mEmpId = m.EmployeeId || m.employeeId;
          const isTargetEmp = empIds.some((id: any) => String(id) === String(mEmpId));
          if (!isTargetEmp) return true;

          const mDates = getDatesInRange(m.startDate, m.endDate);
          const hasOverlap = mDates.some(d => datesToProcess.includes(d));
          return !hasOverlap;
        });

        const deleteKey = 'deleted_employee_shift_mappings';
        const deletedStr = localStorage.getItem(deleteKey);
        let deletedMappings: any[] = deletedStr ? JSON.parse(deletedStr) : [];
        
        empIds.forEach((empId: any) => {
          datesToProcess.forEach(date => {
            deletedMappings.push({ EmployeeId: empId, date: date });
          });
        });
        localStorage.setItem(deleteKey, JSON.stringify(deletedMappings));
      } else {
        localMappings = localMappings.filter(m => {
          const mEmpId = m.EmployeeId || m.employeeId;
          const isTargetEmp = empIds.some((id: any) => String(id) === String(mEmpId));
          if (!isTargetEmp) return true;

          const mDates = getDatesInRange(m.startDate, m.endDate);
          const hasOverlap = mDates.some(d => datesToProcess.includes(d));
          return !hasOverlap;
        });

        empIds.forEach((empId: any) => {
          localMappings.push({
            EmployeeId: empId,
            employeeId: empId,
            ShiftId: shiftId,
            shiftId: shiftId,
            startDate: startDate,
            endDate: endDate
          });
        });

        const deleteKey = 'deleted_employee_shift_mappings';
        const deletedStr = localStorage.getItem(deleteKey);
        if (deletedStr) {
          let deletedMappings: any[] = JSON.parse(deletedStr);
          deletedMappings = deletedMappings.filter(d => {
            const isTargetEmp = empIds.some((id: any) => String(id) === String(d.EmployeeId));
            return !(isTargetEmp && datesToProcess.includes(d.date));
          });
          localStorage.setItem(deleteKey, JSON.stringify(deletedMappings));
        }
      }

      localStorage.setItem(storageKey, JSON.stringify(localMappings));
    } catch (e) {
      console.error('LocalStorage save error:', e);
    }

    return of({ success: true });
  }

  bulkSaveEmployeeShiftMapping(payload: any): Observable<any> {
    const url = `${environment.apiUrl}/devum/theraphy/bulkSaveEmployeeShiftMappings`;
    return this.http.post<any>(url, payload);
  }
}