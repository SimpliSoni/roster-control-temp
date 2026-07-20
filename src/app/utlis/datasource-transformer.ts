import { DsResult } from '@reactore/external-den-core';

export interface DsResultField {
  fieldName: string;
  originalValue: any;
  value: any;
  uom?: any;
  referenceData?: any;
}

export interface TestJsonItem {
  jsonData: any;
  tsDate: string;
  exception: null;
  key: string;
  groupBy: null;
}

export interface TestJson {
  className: string;
  data: {
    list: TestJsonItem[];
  };
}

export function transformDsResultToTestJson(dsResults: DsResult[]): TestJson {
  const list: TestJsonItem[] = [];

  dsResults.forEach((result) => {
    const jsonData: any = {};
    const dsNamePrefix = result.dsName + '.';

    result.data.forEach((field) => {
      if (field.fieldName.startsWith(dsNamePrefix)) {
        const fieldKey = field.fieldName.substring(dsNamePrefix.length);
        jsonData[fieldKey] = field.value;
      }
    });

    if (Object.keys(jsonData).length > 0) {
      list.push({
        jsonData,
        tsDate: jsonData.date || new Date().toISOString(),
        exception: null,
        key: jsonData.id || result.id,
        groupBy: null,
      });
    }
  });

  return {
    className: 'DataViewTimeSeriesItemContainer',
    data: {
      list,
    },
  };
}

export function transformSingleDsResultToTestJson(dsResult: DsResult[]): TestJson {
  return transformDsResultToTestJson(dsResult);
}

export const EMPLOYEE = [
  {
    joiningDate: null,
    name: 'Ashok K',
    email: 'somashekhar.c@reactore.com',
    dateOfBirth: '1980-04-05',
    id: '660fb9542aacbd33a4a6d251',
    employeeId: 'EMP-107',
    address: null,
    contactNo: '9874563212',
    dlNumber: null,
  },
  {
    joiningDate: null,
    name: 'Naveen',
    email: 'naveen.k@reactore.com',
    dateOfBirth: '1968-11-05',
    id: '660fb9782aacbd33a4a6d253',
    employeeId: 'EMP-106',
    address: null,
    contactNo: '7896541230',
    dlNumber: null,
  },
  {
    joiningDate: null,
    name: 'Lakshmeesha',
    email: 'lakshmeesha.r@reactore.com',
    dateOfBirth: '2018-03-08',
    id: '660fb9a12aacbd33a4a6d255',
    employeeId: 'EMP-105',
    address: null,
    contactNo: '8521479630',
    dlNumber: null,
  },
  {
    joiningDate: null,
    name: 'Rakesh',
    email: 'rakesh.m@reactore.com',
    dateOfBirth: '2025-05-14',
    id: '66179118f0759054701dc255',
    employeeId: 'EMP-104',
    address: null,
    contactNo: '123456789',
    dlNumber: null,
  },
  {
    joiningDate: null,
    name: 'Pavan',
    email: 'pavan.k@reactore.com',
    dateOfBirth: null,
    id: '962c4072-2746-4a90-8663-4344950c7cfc',
    employeeId: 'EMP-103',
    address: null,
    contactNo: '9449200207',
    dlNumber: null,
  },
  {
    joiningDate: null,
    name: 'Anand',
    email: 'anand.p@reactore.com',
    dateOfBirth: '1995-03-08',
    id: '9caf5555-99b3-4413-97d1-afcf367ada00',
    employeeId: 'EMP-102',
    address: null,
    contactNo: '9876543210',
    dlNumber: null,
  },
  {
    joiningDate: null,
    name: 'Rudra',
    email: 'Abhishek.G@Reactore.com',
    dateOfBirth: '1995-06-17',
    id: '3fc1f032-b7f2-45a6-8b8d-5f7527d95341',
    employeeId: 'EMP-101',
    address: null,
    contactNo: '98765423211',
    dlNumber: null,
  },
  {
    joiningDate: null,
    name: 'Manoj',
    email: null,
    dateOfBirth: '1993-02-19',
    id: '53357207-067e-4c3f-8202-53393011e8fa',
    employeeId: 'EMP-108',
    address: null,
    contactNo: '34534534534',
    dlNumber: null,
  },
  {
    joiningDate: null,
    name: 'mohanbabu',
    email: 'mohanbabu.p@reactore.com',
    dateOfBirth: null,
    id: 'e6496ae8-94bc-44c5-9f26-d9664572c3f6',
    employeeId: 'EMP-1010',
    address: null,
    contactNo: null,
    dlNumber: null,
  },
];

export const SHIFTS = [
  {
    shiftInterval: null,
    doesShiftFallUnderTwoDays: true,
    startTime: '15:30:00',
    name: 'Third Shift',
    endTime: '23:30:00',
    id: '92b4c0b4-beeb-4133-a3b8-097de1ce533c',
    isOperational: false,
    weekDays: null,
  },
  {
    shiftInterval: null,
    doesShiftFallUnderTwoDays: false,
    startTime: '23:30:00',
    name: 'First Shift',
    endTime: '07:30:00',
    id: '4b805ca0-5e27-46f2-a7d9-6b1b8b933e0a',
    isOperational: false,
    weekDays: null,
  },
  {
    shiftInterval: null,
    doesShiftFallUnderTwoDays: false,
    startTime: '07:30:01',
    name: 'Second Shift',
    endTime: '12:30:00',
    id: '60fed54b-b5de-4442-aa8c-e52fef197d48',
    isOperational: false,
    weekDays: null,
  },
];
