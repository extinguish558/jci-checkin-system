
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useEvent } from '../context/EventContext';
import { FlowFile, GuestCategory, Guest, LotteryPoolConfig } from '../types';
import { 
  FileSpreadsheet, FileText, Presentation, Trash2, Lock, Unlock, 
  ListTodo, Download, Loader2, Upload, X, 
  Activity, CheckCircle2, Mic2, Award, ChevronRight,
  TrendingUp, RefreshCcw, Database, BellRing, Clock, FileBox,
  FileCheck2, Trophy, ClipboardList, ChevronDown, UserCheck, Users,
  RotateCcw, AlertTriangle, Check, ListChecks, Edit3, ChevronUp, Link, Wifi, WifiOff, FileUp, Move, PieChart, Info, FileStack, ShieldAlert, Heart, LockKeyhole, Save, Search, UserMinus, UserPlus, Filter, PlusCircle
} from 'lucide-react';
import { 
  exportFinalActivityReport,
  parseGuestsFromExcel,
  parseGiftsFromExcel,
  parseMcFlowFromExcel
} from '../services/geminiService';

const FlowPanel: React.FC = () => {
  const { 
    settings, updateSettings, addFlowFile, removeFlowFile, isAdmin, loginAdmin, logoutAdmin, guests, 
    overwriteGuestsFromDraft, addGuestsFromDraft, clearGuestsOnly, clearGiftsOnly, clearMcFlowOnly,
    resetGlobalEventState, isCloudConnected, updateGuestInfo, setMcFlowSteps, setGiftItems
  } = useEvent();
  
  const [showLoginModal, setShowLoginModal] = useState(false); 
  const [loginPassword, setLoginPassword] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUploadType, setCurrentUploadType] = useState<'guests_file' | 'gifts_file' | 'mcflow_file' | 'schedule' | 'slides' | null>(null);
  const [importMode, setImportMode] = useState<'add' | 'overwrite'>('add');

  // 看板編輯狀態
  const [isEditingBoard, setIsEditingBoard] = useState(false);
  const [editBoardName, setEditBoardName] = useState(settings.eventName);
  const [editBoardSchedule, setEditBoardSchedule] = useState(settings.briefSchedule || '');
  const [isSavingBoard, setIsSavingBoard] = useState(false);

  // 抽獎池配置狀態
  const [poolConfig, setPoolConfig] = useState<LotteryPoolConfig>(
    settings.lotteryPoolConfig || { includedCategories: Object.values(GuestCategory), includedIndividualIds: [] }
  );
  const [individualSearch, setIndividualSearch] = useState('');
  const [isSavingPool, setIsSavingPool] = useState(false);

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  }, []);

  // 同步設定值
  useEffect(() => {
    if (!isEditingBoard) {
      setEditBoardName(settings.eventName);
      setEditBoardSchedule(settings.briefSchedule || '');
    }
  }, [settings.eventName, settings.briefSchedule, isEditingBoard]);

  useEffect(() => {
    if (settings.lotteryPoolConfig) {
      setPoolConfig(settings.lotteryPoolConfig);
    }
  }, [settings.lotteryPoolConfig]);

  const handleSaveBoard = async () => {
    setIsSavingBoard(true);
    try {
      await updateSettings({
        eventName: editBoardName,
        briefSchedule: editBoardSchedule
      });
      setIsEditingBoard(false);
    } catch (e) {
      alert("儲存看板資訊失敗");
    } finally {
      setIsSavingBoard(false);
    }
  };

  const handleSavePoolConfig = async () => {
    setIsSavingPool(true);
    try {
      await updateSettings({ lotteryPoolConfig: poolConfig });
      alert("抽獎池配置已更新");
    } catch (e) {
      alert("儲存配置失敗");
    } finally {
      setIsSavingPool(false);
    }
  };

  const toggleCategory = (cat: GuestCategory) => {
    setPoolConfig(prev => {
      const exists = prev.includedCategories.includes(cat);
      if (exists) {
        return { ...prev, includedCategories: prev.includedCategories.filter(c => c !== cat) };
      } else {
        return { ...prev, includedCategories: [...prev.includedCategories, cat] };
      }
    });
  };

  const toggleIndividual = (id: string) => {
    setPoolConfig(prev => {
      const exists = prev.includedIndividualIds.includes(id);
      if (exists) {
        return { ...prev, includedIndividualIds: prev.includedIndividualIds.filter(i => i !== id) };
      } else {
        return { ...prev, includedIndividualIds: [...prev.includedIndividualIds, id] };
      }
    });
  };

  const searchedGuests = useMemo(() => {
    const s = individualSearch.trim().toLowerCase();
    if (!s) return [];
    return guests.filter(g => 
      g.name.toLowerCase().includes(s) || 
      (g.title || '').toLowerCase().includes(s)
    ).slice(0, 5);
  }, [guests, individualSearch]);

  const includedGuests = useMemo(() => {
    return guests.filter(g => poolConfig.includedIndividualIds.includes(g.id));
  }, [guests, poolConfig.includedIndividualIds]);

  const downloadFile = (file: FlowFile) => {
    if (!file || (!file.data && !file.url)) {
      alert("檔案內容無效。");
      return;
    }
    if (file.url) {
      window.open(file.url, '_blank');
      return;
    }
    if (file.data) {
      const link = document.createElement('a');
      link.href = file.data;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (!file || !currentUploadType) return;

    let confirmMsg = "";
    if (currentUploadType === 'guests_file' && importMode === 'overwrite') confirmMsg = "將刪除雲端所有報到紀錄並覆蓋，確定嗎？";
    else if (currentUploadType === 'gifts_file') confirmMsg = "將刪除並替換目前的禮品資料，確定嗎？";
    else if (currentUploadType === 'mcflow_file') confirmMsg = "將刪除並替換目前的流程講稿資料，確定嗎？";

    if (confirmMsg && !window.confirm(confirmMsg)) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
    }

    setIsUploading(true);
    setUploadProgress(`正在解析 ${file.name}...`);

    try {
      const metaFile: FlowFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: currentUploadType,
        mimeType: file.type,
        size: file.size,
        uploadTime: new Date().toISOString(),
      };

      if (currentUploadType === 'guests_file') {
        const drafts = await parseGuestsFromExcel(file);
        if (importMode === 'overwrite') await overwriteGuestsFromDraft(drafts, new Date());
        else await addGuestsFromDraft(drafts, new Date());
      } else if (currentUploadType === 'gifts_file') {
        await updateSettings({ giftItems: [], flowFiles: (settings.flowFiles || []).filter(f => f.type !== 'gifts_file') });
        const items = await parseGiftsFromExcel(file);
        await updateSettings({ giftItems: items });
      } else if (currentUploadType === 'mcflow_file') {
        await updateSettings({ mcFlowSteps: [], flowFiles: (settings.flowFiles || []).filter(f => f.type !== 'mcflow_file') });
        const steps = await parseMcFlowFromExcel(file);
        await updateSettings({ mcFlowSteps: steps });
      } else if (currentUploadType === 'schedule' || currentUploadType === 'slides') {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          metaFile.data = reader.result as string;
          await addFlowFile(metaFile);
        };
      }
      
      if (currentUploadType !== 'guests_file' && currentUploadType !== 'schedule' && currentUploadType !== 'slides') {
          await addFlowFile(metaFile);
      }
    } catch (error: any) {
      alert("上傳失敗: " + error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setUploadProgress(null), 3000);
    }
  };

  const handleResetStatus = async (type: 'checkin' | 'gifts' | 'mc' | 'lottery' | 'sponsorships') => {
    if (!isAdmin) { setShowLoginModal(true); return; }
    
    const label = {
      checkin: '報到狀態',
      gifts: '禮品頒贈進度',
      mc: '講稿與介紹進度',
      lottery: '抽獎得獎名單',
      sponsorships: '贊助芳名錄'
    }[type];

    if (!window.confirm(`確定要重置「${label}」嗎？\n資料將會被歸零或重設為初始狀態。`)) return;
    
    try {
        if (type === 'checkin') {
            for (const g of guests) {
                await updateGuestInfo(g.id, { isCheckedIn: false, attendedRounds: [], checkInTime: undefined, round: undefined });
            }
        } else if (type === 'gifts') {
            const items = (settings.giftItems || []).map(i => ({ ...i, isPresented: false }));
            await updateSettings({ giftItems: items });
        } else if (type === 'mc') {
            const steps = (settings.mcFlowSteps || []).map(s => ({ ...s, isCompleted: false }));
            for (const g of guests) { await updateGuestInfo(g.id, { isIntroduced: false }); }
            await updateSettings({ mcFlowSteps: steps });
        } else if (type === 'lottery') {
            for (const g of guests) {
                await updateGuestInfo(g.id, { isWinner: false, wonRounds: [], winRound: undefined, wonTimes: {} });
            }
            await updateSettings({ lotteryRoundCounter: 1, lastDrawTrigger: null });
        } else if (type === 'sponsorships') {
            await updateSettings({ sponsorships: [], lastSponsorshipTrigger: null });
        }
        alert(`${label}已重置。`);
    } catch (e: any) { alert("重置失敗: " + e.message); }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginAdmin(loginPassword)) { setShowLoginModal(false); setLoginPassword(""); }
    else alert("密碼錯誤");
  };

  const handleDetailedClear = async (action: () => Promise<void>) => {
    if (!isAdmin) { setShowLoginModal(true); return; }
    if (!window.confirm('此操作將永久刪除雲端數據，確定嗎？')) return;
    try {
        await action();
        alert('雲端資料已清除。');
    } catch (e: any) { alert('操作失敗: ' + e.message); }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 pb-60 bg-[#F2F2F7] min-h-screen">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

      {/* 頂部區域 - 增加編輯看板功能 */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white space-y-6 relative overflow-hidden">
        <div className="flex justify-between items-center">
           <div className="flex items-center gap-2">
             <Activity className="text-blue-500" size={20} strokeWidth={3} />
             <span className="text-gray-400 font-black tracking-widest text-xs">EVENT DASHBOARD</span>
           </div>
           <div className="flex items-center gap-2">
             {isAdmin && !isEditingBoard && (
               <button onClick={() => setIsEditingBoard(true)} className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black hover:bg-blue-100 transition-colors">
                  <Edit3 size={12}/> 編輯看板內容
               </button>
             )}
             <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black ${isCloudConnected ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                <Wifi size={12}/> {isCloudConnected ? '雲端同步中' : '斷線/離線'}
             </div>
             <button onClick={() => isAdmin ? logoutAdmin() : setShowLoginModal(true)} className="p-2.5 bg-[#F2F2F7] rounded-xl">
               {isAdmin ? <Unlock size={18} className="text-[#007AFF]"/> : <Lock size={18} className="text-gray-300"/>}
             </button>
           </div>
        </div>

        {isEditingBoard ? (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="space-y-2">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">修改活動名稱</label>
               <input 
                 type="text" 
                 value={editBoardName} 
                 onChange={(e) => setEditBoardName(e.target.value)} 
                 className="w-full bg-[#F2F2F7] border-none rounded-2xl py-4 px-6 text-xl md:text-3xl font-black outline-none focus:ring-4 focus:ring-blue-500/10" 
                 placeholder="輸入活動全銜..."
                 autoFocus
               />
             </div>
             <div className="space-y-2">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">修改公告內容</label>
               <textarea 
                 rows={4} 
                 value={editBoardSchedule} 
                 onChange={(e) => setEditBoardSchedule(e.target.value)} 
                 className="w-full bg-[#F2F2F7] border-none rounded-2xl py-4 px-6 text-sm font-bold leading-relaxed outline-none focus:ring-4 focus:ring-blue-500/10 resize-none" 
                 placeholder="輸入要顯示的公告或流程摘要..."
               />
             </div>
             <div className="flex gap-3">
               <button onClick={() => setIsEditingBoard(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl text-xs active:scale-95 transition-all">取消修改</button>
               <button onClick={handleSaveBoard} disabled={isSavingBoard} className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
                  {isSavingBoard ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  確認儲存變更
               </button>
             </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h1 className="text-3xl md:text-4xl font-black text-black leading-tight">{settings.eventName}</h1>
            <div onClick={() => setIsScheduleExpanded(!isScheduleExpanded)} className="bg-[#F2F2F7] rounded-3xl p-6 relative cursor-pointer hover:bg-[#E8E8EE] transition-all">
              <p className={`text-lg font-light leading-relaxed ${isScheduleExpanded ? '' : 'line-clamp-3'}`}>
                {settings.briefSchedule || "尚無活動內容摘要"}
              </p>
              <div className="flex justify-center mt-3 text-gray-300"><ChevronDown size={20} className={isScheduleExpanded ? 'rotate-180' : ''}/></div>
            </div>
          </div>
        )}
      </div>

      {/* 總報表導出區 - 所有人可見 */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-blue-100 flex flex-col md:flex-row items-center gap-6 group">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform">
             <FileStack size={40} />
          </div>
          <div className="flex-1 text-center md:text-left">
             <h3 className="text-2xl font-black text-slate-900">活動成果總報表導出</h3>
             <p className="text-sm font-bold text-slate-400 mt-1">一份 Excel 包含報到、禮品、流程、贊助及中獎名單。</p>
          </div>
          <button 
            onClick={() => exportFinalActivityReport(guests, settings.giftItems || [], settings.mcFlowSteps || [], settings.sponsorships || [], settings.eventName)}
            className="px-10 py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-3"
          >
            <Download size={20} />
            立即生成報表
          </button>
      </div>

      {/* 抽獎池配置 - 新增區域 (對應綠色範圍) */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-white shadow-sm space-y-8 relative overflow-hidden">
        {!isAdmin && <div className="absolute top-8 right-8 text-[#007AFF]/30 flex items-center gap-1"><LockKeyhole size={14} /><span className="text-[10px] font-black uppercase tracking-widest">非授權不可操作</span></div>}
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-red-500 rounded-full" />
          <h4 className="text-xl font-black text-slate-800">抽獎池進階配置</h4>
        </div>

        <div className={`space-y-8 ${!isAdmin ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* 類別篩選 */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Filter size={12}/> 選擇抽獎身分群組 (報到者符合任一項即入池)
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.values(GuestCategory).map(cat => {
                const isSelected = poolConfig.includedCategories.includes(cat);
                return (
                  <button 
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${isSelected ? 'bg-red-500 text-white border-red-500 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'}`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 特定嘉賓例外處理 */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <UserPlus size={12}/> 特例人員名單 (不論類別，強制包含在抽獎池內)
            </label>
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
              <input 
                type="text"
                placeholder="搜尋姓名以加入特例..."
                value={individualSearch}
                onChange={e => setIndividualSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black outline-none focus:ring-4 focus:ring-red-500/10 transition-all"
              />
              
              {searchedGuests.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-10 overflow-hidden divide-y divide-slate-50">
                  {searchedGuests.map(g => (
                    <button 
                      key={g.id}
                      onClick={() => { toggleIndividual(g.id); setIndividualSearch(''); }}
                      className="w-full p-4 flex items-center justify-between hover:bg-slate-50 text-left group"
                    >
                      <div>
                        <p className="font-black text-slate-800">{g.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{g.title || '貴賓'} · {g.category}</p>
                      </div>
                      <PlusCircle size={18} className="text-slate-200 group-hover:text-red-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 已加入的特例顯示 */}
            {includedGuests.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {includedGuests.map(g => (
                  <div key={g.id} className="flex items-center gap-2 bg-slate-900 text-white px-3 py-2 rounded-xl text-[10px] font-black border border-white/10 group">
                    <span>{g.name}</span>
                    <button onClick={() => toggleIndividual(g.id)} className="text-white/40 hover:text-red-400">
                      <X size={14}/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={handleSavePoolConfig}
            disabled={isSavingPool}
            className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] transition-all"
          >
            {isSavingPool ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            更新並應用抽獎池配置
          </button>
        </div>
      </div>

      {/* 已上傳檔案管理 */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-white shadow-sm space-y-6 relative">
          {!isAdmin && <div className="absolute top-8 right-8 text-[#007AFF]/30 flex items-center gap-1"><LockKeyhole size={14} /><span className="text-[10px] font-black uppercase tracking-widest">唯讀模式</span></div>}
          <div className="flex items-center gap-3"><FileBox size={24} className="text-blue-600" /><h4 className="text-xl font-black text-slate-800">已上傳檔案管理</h4></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(settings.flowFiles || []).length > 0 ? (
              settings.flowFiles?.map(file => (
                <div key={file.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white transition-all group">
                  <div className="flex items-center gap-3 min-w-0">
                     <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm"><FileSpreadsheet size={20} /></div>
                     <div className="min-w-0">
                        <p className="text-sm font-black text-slate-700 truncate">{file.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{file.type.replace('_file', '')} · {new Date(file.uploadTime).toLocaleDateString()}</p>
                     </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => downloadFile(file)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Download size={18}/></button>
                    {isAdmin && <button onClick={() => removeFlowFile(file.id)} className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-10 text-center opacity-20"><p className="text-sm font-black">尚無已上傳之流程檔案</p></div>
            )}
          </div>
      </div>

      {/* 資料維護區 */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-white shadow-sm space-y-8 relative">
        {!isAdmin && <div className="absolute top-8 right-8 text-[#007AFF]/30 flex items-center gap-1"><LockKeyhole size={14} /><span className="text-[10px] font-black uppercase tracking-widest">非授權不可操作</span></div>}
        <div className="flex items-center gap-3"><FileUp size={24} className="text-blue-600" /><h4 className="text-xl font-black text-slate-800">人員與流程維護</h4></div>
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!isAdmin ? 'opacity-50 grayscale' : ''}`}>
          <button 
            disabled={!isAdmin} 
            onClick={() => { setCurrentUploadType('guests_file'); setImportMode('add'); fileInputRef.current?.click(); }} 
            className="flex flex-col items-center justify-center p-8 bg-blue-50 border-2 border-dashed border-blue-200 rounded-3xl group transition-all active:scale-95"
          >
            <Users className="mb-2 text-blue-600 group-hover:scale-110" size={32} />
            <span className="text-lg font-black text-blue-900">累加/更新人員</span>
          </button>
          <button 
            disabled={!isAdmin}
            onClick={() => { setCurrentUploadType('mcflow_file'); fileInputRef.current?.click(); }} 
            className="flex flex-col items-center justify-center p-8 bg-emerald-50 border-2 border-dashed border-emerald-200 rounded-3xl group transition-all active:scale-95"
          >
            <FileText className="mb-2 text-emerald-600 group-hover:scale-110" size={32} />
            <span className="text-lg font-black text-emerald-900">更新司儀講稿</span>
          </button>
        </div>
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${!isAdmin ? 'opacity-50 grayscale' : ''}`}>
          {[
            { type: 'schedule', label: '上傳流程附件', icon: ListTodo, color: 'emerald', desc: '詳細活動流程文件。' },
            { type: 'slides', label: '上傳簡報檔案', icon: Presentation, color: 'purple', desc: '活動呈現 PPT 檔案。' },
            { type: 'gifts_file', label: '更新禮品清單', icon: Award, color: 'orange', desc: '頒贈對象與獎項。' },
            { type: 'guests_file', label: '覆蓋全體名單', icon: RotateCcw, color: 'red', desc: '【危險】清空並重設名單。' },
          ].map(item => (
            <button 
              key={item.type} 
              disabled={!isAdmin}
              onClick={() => { setCurrentUploadType(item.type as any); setImportMode('overwrite'); fileInputRef.current?.click(); }} 
              className="flex items-start gap-4 p-5 bg-slate-50 border border-slate-100 rounded-[1.8rem] hover:bg-white hover:border-blue-200 group active:scale-[0.98] text-left"
            >
              <div className={`shrink-0 w-12 h-12 rounded-2xl bg-${item.color}-100 flex items-center justify-center group-hover:scale-110`}><item.icon size={24} className={`text-${item.color}-600`} /></div>
              <div className="flex-1 space-y-1"><span className="block text-sm font-black text-slate-800">{item.label}</span><p className="text-[10px] font-bold text-slate-400 italic">{item.desc}</p></div>
            </button>
          ))}
        </div>
      </div>

      {/* 狀態重置區 */}
      <div className="bg-amber-50 rounded-[2.5rem] p-8 border border-amber-200 space-y-6 relative">
        {!isAdmin && <div className="absolute top-8 right-8 text-amber-600/30 flex items-center gap-1"><LockKeyhole size={14} /><span className="text-[10px] font-black uppercase tracking-widest">受保護功能</span></div>}
        <div className="flex items-center gap-3"><RefreshCcw size={24} className="text-amber-600" /><h4 className="text-xl font-black text-amber-900">活動狀態重置 (不刪除基礎資料)</h4></div>
        <div className={`grid grid-cols-2 md:grid-cols-6 gap-3 ${!isAdmin ? 'opacity-50 grayscale' : ''}`}>
           {[
             { label: '報到狀態', type: 'checkin', icon: UserCheck },
             { label: '禮品進度', type: 'gifts', icon: Award },
             { label: '講稿狀態', type: 'mc', icon: Mic2 },
             { label: '介紹狀態', type: 'mc', icon: ListChecks },
             { label: '抽獎儀表', type: 'lottery', icon: Trophy },
             { label: '贊助資訊', type: 'sponsorships', icon: Heart },
           ].map(item => (
             <button 
               key={item.label} 
               disabled={!isAdmin}
               onClick={() => handleResetStatus(item.type as any)} 
               className="flex flex-col items-center justify-center gap-2 p-4 bg-white hover:bg-amber-100 rounded-2xl border border-amber-100 transition-all active:scale-95"
             >
                <item.icon size={20} className="text-amber-500" />
                <span className="text-[10px] font-black text-amber-900">{item.label}</span>
             </button>
           ))}
        </div>
        <button 
          disabled={!isAdmin}
          onClick={() => resetGlobalEventState()} 
          className={`w-full py-4 bg-amber-500 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg ${!isAdmin ? 'opacity-50' : ''}`}
        >
            <RotateCcw size={16} /> 全域活動進度歸零 (保留名單)
        </button>
      </div>

      {/* 資料刪除區 */}
      <div className="bg-red-50 rounded-[2.5rem] p-8 border border-red-200 space-y-6 relative">
        {!isAdmin && <div className="absolute top-8 right-8 text-red-600/30 flex items-center gap-1"><LockKeyhole size={14} /><span className="text-[10px] font-black uppercase tracking-widest">高權限功能</span></div>}
        <div className="flex items-center gap-3"><Trash2 size={24} className="text-red-600" /><h4 className="text-xl font-black text-red-900">雲端資料刪除 (永久清除)</h4></div>
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${!isAdmin ? 'opacity-50 grayscale' : ''}`}>
            <button disabled={!isAdmin} onClick={() => handleDetailedClear(clearGuestsOnly)} className="flex flex-col items-center justify-center gap-2 p-6 bg-white hover:bg-red-100 rounded-2xl border border-red-100 group">
                <Users size={24} className="text-red-600 group-hover:scale-110" /><p className="font-black text-xs text-red-900">人員名冊</p>
            </button>
            <button disabled={!isAdmin} onClick={() => handleDetailedClear(clearGiftsOnly)} className="flex flex-col items-center justify-center gap-2 p-6 bg-white hover:bg-red-100 rounded-2xl border border-red-100 group">
                <Award size={24} className="text-red-600 group-hover:scale-110" /><p className="font-black text-xs text-red-900">禮品資料</p>
            </button>
            <button disabled={!isAdmin} onClick={() => handleDetailedClear(clearMcFlowOnly)} className="flex flex-col items-center justify-center gap-2 p-6 bg-white hover:bg-red-100 rounded-2xl border border-red-100 group">
                <FileText size={24} className="text-red-600 group-hover:scale-110" /><p className="font-black text-xs text-red-900">司儀講稿</p>
            </button>
            <button disabled={!isAdmin} onClick={() => handleDetailedClear(async () => { await updateSettings({ flowFiles: (settings.flowFiles || []).filter(f => f.type !== 'slides') }); })} className="flex flex-col items-center justify-center gap-2 p-6 bg-white hover:bg-red-100 rounded-2xl border border-red-100 group">
                <Presentation size={24} className="text-red-600 group-hover:scale-110" /><p className="font-black text-xs text-red-900">簡報檔案</p>
            </button>
        </div>
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[300] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-xs shadow-2xl flex flex-col items-center gap-6">
            <h3 className="text-xl font-black text-black text-center">管理權限解鎖</h3>
            <form onSubmit={handleLoginSubmit} className="w-full space-y-4">
              <input type="password" placeholder="••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-[#F2F2F7] border-none rounded-2xl py-5 px-4 text-center text-4xl font-black outline-none" autoFocus />
              <div className="flex gap-2 pt-2"><button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-4 font-black text-gray-400">取消</button><button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl">確認</button></div>
            </form>
          </div>
        </div>
      )}

      {uploadProgress && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[500] px-8 py-4 bg-blue-600 text-white rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Loader2 size={20} className="animate-spin" />
          <span className="font-black tracking-widest">{uploadProgress}</span>
        </div>
      )}
    </div>
  );
};

export default FlowPanel;
