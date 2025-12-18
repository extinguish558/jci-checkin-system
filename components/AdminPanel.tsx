
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useEvent } from '../context/EventContext';
import { parseCheckInSheet, ParseMode, FileInput, exportToExcel } from '../services/geminiService';
import { ParsedGuestDraft, GuestCategory, Guest } from '../types';
import { Camera, RefreshCcw, Save, Plus, UserPlus, FileCheck, Type, Users, UserX, Clock, Settings, Trash2, PenLine, FileText, UploadCloud, ChevronRight, CheckSquare, X, Edit, AlertCircle, UserMinus, Search, Hash, Cloud, CloudOff, AlertTriangle, Lock, Unlock, Circle, Upload, Shield, Download, ChevronDown, ChevronUp, LayoutGrid, Globe, Handshake, RotateCcw, Loader2 } from 'lucide-react';

interface ReviewGuest extends ParsedGuestDraft {
  isSelected: boolean;
}

interface ManualEntryRow {
  code: string;
  name: string;
  title: string;
  category: GuestCategory;
  note: string;
}

const AdminPanel: React.FC = () => {
  const { 
      settings, updateSettings, addGuestsFromDraft, updateGuestInfo, guests, deleteGuest, 
      toggleCheckInRound, clearGuestCheckIn, isCloudConnected, connectionError, clearAllData, 
      isAdmin, loginAdmin, logoutAdmin, uploadAllLocalDataToCloud, usingLocalDataProtection,
      clearAllCheckIns, clearCheckInsForIds
  } = useEvent();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [draftGuests, setDraftGuests] = useState<ReviewGuest[]>([]);
  const [importMode, setImportMode] = useState<ParseMode>('CHECK_IN'); 
  const [progressMsg, setProgressMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  
  const [activeTab, setActiveTab] = useState<string>('YB');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [manualEntries, setManualEntries] = useState<ManualEntryRow[]>([
    { code: '', name: '', title: '', category: GuestCategory.OTHER, note: '' }
  ]);

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

  const triggerFileUpload = (mode: ParseMode) => {
      if (!isAdmin && mode === 'ROSTER') {
          alert("請先登入管理員權限以執行名單匯入。");
          return;
      }
      setImportMode(mode);
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
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
    setProgressMsg('正在解析檔案...');
    try {
      const readFileAsBase64 = (file: File): Promise<FileInput> => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve({
              data: (reader.result as string).split(',')[1],
              mimeType: file.type || 'application/octet-stream'
          });
          reader.readAsDataURL(file);
        });
      };
      const fileDataList = await Promise.all(Array.from(files).map(readFileAsBase64));
      const results = await parseCheckInSheet(fileDataList, importMode);
      if (results.length > 0) {
          const mapped = results.map(d => ({ ...d, isSelected: true }));
          setDraftGuests(mapped);
      } else {
          alert("未能辨識出任何資料。");
      }
    } catch (err: any) { alert(`錯誤：${err.message}`); } finally {
      setIsProcessing(false);
    }
  };

  const getTargetGroup = useCallback((g: Guest): string => {
      const title = g.title || '';
      const category = (g.category || '').toString();
      const visitingKeywords = ['母會', '兄弟會', '分會', '友好會', '姐妹會', '姊妹會', '聯誼會'];
      const hqKeywords = ['總會'];
      
      if (category.includes('YB') || category.includes('會友')) return 'YB';
      if (category.includes('OB') || category.includes('特友')) return 'OB';
      if (category.includes('總會貴賓') || hqKeywords.some(k => title.includes(k))) return 'HQ';
      if (category.includes('友會') || visitingKeywords.some(k => title.includes(k))) return 'VISITING';
      return 'VIP';
  }, []);

  const groupedData = useMemo(() => {
      const search = searchTerm.trim().toLowerCase();
      const filtered = guests.filter(g => 
          g.name.toLowerCase().includes(search) || 
          g.title.toLowerCase().includes(search) || 
          (g.code && g.code.toLowerCase().includes(search))
      );

      const groupConfig = [
        { key: 'YB', title: '會友 YB', color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: LayoutGrid },
        { key: 'OB', title: '特友 OB', color: 'text-orange-600', bgColor: 'bg-orange-50', icon: Clock },
        { key: 'HQ', title: '總會貴賓', color: 'text-indigo-600', bgColor: 'bg-indigo-50', icon: Globe },
        { key: 'VISITING', title: '友會貴賓', color: 'text-emerald-600', bgColor: 'bg-emerald-50', icon: Handshake },
        { key: 'VIP', title: '貴賓 VIP', color: 'text-blue-600', bgColor: 'bg-blue-50', icon: Shield },
      ];

      return groupConfig.map(config => {
          const list = filtered.filter(g => getTargetGroup(g) === config.key);
          const sortedList = [...list].sort((a, b) => {
              const codeA = a.code || '';
              const codeB = b.code || '';
              if (codeA || codeB) {
                  return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
              }
              return (a.checkInTime || '').localeCompare(b.checkInTime || '');
          });
          return {
              ...config,
              list: sortedList,
              checkedCount: sortedList.filter(g => g.isCheckedIn).length,
              totalCount: sortedList.length
          };
      });
  }, [guests, searchTerm, getTargetGroup]);

  const CheckInButton = ({ isActive, onClick, theme, round }: { isActive: boolean, onClick: () => void, theme: 'blue' | 'purple', round: number }) => {
    const activeClass = theme === 'blue' ? 'bg-blue-600 text-white border-blue-600' : 'bg-purple-600 text-white border-purple-600';
    return (
        <button 
          onClick={(e) => { e.stopPropagation(); onClick(); }} 
          className={`w-full py-1.5 md:py-4 px-0.5 md:px-2 rounded-lg md:rounded-xl font-black text-[8px] md:text-sm transition-all border-2 flex items-center justify-center gap-0.5 md:gap-2 ${isActive ? activeClass : 'bg-white text-slate-300 border-slate-100 hover:border-slate-200 shadow-sm'}`}
        >
            {isActive ? <CheckSquare size={10} className="md:w-4 md:h-4" /> : <div className="w-2.5 h-2.5 md:w-4 md:h-4 rounded-sm md:rounded-md border-2 border-current opacity-30"></div>}
            <span className="whitespace-nowrap">{isActive ? '已到' : '未到'}</span>
        </button>
    );
  };

  const handleDownloadExcel = () => exportToExcel(guests, settings.eventName);

  const handleResetCurrentTab = async () => {
    if (isResetting) return;
    const currentTabTitle = groupedData.find(g => g.key === activeTab)?.title || activeTab;
    const idsToReset = guests.filter(g => getTargetGroup(g) === activeTab).map(g => g.id);
    if (idsToReset.length === 0) {
        alert(`目前的「${currentTabTitle}」分頁中沒有任何人員。`);
        return;
    }
    if (confirm(`確定要重置「${currentTabTitle}」共 ${idsToReset.length} 位人員的報到狀態嗎？\n\n人員名單會保留，但 R1/R2 的報到紀錄將被清空。`)) {
        setIsResetting(true);
        try {
            await clearCheckInsForIds(idsToReset);
            alert("已完成重置。");
        } catch (e: any) {
            alert("重置失敗: " + e.message);
        } finally {
            setIsResetting(false);
        }
    }
  };

  const handleResetCheckIn = async () => {
    if (isResetting) return;
    if (confirm("⚠️ 警告：確定要重置「所有分頁」的人員報到狀態嗎？\n\n此操作會清空全體人員的 R1/R2 報到紀錄。")) {
        setIsResetting(true);
        try {
            await clearAllCheckIns();
            alert("已完成全體重置。");
        } catch (e: any) {
            alert("重置失敗: " + e.message);
        } finally {
            setIsResetting(false);
        }
    }
  };

  const handleAddManualGuests = async () => {
    const validEntries = manualEntries.filter(e => e.name.trim());
    if (validEntries.length === 0) return;
    const drafts: ParsedGuestDraft[] = validEntries.map(e => ({
        ...e,
        hasSignature: false
    }));
    await addGuestsFromDraft(drafts, new Date());
    setIsManualEntryOpen(false);
    setManualEntries([{ code: '', name: '', title: '', category: GuestCategory.OTHER, note: '' }]);
  };

  return (
    <div className="p-3 md:p-6 lg:p-8 max-w-7xl mx-auto pb-24 overflow-x-hidden flex flex-col gap-4 md:gap-8">
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />

      {/* Header */}
      <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row justify-between md:items-end border-b border-slate-200 pb-4 gap-4">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
                   <h2 className="text-2xl md:text-3xl font-black flex items-center gap-2 text-slate-800">
                    <Settings className="w-6 h-6 md:w-8 md:h-8 text-indigo-500" /> 報到管理
                   </h2>
                   <div className="flex items-center gap-2">
                       {isCloudConnected && <span className="text-[10px] md:text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-100 flex items-center gap-1 font-bold shadow-sm"><Cloud size={12}/> 雲端同步</span>}
                       <button onClick={() => isAdmin ? logoutAdmin() : setShowLoginModal(true)} className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] md:text-xs font-black border bg-slate-100 text-slate-500 border-transparent">
                          {isAdmin ? <Unlock size={12} /> : <Lock size={12} />} {isAdmin ? '管理員解鎖' : '管理員鎖定'}
                       </button>
                   </div>
              </div>
              <div className="text-right">
                  <div className="text-lg md:text-xl font-mono font-black text-slate-500 flex items-center justify-end gap-2 bg-slate-100/50 px-4 py-1.5 rounded-xl border border-slate-200 shadow-inner">
                    <Clock size={18} className="text-indigo-400" />
                    {currentTime.toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                  </div>
              </div>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-indigo-900 leading-tight truncate drop-shadow-sm">{settings.eventName}</h1>
      </div>

      {/* 功能卡片 */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-6">
          <button onClick={() => triggerFileUpload('ROSTER')} className="bg-white border border-slate-100 p-3 md:p-6 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center gap-1.5 md:gap-2 shadow-sm hover:shadow-md hover:border-orange-100 transition-all group min-h-[90px] md:min-h-[140px]">
              <div className={`p-2.5 md:p-4 rounded-xl md:rounded-2xl transition-all duration-300 group-hover:scale-110 ${isAdmin ? 'bg-orange-50' : 'bg-slate-100 grayscale opacity-50'}`}>
                <FileText size={20} className="text-orange-500 md:w-6 md:h-6" />
              </div>
              <div className="font-black text-slate-700 text-[10px] md:text-base leading-tight">匯入名單</div>
          </button>
          
          <button onClick={() => setIsManualEntryOpen(true)} className="bg-white border border-slate-100 p-3 md:p-6 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center gap-1.5 md:gap-2 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group min-h-[90px] md:min-h-[140px]">
               <div className="p-2.5 md:p-4 rounded-xl md:rounded-2xl transition-all duration-300 group-hover:scale-110 bg-indigo-50">
                <PenLine size={20} className="text-indigo-600 md:w-6 md:h-6" />
               </div>
               <div className="font-black text-slate-700 text-[10px] md:text-base leading-tight">手動新增</div>
          </button>

          <div className="col-span-1 md:col-span-2 bg-white p-2.5 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-2 md:gap-3 min-h-[90px] md:min-h-[140px]">
               <div className="text-slate-400 text-[8px] md:text-xs font-black uppercase tracking-wider flex items-center justify-center md:justify-start gap-1 md:gap-2">
                 <Camera size={12} className="md:w-3.5 md:h-3.5"/> 
                 <span className="hidden xs:inline">OCR 掃描</span>
               </div>
               <div className="flex flex-col md:flex-row gap-1 md:gap-2 flex-1 h-full">
                   <button onClick={() => handleCheckInUpload(1)} className="flex-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl md:rounded-2xl py-1 md:py-2 flex flex-col items-center justify-center hover:bg-blue-100 transition-all group">
                      <span className="font-black text-sm md:text-xl leading-none">R1</span>
                      <span className="hidden sm:inline text-[9px] md:text-[10px] font-bold opacity-60">第一輪</span>
                  </button>
                  <button onClick={() => handleCheckInUpload(2)} className="flex-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-xl md:rounded-2xl py-1 md:py-2 flex flex-col items-center justify-center hover:bg-purple-100 transition-all group">
                      <span className="font-black text-sm md:text-xl leading-none">R2</span>
                      <span className="hidden sm:inline text-[9px] md:text-[10px] font-bold opacity-60">第二輪</span>
                  </button>
               </div>
          </div>
      </div>

      {/* 搜尋與重置 */}
      <div className="flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
              <input type="text" placeholder="搜尋姓名、職稱或編號..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-3 md:py-4 bg-white border border-slate-200 rounded-2xl text-sm md:text-base outline-none focus:ring-4 ring-indigo-500/10 focus:border-indigo-500 shadow-sm transition-all" />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
          </div>
          
          {isAdmin && (
            <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full md:w-auto">
                <button disabled={isResetting} onClick={handleResetCurrentTab} className="flex-1 py-3 md:py-4 px-4 bg-orange-50 text-orange-600 font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-orange-100 border border-orange-100 transition-all active:scale-95 text-xs md:text-sm whitespace-nowrap shadow-sm disabled:opacity-50">
                    {isResetting ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16}/>} 重置本分頁
                </button>
                <button disabled={isResetting} onClick={handleResetCheckIn} className="flex-1 py-3 md:py-4 px-4 bg-red-50 text-red-600 font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-red-100 border border-red-100 transition-all active:scale-95 text-xs md:text-sm whitespace-nowrap shadow-sm disabled:opacity-50">
                    {isResetting ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16}/>} 重置全體
                </button>
                <button onClick={handleDownloadExcel} className="w-full sm:w-auto py-3 md:py-4 px-6 bg-green-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-green-700 shadow-lg transition-all active:scale-95 text-sm md:text-base whitespace-nowrap">
                    <Download size={20}/> 匯出 Excel
                </button>
            </div>
          )}
      </div>

      {/* 頁籤導覽 */}
      <div className="bg-slate-100/50 p-1.5 rounded-3xl border border-slate-200 shadow-inner">
          <div className="grid grid-cols-3 md:flex md:flex-wrap lg:flex-nowrap gap-1 md:gap-2">
              {groupedData.map(group => (
                  <button key={group.key} onClick={() => setActiveTab(group.key)} className={`py-2 md:py-4 px-2 md:px-6 rounded-2xl font-black text-[10px] md:text-base transition-all duration-300 flex flex-row items-center justify-center gap-1.5 md:gap-3 flex-1 ${activeTab === group.key ? 'bg-white text-indigo-600 shadow-md ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600 hover:bg-white/40'}`}>
                    <group.icon size={14} className={`md:w-5 md:h-5 ${activeTab === group.key ? group.color : ''}`} />
                    <span className="whitespace-nowrap">{group.title}</span>
                    <div className={`hidden sm:block px-2 py-0.5 rounded-full text-[9px] md:text-xs font-bold ${activeTab === group.key ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-200 text-slate-400'}`}>
                        {group.checkedCount}/{group.totalCount}
                    </div>
                  </button>
              ))}
          </div>
      </div>

      {/* 人員名單表格 - 手機版優化佈局 */}
      <div className="space-y-6">
          {groupedData.filter(g => g.key === activeTab).map(group => (
              <div key={group.key} className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in duration-500">
                  <div className={`px-6 py-4 border-b flex items-center justify-between ${group.bgColor}`}>
                      <h3 className={`text-lg md:text-xl font-black ${group.color} flex items-center gap-2`}>
                          <group.icon size={20} /> {group.title} 名單
                      </h3>
                      <div className="text-right">
                        <div className={`text-lg md:text-2xl font-black ${group.color}`}>{group.checkedCount} <span className="text-xs opacity-50 font-bold">/ {group.totalCount}</span></div>
                      </div>
                  </div>

                  <div className="w-full overflow-x-hidden">
                      <table className="w-full text-left border-collapse table-fixed">
                          <thead className="bg-slate-50 text-slate-400 uppercase text-[8px] md:text-xs font-black border-b">
                              <tr>
                                  <th className="py-4 px-2 w-8 md:w-16 text-center">#</th>
                                  <th className="py-4 px-2 w-[22%] md:w-[20%]">姓名</th>
                                  <th className="py-4 px-2 w-[35%] md:w-auto">職稱 / 備註</th>
                                  <th className="py-4 px-1 text-center w-[55px] md:w-[110px] bg-blue-50/20">R1 報到</th>
                                  <th className="py-4 px-1 text-center w-[55px] md:w-[110px] bg-purple-50/20">R2 報到</th>
                                  <th className="py-4 px-2 text-center w-8 md:w-16"></th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                              {group.list.length === 0 ? (
                                  <tr><td colSpan={6} className="py-24 text-center text-slate-300 font-bold text-lg md:text-xl">尚無相符資料</td></tr>
                              ) : (
                                  group.list.map((g, idx) => (
                                      <tr key={g.id} className={`hover:bg-slate-50/80 transition-all ${g.isCheckedIn ? 'bg-white' : 'bg-slate-50/20'}`}>
                                          <td className="py-4 md:py-6 px-1 text-center">
                                              {g.isCheckedIn ? (
                                                  <div className={`w-6 h-6 md:w-10 md:h-10 flex items-center justify-center rounded-lg font-mono font-black text-[10px] md:text-lg shadow-sm mx-auto bg-white border ${group.color} border-current`}>
                                                      {group.list.filter(x => x.isCheckedIn).indexOf(g) + 1}
                                                  </div>
                                              ) : (
                                                  <span className="text-slate-300 font-mono text-[8px] md:text-sm font-bold italic">#{g.code || (idx + 1)}</span>
                                              )}
                                          </td>
                                          <td className="py-4 md:py-6 px-2">
                                              <div className="font-black text-slate-800 text-xs md:text-xl leading-none mb-1 md:mb-2 truncate">{g.name}</div>
                                              <div className="hidden md:flex items-center gap-1.5 flex-wrap">
                                                <div className="text-[8px] md:text-[9px] text-indigo-500 font-black bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100 whitespace-nowrap uppercase">{g.category.substring(0, 4)}</div>
                                              </div>
                                          </td>
                                          <td className="py-4 md:py-6 px-2">
                                              <div className="text-slate-600 font-black text-[10px] md:text-lg leading-tight break-words">
                                                  {g.title || <span className="text-slate-200 font-normal italic">未設定職稱</span>}
                                              </div>
                                              {g.note && (
                                                <div className="text-[8px] md:text-sm text-orange-500 font-black mt-1 flex items-center gap-1">
                                                    <AlertCircle size={10} className="shrink-0"/> {g.note}
                                                </div>
                                              )}
                                          </td>
                                          <td className="py-4 md:py-6 px-0.5 text-center bg-blue-50/5">
                                              <CheckInButton isActive={g.attendedRounds?.includes(1)} onClick={() => toggleCheckInRound(g.id, 1)} theme="blue" round={1} />
                                          </td>
                                          <td className="py-4 md:py-6 px-0.5 text-center bg-purple-50/5">
                                              <CheckInButton isActive={g.attendedRounds?.includes(2)} onClick={() => toggleCheckInRound(g.id, 2)} theme="purple" round={2} />
                                          </td>
                                          <td className="py-4 md:py-6 px-1 text-center">
                                              {isAdmin && (
                                                <button onClick={() => setEditingGuest(g)} className="p-1 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-lg transition-all">
                                                    <Edit size={14} className="md:w-5 md:h-5"/>
                                                </button>
                                              )}
                                          </td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          ))}
      </div>

      {/* 手動新增彈窗 */}
      {isManualEntryOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-6 md:p-10 max-w-2xl w-full shadow-2xl animate-in zoom-in duration-300 overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3"><Plus className="text-indigo-600" /> 手動新增人員</h3>
            <div className="space-y-4">
              {manualEntries.map((entry, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 relative">
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="姓名" className="p-3 rounded-xl border-2 border-white focus:border-indigo-500 outline-none font-bold shadow-sm" value={entry.name} onChange={e => {
                      const next = [...manualEntries];
                      next[idx].name = e.target.value;
                      setManualEntries(next);
                    }} />
                    <input placeholder="編號 (選填)" className="p-3 rounded-xl border-2 border-white focus:border-indigo-500 outline-none font-bold shadow-sm" value={entry.code} onChange={e => {
                      const next = [...manualEntries];
                      next[idx].code = e.target.value;
                      setManualEntries(next);
                    }} />
                  </div>
                  <input placeholder="職稱" className="w-full p-3 rounded-xl border-2 border-white focus:border-indigo-500 outline-none font-bold shadow-sm" value={entry.title} onChange={e => {
                    const next = [...manualEntries];
                    next[idx].title = e.target.value;
                    setManualEntries(next);
                  }} />
                  <select className="w-full p-3 rounded-xl border-2 border-white focus:border-indigo-500 outline-none font-bold shadow-sm appearance-none" value={entry.category} onChange={e => {
                    const next = [...manualEntries];
                    next[idx].category = e.target.value as GuestCategory;
                    setManualEntries(next);
                  }}>
                    {Object.values(GuestCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              ))}
              <button onClick={() => setManualEntries([...manualEntries, { code: '', name: '', title: '', category: GuestCategory.OTHER, note: '' }])} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold hover:border-indigo-300 hover:text-indigo-400 transition-all flex items-center justify-center gap-2">
                <Plus size={18}/> 繼續新增下一位
              </button>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setIsManualEntryOpen(false)} className="flex-1 bg-slate-100 py-4 rounded-2xl font-black text-slate-500">取消</button>
              <button onClick={handleAddManualGuests} className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-200">確認加入名單</button>
            </div>
          </div>
        </div>
      )}

      {/* 編輯人員彈窗 */}
      {editingGuest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-6 md:p-10 max-w-md w-full shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3"><Edit className="text-indigo-600" /> 編輯人員資訊</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-400 mb-1 block">姓名</label>
                <input className="w-full p-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-indigo-500 outline-none font-bold" value={editingGuest.name} onChange={e => setEditingGuest({...editingGuest, name: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 mb-1 block">職稱</label>
                <input className="w-full p-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-indigo-500 outline-none font-bold" value={editingGuest.title || ''} onChange={e => setEditingGuest({...editingGuest, title: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 mb-1 block">類別</label>
                <select className="w-full p-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-indigo-500 outline-none font-bold" value={editingGuest.category} onChange={e => setEditingGuest({...editingGuest, category: e.target.value as GuestCategory})}>
                  {Object.values(GuestCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 mb-1 block">備註</label>
                <input className="w-full p-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-indigo-500 outline-none font-bold" value={editingGuest.note || ''} onChange={e => setEditingGuest({...editingGuest, note: e.target.value})} />
              </div>
              <div className="pt-4 flex flex-col gap-2">
                <button onClick={() => { updateGuestInfo(editingGuest.id, editingGuest); setEditingGuest(null); }} className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl shadow-lg">儲存修改</button>
                <button onClick={() => { if(confirm('確定要刪除此人嗎？')) { deleteGuest(editingGuest.id); setEditingGuest(null); } }} className="w-full bg-red-50 text-red-500 font-black py-3 rounded-xl flex items-center justify-center gap-2 mt-2"><Trash2 size={16}/> 刪除此人員</button>
                <button onClick={() => setEditingGuest(null)} className="w-full text-slate-400 font-bold py-2 mt-2">取消並關閉</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 管理員登入彈窗 */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[190] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl">
            <form onSubmit={handleLoginSubmit} className="space-y-6 text-center">
              <h3 className="text-xl font-black text-slate-800">管理員登入</h3>
              <input type="password" placeholder="管理密碼" className="w-full p-4 bg-slate-100 rounded-2xl text-center text-3xl font-mono outline-none border-2 border-indigo-500 shadow-inner" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} autoFocus />
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowLoginModal(false); setLoginPassword(""); }} className="flex-1 bg-slate-100 text-slate-500 font-black py-4 rounded-2xl text-lg">取消</button>
                <button type="submit" className="flex-[2] bg-indigo-600 text-white font-black py-4 rounded-2xl text-lg shadow-lg">解鎖</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OCR 辨識審核 */}
      {draftGuests.length > 0 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-2 md:p-6 overflow-hidden animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] md:rounded-[3rem] w-full max-w-5xl h-[95vh] md:h-[90vh] flex flex-col shadow-2xl border border-white/20 overflow-hidden scale-95 md:scale-100 transition-transform">
            <div className="p-6 md:p-10 border-b flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100"><FileCheck size={28}/></div>
                <div>
                  <h3 className="text-xl md:text-3xl font-black text-slate-800">OCR 辨識結果審核</h3>
                  <p className="text-slate-400 font-bold text-xs md:text-sm">請確認以下資料，點擊「確認匯入」完成報到流程</p>
                </div>
              </div>
              <button onClick={() => setDraftGuests([])} className="p-3 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={28}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-4 custom-scrollbar">
              {draftGuests.map((dg, idx) => (
                <div key={idx} className={`group p-4 md:p-6 rounded-3xl border-2 transition-all flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 ${dg.isSelected ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-100 bg-slate-50 opacity-40'}`}>
                  <button onClick={() => {
                    const next = [...draftGuests];
                    next[idx].isSelected = !next[idx].isSelected;
                    setDraftGuests(next);
                  }} className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${dg.isSelected ? 'bg-indigo-600 text-white' : 'bg-white text-slate-300'}`}><CheckSquare size={20}/></button>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">姓名</label>
                      <input className="w-full bg-white px-4 py-2 rounded-xl border border-transparent focus:border-indigo-400 outline-none font-bold text-slate-700 shadow-sm" value={dg.name} onChange={e => {
                        const next = [...draftGuests];
                        next[idx].name = e.target.value;
                        setDraftGuests(next);
                      }} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">職稱</label>
                      <input className="w-full bg-white px-4 py-2 rounded-xl border border-transparent focus:border-indigo-400 outline-none font-bold text-slate-700 shadow-sm" value={dg.title || ''} onChange={e => {
                        const next = [...draftGuests];
                        next[idx].title = e.target.value;
                        setDraftGuests(next);
                      }} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">類別</label>
                      <select className="w-full bg-white px-4 py-2 rounded-xl border border-transparent focus:border-indigo-400 outline-none font-bold text-slate-700 shadow-sm" value={dg.category} onChange={e => {
                        const next = [...draftGuests];
                        next[idx].category = e.target.value as GuestCategory;
                        setDraftGuests(next);
                      }}>{Object.values(GuestCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">簽名狀態</label>
                        <div className={`px-4 py-2 rounded-xl font-bold text-center text-sm ${dg.hasSignature ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{dg.hasSignature ? '偵測到簽名' : '未簽名'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 md:p-10 border-t bg-slate-50 flex gap-4 md:gap-6">
              <button onClick={() => setDraftGuests([])} className="flex-1 bg-white border-2 border-slate-200 py-4 rounded-2xl font-black text-slate-400 hover:bg-slate-100 transition-all text-sm md:text-lg">取消匯入</button>
              <button onClick={async () => {
                const selected = draftGuests.filter(d => d.isSelected);
                if (selected.length > 0) {
                  await addGuestsFromDraft(selected, new Date());
                  alert(`成功處理 ${selected.length} 筆資料！`);
                }
                setDraftGuests([]);
              }} className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all transform active:scale-95 text-sm md:text-lg flex items-center justify-center gap-3"><Cloud size={24}/> 確認匯入雲端名單</button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isProcessing && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[300] flex flex-col items-center justify-center animate-in fade-in duration-300">
           <div className="bg-white p-10 rounded-3xl shadow-2xl border border-slate-100 flex flex-col items-center gap-6 max-w-xs w-full text-center">
              <Loader2 size={64} className="text-indigo-600 animate-spin" />
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800">{progressMsg}</h3>
                <p className="text-sm font-bold text-slate-400">正在處理文件，請勿離開畫面...</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
