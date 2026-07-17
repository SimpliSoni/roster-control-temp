import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  let headers: any = {
    orgcode: 'vikiai-dev',
    appcode: 'theraphy',
    sitecode: 'DefaultSiteCode',
    identifiertype: 'external',
  };

  // Employee API (Commented out previous implementation)
  /*
  if (req.url.includes('getEmployeeDetail')) {
    headers = {
      ...headers,
      clientSecret: 'fc0fd918-d271-661a-46d8-95768c9a1d0e',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };
  }
  */

  // New Employee Details API
  if (req.url.includes('getEmployeeDetails')) {
    headers = {
      orgcode: 'dynalloc',
      appcode: 'fms',
      sitecode: 'MANO',
      identifiertype: 'internal',
      'Content-Type': 'application/json',
      clientSecret: '79d98604-8909-b5cf-b74b-fd29c84f9836'
    };
  }

  // Shift API
  if (req.url.toLowerCase().includes('saveshift')) {
    headers = {
      ...headers,
      clientSecret: '317888e6-bf55-5192-9938-2185376f58fd',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };
  }

  // Get Shift Details API (Commented out previous implementation)
  /*
  if (req.url.includes('getShiftdetails61')) {
    headers = {
      ...headers,
      clientSecret: '2a760882-0b23-93ac-24c3-215762cba798',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };
  }
  */

  // New Get Shift Details API
  if (req.url.includes('getShiftDetails')) {
    headers = {
      orgcode: 'dynalloc',
      appcode: 'fms',
      sitecode: 'MANO',
      identifiertype: 'internal',
      'Content-Type': 'application/json',
      clientSecret: '5d2db3fd-5914-b635-1bb4-a3b0aaaa218c'
    };
  }

  // Employee Shift Mappings (Get)
  if (req.url.toLowerCase().includes('getemployeeshiftmapping')) {
    headers = {
      ...headers,
      clientSecret: '3c8dce4c-f68d-115b-e278-a04b8a67a14d',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };
  }

  // Bulk Save Employee Shift Mappings
  if (req.url.toLowerCase().includes('bulksaveemployeeshiftmappings')) {
    headers = {
      ...headers,
      clientSecret: '1cc3901d-4d31-de73-cb9c-0f38127f41f7',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };
  } else if (req.url.toLowerCase().includes('saveemployeeshiftmapping')) {
    // Save Employee Shift Mappings
    headers = {
      ...headers,
      clientSecret: '5c655a88-c9f2-becd-2640-b92202cdfcb3',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };
  }

  const modifiedReq = req.clone({
    setHeaders: headers,
  });
  return next(modifiedReq);
};

/**
 * appCode: viki.ai-dev
 * appCode: externalCoreHelper.getAppCode --> viki.ai-dev
 **/