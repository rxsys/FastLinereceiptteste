'use server'

import { NextResponse } from 'next/server';
import fetch from 'node-fetch';

const NTA_APP_ID = 'KhdvgjqHdHtF8';

export interface NtaValidationResult {
  success: boolean;
  name?: string;
  address?: string;
  error?: string;
  status: 'verified' | 'not_found' | 'failed';
}

async function validateRegistrationNumber(registrationNumber: string): Promise<NtaValidationResult> {
  const cleanNumber = registrationNumber.replace(/[^0-9]/g, '');
  
  if (cleanNumber.length !== 13) {
    return { success: false, status: 'failed', error: 'Invalid number length' };
  }

  const invoiceNumber = `T${cleanNumber}`;
  const url = `https://web-api.invoice-kohyo.nta.go.jp/1/num?id=${NTA_APP_ID}&number=${invoiceNumber}&type=21`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      return { success: false, status: 'failed', error: `HTTP ${response.status}` };
    }

    const data: any = await response.json();

    if (data.count === "1" && data.announcement && data.announcement.length > 0) {
      const info = data.announcement[0];
      return {
        success: true,
        status: 'verified',
        name: info.name,
        address: info.address
      };
    }

    return { success: false, status: 'not_found' };
  } catch (error) {
    console.error('NTA API Error:', error);
    return { success: false, status: 'failed', error: 'Network error' };
  }
}

export async function POST(request: Request) {
  try {
    const { registrationNumber } = await request.json();

    if (!registrationNumber) {
      return NextResponse.json({ error: 'Registration number is required' }, { status: 400 });
    }

    const result = await validateRegistrationNumber(registrationNumber);
    return NextResponse.json(result);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
