
export enum GuestCategory {
  PAST_PRESIDENT = '歷屆會長',
  PAST_CHAIRMAN = '歷屆主席',
  HQ_GUEST = '總會貴賓',
  GOV_OFFICIAL = '政府貴賓',
  VISITING_CHAPTER = '友會來訪',
  MEMBER_YB = '會友 (YB)', // New: Young Business
  MEMBER_OB = '特友會 (OB)', // New: Old Boy
  OTHER = '其他貴賓'
}

export interface Guest {
  id: string;
  code?: string; // New: Original Source ID (e.g., OB-123)
  name: string;
  title: string;
  category: GuestCategory;
  note?: string; // Added note field
  isCheckedIn: boolean; // Computed: True if attendedRounds.length > 0
  attendedRounds: number[]; // New: Tracks specific rounds [1, 2]
  checkInTime?: string; // ISO String (Optional if not checked in)
  round?: number; // Legacy/Display: Returns the latest round attended
  isIntroduced: boolean;
  isWinner: boolean; // True if won in ANY round
  wonRounds: number[]; // New: Tracks ALL rounds won (e.g. [1, 3])
  winRound?: number; // Legacy: kept for compatibility, optional
}

export interface SystemSettings {
  eventName: string;
  currentCheckInRound: number; // Replaces time cutoffs. Manually set (1 or 2).
  lotteryRoundCounter: number;
  totalRounds: number; // Keep this if we want to support up to 6 in future, but UI will focus on 1 & 2
}

export interface ParsedGuestDraft {
  code?: string; // New: Original Source ID
  name: string;
  title: string;
  category: GuestCategory;
  note?: string; // Added note field
  hasSignature: boolean;
  forcedRound?: number; // Optional: If specified, forces check-in to this round
}
