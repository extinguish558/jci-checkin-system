
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Guest, SystemSettings, GuestCategory, ParsedGuestDraft, FlowFile, McFlowStep, GiftItem } from '../types';
import { db, isFirebaseReady } from '../services/firebase';

export type DrawMode = 'default' | 'all' | 'winners_only';

interface UnlockedSections {
  registration: boolean;
  gifts: boolean;
  mc: boolean;
  lottery: boolean;
}

interface ResetOptions {
  flow?: boolean;
  gifts?: boolean;
  checkin?: boolean;
  lottery?: boolean;
}

interface EventContextType {
  guests: Guest[];
  settings: SystemSettings;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  addGuestsFromDraft: (drafts: ParsedGuestDraft[], checkInTimestamp: Date, options?: { resetStatus?: boolean }) => Promise<void>;
  overwriteGuestsFromDraft: (drafts: ParsedGuestDraft[], checkInTimestamp: Date) => Promise<void>;
  updateGuestInfo: (id: string, updates: Partial<Guest>) => Promise<void>;
  toggleIntroduced: (id: string) => Promise<void>;
  resetIntroductions: () => Promise<void>;
  drawWinner: (mode?: DrawMode) => Guest | null;
  resetLottery: () => Promise<void>;
  clearLotteryRound: (round: number) => Promise<void>;
  removeWinnerFromRound: (guestId: string, round: number) => Promise<void>;
  nextLotteryRound: () => void;
  jumpToLotteryRound: (round: number) => void; 
  clearAllData: () => Promise<void>;
  clearGuestsOnly: () => Promise<void>;
  clearGiftsOnly: () => Promise<void>;
  clearMcFlowOnly: () => Promise<void>;
  resetGlobalEventState: () => Promise<void>;
  resetSpecificRecords: (options: ResetOptions) => Promise<void>;
  deleteGuest: (id: string) => Promise<void>;
  toggleCheckInRound: (id: string, round: number) => Promise<void>;
  clearGuestCheckIn: (id: string) => Promise<void>;
  clearAllCheckIns: () => Promise<void>;
  clearCheckInsForIds: (ids: string[]) => Promise<void>;
  addFlowFile: (file: FlowFile) => Promise<void>;
  removeFlowFile: (id: string) => Promise<void>;
  toggleMcFlowStep: (id: string) => Promise<void>;
  setMcFlowSteps: (steps: McFlowStep[]) => Promise<void>;
  toggleGiftPresented: (id: string) => Promise<void>;
  setGiftItems: (items: GiftItem[]) => Promise<void>;
  isCloudConnected: boolean; 
  connectionError: string | null;
  usingLocalDataProtection: boolean;
  uploadAllLocalDataToCloud: () => Promise<void>;
  isAdmin: boolean;
  unlockedSections: UnlockedSections;
  loginAdmin: (password: string) => boolean;
  logoutAdmin: () => void;
}

const defaultSettings: SystemSettings = {
  eventName: "年度盛會",
  briefSchedule: "",
  currentCheckInRound: 1,
  lotteryRoundCounter: 1,
  totalRounds: 2,
  flowFiles: [],
  mcFlowSteps: [],
  giftItems: []
};

const sanitizeForFirestore = (data: any) => {
    const clean = { ...data };
    Object.keys(clean).forEach(key => {
        if (clean[key] === undefined) {
            clean[key] = null;
        }
    });
    return clean;
};

const EventContext = createContext<EventContextType | undefined>(undefined);

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // 重要：防止同步競爭的保護鎖
  const isHardResetting = useRef(false);

  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('isAdmin') === 'true');
  const [unlockedSections, setUnlockedSections] = useState<UnlockedSections>(() => {
    const saved = localStorage.getItem('unlockedSections');
    return saved ? JSON.parse(saved) : { registration: false, gifts: false, mc: false, lottery: false };
  });

  const PASSWORDS = { ADMIN: "8888", REGISTRATION: "0000", GIFTS: "1111", MC: "2222", LOTTERY: "3333" };

  const loginAdmin = useCallback((password: string) => {
      if (password === PASSWORDS.ADMIN) {
          setIsAdmin(true);
          const allUnlocked = { registration: true, gifts: true, mc: true, lottery: true };
          setUnlockedSections(allUnlocked);
          localStorage.setItem('isAdmin', 'true');
          localStorage.setItem('unlockedSections', JSON.stringify(allUnlocked));
          return true;
      }
      let updated = { ...unlockedSections };
      let matched = false;
      if (password === PASSWORDS.REGISTRATION) { updated.registration = true; matched = true; }
      else if (password === PASSWORDS.GIFTS) { updated.gifts = true; matched = true; }
      else if (password === PASSWORDS.MC) { updated.mc = true; matched = true; }
      else if (password === PASSWORDS.LOTTERY) { updated.lottery = true; matched = true; }
      if (matched) {
          setUnlockedSections(updated);
          localStorage.setItem('unlockedSections', JSON.stringify(updated));
          return true;
      }
      return false;
  }, [unlockedSections]);

  const logoutAdmin = useCallback(() => {
      setIsAdmin(false);
      const locked = { registration: false, gifts: false, mc: false, lottery: false };
      setUnlockedSections(locked);
      localStorage.removeItem('isAdmin');
      localStorage.setItem('unlockedSections', JSON.stringify(locked));
  }, []);

  const saveToLocal = (newGuests: Guest[]) => { localStorage.setItem('event_guests', JSON.stringify(newGuests)); };
  const saveSettingsToLocal = (newSettings: SystemSettings) => { localStorage.setItem('event_settings', JSON.stringify(newSettings)); }

  useEffect(() => {
    if (!isFirebaseReady || !db) return;
    
    const unsubscribeSettings = db.collection("config").doc("mainSettings").onSnapshot((docSnap: any) => {
      // 如果正在執行寫入操作，跳過此次雲端入站更新，避免資料被舊快照覆蓋
      if (isHardResetting.current) {
        console.log("Blocking incoming settings snapshot during hard reset...");
        return;
      }
      
      if (docSnap.exists) {
        const s = docSnap.data() as SystemSettings;
        setSettings(s);
        saveSettingsToLocal(s);
      }
    });

    const unsubscribeGuests = db.collection("guests").onSnapshot((snapshot: any) => {
      setIsCloudConnected(true); setConnectionError(null);
      if (isHardResetting.current) return;
      const cloudGuests: Guest[] = [];
      snapshot.forEach((doc: any) => cloudGuests.push(doc.data() as Guest));
      setGuests(cloudGuests);
      saveToLocal(cloudGuests);
    }, (error: any) => { setIsCloudConnected(false); setConnectionError(error.message); });

    return () => { unsubscribeGuests(); unsubscribeSettings(); };
  }, []);

  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    const nextSettings = { ...settings, ...newSettings };
    setSettings(nextSettings);
    saveSettingsToLocal(nextSettings);
    if (db) {
        try {
            const sanitized = sanitizeForFirestore(newSettings);
            await db.collection("config").doc("mainSettings").set(sanitized, { merge: true });
        } catch (e: any) { console.error("Error updating settings:", e); }
    }
  };

  const clearMcFlowOnly = async () => {
    isHardResetting.current = true;
    try {
        const newFiles = (settings.flowFiles || []).filter(f => f.type !== 'mcflow_file');
        const updates = { mcFlowSteps: [], flowFiles: newFiles };
        
        // 1. 同步本地狀態
        setSettings(prev => ({ ...prev, ...updates }));
        saveSettingsToLocal({ ...settings, ...updates });
        
        // 2. 強制寫入雲端 (使用 set merge 以清空陣列)
        if (db) {
            await db.collection("config").doc("mainSettings").set(sanitizeForFirestore(updates), { merge: true });
        }
        console.log("McFlow data cleared in cloud and local.");
    } finally {
        // 給予 2 秒的緩衝時間確保 Firestore 完成所有非同步更新
        setTimeout(() => { isHardResetting.current = false; }, 2000);
    }
  };

  const clearGiftsOnly = async () => {
    isHardResetting.current = true;
    try {
        const newFiles = (settings.flowFiles || []).filter(f => f.type !== 'gifts_file');
        const updates = { giftItems: [], flowFiles: newFiles };
        setSettings(prev => ({ ...prev, ...updates }));
        saveSettingsToLocal({ ...settings, ...updates });
        if (db) {
            await db.collection("config").doc("mainSettings").set(sanitizeForFirestore(updates), { merge: true });
        }
    } finally {
        setTimeout(() => { isHardResetting.current = false; }, 2000);
    }
  };

  const clearGuestsOnly = async () => {
    isHardResetting.current = true;
    try {
        setGuests([]);
        saveToLocal([]);
        const newFiles = (settings.flowFiles || []).filter(f => f.type !== 'guests_file');
        if (db) {
            const snapshot = await db.collection("guests").get();
            const batch = db.batch();
            snapshot.forEach((doc: any) => batch.delete(doc.ref));
            await batch.commit();
        }
        await updateSettings({ flowFiles: newFiles });
    } finally {
        setTimeout(() => { isHardResetting.current = false; }, 3000);
    }
  };

  const toggleMcFlowStep = async (id: string) => {
    const currentSteps = settings.mcFlowSteps || [];
    const newSteps = currentSteps.map(step => step.id === id ? { ...step, isCompleted: !step.isCompleted } : step);
    await updateSettings({ mcFlowSteps: newSteps });
  };

  const setMcFlowSteps = async (steps: McFlowStep[]) => { await updateSettings({ mcFlowSteps: steps }); };
  const setGiftItems = async (items: GiftItem[]) => { await updateSettings({ giftItems: items }); };
  const toggleGiftPresented = async (id: string) => {
    const currentItems = settings.giftItems || [];
    const newItems = currentItems.map(item => item.id === id ? { ...item, isPresented: !item.isPresented } : item);
    await updateSettings({ giftItems: newItems });
  };

  const updateGuestInfo = async (id: string, updates: Partial<Guest>) => {
    setGuests(prev => {
        const next = prev.map(g => g.id === id ? { ...g, ...updates } : g);
        saveToLocal(next);
        return next;
    });
    if (db) {
        try {
            await db.collection("guests").doc(id).set(sanitizeForFirestore(updates), { merge: true });
        } catch (e: any) { console.error("Update guest info failed", e); }
    }
  };

  const toggleCheckInRound = async (id: string, targetRound: number) => {
    const guest = guests.find(g => g.id === id);
    if (!guest) return;
    const currentRounds = guest.attendedRounds || [];
    const isAttendingTarget = currentRounds.includes(targetRound);
    let newRounds = isAttendingTarget ? [] : [targetRound];
    const updates = {
        attendedRounds: newRounds,
        isCheckedIn: newRounds.length > 0,
        round: newRounds.length > 0 ? targetRound : null,
        checkInTime: newRounds.length > 0 ? (guest.checkInTime || new Date().toISOString()) : null,
        isIntroduced: newRounds.length > 0 ? guest.isIntroduced : false 
    };
    await updateGuestInfo(id, updates);
  };

  const toggleIntroduced = async (id: string) => {
    const guest = guests.find(g => g.id === id);
    if (!guest) return;
    await updateGuestInfo(id, { isIntroduced: !guest.isIntroduced });
  };

  const resetGlobalEventState = async () => {
    if (!confirm('確定要重置今日所有進度（報到、得獎、講稿進度）嗎？人員名冊將保留。')) return;
    isHardResetting.current = true;
    try {
        const updatedSteps = (settings.mcFlowSteps || []).map(s => ({ ...s, isCompleted: false }));
        const updatedGifts = (settings.giftItems || []).map(i => ({ ...i, isPresented: false }));
        await updateSettings({ mcFlowSteps: updatedSteps, giftItems: updatedGifts, currentCheckInRound: 1, lotteryRoundCounter: 1 });
        
        const batch = db.batch();
        guests.forEach(g => {
            const ref = db.collection("guests").doc(g.id);
            batch.set(ref, { isCheckedIn: false, attendedRounds: [], checkInTime: null, round: null, isIntroduced: false, isWinner: false, wonRounds: [], winRound: null, wonTimes: {} }, { merge: true });
        });
        await batch.commit();
    } finally {
        setTimeout(() => { isHardResetting.current = false; }, 3000);
    }
  };

  const removeWinnerFromRound = async (guestId: string, round: number) => {
    const guest = guests.find(g => g.id === guestId);
    if (!guest) return;
    const newWonRounds = (guest.wonRounds || []).filter(r => r !== round);
    const newWonTimes = { ...(guest.wonTimes || {}) };
    delete newWonTimes[round.toString()];
    await updateGuestInfo(guestId, { wonRounds: newWonRounds, isWinner: newWonRounds.length > 0, winRound: newWonRounds.length > 0 ? Math.max(...newWonRounds) : undefined, wonTimes: newWonTimes });
  };

  const resetLottery = async () => {
    isHardResetting.current = true;
    try {
        await updateSettings({ lotteryRoundCounter: 1 });
        const batch = db.batch();
        guests.forEach(g => {
            const ref = db.collection("guests").doc(g.id);
            batch.set(ref, { isWinner: false, wonRounds: [], winRound: null, wonTimes: {} }, { merge: true });
        });
        await batch.commit();
    } finally {
        setTimeout(() => { isHardResetting.current = false; }, 2000);
    }
  };

  const jumpToLotteryRound = (round: number) => updateSettings({ lotteryRoundCounter: round });

  return (
    <EventContext.Provider value={{
      guests, settings, updateSettings, addGuestsFromDraft: async() => {}, overwriteGuestsFromDraft: async() => {}, updateGuestInfo, toggleIntroduced,
      resetIntroductions: async() => {}, drawWinner: () => null, resetLottery, clearLotteryRound: async() => {}, removeWinnerFromRound, nextLotteryRound: () => {},
      jumpToLotteryRound, clearAllData: async() => {}, clearGuestsOnly, clearGiftsOnly, clearMcFlowOnly, resetGlobalEventState, resetSpecificRecords: async() => {}, deleteGuest: async() => {}, toggleCheckInRound, clearGuestCheckIn: async() => {},
      clearAllCheckIns: async() => {}, clearCheckInsForIds: async() => {}, addFlowFile: async(f) => {
        const current = settings.flowFiles || [];
        const next = [...current.filter(x => x.type !== f.type), f];
        await updateSettings({ flowFiles: next });
      }, removeFlowFile: async() => {}, toggleMcFlowStep, setMcFlowSteps, 
      toggleGiftPresented, setGiftItems, isCloudConnected, connectionError: null,
      usingLocalDataProtection: false, uploadAllLocalDataToCloud: async() => {}, isAdmin, unlockedSections, loginAdmin, logoutAdmin
    }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEvent = () => {
  const context = useContext(EventContext);
  if (!context) throw new Error("useEvent must be used within EventProvider");
  return context;
};
