
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Guest, SystemSettings, GuestCategory, ParsedGuestDraft, FlowFile, McFlowStep, GiftItem, Sponsorship } from '../types';
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
  drawWinners: (count: number) => Guest[]; 
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
  addSponsorship: (sponsorship: Omit<Sponsorship, 'id' | 'timestamp'>) => Promise<void>;
  updateSponsorship: (id: string, updates: Partial<Sponsorship>) => Promise<void>;
  deleteSponsorship: (id: string) => Promise<void>;
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
  giftItems: [],
  sponsorships: [],
  lotteryPoolConfig: {
    includedCategories: Object.values(GuestCategory),
    includedIndividualIds: []
  },
  lastDrawTrigger: null,
  lastSponsorshipTrigger: null
};

const sanitizeForFirestore = (obj: any): any => {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => sanitizeForFirestore(item));
  const sanitized: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      sanitized[key] = sanitizeForFirestore(obj[key]);
    }
  }
  return sanitized;
};

const EventContext = createContext<EventContextType | undefined>(undefined);

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
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
        } catch (e: any) { 
          console.error("Firebase Update Error:", e);
          throw e; 
        }
    }
  };

  const addGuestsFromDraft = async (drafts: ParsedGuestDraft[], checkInTimestamp: Date) => {
    const newGuests: Guest[] = drafts.map(d => ({
      id: Math.random().toString(36).substr(2, 9),
      code: d.code,
      name: d.name,
      title: d.title,
      category: d.category,
      note: d.note,
      isCheckedIn: d.hasSignature,
      attendedRounds: d.hasSignature ? [settings.currentCheckInRound] : [],
      checkInTime: d.hasSignature ? checkInTimestamp.toISOString() : undefined,
      round: d.hasSignature ? settings.currentCheckInRound : undefined,
      isIntroduced: false,
      isWinner: false,
      wonRounds: [],
    }));
    if (db) {
      const batch = db.batch();
      newGuests.forEach(g => {
        const ref = db.collection("guests").doc(g.id);
        batch.set(ref, sanitizeForFirestore(g));
      });
      await batch.commit();
    } else {
      const updated = [...guests, ...newGuests];
      setGuests(updated);
      saveToLocal(updated);
    }
  };

  const overwriteGuestsFromDraft = async (drafts: ParsedGuestDraft[], checkInTimestamp: Date) => {
    isHardResetting.current = true;
    try {
      if (db) {
        const snapshot = await db.collection("guests").get();
        const batch = db.batch();
        snapshot.forEach((doc: any) => batch.delete(doc.ref));
        await batch.commit();
      }
      await addGuestsFromDraft(drafts, checkInTimestamp);
    } finally {
      setTimeout(() => { isHardResetting.current = false; }, 2000);
    }
  };

  const updateGuestInfo = async (id: string, updates: Partial<Guest>) => {
    if (db) {
      await db.collection("guests").doc(id).set(sanitizeForFirestore(updates), { merge: true });
    } else {
      setGuests(prev => {
        const next = prev.map(g => g.id === id ? { ...g, ...updates } : g);
        saveToLocal(next);
        return next;
      });
    }
  };

  const deleteGuest = async (id: string) => {
    if (db) {
      await db.collection("guests").doc(id).delete();
    } else {
      const updated = guests.filter(g => g.id !== id);
      setGuests(updated);
      saveToLocal(updated);
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
        checkInTime: newRounds.length > 0 ? (guest.checkInTime || new Date().toISOString()) : null
    };
    await updateGuestInfo(id, updates);
  };

  const toggleIntroduced = async (id: string) => {
    const guest = guests.find(g => g.id === id);
    if (!guest) return;
    await updateGuestInfo(id, { isIntroduced: !guest.isIntroduced });
  };

  const drawWinners = (count: number): Guest[] => {
    const round = settings.lotteryRoundCounter;
    const poolConfig = settings.lotteryPoolConfig || { includedCategories: Object.values(GuestCategory), includedIndividualIds: [] };
    
    // Filter candidates based on pool configuration
    let pool = guests.filter(g => {
      if (!g.isCheckedIn) return false; // Must be checked in
      if (g.wonRounds?.includes(round)) return false; // Must not have won in this round
      
      const isInCategory = poolConfig.includedCategories.includes(g.category);
      const isExplicitlyIncluded = poolConfig.includedIndividualIds.includes(g.id);
      
      return isInCategory || isExplicitlyIncluded;
    });

    if (pool.length === 0) return [];
    
    const actualCount = Math.min(count, pool.length);
    const selectedWinners: Guest[] = [];
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    for (let i = 0; i < actualCount; i++) selectedWinners.push(shuffled[i]);
    const now = new Date().toISOString();
    
    if (db) {
      const batch = db.batch();
      selectedWinners.forEach(winner => {
        const wonRounds = [...(winner.wonRounds || []), round];
        const wonTimes = { ...(winner.wonTimes || {}), [round.toString()]: now };
        const ref = db.collection("guests").doc(winner.id);
        batch.update(ref, { isWinner: true, wonRounds, winRound: round, wonTimes });
      });
      batch.commit();
    }
    
    updateSettings({ lastDrawTrigger: { winnerIds: selectedWinners.map(w => w.id), timestamp: Date.now() } });
    return selectedWinners;
  };

  const drawWinner = (): Guest | null => {
    const results = drawWinners(1);
    return results.length > 0 ? results[0] : null;
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
    await updateSettings({ lotteryRoundCounter: 1, lastDrawTrigger: null, lastSponsorshipTrigger: null });
    if (db) {
        const snapshot = await db.collection("guests").get();
        const batch = db.batch();
        snapshot.forEach((doc: any) => { batch.update(doc.ref, { isWinner: false, wonRounds: [], winRound: null, wonTimes: {} }); });
        await batch.commit();
    }
  };

  const clearMcFlowOnly = async () => {
    isHardResetting.current = true;
    try {
        const newFiles = (settings.flowFiles || []).filter(f => f.type !== 'mcflow_file');
        const updates = { mcFlowSteps: [], flowFiles: newFiles };
        if (db) await db.collection("config").doc("mainSettings").set(sanitizeForFirestore(updates), { merge: true });
    } finally { setTimeout(() => { isHardResetting.current = false; }, 2000); }
  };

  const clearGiftsOnly = async () => {
    isHardResetting.current = true;
    try {
        const newFiles = (settings.flowFiles || []).filter(f => f.type !== 'gifts_file');
        const updates = { giftItems: [], flowFiles: newFiles };
        if (db) await db.collection("config").doc("mainSettings").set(sanitizeForFirestore(updates), { merge: true });
    } finally { setTimeout(() => { isHardResetting.current = false; }, 2000); }
  };

  const clearGuestsOnly = async () => {
    isHardResetting.current = true;
    try {
        if (db) {
            const snapshot = await db.collection("guests").get();
            const batch = db.batch();
            snapshot.forEach((doc: any) => batch.delete(doc.ref));
            await batch.commit();
        }
        await updateSettings({ flowFiles: (settings.flowFiles || []).filter(f => f.type !== 'guests_file') });
    } finally { setTimeout(() => { isHardResetting.current = false; }, 3000); }
  };

  const resetGlobalEventState = async () => {
    isHardResetting.current = true;
    try {
        const updatedSteps = (settings.mcFlowSteps || []).map(s => ({ ...s, isCompleted: false, completedAt: null }));
        const updatedGifts = (settings.giftItems || []).map(i => ({ ...i, isPresented: false, presentedAt: null }));
        await updateSettings({ mcFlowSteps: updatedSteps, giftItems: updatedGifts, currentCheckInRound: 1, lotteryRoundCounter: 1, lastDrawTrigger: null, sponsorships: [], lastSponsorshipTrigger: null });
        if (db) {
            const snapshot = await db.collection("guests").get();
            const batch = db.batch();
            snapshot.forEach((doc: any) => {
                batch.update(doc.ref, { isCheckedIn: false, attendedRounds: [], checkInTime: null, round: null, isIntroduced: false, isWinner: false, wonRounds: [], winRound: null, wonTimes: {} });
            });
            await batch.commit();
        }
    } finally { setTimeout(() => { isHardResetting.current = false; }, 3000); }
  };

  const addSponsorship = async (s: Omit<Sponsorship, 'id' | 'timestamp'>) => {
    const newS: Sponsorship = {
      ...s,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString()
    };
    const nextSponsorships = [...(settings.sponsorships || []), newS];
    await updateSettings({ 
      sponsorships: nextSponsorships,
      lastSponsorshipTrigger: { sponsorship: newS, timestamp: Date.now() }
    });
  };

  const updateSponsorship = async (id: string, updates: Partial<Sponsorship>) => {
    const nextSponsorships = (settings.sponsorships || []).map(s => s.id === id ? { ...s, ...updates } : s);
    await updateSettings({ sponsorships: nextSponsorships });
  };

  const deleteSponsorship = async (id: string) => {
    const nextSponsorships = (settings.sponsorships || []).filter(s => s.id !== id);
    await updateSettings({ sponsorships: nextSponsorships });
  };

  const jumpToLotteryRound = (round: number) => updateSettings({ lotteryRoundCounter: round });
  const setMcFlowSteps = async (steps: McFlowStep[]) => { await updateSettings({ mcFlowSteps: steps }); };
  const toggleMcFlowStep = async (id: string) => {
    const currentSteps = settings.mcFlowSteps || [];
    const nextSteps = currentSteps.map(s => s.id === id ? { 
      ...s, 
      isCompleted: !s.isCompleted,
      completedAt: !s.isCompleted ? new Date().toISOString() : null 
    } : s);
    await updateSettings({ mcFlowSteps: nextSteps });
  };
  const setGiftItems = async (items: GiftItem[]) => { await updateSettings({ giftItems: items }); };
  const toggleGiftPresented = async (id: string) => {
    const currentItems = settings.giftItems || [];
    const nextItems = currentItems.map(i => i.id === id ? { 
      ...i, 
      isPresented: !i.isPresented,
      presentedAt: !i.isPresented ? new Date().toISOString() : null
    } : i);
    await updateSettings({ giftItems: nextItems });
  };

  return (
    <EventContext.Provider value={{
      guests, settings, updateSettings, addGuestsFromDraft, overwriteGuestsFromDraft, updateGuestInfo, toggleIntroduced,
      resetIntroductions: async() => {}, drawWinner, drawWinners, resetLottery, clearLotteryRound: async() => {}, removeWinnerFromRound, nextLotteryRound: () => {},
      jumpToLotteryRound, clearAllData: async() => {}, clearGuestsOnly, clearGiftsOnly, clearMcFlowOnly, resetGlobalEventState, resetSpecificRecords: async() => {}, deleteGuest, toggleCheckInRound, clearGuestCheckIn: async() => {},
      clearAllCheckIns: async() => {}, clearCheckInsForIds: async() => {}, addFlowFile: async(f) => {
        const current = settings.flowFiles || [];
        const next = [...current.filter(x => x.type !== f.type), f];
        await updateSettings({ flowFiles: next });
      }, removeFlowFile: async() => {}, toggleMcFlowStep, setMcFlowSteps, 
      toggleGiftPresented, setGiftItems, addSponsorship, updateSponsorship, deleteSponsorship, isCloudConnected, connectionError: null,
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
