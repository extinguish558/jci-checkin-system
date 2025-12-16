import React, { createContext, useContext, useState, useEffect } from 'react';
import { Guest, SystemSettings, GuestCategory, ParsedGuestDraft } from '../types';
import { db, isFirebaseReady } from '../services/firebase';

export type DrawMode = 'default' | 'all' | 'winners_only';

interface EventContextType {
  guests: Guest[];
  settings: SystemSettings;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  addGuestsFromDraft: (drafts: ParsedGuestDraft[], checkInTimestamp: Date) => void;
  updateGuestInfo: (id: string, updates: Partial<Guest>) => void;
  toggleIntroduced: (id: string) => void;
  resetIntroductions: () => void;
  drawWinner: (mode?: DrawMode) => Guest | null;
  resetLottery: () => void;
  nextLotteryRound: () => void;
  jumpToLotteryRound: (round: number) => void; 
  clearAllData: () => void;
  deleteGuest: (id: string) => void;
  toggleCheckInRound: (id: string, round: number) => void;
  isCloudConnected: boolean; // Status indicator
  
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

// Helper for generating IDs without external library
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const EventContext = createContext<EventContextType | undefined>(undefined);

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state from LocalStorage to ensure data persists even if Cloud fails
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
  
  // Admin Auth State (Session based, resets on refresh for safety)
  const [isAdmin, setIsAdmin] = useState(false);
  const ADMIN_PASSWORD = "8888"; // Simple hardcoded password

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

  // Helper to persist to local storage
  const saveToLocal = (newGuests: Guest[]) => {
      localStorage.setItem('event_guests', JSON.stringify(newGuests));
  };
  const saveSettingsToLocal = (newSettings: SystemSettings) => {
      localStorage.setItem('event_settings', JSON.stringify(newSettings));
  }

  // 1. Initial Load & Real-time Listeners (Firestore)
  useEffect(() => {
    if (!isFirebaseReady || !db) {
      console.warn("Firebase not configured. Running in Local Mode.");
      return;
    }

    setIsCloudConnected(true);

    // Listener for Guests Collection
    const unsubscribeGuests = db.collection("guests").onSnapshot((snapshot: any) => {
      const cloudGuests: Guest[] = [];
      snapshot.forEach((doc: any) => {
        cloudGuests.push(doc.data() as Guest);
      });

      // SAFE MERGE STRATEGY (修正資料被覆蓋問題)
      // Logic: Merge Cloud data into Local state, but NEVER delete local data solely because it's missing from Cloud.
      // This protects data if Cloud sync is slow/partial or if Cloud DB was accidentally wiped.
      
      setGuests(prevGuests => {
          const cloudMap = new Map(cloudGuests.map(g => [g.id, g]));
          
          // 1. Iterate through LOCAL guests
          const mergedGuests = prevGuests.map(local => {
              // If Cloud has a newer version of this guest, use Cloud version (Source of Truth for updates)
              if (cloudMap.has(local.id)) {
                  const cloudData = cloudMap.get(local.id)!;
                  cloudMap.delete(local.id); // Mark as processed
                  return cloudData;
              }
              // If Cloud does NOT have this guest, KEEP the local version.
              // We assume it's a local draft that hasn't synced yet.
              return local;
          });

          // 2. Add any NEW guests from Cloud that weren't in Local
          const newFromCloud = Array.from(cloudMap.values());
          
          const finalGuests = [...mergedGuests, ...newFromCloud];
          
          // Persist combined list
          saveToLocal(finalGuests);
          return finalGuests;
      });

    }, (error: any) => {
      console.error("Firebase Guest Sync Error:", error);
      setIsCloudConnected(false);
    });

    // Listener for Settings Document
    const unsubscribeSettings = db.collection("config").doc("mainSettings").onSnapshot((docSnap: any) => {
      if (docSnap.exists) {
        const s = docSnap.data() as SystemSettings;
        setSettings(s);
        saveSettingsToLocal(s);
      } else {
        // Initialize settings if not exists
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

  // Helper to update Firestore
  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    // Optimistic update
    const nextSettings = { ...settings, ...newSettings };
    setSettings(nextSettings);
    saveSettingsToLocal(nextSettings);
    
    if (!db) return;
    try {
        await db.collection("config").doc("mainSettings").update(newSettings);
    } catch (e) {
        console.error("Error updating settings:", e);
    }
  };

  const addGuestsFromDraft = async (drafts: ParsedGuestDraft[], checkInTimestamp: Date) => {
    const globalRound = settings.currentCheckInRound;
    
    // Prepare new list based on current state
    const updatedGuestList = [...guests];
    const existingNames = new Map<string, number>(); // Map Name -> Index
    
    updatedGuestList.forEach((g, idx) => existingNames.set(g.name, idx));

    // To handle large imports (210+), we need to handle batching carefully if sending to cloud
    // But first, we update LOCAL state immediately so user sees results.

    const newDocs: any[] = []; // Store operations to commit later if needed
    const BLACKLIST = ['姓名', 'Name', '職稱', 'Title', '備註', 'Note'];

    drafts.forEach(draft => {
        // FINAL VALIDATION GATEKEEPER
        if (!draft.name || !draft.name.trim()) return;
        const cleanName = draft.name.trim();
        // Check if name is in blacklist (case insensitive)
        if (BLACKLIST.some(b => b.toLowerCase() === cleanName.toLowerCase())) return;

        const shouldAddRound = draft.hasSignature;
        // Determines which round to apply: Use forceRound if provided, else global settings
        const targetRound = draft.forcedRound !== undefined ? draft.forcedRound : globalRound;
        
        const exists = existingNames.has(cleanName);
        
        if (exists) {
            // Update Existing
            const idx = existingNames.get(cleanName)!;
            const existing = updatedGuestList[idx];
            
            let newRounds = [...(existing.attendedRounds || [])];
            
            // LOGIC CHANGE: First Check-in Prevails (以第一次報到為準)
            // Only update check-in status if they are NOT currently checked in.
            // If they are already checked in (length > 0), we ignore the new round signal from this draft.
            let newCheckInTime = existing.checkInTime;

            if (shouldAddRound) {
                if (!existing.isCheckedIn) {
                    // Not checked in yet? Check them in to THIS round.
                    newRounds = [targetRound];
                    newCheckInTime = checkInTimestamp.toISOString();
                } 
                // Else: Already checked in. Do NOT overwrite rounds. 
                // E.g. If checked in at R1, and scanning R2 list, they stay R1.
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
            
            updatedGuestList[idx] = updatedGuest;
            newDocs.push({ type: 'update', refId: existing.id, data: updatedGuest });

        } else {
            // Create New
            const draftId = generateId();
            // New guest, simply set round if signed
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
            
            updatedGuestList.push(newGuest);
            existingNames.set(newGuest.name, updatedGuestList.length - 1);
            newDocs.push({ type: 'set', refId: draftId, data: newGuest });
        }
    });

    // 1. CRITICAL: Update UI & LocalStorage IMMEDIATELY
    // This solves the "nothing happens" issue.
    setGuests(updatedGuestList);
    saveToLocal(updatedGuestList);

    // 2. Cloud Sync (Background)
    if (db && isFirebaseReady && newDocs.length > 0) {
        try {
            // Simple chunking for batch write
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
        } catch (e) {
            console.error("Cloud Sync Failed:", e);
        }
    }
  };

  const updateGuestInfo = async (id: string, updates: Partial<Guest>) => {
      const newGuests = guests.map(g => g.id === id ? { ...g, ...updates } : g);
      setGuests(newGuests);
      saveToLocal(newGuests);

      if (!db) return;
      try {
          await db.collection("guests").doc(id).update(updates);
      } catch(e) { console.error(e); }
  };

  const toggleCheckInRound = async (id: string, targetRound: number) => {
      const guest = guests.find(g => g.id === id);
      if (!guest) return;

      const currentRounds = guest.attendedRounds || [];
      const isAttendingTarget = currentRounds.includes(targetRound);
      
      let newRounds: number[];
      let newCheckInTime = guest.checkInTime;

      // LOGIC CHANGE: MUTUALLY EXCLUSIVE ROUNDS
      if (isAttendingTarget) {
          // If currently attending this round, toggle OFF (remove all rounds)
          newRounds = [];
      } else {
          // If not attending this round, toggle ON (and force this round ONLY)
          // This removes any other existing round automatically.
          newRounds = [targetRound];
          
          // Only update timestamp if they weren't checked in before
          if (!guest.isCheckedIn) {
              newCheckInTime = new Date().toISOString();
          }
      }
      
      const updates = {
          attendedRounds: newRounds,
          isCheckedIn: newRounds.length > 0,
          round: newRounds.length > 0 ? newRounds[0] : undefined, // Simplify round logic
          checkInTime: newCheckInTime
      };

      const newGuests = guests.map(g => g.id === id ? { ...g, ...updates } : g);
      setGuests(newGuests);
      saveToLocal(newGuests);

      if (!db) return;
      await db.collection("guests").doc(id).update(updates);
  };

  const toggleIntroduced = async (id: string) => {
    const guest = guests.find(g => g.id === id);
    if (!guest) return;
    const newVal = !guest.isIntroduced;
    
    const newGuests = guests.map(g => g.id === id ? { ...g, isIntroduced: newVal } : g);
    setGuests(newGuests);
    saveToLocal(newGuests);

    if (!db) return;
    await db.collection("guests").doc(id).update({ isIntroduced: newVal });
  };

  const resetIntroductions = async () => {
    if (confirm('確定要重置所有介紹狀態嗎？')) {
        const newGuests = guests.map(g => g.isIntroduced ? { ...g, isIntroduced: false } : g);
        setGuests(newGuests);
        saveToLocal(newGuests);

        if (!db) return;
        const batch = db.batch();
        guests.forEach(g => {
            if (g.isIntroduced) {
                batch.update(db.collection("guests").doc(g.id), { isIntroduced: false });
            }
        });
        await batch.commit();
    }
  };

  const drawWinner = (mode: DrawMode = 'default'): Guest | null => {
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

    const newGuests = guests.map(g => g.id === winner.id ? { ...g, ...updates } : g);
    setGuests(newGuests);
    saveToLocal(newGuests);

    if (db) {
        db.collection("guests").doc(winner.id).update(updates);
    }

    return winner;
  };

  const resetLottery = async () => {
    if (confirm('確定要重置所有抽獎名單嗎？(將清除所有中獎紀錄)')) {
      const newGuests = guests.map(g => ({ ...g, isWinner: false, winRound: undefined, wonRounds: [] }));
      const newSettings = { ...settings, lotteryRoundCounter: 1 };
      
      setGuests(newGuests);
      saveToLocal(newGuests);
      setSettings(newSettings);
      saveSettingsToLocal(newSettings);

      if (!db) return;
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
    }
  };

  const nextLotteryRound = () => {
      updateSettings({ lotteryRoundCounter: settings.lotteryRoundCounter + 1 });
  };

  const jumpToLotteryRound = (round: number) => {
      updateSettings({ lotteryRoundCounter: round });
  };

  const clearAllData = async () => {
      // Logic moved to UI (AdminPanel) to avoid browser confirm issues.
      // This function now executes immediately.
      
      setGuests([]);
      saveToLocal([]);
      setSettings(defaultSettings);
      saveSettingsToLocal(defaultSettings);

      if (!db) return;
      
      try {
        // Delete in batches of 400
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
  }

  const deleteGuest = async (id: string) => {
      const newGuests = guests.filter(g => g.id !== id);
      setGuests(newGuests);
      saveToLocal(newGuests);

      if (!db) return;
      await db.collection("guests").doc(id).delete();
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