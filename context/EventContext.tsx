import React, { createContext, useContext, useState, useEffect } from 'react';
import { Guest, SystemSettings, GuestCategory, ParsedGuestDraft } from '../types';
import { db, isFirebaseReady } from '../services/firebase';

export type DrawMode = 'default' | 'all' | 'winners_only';

interface EventContextType {
  guests: Guest[];
  settings: SystemSettings;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  addGuestsFromDraft: (drafts: ParsedGuestDraft[], checkInTimestamp: Date) => Promise<void>;
  updateGuestInfo: (id: string, updates: Partial<Guest>) => Promise<void>;
  toggleIntroduced: (id: string) => Promise<void>;
  resetIntroductions: () => Promise<void>;
  drawWinner: (mode?: DrawMode) => Guest | null;
  resetLottery: () => Promise<void>;
  nextLotteryRound: () => void;
  jumpToLotteryRound: (round: number) => void; 
  clearAllData: () => Promise<void>;
  deleteGuest: (id: string) => Promise<void>;
  toggleCheckInRound: (id: string, round: number) => Promise<void>;
  isCloudConnected: boolean; 
  connectionError: string | null;
  
  // New Sync Function
  uploadAllLocalDataToCloud: () => Promise<void>;

  // Auth
  isAdmin: boolean;
  loginAdmin: (password: string) => boolean;
  logoutAdmin: () => void;
}

const defaultSettings: SystemSettings = {
  eventName: "年度盛會",
  currentCheckInRound: 1,
  lotteryRoundCounter: 1,
  totalRounds: 2,
};

// Helper for generating IDs
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const EventContext = createContext<EventContextType | undefined>(undefined);

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state from LocalStorage for faster first paint
  const [guests, setGuests] = useState<Guest[]>(() => {
      try {
          const local = localStorage.getItem('event_guests');
          return local ? JSON.parse(local) : [];
      } catch { return []; }
  });
  
  const [settings, setSettings] = useState<SystemSettings>(() => {
      try {
          const local = localStorage.getItem('event_settings');
          return local ? JSON.parse(local) : defaultSettings;
      } catch { return defaultSettings; }
  });

  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const ADMIN_PASSWORD = "8888"; 

  const loginAdmin = (password: string) => {
      if (password === ADMIN_PASSWORD) {
          setIsAdmin(true);
          return true;
      }
      return false;
  };

  const logoutAdmin = () => {
      setIsAdmin(false);
  };

  const saveToLocal = (newGuests: Guest[]) => {
      localStorage.setItem('event_guests', JSON.stringify(newGuests));
  };
  const saveSettingsToLocal = (newSettings: SystemSettings) => {
      localStorage.setItem('event_settings', JSON.stringify(newSettings));
  }

  // 1. Real-time Listeners (Firestore) - The Source of Truth
  useEffect(() => {
    if (!isFirebaseReady || !db) {
      console.warn("Firebase not configured. Running in Local Mode.");
      setConnectionError("Firebase Config 無效或未設定");
      return;
    }

    // Listener for Guests Collection
    const unsubscribeGuests = db.collection("guests").onSnapshot((snapshot: any) => {
      setIsCloudConnected(true);
      setConnectionError(null);

      const cloudGuests: Guest[] = [];
      snapshot.forEach((doc: any) => {
        cloudGuests.push(doc.data() as Guest);
      });

      // CLOUD FIRST STRATEGY:
      // We trust the cloud 100%. We replace local state with cloud state.
      // This ensures all devices see exactly the same thing.
      setGuests(cloudGuests);
      saveToLocal(cloudGuests);

    }, (error: any) => {
      console.error("Firebase Guest Sync Error:", error);
      setIsCloudConnected(false);
      setConnectionError(error.message);
    });

    // Listener for Settings
    const unsubscribeSettings = db.collection("config").doc("mainSettings").onSnapshot((docSnap: any) => {
      if (docSnap.exists) {
        const s = docSnap.data() as SystemSettings;
        setSettings(s);
        saveSettingsToLocal(s);
      } else {
        // Init settings if missing
        db.collection("config").doc("mainSettings").set(defaultSettings).catch(console.error);
      }
    }, (error: any) => {
       console.error("Firebase Settings Sync Error:", error);
    });

    return () => {
      unsubscribeGuests();
      unsubscribeSettings();
    };
  }, []);

  // --- ACTIONS ---
  // All actions now prioritize Cloud Writes. 
  // We do NOT manually setGuests() if we are connected to the cloud.
  // We let the onSnapshot listener update the UI.

  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    // Optimistic update for settings is okay as it feels snappier
    const nextSettings = { ...settings, ...newSettings };
    setSettings(nextSettings);
    saveSettingsToLocal(nextSettings);
    
    if (db && isCloudConnected) {
        try {
            await db.collection("config").doc("mainSettings").update(newSettings);
        } catch (e) {
            console.error("Error updating settings:", e);
        }
    }
  };

  const uploadAllLocalDataToCloud = async () => {
      if (!db || !isCloudConnected) {
          throw new Error("尚未連線至雲端，無法上傳。");
      }
      
      console.log("Starting full sync upload...");
      const MAX_BATCH_SIZE = 450;
      
      const guestChunks = [];
      for (let i = 0; i < guests.length; i += MAX_BATCH_SIZE) {
          guestChunks.push(guests.slice(i, i + MAX_BATCH_SIZE));
      }

      for (const chunk of guestChunks) {
          const batch = db.batch();
          chunk.forEach(g => {
              const ref = db.collection("guests").doc(g.id);
              batch.set(ref, g, { merge: true });
          });
          await batch.commit();
      }

      await db.collection("config").doc("mainSettings").set(settings, { merge: true });
      console.log("Full sync upload complete.");
  };

  const addGuestsFromDraft = async (drafts: ParsedGuestDraft[], checkInTimestamp: Date) => {
    const globalRound = settings.currentCheckInRound;
    
    // We calculate the logic against the CURRENT known guests
    // Because this is async, if two people scan at exact same millisecond, 
    // Firestore transactions would be needed for perfect safety, but batch is atomic enough for this use case.
    const currentGuests = [...guests];
    const existingNames = new Map<string, number>(); 
    currentGuests.forEach((g, idx) => existingNames.set(g.name, idx));

    const newDocs: { type: 'set' | 'update', refId: string, data: any }[] = [];
    const BLACKLIST = ['姓名', 'Name', '職稱', 'Title', '備註', 'Note'];

    // Track local updates just for Offline Mode fallback
    const offlineGuestList = [...currentGuests];

    drafts.forEach(draft => {
        if (!draft.name || !draft.name.trim()) return;
        const cleanName = draft.name.trim();
        if (BLACKLIST.some(b => b.toLowerCase() === cleanName.toLowerCase())) return;

        const shouldAddRound = draft.hasSignature;
        const targetRound = draft.forcedRound !== undefined ? draft.forcedRound : globalRound;
        
        const exists = existingNames.has(cleanName);
        
        if (exists) {
            const idx = existingNames.get(cleanName)!;
            const existing = offlineGuestList[idx];
            
            let newRounds = [...(existing.attendedRounds || [])];
            let newCheckInTime = existing.checkInTime;

            if (shouldAddRound) {
                if (!existing.isCheckedIn) {
                    newRounds = [targetRound];
                    newCheckInTime = checkInTimestamp.toISOString();
                } else if (!newRounds.includes(targetRound)) {
                     newRounds.push(targetRound);
                }
            }

            const updatedGuest: Guest = {
                ...existing,
                attendedRounds: newRounds,
                isCheckedIn: newRounds.length > 0,
                round: newRounds.length > 0 ? Math.max(...newRounds) : undefined,
                checkInTime: newCheckInTime,
                title: draft.title || existing.title,
                note: draft.note || existing.note,
                category: draft.category || existing.category,
                code: draft.code || existing.code
            };
            
            offlineGuestList[idx] = updatedGuest; // Update local tracking
            newDocs.push({ type: 'update', refId: existing.id, data: updatedGuest });

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
            
            offlineGuestList.push(newGuest); // Update local tracking
            existingNames.set(newGuest.name, offlineGuestList.length - 1);
            newDocs.push({ type: 'set', refId: draftId, data: newGuest });
        }
    });

    // CLOUD FIRST LOGIC
    if (db && isCloudConnected) {
        try {
            const MAX_BATCH_SIZE = 450;
            for (let i = 0; i < newDocs.length; i += MAX_BATCH_SIZE) {
                const chunk = newDocs.slice(i, i + MAX_BATCH_SIZE);
                const currentBatch = db.batch();
                
                chunk.forEach(op => {
                    const ref = db.collection("guests").doc(op.refId);
                    if (op.type === 'set') currentBatch.set(ref, op.data);
                    else currentBatch.update(ref, op.data);
                });
                
                await currentBatch.commit();
            }
            console.log("Cloud batch write successful");
            // DO NOT setGuests here. The snapshot listener will trigger and update the UI.
            // This ensures we are viewing exactly what is on the server.
        } catch (e) {
            console.error("Cloud Sync Failed:", e);
            throw new Error("同步失敗，請檢查網路連線");
        }
    } else {
        // Fallback: Offline Mode
        console.warn("Offline: Updating local state only.");
        setGuests(offlineGuestList);
        saveToLocal(offlineGuestList);
    }
  };

  const updateGuestInfo = async (id: string, updates: Partial<Guest>) => {
      // CLOUD FIRST
      if (db && isCloudConnected) {
          await db.collection("guests").doc(id).update(updates);
      } else {
          // Offline Fallback
          const newGuests = guests.map(g => g.id === id ? { ...g, ...updates } : g);
          setGuests(newGuests);
          saveToLocal(newGuests);
      }
  };

  const toggleCheckInRound = async (id: string, targetRound: number) => {
      const guest = guests.find(g => g.id === id);
      if (!guest) return;

      const currentRounds = guest.attendedRounds || [];
      const isAttendingTarget = currentRounds.includes(targetRound);
      
      let newRounds: number[];
      let newCheckInTime = guest.checkInTime;

      if (isAttendingTarget) {
          newRounds = currentRounds.filter(r => r !== targetRound);
      } else {
          newRounds = [...currentRounds, targetRound].sort((a,b) => a-b);
          if (!guest.isCheckedIn) {
              newCheckInTime = new Date().toISOString();
          }
      }
      
      const updates = {
          attendedRounds: newRounds,
          isCheckedIn: newRounds.length > 0,
          round: newRounds.length > 0 ? Math.max(...newRounds) : undefined,
          checkInTime: newCheckInTime
      };

      // CLOUD FIRST
      if (db && isCloudConnected) {
          await db.collection("guests").doc(id).update(updates);
      } else {
          // Offline Fallback
          const newGuests = guests.map(g => g.id === id ? { ...g, ...updates } : g);
          setGuests(newGuests);
          saveToLocal(newGuests);
      }
  };

  const toggleIntroduced = async (id: string) => {
    const guest = guests.find(g => g.id === id);
    if (!guest) return;
    const newVal = !guest.isIntroduced;
    
    if (db && isCloudConnected) {
        await db.collection("guests").doc(id).update({ isIntroduced: newVal });
    } else {
        const newGuests = guests.map(g => g.id === id ? { ...g, isIntroduced: newVal } : g);
        setGuests(newGuests);
        saveToLocal(newGuests);
    }
  };

  const resetIntroductions = async () => {
    if (confirm('確定要重置所有介紹狀態嗎？')) {
        if (db && isCloudConnected) {
            const batch = db.batch();
            guests.forEach(g => {
                if (g.isIntroduced) {
                    batch.update(db.collection("guests").doc(g.id), { isIntroduced: false });
                }
            });
            await batch.commit();
        } else {
            const newGuests = guests.map(g => g.isIntroduced ? { ...g, isIntroduced: false } : g);
            setGuests(newGuests);
            saveToLocal(newGuests);
        }
    }
  };

  const drawWinner = (mode: DrawMode = 'default'): Guest | null => {
    // Drawing logic relies on current local state (which is synced) to Pick a Winner
    // Then writes the result to Cloud.
    const checkedInGuests = guests.filter(g => g.isCheckedIn);
    const currentRound = settings.lotteryRoundCounter;

    let eligible: Guest[] = [];

    switch (mode) {
      case 'all':
        eligible = checkedInGuests.filter(g => !g.wonRounds.includes(currentRound));
        break;
      case 'winners_only':
        eligible = checkedInGuests.filter(g => g.isWinner && !g.wonRounds.includes(currentRound));
        break;
      case 'default':
      default:
        eligible = checkedInGuests.filter(g => !g.wonRounds.includes(currentRound));
        break;
    }

    if (eligible.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * eligible.length);
    const winner = eligible[randomIndex];

    const newWonRounds = [...(winner.wonRounds || []), currentRound].sort((a,b) => a-b);
    const updates = {
        isWinner: true,
        wonRounds: newWonRounds,
        winRound: currentRound
    };

    if (db && isCloudConnected) {
        db.collection("guests").doc(winner.id).update(updates);
    } else {
        // Offline draw
        const newGuests = guests.map(g => g.id === winner.id ? { ...g, ...updates } : g);
        setGuests(newGuests);
        saveToLocal(newGuests);
    }

    return winner;
  };

  const resetLottery = async () => {
    if (confirm('確定要重置所有抽獎名單嗎？(將清除所有中獎紀錄)')) {
      const newSettings = { ...settings, lotteryRoundCounter: 1 };
      
      if (db && isCloudConnected) {
          const batch = db.batch();
          guests.forEach(g => {
              if (g.isWinner || (g.wonRounds && g.wonRounds.length > 0)) {
                  batch.update(db.collection("guests").doc(g.id), { 
                      isWinner: false, 
                      winRound: null as any, 
                      wonRounds: [] 
                  });
              }
          });
          batch.update(db.collection("config").doc("mainSettings"), { lotteryRoundCounter: 1 });
          await batch.commit();
      } else {
          const newGuests = guests.map(g => ({ ...g, isWinner: false, winRound: undefined, wonRounds: [] }));
          setGuests(newGuests);
          saveToLocal(newGuests);
          setSettings(newSettings);
          saveSettingsToLocal(newSettings);
      }
    }
  };

  const nextLotteryRound = () => {
      updateSettings({ lotteryRoundCounter: settings.lotteryRoundCounter + 1 });
  };

  const jumpToLotteryRound = (round: number) => {
      updateSettings({ lotteryRoundCounter: round });
  };

  const clearAllData = async () => {
      if (db && isCloudConnected) {
        try {
            const chunkSize = 400;
            for (let i = 0; i < guests.length; i += chunkSize) {
                const chunk = guests.slice(i, i + chunkSize);
                const currentBatch = db.batch();
                chunk.forEach(g => currentBatch.delete(db.collection("guests").doc(g.id)));
                await currentBatch.commit();
            }
            await db.collection("config").doc("mainSettings").set(defaultSettings);
        } catch (e) {
            console.error("Error clearing cloud data:", e);
        }
      } else {
          setGuests([]);
          saveToLocal([]);
          setSettings(defaultSettings);
          saveSettingsToLocal(defaultSettings);
      }
  }

  const deleteGuest = async (id: string) => {
      if (db && isCloudConnected) {
          await db.collection("guests").doc(id).delete();
      } else {
          const newGuests = guests.filter(g => g.id !== id);
          setGuests(newGuests);
          saveToLocal(newGuests);
      }
  }

  return (
    <EventContext.Provider value={{
      guests,
      settings,
      updateSettings,
      addGuestsFromDraft,
      updateGuestInfo,
      toggleIntroduced,
      resetIntroductions,
      drawWinner,
      resetLottery,
      nextLotteryRound,
      jumpToLotteryRound,
      clearAllData,
      deleteGuest,
      toggleCheckInRound,
      isCloudConnected,
      connectionError,
      uploadAllLocalDataToCloud, // Export
      isAdmin,
      loginAdmin,
      logoutAdmin
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
