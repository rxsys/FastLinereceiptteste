import fetch from 'node-fetch';
import { rtdb } from './firebase';

const NTA_APP_ID = 'KhdvgjqHdHtF8';

export interface NtaValidationResult {
  success: boolean;
  name?: string;
  address?: string;
  error?: string;
  status: 'verified' | 'not_found' | 'failed';
}

/**
 * Limpa e valida o número de registro na API da NTA
 */
export async function validateRegistrationNumber(registrationNumber: string): Promise<NtaValidationResult> {
  const cleanNumber = registrationNumber.replace(/[^0-9]/g, '');
  
  if (cleanNumber.length !== 13) {
    return { success: false, status: 'failed', error: 'Invalid number length' };
  }

  const invoiceNumber = `T${cleanNumber}`;
  const url = `https://web-api.invoice-kohyo.nta.go.jp/1/num?id=${NTA_APP_ID}&number=${invoiceNumber}&type=21`;

  try {
    const response = await fetch(url);
    if (!response.ok) return { success: false, status: 'failed', error: `HTTP ${response.status}` };

    const data: any = await response.json();
    if (data.count === "1" && data.announcement && data.announcement.length > 0) {
      const info = data.announcement[0];
      return { success: true, status: 'verified', name: info.name, address: info.address };
    }
    return { success: false, status: 'not_found' };
  } catch (error) {
    return { success: false, status: 'failed', error: 'Network error' };
  }
}

/**
 * Processa a verificação da despesa em background e atualiza o Realtime Database
 */
export async function processExpenseNtaCheck(ownerId: string, expenseId: string, registrationNumber: string) {
  if (!registrationNumber || !ownerId) return;

  const expenseRef = rtdb.ref(`owner_data/${ownerId}/expenses/${expenseId}`);

  try {
    const result = await validateRegistrationNumber(registrationNumber);
    await expenseRef.update({
      ntaStatus: result.status,
      ntaData: result.success ? { name: result.name, address: result.address } : null,
      ntaLastCheck: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return result;
  } catch (error) {
    await expenseRef.update({ ntaStatus: 'failed', ntaLastCheck: new Date().toISOString() });
  }
}
