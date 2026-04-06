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

export interface InvestorsData {
  generatedAt: string;
  investors: VIPInvestor[];
}
