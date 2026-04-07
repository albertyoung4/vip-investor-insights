export interface VIPInvestor {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalWon: number;
  totalBids: number;
  ytdWon: number;
  ytdBids: number;
  entities: string[];
}

export interface PropertyDetail {
  propertyId: string | null;
  attomId: number | null;
  offerDate: string;
  offerPrice: number;
  status: string;
  isRebuilt: boolean;
  address: string | null;
  city: string | null;
  state: string | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  lotSize: number | null;
  lat: number | null;
  lng: number | null;
  entity?: string;
  omrMatch?: {
    posterName: string | null;
    askingPrice: number | null;
    postedAt: string | null;
  };
}

export interface QuarterlyStats {
  [key: string]: { rebuilt: number; total: number };
}

export interface InvestorProfile {
  investor: VIPInvestor;
  stats: {
    totalTransactions2025: number;
    rebuiltTransactions: number;
    recorderTransactions: number;
    quarterlyStats: QuarterlyStats;
  };
  properties: PropertyDetail[];
}

export interface PurchaseBreakdown {
  mls2025: number;
  offMarket2025: number;
  rebuilt2025: number;
  mls2026: number;
  offMarket2026: number;
  rebuilt2026: number;
}

export interface CommissionData {
  totalDeals2025: number;
  mlsDeals2025: number;
  offMarketDeals2025: number;
  rebuiltDeals2025: number;
  mlsRate: number;
  recorderVolume2025: number;
  estMlsVolume2025: number;
  estCommission3pct: number;
  opportunityType: "MLS-Heavy" | "Off-Market" | "Mixed";
}

export interface CommissionFile {
  year: number;
  generatedAt: string;
  investors: Record<string, CommissionData>;
  totals: {
    totalDeals: number;
    mlsDeals: number;
    recorderVolume: number;
    estMlsVolume: number;
    estCommission: number;
  };
}

export interface InvestorsData {
  generatedAt: string;
  investors: VIPInvestor[];
}
