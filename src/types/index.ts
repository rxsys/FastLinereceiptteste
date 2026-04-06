/**
 * Fast LINE Generic Business Types
 * Terminology Mapping:
 * - companies -> owner
 * - employees -> lineuser
 * - partners  -> projects
 * - projects  -> costcenter
 */

export interface Expense {
  id: string;
  userId: string;
  lineuserId: string | null;  // Formerly employeeId
  ownerId: string;           // Formerly companyId
  projectId?: string | null; // Added for project-level grouping
  costcenterId: string | null; // Formerly projectId
  costcenterName: string | null; // Formerly projectName
  senderName: string;
  amount: number;
  type: 'expense' | 'income';
  subType?: 'payment' | 'extra' | string; // Classification for income
  description: string;
  category: string;
  date: string;
  purchaseTime?: string;
  tNumber?: string;
  notes?: string;
  createdAt: string;
  imageUrl?: string | null;
  status: 'pending_project' | 'processed' | 'cancelled';
  registrationNumber?: string;
  ntaStatus?: 'pending' | 'verified' | 'failed' | 'not_found';
  ntaData?: {
    name?: string;
    address?: string;
  };
  ntaLastCheck?: string;
}

export interface LineUser { // Formerly Employee
  id: string;
  lineId: string;
  ownerId: string;       // Formerly companyId
  name: string;
  fullName?: string;
  photo?: string;
  status: number;
  createdAt: string;
  registrationInfo?: string;
  ownerName?: string;     // Formerly companyName
}

export interface CostCenter { // Formerly Project
  id: string;
  ownerId: string;        // Formerly companyId
  projectId?: string;     // Formerly partnerId
  name: string;
  description?: string;
  totalValue: number | string;
  budgetLimit?: number;
  assignedLineUserIds: string[]; // Formerly assignedEmployeeIds
  status: 'active' | 'completed' | 'on_hold';
  createdAt: string;
}

export interface Project { // Formerly Partner
  id: string;
  ownerId: string;         // Formerly companyId
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Owner { // Formerly Company / BaseProject
  id: string;
  name: string;
  lineChannelSecret?: string;
  lineChannelAccessToken?: string;
}

export interface Invite {
  id: string;
  hash: string;           // 8 chars hex uppercase ex: "A3F8K2X9"
  ownerId: string;
  botId: string;          // LINE Basic ID para validação
  inviteName: string;
  projectIds: string[];   // ARRAY - múltiplos projetos
  costCenterIds: string[];
  language: string;
  createdAt: string;
  used: boolean;
  usedBy?: string;        // lineId do usuário que usou
  usedAt?: string;
}

// Aliases for migration compatibility
export type Employee = LineUser;
export type Company = Owner;
export type BaseProject = Owner;

export const CATEGORY_MAP: Record<string, string> = {
  'Food': '食事・食費',
  'Transport': '交通費・燃料',
  'Utilities': '通信・インフラ・光熱費',
  'Shopping': '備品・オフィス用品',
  'Entertainment': '接待交際費',
  'Groceries': '原材料・資材費',
  'Rent/Mortgage': 'リース・レンタル料',
  'Healthcare': '福利厚生・安全',
  'Work': '外注・委託費',
  'Miscellaneous': 'その他',
  'Income': '入金・予算追加'
};