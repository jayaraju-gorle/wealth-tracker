export type AssetType = 'CASH' | 'SAVINGS_ACCOUNT' | 'MUTUAL_FUND' | 'STOCK' | 'REAL_ESTATE' | 'GOLD' | 'SILVER' | 'FD' | 'EPF_PPF' | 'NPS' | 'INSURANCE' | 'BONDS' | 'CRYPTO' | 'VEHICLE' | 'ESOPS' | 'LENDING' | 'OTHER';
export type LiabilityType = 'HOME_LOAN' | 'MORTGAGE' | 'CAR_LOAN' | 'VEHICLE_LOAN' | 'EDUCATION_LOAN' | 'PERSONAL_LOAN' | 'BUSINESS_LOAN' | 'GOLD_LOAN' | 'CREDIT_CARD' | 'OTHER';
export type MilestoneTrackingMode = 'net_worth' | 'liquid_assets' | 'total_assets';

// Asset types considered liquid (easily accessible for emergencies)
export const LIQUID_ASSET_TYPES: AssetType[] = ['CASH', 'SAVINGS_ACCOUNT', 'MUTUAL_FUND', 'STOCK', 'FD', 'BONDS', 'CRYPTO'];

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: 'document' | 'image' | 'link';
}

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
  // SIP tracking (optional, MF only)
  sipAmount?: number;         // Monthly SIP amount in ₹
  sipDay?: number;            // Day of month (1-28, default 5)
  lastSipLogDate?: string;    // ISO date of last logged SIP
  // Tracking metadata (optional)
  trackingUrl?: string;       // Portal URL (e.g., https://kuvera.in)
  trackingUsername?: string;  // Login username/email
  trackingPassword?: string;  // Login password
  notes?: string;             // Free-form notes
  location?: string;           // Real estate: address or Google Maps link
  attachments?: Attachment[];   // Documents, images, links
}

export interface Liability {
  id: string;
  name: string;
  value: number;
  type: LiabilityType;
  interestRate: number; // Annual percentage
  // Tracking metadata (optional)
  trackingUrl?: string;
  trackingUsername?: string;
  trackingPassword?: string;
  notes?: string;
  attachments?: Attachment[];   // Documents, images, links
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
  sharedGeminiKey?: string;
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