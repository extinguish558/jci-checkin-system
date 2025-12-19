
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  addGuestsFromDraft: (drafts: ParsedGuestDraft[], checkInTimestamp: Date) => Promise<void>;
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

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const sanitizeForFirestore = (data: any) => {
    const clean = { ...data };
    Object.keys(clean).forEach(key => {
        if (clean[key] === undefined) {
            delete clean[key];
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
  const [usingLocalDataProtection, setUsingLocalDataProtection] = useState(false);
  
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('isAdmin') === 'true');
  const [unlockedSections, setUnlockedSections] = useState<UnlockedSections>(() => {
    const saved = localStorage.getItem('unlockedSections');
    return saved ? JSON.parse(saved) : { registration: false, gifts: false, mc: false, lottery: false };
  });
  
  const PASSWORDS = {
    ADMIN: "8888",
    REGISTRATION: "0000",
    GIFTS: "1111",
    MC: "2222",
    LOTTERY: "3333"
  };

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
      
      if (password === PASSWORDS.REGISTRATION) {
          updated.registration = true;
          matched = true;
      } else if (password === PASSWORDS.GIFTS) {
          updated.gifts = true;
          matched = true;
      } else if (password === PASSWORDS.MC) {
          updated.mc = true; 
          matched = true;
      } else if (password === PASSWORDS.LOTTERY) {
          updated.lottery = true;
          matched = true;
      }

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

  const saveToLocal = (newGuests: Guest[]) => {
      localStorage.setItem('event_guests', JSON.stringify(newGuests));
  };
  const saveSettingsToLocal = (newSettings: SystemSettings) => {
      localStorage.setItem('event_settings', JSON.stringify(newSettings));
  }

  useEffect(() => {
      try {
          const localG = localStorage.getItem('event_guests');
          if (localG) setGuests(JSON.parse(localG));
          const localS = localStorage.getItem('event_settings');
          if (localS) setSettings(JSON.parse(localS));
      } catch (e) { console.error("Initial load failed", e); }
  }, []);

  useEffect(() => {
    if (!isFirebaseReady || !db) {
      setConnectionError("Firebase Config 未設定");
      return;
    }

    const unsubscribeGuests = db.collection("guests").onSnapshot((snapshot: any) => {
      setIsCloudConnected(true);
      setConnectionError(null);
      const cloudGuests: Guest[] = [];
      snapshot.forEach((doc: any) => cloudGuests.push(doc.data() as Guest));
      
      if (cloudGuests.length > 0) {
          setGuests(cloudGuests);
          saveToLocal(cloudGuests);
          setUsingLocalDataProtection(false);
      } else {
          const localStr = localStorage.getItem('event_guests');
          if (localStr && JSON.parse(localStr).length > 0) {
              setUsingLocalDataProtection(true);
          }
      }
    }, (error: any) => {
      setIsCloudConnected(false);
      setConnectionError(error.message);
    });

    const unsubscribeSettings = db.collection("config").doc("mainSettings").onSnapshot((docSnap: any) => {
      if (docSnap.exists) {
        const s = docSnap.data() as SystemSettings;
        setSettings(s);
        saveSettingsToLocal(s);
      }
    });

    return () => {
      unsubscribeGuests();
      unsubscribeSettings();
    };
  }, []);

  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    const nextSettings = { ...settings, ...newSettings };
    setSettings(nextSettings);
    saveSettingsToLocal(nextSettings);
    if (db) {
        try {
            await db.collection("config").doc("mainSettings").set(nextSettings, { merge: true });
        } catch (e: any) { 
            console.error("Error updating settings:", e);
        }
    }
  };

  const toggleMcFlowStep = async (id: string) => {
    const currentSteps = settings.mcFlowSteps || [];
    const newSteps = currentSteps.map(step => step.id === id ? { ...step, isCompleted: !step.isCompleted } : step);
    await updateSettings({ mcFlowSteps: newSteps });
  };

  const setMcFlowSteps = async (steps: McFlowStep[]) => {
    await updateSettings({ mcFlowSteps: steps });
  };

  const toggleGiftPresented = async (id: string) => {
    const currentItems = settings.giftItems || [];
    const newItems = currentItems.map(item => item.id === id ? { ...item, isPresented: !item.isPresented } : item);
    await updateSettings({ giftItems: newItems });
  };

  const setGiftItems = async (items: GiftItem[]) => {
    await updateSettings({ giftItems: items });
  };

  const clearCheckInsForIds = useCallback(async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    setGuests(prev => {
        const updated = prev.map(g => ids.includes(g.id) ? {
            ...g,
            attendedRounds: [],
            isCheckedIn: false,
            round: undefined,
            checkInTime: undefined,
            isIntroduced: false
        } : g);
        saveToLocal(updated);
        return updated;
    });
    if (db) {
        try {
            const MAX_BATCH_SIZE = 450;
            for (let i = 0; i < ids.length; i += MAX_BATCH_SIZE) {
                const chunk = ids.slice(i, i + MAX_BATCH_SIZE);
                const batch = db.batch();
                chunk.forEach(id => {
                    const ref = db.collection("guests").doc(id);
                    batch.set(ref, { 
                        attendedRounds: [], 
                        isCheckedIn: false, 
                        round: null, 
                        checkInTime: null,
                        isIntroduced: false 
                    }, { merge: true });
                });
                await batch.commit();
            }
        } catch (error: any) {
            console.error("Reset cloud sync failed:", error);
            alert("重置失敗: " + error.message);
        }
    }
  }, []);

  const clearAllCheckIns = useCallback(async () => {
    const allIds = guests.map(g => g.id);
    await clearCheckInsForIds(allIds);
  }, [guests, clearCheckInsForIds]);

  const addFlowFile = async (file: FlowFile) => {
    const currentFiles = settings.flowFiles || [];
    const filteredFiles = currentFiles.filter(f => f.type !== file.type);
    const newFiles = [...filteredFiles, file];
    await updateSettings({ flowFiles: newFiles });
  };

  const removeFlowFile = async (id: string) => {
    const newFiles = (settings.flowFiles || []).filter(f => f.id !== id);
    await updateSettings({ flowFiles: newFiles });
  };

  const uploadAllLocalDataToCloud = async () => {
      if (!db) throw new Error("Firebase 尚未初始化");
      const MAX_BATCH_SIZE = 450;
      for (let i = 0; i < guests.length; i += MAX_BATCH_SIZE) {
          const chunk = guests.slice(i, i + MAX_BATCH_SIZE);
          const batch = db.batch();
          chunk.forEach(g => batch.set(db.collection("guests").doc(g.id), sanitizeForFirestore(g), { merge: true }));
          await batch.commit();
      }
      await db.collection("config").doc("mainSettings").set(settings, { merge: true });
      setUsingLocalDataProtection(false);
  };

  const addGuestsFromDraft = async (drafts: ParsedGuestDraft[], checkInTimestamp: Date) => {
    const globalRound = settings.currentCheckInRound;
    const BLACKLIST = ['姓名', '職稱', '備註'];
    let newDocs: any[] = [];
    setGuests(prevGuests => {
        const currentGuests = [...prevGuests];
        const existingNames = new Map<string, number>(); 
        currentGuests.forEach((g, idx) => existingNames.set(g.name, idx));
        const offlineGuestList = [...currentGuests];
        drafts.forEach(draft => {
            if (!draft.name || !draft.name.trim()) return;
            const cleanName = draft.name.trim();
            if (BLACKLIST.some(b => cleanName.includes(b))) return;
            const shouldAddRound = draft.hasSignature;
            const targetRound = draft.forcedRound !== undefined ? draft.forcedRound : globalRound;
            const exists = existingNames.has(cleanName);
            if (exists) {
                const idx = existingNames.get(cleanName)!;
                const existing = offlineGuestList[idx];
                let newRounds = [...(existing.attendedRounds || [])];
                const isNewlyCheckingIn = !existing.isCheckedIn && shouldAddRound;
                if (shouldAddRound) newRounds = [targetRound];
                const updatedGuest: Guest = {
                    ...existing,
                    attendedRounds: newRounds,
                    isCheckedIn: newRounds.length > 0,
                    round: newRounds.length > 0 ? Math.max(...newRounds) : undefined,
                    checkInTime: newRounds.length > 0 ? (existing.checkInTime || checkInTimestamp.toISOString()) : undefined,
                    title: draft.title || existing.title,
                    category: draft.category || existing.category,
                    code: draft.code || existing.code,
                    note: draft.note || existing.note,
                    isIntroduced: isNewlyCheckingIn ? false : existing.isIntroduced 
                };
                offlineGuestList[idx] = updatedGuest;
                newDocs.push({ type: 'set', id: existing.id, data: sanitizeForFirestore(updatedGuest) });
            } else {
                const draftId = generateId();
                const newRounds = shouldAddRound ? [targetRound] : [];
                const newGuest: Guest = {
                    id: draftId,
                    code: draft.code || '',
                    name: cleanName,
                    title: draft.title || '', 
                    category: draft.category,
                    note: draft.note || '',
                    attendedRounds: newRounds,
                    isCheckedIn: newRounds.length > 0,
                    checkInTime: shouldAddRound ? checkInTimestamp.toISOString() : undefined,
                    round: shouldAddRound ? targetRound : undefined,
                    isIntroduced: false, 
                    isWinner: false,
                    wonRounds: []
                };
                offlineGuestList.push(newGuest);
                newDocs.push({ type: 'set', id: draftId, data: sanitizeForFirestore(newGuest) });
            }
        });
        saveToLocal(offlineGuestList);
        return offlineGuestList;
    });
    if (db) {
        try {
            const batch = db.batch();
            newDocs.forEach(op => {
                const ref = db.collection("guests").doc(op.id);
                batch.set(ref, op.data, { merge: true });
            });
            await batch.commit();
        } catch (e: any) { alert("匯入雲端失敗: " + e.message); }
    }
  };

  const overwriteGuestsFromDraft = async (drafts: ParsedGuestDraft[], checkInTimestamp: Date) => {
    if (!confirm('此操作將會「清空所有現有名單」並替換為新檔案，確定要執行嗎？')) return;
    
    if (db) {
        const snapshot = await db.collection("guests").get();
        const batch = db.batch();
        snapshot.forEach((doc: any) => batch.delete(doc.ref));
        await batch.commit();
    }
    setGuests([]);
    saveToLocal([]);

    await addGuestsFromDraft(drafts, checkInTimestamp);
  };

  const updateGuestInfo = async (id: string, updates: Partial<Guest>) => {
      setGuests(prev => {
          const next = prev.map(g => g.id === id ? { ...g, ...updates } : g);
          saveToLocal(next);
          return next;
      });
      if (db) {
          try {
              await db.collection("guests").doc(id).set(updates, { merge: true });
          } catch (e: any) { alert("更新失敗: " + e.message); }
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
      updateGuestInfo(id, updates);
  };

  const clearGuestCheckIn = async (id: string) => {
      const updates = { attendedRounds: [], isCheckedIn: false, round: null, checkInTime: null, isIntroduced: false };
      updateGuestInfo(id, updates);
  };

  const toggleIntroduced = async (id: string) => {
    const guest = guests.find(g => g.id === id);
    if (!guest) return;
    updateGuestInfo(id, { isIntroduced: !guest.isIntroduced });
  };

  const resetIntroductions = async () => {
    if (confirm('確定要重置所有介紹狀態嗎？')) {
        const ids = guests.filter(g => g.isIntroduced).map(g => g.id);
        if (ids.length === 0) return;
        setGuests(prev => {
            const next = prev.map(g => ({ ...g, isIntroduced: false }));
            saveToLocal(next);
            return next;
        });
        if (db) {
            try {
                const batch = db.batch();
                ids.forEach(id => batch.set(db.collection("guests").doc(id), { isIntroduced: false }, { merge: true }));
                await batch.commit();
            } catch (e: any) { alert("重置介紹失敗: " + e.message); }
        }
    }
  };

  const drawWinner = (mode: DrawMode = 'default'): Guest | null => {
    const checkedInGuests = guests.filter(g => g.isCheckedIn);
    const currentRound = settings.lotteryRoundCounter;
    const eligible = checkedInGuests.filter(g => !g.wonRounds.includes(currentRound));
    if (eligible.length === 0) return null;
    const winner = eligible[Math.floor(Math.random() * eligible.length)];
    const newWonRounds = [...(winner.wonRounds || []), currentRound];
    const newWonTimes = { ...(winner.wonTimes || {}), [currentRound.toString()]: new Date().toISOString() };
    const updates = { isWinner: true, wonRounds: newWonRounds, winRound: currentRound, wonTimes: newWonTimes };
    updateGuestInfo(winner.id, updates);
    return winner;
  };

  const resetLottery = async () => {
    if (confirm('確定要重置所有抽獎名單嗎？')) {
      setGuests(prev => {
          const next = prev.map(g => ({ ...g, isWinner: false, winRound: undefined, wonRounds: [], wonTimes: {} }));
          saveToLocal(next);
          return next;
      });
      updateSettings({ lotteryRoundCounter: 1 });
      if (db) {
          try {
              const batch = db.batch();
              guests.forEach(g => batch.set(db.collection("guests").doc(g.id), { isWinner: false, winRound: null, wonRounds: [], wonTimes: {} }, { merge: true }));
              await batch.commit();
          } catch (e: any) { alert("重置抽獎失敗: " + e.message); }
      }
    }
  };

  const clearLotteryRound = async (round: number) => {
      if (!confirm(`確定要清除第 ${round} 輪得獎紀錄嗎？`)) return;
      setGuests(prev => {
          const next = prev.map(g => {
              if (g.wonRounds.includes(round)) {
                  const remaining = g.wonRounds.filter(r => r !== round);
                  const newWonTimes = { ...(g.wonTimes || {}) };
                  delete newWonTimes[round.toString()];
                  return { ...g, wonRounds: remaining, isWinner: remaining.length > 0, wonTimes: newWonTimes };
              }
              return g;
          });
          saveToLocal(next);
          return next;
      });
      if (db) {
          try {
              const batch = db.batch();
              guests.forEach(g => {
                  if (g.wonRounds.includes(round)) {
                      const remaining = g.wonRounds.filter(r => r !== round);
                      const newWonTimes = { ...(g.wonTimes || {}) };
                      delete newWonTimes[round.toString()];
                      batch.set(db.collection("guests").doc(g.id), { wonRounds: remaining, isWinner: remaining.length > 0, wonTimes: newWonTimes }, { merge: true });
                  }
              });
              await batch.commit();
          } catch (e: any) { alert("清除失敗: " + e.message); }
      }
  };

  const removeWinnerFromRound = async (guestId: string, round: number) => {
      const guest = guests.find(g => g.id === guestId);
      if (!guest) return;
      const newWonRounds = (guest.wonRounds || []).filter(r => r !== round);
      const isWinner = newWonRounds.length > 0;
      const newWonTimes = { ...(guest.wonTimes || {}) };
      delete newWonTimes[round.toString()];
      await updateGuestInfo(guestId, {
          wonRounds: newWonRounds,
          isWinner: isWinner,
          winRound: isWinner ? Math.max(...newWonRounds) : undefined,
          wonTimes: newWonTimes
      });
  };

  const nextLotteryRound = () => updateSettings({ lotteryRoundCounter: settings.lotteryRoundCounter + 1 });
  const jumpToLotteryRound = (round: number) => updateSettings({ lotteryRoundCounter: round });

  const clearAllData = async () => {
      if (!confirm('確定要刪除「所有」資料（包括檔案、名單與設定）嗎？此操作不可復原。')) return;
      setGuests([]);
      saveToLocal([]);
      const newSettings = { ...defaultSettings };
      setSettings(newSettings);
      saveSettingsToLocal(newSettings);
      if (db) {
        try {
            const snapshot = await db.collection("guests").get();
            const batch = db.batch();
            snapshot.forEach((doc: any) => batch.delete(doc.ref));
            batch.set(db.collection("config").doc("mainSettings"), newSettings);
            await batch.commit();
        } catch (e: any) { alert("刪除全域資料失敗: " + e.message); }
      }
  }

  const resetSpecificRecords = async (options: ResetOptions) => {
    const settingsUpdates: Partial<SystemSettings> = {};
    const guestUpdates: Record<string, Partial<Guest>> = {};

    if (options.flow) {
      settingsUpdates.mcFlowSteps = (settings.mcFlowSteps || []).map(s => ({ ...s, isCompleted: false }));
    }

    if (options.gifts) {
      settingsUpdates.giftItems = (settings.giftItems || []).map(i => ({ ...i, isPresented: false }));
    }

    if (options.checkin || options.lottery) {
      guests.forEach(g => {
        const u: Partial<Guest> = {};
        if (options.checkin) {
          u.isCheckedIn = false;
          u.attendedRounds = [];
          u.checkInTime = undefined;
          u.round = undefined;
          u.isIntroduced = false;
        }
        if (options.lottery) {
          u.isWinner = false;
          u.wonRounds = [];
          u.winRound = undefined;
          u.wonTimes = {};
        }
        if (Object.keys(u).length > 0) {
          guestUpdates[g.id] = u;
        }
      });
    }

    if (options.lottery) {
      settingsUpdates.lotteryRoundCounter = 1;
    }

    if (options.checkin) {
      settingsUpdates.currentCheckInRound = 1;
    }

    // 執行更新
    if (Object.keys(settingsUpdates).length > 0) {
      await updateSettings(settingsUpdates);
    }

    if (Object.keys(guestUpdates).length > 0) {
      setGuests(prev => {
        const next = prev.map(g => guestUpdates[g.id] ? { ...g, ...guestUpdates[g.id] } : g);
        saveToLocal(next);
        return next;
      });

      if (db) {
        try {
          const MAX_BATCH_SIZE = 450;
          const ids = Object.keys(guestUpdates);
          for (let i = 0; i < ids.length; i += MAX_BATCH_SIZE) {
            const chunk = ids.slice(i, i + MAX_BATCH_SIZE);
            const batch = db.batch();
            chunk.forEach(id => {
              const u = { ...guestUpdates[id] };
              // Firestore 需要用 null 取代 undefined
              Object.keys(u).forEach(k => { if ((u as any)[k] === undefined) (u as any)[k] = null; });
              batch.set(db.collection("guests").doc(id), u, { merge: true });
            });
            await batch.commit();
          }
        } catch (e: any) {
          console.error("Cloud reset failed", e);
        }
      }
    }
  };

  const resetGlobalEventState = async () => {
    await resetSpecificRecords({ flow: true, gifts: true, checkin: true, lottery: true });
    alert("所有活動紀錄已重置（已保留上傳檔案與嘉賓名單基礎資料）。");
  };

  const deleteGuest = async (id: string) => {
      setGuests(prev => {
          const next = prev.filter(g => g.id !== id);
          saveToLocal(next);
          return next;
      });
      if (db) {
          try {
              await db.collection("guests").doc(id).delete();
          } catch (e: any) { alert("刪除失敗: " + e.message); }
      }
  }

  return (
    <EventContext.Provider value={{
      guests, settings, updateSettings, addGuestsFromDraft, overwriteGuestsFromDraft, updateGuestInfo, toggleIntroduced,
      resetIntroductions, drawWinner, resetLottery, clearLotteryRound, removeWinnerFromRound, nextLotteryRound,
      jumpToLotteryRound, clearAllData, resetGlobalEventState, resetSpecificRecords, deleteGuest, toggleCheckInRound, clearGuestCheckIn,
      clearAllCheckIns, clearCheckInsForIds, addFlowFile, removeFlowFile, toggleMcFlowStep, setMcFlowSteps, 
      toggleGiftPresented, setGiftItems, isCloudConnected, connectionError,
      usingLocalDataProtection, uploadAllLocalDataToCloud, isAdmin, unlockedSections, loginAdmin, logoutAdmin
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
