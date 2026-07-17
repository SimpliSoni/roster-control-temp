import { DsResult } from "@reactore/external-den-core";
 
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
