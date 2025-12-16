import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useEvent } from '../context/EventContext';
import { parseCheckInSheet, ParseMode, FileInput } from '../services/geminiService';
import { ParsedGuestDraft, GuestCategory, Guest } from '../types';
import { Camera, RefreshCcw, Save, Plus, UserPlus, FileCheck, Type, Users, UserX, Clock, Settings, Trash2, PenLine, FileText, UploadCloud, ChevronRight, CheckSquare, X, Edit, AlertCircle, UserMinus, Search, Hash, Cloud, CloudOff, AlertTriangle, Lock, Unlock, Circle } from 'lucide-react';

interface ReviewGuest extends ParsedGuestDraft {
  isSelected: boolean;
}

// For manual entry
interface ManualEntryRow {
  code: string;
  name: string;
  title: string;
  category: GuestCategory;
  note: string;
}

const AdminPanel: React.FC = () => {
  const { settings, updateSettings, addGuestsFromDraft, updateGuestInfo, guests, deleteGuest, toggleCheckInRound, isCloudConnected, connectionError, clearAllData, isAdmin, loginAdmin, logoutAdmin } = useEvent();
  const [isProcessing, setIsProcessing] = useState(false);
  const [draftGuests, setDraftGuests] = useState<ReviewGuest[]>([]);
  const [importMode, setImportMode] = useState<ParseMode>('CHECK_IN'); 
  const [progressMsg, setProgressMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Login Modal State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");

  // Edit Modal State
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  
  // Custom Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
      isOpen: boolean;
      type: 'DELETE_ONE' | 'CLEAR_ALL';
      step: 1 | 2; // For double confirmation
      data?: { id: string; name: string };
  }>({ isOpen: false, type: 'DELETE_ONE', step: 1 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Entry State
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [manualEntries, setManualEntries] = useState<ManualEntryRow[]>([
    { code: '', name: '', title: '', category: GuestCategory.OTHER, note: '' },
    { code: '', name: '', title: '', category: GuestCategory.OTHER, note: '' },
    { code: '', name: '', title: '', category: GuestCategory.OTHER, note: '' }
  ]);
  // 0: None, 1: R1, 2: R2
  const [manualCheckInTarget, setManualCheckInTarget] = useState<number>(0);

  // Live Clock Effect
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (loginAdmin(loginPassword)) {
          setShowLoginModal(false);
          setLoginPassword("");
      } else {
          alert("密碼錯誤 (預設 8888)");
      }
  };

  const mergeGuests = (currentList: ReviewGuest[], newList: ReviewGuest[]): ReviewGuest[] => {
    const map = new Map<string, ReviewGuest>();
    currentList.forEach(guest => { if (guest.name) map.set(guest.name.trim(), guest); });
    newList.forEach(guest => {
        const key = guest.name.trim();
        if (!key) return;
        const existing = map.get(key);
        if (existing) {
            // Keep existing signature if true, otherwise take new
            map.set(key, { ...existing, ...guest, hasSignature: existing.hasSignature || guest.hasSignature });
        } else {
            map.set(key, guest);
        }
    });
    return Array.from(map.values());
  };

  const triggerFileUpload = (mode: ParseMode) => {
      if (!isAdmin && mode === 'ROSTER') {
          alert("請先登入管理員權限以執行此操作。");
          return;
      }
      setImportMode(mode);
      if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Reset input to allow same file selection
          fileInputRef.current.click();
      }
  }

  const handleCheckInUpload = (round: number) => {
      updateSettings({ currentCheckInRound: round });
      triggerFileUpload('CHECK_IN');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setProgressMsg('準備檔案中...');
    setDraftGuests([]); 
    const newDrafts: ReviewGuest[] = [];

    const readFileAsBase64 = (file: File): Promise<FileInput> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({
            data: (reader.result as string).split(',')[1],
            mimeType: file.type || 'application/octet-stream' // Fallback
        });
        reader.readAsDataURL(file);
      });
    };

    try {
      const fileDataList = await Promise.all(Array.from(files).map(readFileAsBase64));

      const BATCH_SIZE = 5;
      const totalBatches = Math.ceil(fileDataList.length / BATCH_SIZE);

      for (let i = 0; i < fileDataList.length; i += BATCH_SIZE) {
          const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
          setProgressMsg(`正在分析第 ${batchIndex} / ${totalBatches} 批檔案 (AI 處理中)...`);
          
          const batch = fileDataList.slice(i, i + BATCH_SIZE);
          
          try {
              const results = await parseCheckInSheet(batch, importMode);
              const mapped = results.map(d => ({ ...d, isSelected: true }));
              newDrafts.push(...mapped);
          } catch (error) {
              console.error(`Error processing batch ${batchIndex}:`, error);
              // Don't throw here, try to process other batches
          }
      }

      if (newDrafts.length > 0) {
          setDraftGuests(prev => mergeGuests(prev, newDrafts)); 
      } else {
          // 詳細提示使用者為什麼沒有資料
          alert("未能辨識出任何資料。\n\n可能原因：\n1. 圖片模糊或無文字\n2. Excel 檔案缺少「姓名」欄位\n3. AI 無法讀取內容 (請確認 API Key 設定)");
      }

    } catch (err: any) {
      console.error(err);
      // 顯示具體的錯誤訊息，幫助除錯
      alert(`處理檔案時發生錯誤：\n${err.message || '未知錯誤'}\n\n如果您剛設定 API Key，請記得在 Vercel 點擊 Redeploy。`);
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmDraft = () => {
    const selectedDrafts = draftGuests.filter(d => d.isSelected);
    if (selectedDrafts.length === 0) return alert("請至少勾選一位");
    if (selectedDrafts.some(d => !d.name.trim())) return alert("請輸入姓名");
    
    // Use current time
    const checkInDate = new Date();

    addGuestsFromDraft(selectedDrafts, checkInDate);
    setDraftGuests([]);
    alert(`成功匯入 ${selectedDrafts.length} 筆資料`);
  };

  // Replaced ToggleSwitch with a clearer CheckInButton
  const CheckInButton = ({ isActive, onClick, activeColorClass }: { isActive: boolean, onClick: () => void, activeColorClass: string }) => (
      <button 
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className={`
              w-full py-2 px-1 rounded-lg font-bold text-sm transition-all shadow-sm border
              ${isActive 
                  ? `${activeColorClass} text-white border-transparent scale-105 shadow-md` 
                  : 'bg-white text-slate-300 border-slate-200 hover:bg-slate-50 hover:text-slate-400 hover:border-slate-300'}
          `}
      >
          {isActive ? (
              <span className="flex items-center justify-center gap-1">
                  <CheckSquare size={16} className="stroke-[3px]" /> 已到
              </span>
          ) : (
              <span className="flex items-center justify-center gap-1">
                  <div className="w-4 h-4 rounded-full border-2 border-slate-200"></div> 未到
              </span>
          )}
      </button>
  );

  const handleSaveEdit = () => {
      if (!editingGuest) return;
      if (!editingGuest.name.trim()) return alert("姓名不能為空");
      
      updateGuestInfo(editingGuest.id, {
          code: editingGuest.code,
          name: editingGuest.name,
          title: editingGuest.title,
          category: editingGuest.category,
          note: editingGuest.note
      });
      setEditingGuest(null);
  };

  // --- Manual Entry Logic ---
  const updateManualEntry = (index: number, field: keyof ManualEntryRow, value: string) => {
      const newEntries = [...manualEntries];
      newEntries[index] = { ...newEntries[index], [field]: value };
      setManualEntries(newEntries);
  };

  const addManualRow = () => {
      setManualEntries([...manualEntries, { code: '', name: '', title: '', category: GuestCategory.OTHER, note: '' }]);
  };

  const removeManualRow = (index: number) => {
      setManualEntries(manualEntries.filter((_, i) => i !== index));
  };

  const submitManualEntries = () => {
      const validEntries = manualEntries.filter(e => e.name.trim() !== '');
      if (validEntries.length === 0) return alert('請至少輸入一位人員姓名');

      // Use current time
      const checkInDate = new Date();

      const drafts: ParsedGuestDraft[] = validEntries.map(e => ({
          code: e.code.trim(),
          name: e.name.trim(),
          title: e.title.trim(),
          category: e.category,
          note: e.note.trim(),
          hasSignature: manualCheckInTarget !== 0,
          forcedRound: manualCheckInTarget !== 0 ? manualCheckInTarget : undefined
      }));

      addGuestsFromDraft(drafts, checkInDate);
      
      // Reset
      setManualEntries([{ code: '', name: '', title: '', category: GuestCategory.OTHER, note: '' }]);
      alert(`已新增 ${validEntries.length} 位人員`);
  };

  // List Data
  const stats = useMemo(() => {
    const total = guests.length;
    const checkedIn = guests.filter(g => g.isCheckedIn).length;
    
    // Categorized Stats
    const obGuests = guests.filter(g => g.category === GuestCategory.MEMBER_OB);
    const ybGuests = guests.filter(g => g.category === GuestCategory.MEMBER_YB);
    const vipGuests = guests.filter(g => g.category !== GuestCategory.MEMBER_OB && g.category !== GuestCategory.MEMBER_YB);

    return { 
        total, 
        checkedIn, 
        absent: total - checkedIn,
        ob: { total: obGuests.length, checkedIn: obGuests.filter(g => g.isCheckedIn).length },
        yb: { total: ybGuests.length, checkedIn: ybGuests.filter(g => g.isCheckedIn).length },
        vip: { total: vipGuests.length, checkedIn: vipGuests.filter(g => g.isCheckedIn).length },
    };
  }, [guests]);

  const filteredGuests = useMemo(() => {
    return guests.filter(g => 
        g.name.includes(searchTerm) || 
        g.title.includes(searchTerm) || 
        (g.code && g.code.includes(searchTerm)) ||
        (g.note && g.note.includes(searchTerm))
    );
  }, [guests, searchTerm]);

  // Sort: Group by OB/YB, then by Code (Ascending)
  const displayGuests = useMemo(() => {
    const sorted = [...filteredGuests].sort((a, b) => {
        // 1. Category Priority: OB > YB > Others
        const getPrio = (cat: GuestCategory) => {
            if (cat === GuestCategory.MEMBER_OB) return 1;
            if (cat === GuestCategory.MEMBER_YB) return 2;
            return 3;
        };
        
        const prioA = getPrio(a.category);
        const prioB = getPrio(b.category);
        
        if (prioA !== prioB) return prioA - prioB;
        
        // 2. Sort by Code
        const codeA = a.code || '';
        const codeB = b.code || '';
        
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
    });
    return sorted;
  }, [filteredGuests]);

  const StatItem = ({ label, current, total, color }: { label: string, current: number, total: number, color: string }) => (
      <div className="flex flex-col items-center mx-2 min-w-[60px]">
          <span className="text-xs text-slate-500 font-bold mb-1">{label}</span>
          <div className={`text-lg font-black ${color}`}>{current}<span className="text-xs text-slate-300 font-normal">/{total}</span></div>
      </div>
  )

  // -- DELETE HANDLERS (New Logic) --

  const handleDeleteClick = (e: React.MouseEvent, id: string, name: string) => {
      e.stopPropagation(); // Stop row click
      e.preventDefault();
      setConfirmModal({
          isOpen: true,
          type: 'DELETE_ONE',
          step: 1,
          data: { id, name }
      });
  };

  const handleClearAllClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setConfirmModal({
          isOpen: true,
          type: 'CLEAR_ALL',
          step: 1
      });
  };

  const executeConfirmAction = () => {
      if (confirmModal.type === 'DELETE_ONE' && confirmModal.data) {
          deleteGuest(confirmModal.data.id);
          setConfirmModal({ ...confirmModal, isOpen: false });
      } else if (confirmModal.type === 'CLEAR_ALL') {
          if (confirmModal.step === 1) {
              setConfirmModal({ ...confirmModal, step: 2 });
              return;
          }
          clearAllData();
          setConfirmModal({ ...confirmModal, isOpen: false });
      }
  };

  const handleConnectionClick = () => {
      if (!isCloudConnected) {
          alert(`連線狀態錯誤：\n${connectionError || '未知錯誤'}\n\n建議排除方式：\n1. 請試著「重新整理」網頁。\n2. 確認 Firebase 專案已建立並選擇「測試模式」。\n3. 檢查網路連線。`);
      }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto pb-24">
      {/* Hidden File Input */}
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,.xlsx,.xls,.csv" 
        multiple 
        className="hidden" 
        onChange={handleFileUpload} 
      />

      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
          <div className="flex justify-between items-end border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                   <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                    <Settings className="w-6 h-6" /> 後台管理
                   </h2>
              </div>
              <div className="flex items-center gap-4">
                  {/* Admin Login Button */}
                  <button 
                      onClick={() => isAdmin ? logoutAdmin() : setShowLoginModal(true)}
                      className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${isAdmin ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-100 text-slate-500 border-slate-300'}`}
                  >
                      {isAdmin ? <Unlock size={14} /> : <Lock size={14} />}
                      {isAdmin ? '已解鎖 (點擊鎖定)' : '已鎖定 (點擊解鎖)'}
                  </button>

                  <div 
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border cursor-pointer ${isCloudConnected ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}
                      onClick={handleConnectionClick}
                      title={connectionError || (isCloudConnected ? "連線正常" : "點擊查看錯誤")}
                  >
                      {isCloudConnected ? <Cloud size={14} /> : <CloudOff size={14} />}
                      {isCloudConnected ? '雲端連線中' : '未連線 (僅本機)'}
                  </div>
                  <div className="text-xl font-mono font-bold text-slate-500 flex items-center gap-2">
                     <Clock size={20} />
                     {currentTime.toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
              </div>
          </div>
          
          <div className="flex justify-between items-end">
              <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-500 mb-1">活動名稱 (Event Name)</label>
                  <input 
                      type="text" 
                      className="w-full text-3xl font-bold p-2 border-b-2 border-slate-200 focus:border-blue-500 outline-none bg-transparent text-slate-900 placeholder:text-slate-300" 
                      value={settings.eventName} 
                      onChange={e => updateSettings({eventName: e.target.value})}
                      placeholder="請輸入活動名稱"
                      disabled={!isAdmin} 
                    />
              </div>
               {/* Danger Zone: Clear Data - ONLY SHOW IF ADMIN */}
               {isAdmin && (
                   <button 
                      onClick={handleClearAllClick}
                      className="ml-4 flex items-center gap-2 text-sm text-red-400 hover:text-red-600 border border-red-200 hover:bg-red-50 p-2 rounded transition-colors cursor-pointer relative z-10"
                      title="清空所有資料"
                   >
                       <Trash2 size={16} /> <span className="hidden md:inline font-bold">清空所有資料</span>
                   </button>
               )}
          </div>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Roster Upload - Disabled if not admin */}
          <button 
              onClick={() => triggerFileUpload('ROSTER')} 
              className={`border p-6 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors shadow-sm h-full
                  ${isAdmin 
                      ? 'bg-white hover:bg-orange-50 text-slate-700 hover:text-orange-700 border-slate-200 hover:border-orange-200 cursor-pointer' 
                      : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'}
              `}
              disabled={isProcessing}
          >
              {isProcessing && importMode === 'ROSTER' ? <RefreshCcw className="animate-spin text-orange-500" size={32} /> : <FileText size={32} className={isAdmin ? "text-orange-500" : "text-slate-400"}/>}
              <div className="font-bold text-lg">{isAdmin ? "建立/匯入 名單" : "匯入名單 (權限鎖定)"}</div>
              <div className="text-xs opacity-60">Step 1: 上傳總名單 (Excel/PDF)</div>
          </button>

           {/* Check-in Upload - Always Available (Usage) */}
           <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-1">
               <div className="text-center text-slate-400 text-xs font-bold py-1 flex items-center justify-center gap-1">
                   <Camera size={14}/> 簽到表辨識 (Step 2)
               </div>
               <div className="flex gap-2 flex-1">
                   <button 
                      onClick={() => handleCheckInUpload(1)} 
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg p-3 flex flex-col items-center justify-center transition-colors relative overflow-hidden group"
                      disabled={isProcessing}
                  >
                      {isProcessing && importMode === 'CHECK_IN' && settings.currentCheckInRound === 1 ? (
                          <RefreshCcw className="animate-spin mb-1" size={24} />
                      ) : (
                          <div className="bg-blue-200 p-2 rounded-full mb-1 group-hover:scale-110 transition-transform"><Camera size={20} /></div>
                      )}
                      <span className="font-black text-xl">R1</span>
                      <span className="text-xs font-bold">第一梯次辨識</span>
                  </button>
                  
                  <button 
                      onClick={() => handleCheckInUpload(2)} 
                      className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg p-3 flex flex-col items-center justify-center transition-colors relative overflow-hidden group"
                      disabled={isProcessing}
                  >
                      {isProcessing && importMode === 'CHECK_IN' && settings.currentCheckInRound === 2 ? (
                          <RefreshCcw className="animate-spin mb-1" size={24} />
                      ) : (
                          <div className="bg-purple-200 p-2 rounded-full mb-1 group-hover:scale-110 transition-transform"><Camera size={20} /></div>
                      )}
                      <span className="font-black text-xl">R2</span>
                      <span className="text-xs font-bold">第二梯次辨識</span>
                  </button>
               </div>
           </div>
      </div>

       {/* Manual Entry Toggle */}
       <div className="mb-6">
            <button 
                onClick={() => setIsManualEntryOpen(!isManualEntryOpen)}
                className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 bg-white border border-slate-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
                <PenLine size={16} /> 手動輸入 / 新增人員
            </button>
            
            {isManualEntryOpen && (
                <div className="mt-4 p-4 bg-white rounded-xl border border-blue-100 shadow-sm animate-in slide-in-from-top-2">
                    <div className="mb-3 flex flex-col md:flex-row gap-4 items-start md:items-center">
                        <span className="text-sm font-bold text-slate-700">新增人員報到狀態：</span>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="manualCheckIn"
                                    checked={manualCheckInTarget === 0} 
                                    onChange={() => setManualCheckInTarget(0)}
                                    className="w-4 h-4 text-slate-600 focus:ring-slate-500"
                                />
                                <span className={`text-sm font-bold ${manualCheckInTarget === 0 ? 'text-slate-800' : 'text-slate-500'}`}>不報到 (預設)</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="manualCheckIn"
                                    checked={manualCheckInTarget === 1} 
                                    onChange={() => setManualCheckInTarget(1)}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                />
                                <span className={`text-sm font-bold ${manualCheckInTarget === 1 ? 'text-blue-700' : 'text-slate-500'}`}>R1 報到</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="manualCheckIn"
                                    checked={manualCheckInTarget === 2} 
                                    onChange={() => setManualCheckInTarget(2)}
                                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                                />
                                <span className={`text-sm font-bold ${manualCheckInTarget === 2 ? 'text-purple-700' : 'text-slate-500'}`}>R2 報到</span>
                            </label>
                        </div>
                  </div>
                  <div className="space-y-2 mt-2">
                      {manualEntries.map((entry, idx) => (
                          <div key={idx} className="flex flex-col md:flex-row gap-2 items-start md:items-center p-2 bg-slate-50 rounded border border-slate-200">
                              <input placeholder="編號" value={entry.code} onChange={e => updateManualEntry(idx, 'code', e.target.value)} className="p-2 border rounded w-full md:w-1/6" />
                              <input placeholder="姓名" value={entry.name} onChange={e => updateManualEntry(idx, 'name', e.target.value)} className="p-2 border rounded w-full md:w-1/4" />
                              <input placeholder="職稱" value={entry.title} onChange={e => updateManualEntry(idx, 'title', e.target.value)} className="p-2 border rounded w-full md:w-1/4" />
                               <input placeholder="備註" value={entry.note} onChange={e => updateManualEntry(idx, 'note', e.target.value)} className="p-2 border rounded w-full md:w-1/5" />
                              <select value={entry.category} onChange={e => updateManualEntry(idx, 'category', e.target.value as GuestCategory)} className="p-2 border rounded w-full md:w-1/4">
                                  {Object.values(GuestCategory).map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <button onClick={() => removeManualRow(idx)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                          </div>
                      ))}
                  </div>
                  <div className="flex gap-2 mt-4">
                      <button onClick={addManualRow} className="flex items-center gap-1 text-blue-600 font-bold text-sm px-3 py-2 border border-blue-200 rounded hover:bg-blue-50"><Plus size={16}/> 新增</button>
                      <button onClick={submitManualEntries} className="flex-1 bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 shadow-sm">確認新增</button>
                  </div>
                </div>
            )}
       </div>

      {/* List Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         {/* Stats Bar */}
         <div className="flex flex-col md:flex-row justify-between items-center bg-slate-50 px-4 py-3 border-b border-slate-200 gap-4 overflow-x-auto">
             <div className="flex items-center divide-x divide-slate-200">
                 <StatItem label="總人數" current={stats.total} total={stats.total} color="text-slate-700" />
                 <StatItem label="總已到" current={stats.checkedIn} total={stats.total} color="text-indigo-600" />
                 <StatItem label="特友會OB" current={stats.ob.checkedIn} total={stats.ob.total} color="text-orange-600" />
                 <StatItem label="會友YB" current={stats.yb.checkedIn} total={stats.yb.total} color="text-yellow-600" />
                 <StatItem label="貴賓VIP" current={stats.vip.checkedIn} total={stats.vip.total} color="text-blue-500" />
             </div>
             
             {/* Search */}
             <div className="relative w-full md:w-64">
                 <input 
                    type="text" 
                    placeholder="搜尋..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-full text-sm focus:border-indigo-500 outline-none transition-shadow focus:shadow-sm"
                 />
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
             </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-500 uppercase text-xs font-bold border-b border-slate-200">
                    <tr>
                        <th className="p-3 w-16 text-center">編號</th>
                        <th className="p-3 w-[15%]">姓名</th>
                        <th className="p-3 w-[15%]">職稱</th>
                        <th className="p-3 w-[15%]">備註</th>
                        <th className="p-3 w-[10%]">類別</th>
                        <th className="p-3 text-center w-[10%] bg-blue-50 text-blue-800">R1</th>
                        <th className="p-3 text-center w-[10%] bg-purple-50 text-purple-800">R2</th>
                        <th className="p-3 w-[15%] text-center">操作</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {displayGuests.map((g, index) => (
                        <tr key={g.id} className={`hover:bg-slate-50 transition-colors ${g.isCheckedIn ? 'bg-white' : 'bg-slate-50/50'}`}>
                            <td className="p-3 text-center font-mono text-slate-500 font-bold">{g.code || '-'}</td>
                            <td className="p-3 font-bold text-slate-800 text-base">{g.name}</td>
                            <td className="p-3 text-slate-500">{g.title}</td>
                            <td className="p-3 text-slate-500 truncate max-w-[150px]">{g.note}</td>
                            <td className="p-3"><span className="bg-slate-200 text-slate-600 px-2 py-1 rounded text-xs whitespace-nowrap">{g.category}</span></td>
                            
                            {/* R1 Toggle */}
                            <td className="p-3 text-center bg-blue-50/30">
                                <CheckInButton 
                                    isActive={g.attendedRounds?.includes(1) || false}
                                    onClick={() => toggleCheckInRound(g.id, 1)}
                                    activeColorClass="bg-blue-600 shadow-blue-200"
                                />
                            </td>

                            {/* R2 Toggle */}
                            <td className="p-3 text-center bg-purple-50/30">
                                <CheckInButton 
                                    isActive={g.attendedRounds?.includes(2) || false}
                                    onClick={() => toggleCheckInRound(g.id, 2)}
                                    activeColorClass="bg-purple-600 shadow-purple-200"
                                />
                            </td>

                            <td className="p-3 text-center flex justify-center gap-2 items-center">
                                {/* Only show Edit/Delete if Admin */}
                                {isAdmin ? (
                                    <>
                                        <button onClick={() => setEditingGuest(g)} className="flex items-center gap-1 text-slate-500 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-300 px-3 py-1.5 rounded shadow-sm transition-colors cursor-pointer relative z-10">
                                            <Edit size={14}/> 編輯
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeleteClick(e, g.id, g.name)}
                                            className="flex items-center gap-1 text-slate-500 hover:text-red-600 bg-white border border-slate-200 hover:border-red-300 px-3 py-1.5 rounded shadow-sm transition-colors cursor-pointer relative z-10"
                                        >
                                            <Trash2 size={14}/> 刪除
                                        </button>
                                    </>
                                ) : (
                                    <span className="text-xs text-slate-300 italic">權限鎖定</span>
                                )}
                            </td>
                        </tr>
                    ))}
                    {displayGuests.length === 0 && (
                        <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-400">
                                無符合資料
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
         </div>
      </div>

       {/* LOGIN MODAL */}
       {showLoginModal && (
           <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                   <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                       <Lock className="text-indigo-600" size={24} /> 管理員登入
                   </h3>
                   <form onSubmit={handleLoginSubmit}>
                       <label className="block text-sm font-bold text-slate-500 mb-1">請輸入密碼</label>
                       <input 
                           type="password" 
                           autoFocus
                           className="w-full p-3 border border-slate-300 rounded-lg mb-4 text-lg focus:border-indigo-500 outline-none"
                           value={loginPassword}
                           onChange={e => setLoginPassword(e.target.value)}
                           placeholder="預設: 8888"
                       />
                       <div className="flex gap-2">
                           <button 
                               type="button" 
                               onClick={() => setShowLoginModal(false)}
                               className="flex-1 py-2 rounded-lg text-slate-500 font-bold hover:bg-slate-100"
                           >
                               取消
                           </button>
                           <button 
                               type="submit" 
                               className="flex-1 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700"
                           >
                               解鎖
                           </button>
                       </div>
                   </form>
               </div>
           </div>
       )}

       {/* CUSTOM CONFIRM MODAL */}
       {confirmModal.isOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100">
                    <div className="flex flex-col items-center text-center">
                        <div className={`rounded-full p-4 mb-4 ${confirmModal.type === 'CLEAR_ALL' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                            <AlertTriangle size={32} />
                        </div>
                        
                        <h3 className="text-xl font-bold text-slate-800 mb-2">
                            {confirmModal.type === 'CLEAR_ALL' 
                                ? (confirmModal.step === 1 ? "警告：刪除所有資料？" : "再次確認：真的要清空嗎？")
                                : "確認刪除資料"
                            }
                        </h3>
                        
                        <p className="text-slate-500 mb-6">
                            {confirmModal.type === 'CLEAR_ALL' 
                                ? (confirmModal.step === 1 ? "此操作將刪除「所有」報到、名單與抽獎紀錄，且無法復原。" : "所有資料將會立即消失，請確認您已備份或無需保留。")
                                : <span>確定要刪除「<span className="font-bold text-slate-800">{confirmModal.data?.name}</span>」嗎？</span>
                            }
                        </p>

                        <div className="flex gap-3 w-full">
                            <button 
                                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false, step: 1 })}
                                className="flex-1 py-3 px-4 rounded-lg font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                                取消
                            </button>
                            <button 
                                onClick={executeConfirmAction}
                                className={`flex-1 py-3 px-4 rounded-lg font-bold text-white shadow-md transition-colors ${confirmModal.type === 'CLEAR_ALL' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-800 hover:bg-slate-900'}`}
                            >
                                {confirmModal.type === 'CLEAR_ALL' 
                                    ? (confirmModal.step === 1 ? "下一步 (確認)" : "確認清空")
                                    : "確認刪除"
                                }
                            </button>
                        </div>
                    </div>
                </div>
            </div>
       )}

       {/* DRAFT CONFIRMATION DIALOG */}
       {draftGuests.length > 0 && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                 <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95">
                    <div className="flex justify-between items-center mb-4 border-b pb-4">
                        <div>
                            <h4 className="font-bold text-xl flex items-center gap-2 text-slate-800">
                                {importMode === 'ROSTER' ? '名單辨識結果' : '簽到表辨識結果'}
                            </h4>
                            <span className="text-sm text-slate-500 font-bold bg-yellow-100 px-2 py-1 rounded text-yellow-800 mt-1 inline-block">
                                目標梯次: R{settings.currentCheckInRound}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setDraftGuests([])} className="px-4 py-2 rounded text-slate-500 hover:bg-slate-100 font-bold">取消</button>
                            <button onClick={handleConfirmDraft} className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-green-700 flex items-center gap-2">
                                <CheckSquare size={16} /> 確認匯入
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50 rounded-lg border border-slate-200 custom-scrollbar grid grid-cols-1 gap-2">
                        {/* Header for Draft List */}
                        <div className="flex gap-2 px-3 text-xs font-bold text-slate-400 mb-1">
                             <div className="w-8"></div>
                             <div className="w-20">編號</div>
                             <div className="w-24 md:w-32">姓名</div>
                             <div className="w-24">職稱</div>
                             <div className="w-20">類別</div>
                        </div>

                        {draftGuests.map((d, i) => (
                            <div key={i} className={`flex flex-wrap gap-2 items-center p-3 rounded-lg border shadow-sm transition-colors ${d.isSelected ? 'bg-white border-indigo-200' : 'bg-slate-100 opacity-60'}`}>
                                <input type="checkbox" checked={d.isSelected} onChange={() => {
                                    const n = [...draftGuests]; n[i].isSelected = !n[i].isSelected; setDraftGuests(n);
                                }} className="w-5 h-5 accent-indigo-500 cursor-pointer" />

                                <input value={d.code || ''} onChange={e => {
                                    const n = [...draftGuests]; n[i].code = e.target.value; setDraftGuests(n);
                                }} className="border border-slate-300 p-2 rounded w-20 font-mono text-sm focus:border-indigo-400 outline-none" placeholder="編號" />
                                
                                <input value={d.name} onChange={e => {
                                    const n = [...draftGuests]; n[i].name = e.target.value; setDraftGuests(n);
                                }} className="border border-slate-300 p-2 rounded w-24 md:w-32 font-bold focus:border-indigo-400 outline-none" placeholder="姓名" />
                                
                                <input value={d.title} onChange={e => {
                                    const n = [...draftGuests]; n[i].title = e.target.value; setDraftGuests(n);
                                }} className="border border-slate-300 p-2 rounded w-24 text-sm focus:border-indigo-400 outline-none" placeholder="職稱" />
                                
                                <span className="text-xs bg-slate-200 px-2 py-1 rounded">{d.category}</span>
                                
                                <button 
                                    onClick={() => {
                                        const n = [...draftGuests]; n[i].hasSignature = !n[i].hasSignature; setDraftGuests(n);
                                    }}
                                    className={`ml-auto flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold border ${d.hasSignature ? 'bg-green-100 text-green-700 border-green-300' : 'bg-slate-100 text-slate-400 border-slate-200'}`}
                                >
                                    {d.hasSignature ? `R${settings.currentCheckInRound} 已簽` : "未簽"}
                                </button>
                            </div>
                        ))}
                    </div>
                 </div>
            </div>
      )}

      {/* EDIT MODAL */}
      {editingGuest && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Edit size={20}/> 編輯人員資料</h3>
                      <button onClick={() => setEditingGuest(null)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-slate-600 mb-1">編號</label>
                          <input 
                              value={editingGuest.code || ''} 
                              onChange={e => setEditingGuest({ ...editingGuest, code: e.target.value })}
                              className="w-full p-2 border rounded font-mono"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-600 mb-1">姓名</label>
                          <input 
                              value={editingGuest.name} 
                              onChange={e => setEditingGuest({ ...editingGuest, name: e.target.value })}
                              className="w-full p-2 border rounded"
                          />
                      </div>
                      <div className="flex gap-2">
                           <div className="flex-1">
                                <label className="block text-sm font-bold text-slate-600 mb-1">職稱</label>
                                <input 
                                    value={editingGuest.title} 
                                    onChange={e => setEditingGuest({ ...editingGuest, title: e.target.value })}
                                    className="w-full p-2 border rounded"
                                />
                           </div>
                           <div className="flex-1">
                                <label className="block text-sm font-bold text-slate-600 mb-1">類別</label>
                                <select 
                                    value={editingGuest.category} 
                                    onChange={e => setEditingGuest({ ...editingGuest, category: e.target.value as GuestCategory })}
                                    className="w-full p-2 border rounded"
                                >
                                    {Object.values(GuestCategory).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                           </div>
                      </div>
                      
                      <div>
                          <label className="block text-sm font-bold text-slate-600 mb-1">備註</label>
                          <input 
                              value={editingGuest.note || ''} 
                              onChange={e => setEditingGuest({ ...editingGuest, note: e.target.value })}
                              className="w-full p-2 border rounded"
                          />
                      </div>
                      
                      <button onClick={handleSaveEdit} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 shadow-md mt-2">
                          儲存變更
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;