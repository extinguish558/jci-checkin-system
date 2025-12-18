
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

export interface FlowFile {
  id: string;
  name: string;
  type: 'schedule' | 'gifts' | 'slides';
  mimeType: string;
  size: number;
  uploadTime: string;
  data?: string; // Base64 內容 (用於小型檔案)
  url?: string;  // 外部連結網址 (用於大型簡報檔案)
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
}

export interface SystemSettings {
  eventName: string;
  briefSchedule?: string; // 新增：精簡流程文字
  currentCheckInRound: number;
  lotteryRoundCounter: number;
  totalRounds: number;
  flowFiles?: FlowFile[]; 
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
