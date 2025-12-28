
export enum GuestCategory {
  PAST_PRESIDENT = '歷屆會長',
  PAST_CHAIRMAN = '歷屆主席',
  HQ_GUEST = '總會貴賓',
  GOV_OFFICIAL = '政府貴賓',
  VISITING_CHAPTER = '友會來訪',
  MEMBER_YB = '會友 (YB)', 
  MEMBER_OB = '特友會 (OB)', 
  OTHER = '其他貴賓'
}

export interface Sponsorship {
  id: string;
  name: string;
  title: string;
  amount: number;
  itemName?: string;
  timestamp: string;
}

export interface FlowFile {
  id: string;
  name: string;
  type: 'schedule' | 'gifts_file' | 'slides' | 'mcflow_file' | 'guests_file'; 
  mimeType: string;
  size: number;
  uploadTime: string;
  data?: string;
  url?: string;
}

export interface McFlowStep {
  id: string;
  sequence?: string;
  time?: string;
  title: string;
  script?: string;
  slides?: string;
  isCompleted: boolean;
  completedAt?: string; 
}

export interface GiftItem {
  id: string;
  sequence?: string;
  name: string;
  quantity?: string;
  recipient: string;
  personInCharge?: string;
  donor?: string;
  isPresented: boolean;
  presentedAt?: string;
}

export interface Guest {
  id: string;
  code?: string;
  name: string;
  title: string;
  category: GuestCategory;
  note?: string;
  isCheckedIn: boolean;
  attendedRounds: number[];
  checkInTime?: string;
  round?: number;
  isIntroduced: boolean;
  isWinner: boolean;
  wonRounds: number[];
  winRound?: number;
  wonTimes?: Record<string, string>; 
}

export interface LotteryPoolConfig {
  includedCategories: GuestCategory[];
  includedIndividualIds: string[];
}

export interface SystemSettings {
  eventName: string;
  briefSchedule?: string;
  currentCheckInRound: number;
  lotteryRoundCounter: number;
  totalRounds: number;
  flowFiles?: FlowFile[]; 
  mcFlowSteps?: McFlowStep[];
  giftItems?: GiftItem[];
  sponsorships?: Sponsorship[];
  lotteryPoolConfig?: LotteryPoolConfig;
  lastDrawTrigger?: {
    winnerIds: string[];
    timestamp: number;
  } | null;
  lastSponsorshipTrigger?: {
    sponsorship: Sponsorship;
    timestamp: number;
  } | null;
  // 地點設定相關
  location?: {
    latitude: number;
    longitude: number;
    name: string;
    radius: number; // 單位：公尺
  };
}

export interface ParsedGuestDraft {
  code?: string;
  name: string;
  title: string;
  category: GuestCategory;
  note?: string;
  hasSignature: boolean;
  forcedRound?: number;
}
