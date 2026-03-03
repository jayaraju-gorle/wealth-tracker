export type AssetType = 'CASH' | 'MUTUAL_FUND' | 'STOCK' | 'REAL_ESTATE' | 'GOLD' | 'FD' | 'EPF_PPF' | 'CRYPTO' | 'OTHER';
export type LiabilityType = 'HOME_LOAN' | 'CAR_LOAN' | 'EDUCATION_LOAN' | 'PERSONAL_LOAN' | 'CREDIT_CARD' | 'OTHER';
export type MilestoneTrackingMode = 'net_worth' | 'liquid_assets' | 'total_assets';

// Asset types considered liquid (easily accessible for emergencies)
export const LIQUID_ASSET_TYPES: AssetType[] = ['CASH', 'FD', 'MUTUAL_FUND'];

export interface Asset {
  id: string;
  name: string;
  value: number;
  type: AssetType;
  growthRate: number; // Annual percentage expected
  // Smart pricing (optional)
  schemeCode?: number;        // MF: AMFI scheme code
  units?: number;             // MF: units held
  navPerUnit?: number;        // MF: last fetched NAV
  quantity?: number;          // Stock / Gold / Silver: quantity or grams
  pricePerUnit?: number;      // Stock / Gold / Silver: price per share/gram
  valuationMode?: 'manual' | 'smart';
}

export interface Liability {
  id: string;
  name: string;
  value: number;
  type: LiabilityType;
  interestRate: number; // Annual percentage
}

export interface Snapshot {
  id: string;
  date: string; // ISO Date YYYY-MM-DD
  netWorth: number;
  note?: string;
  isManual?: boolean;
}

export interface Milestone {
  id: string;
  name: string;
  targetAmount: number;
  color: string;
  trackingMode: MilestoneTrackingMode;
}

export interface AppState {
  familyId: string | null;
  assets: Asset[];
  liabilities: Liability[];
  monthlyContribution: number;
  snapshots: Snapshot[];
  milestones: Milestone[];
  lastUpdated: number;
  themeColor: string;
}

export const INITIAL_STATE: AppState = {
  familyId: null,
  assets: [],
  liabilities: [],
  monthlyContribution: 25000, // Reasonable SIP amount
  snapshots: [],
  milestones: [
    { id: '1', name: 'Emergency Fund', targetAmount: 500000, color: '#10b981', trackingMode: 'liquid_assets' },
    { id: '2', name: 'Home Down Payment', targetAmount: 5000000, color: '#3b82f6', trackingMode: 'net_worth' }
  ],
  lastUpdated: 0, // Set to 0 so cloud data (always > 0) will override initial empty state
  themeColor: 'blue'
};