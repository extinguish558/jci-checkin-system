import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useEvent } from '../context/EventContext';
import { FlowFile, GuestCategory, Guest } from '../types';
import { 
  FileSpreadsheet, FileText, Presentation, Trash2, Lock, Unlock, 
  ListTodo, Download, Loader2, Upload, X, 
  Activity, CheckCircle2, Mic2, Award, ChevronRight,
  TrendingUp, RefreshCcw, Database, BellRing, Clock, FileBox,
  FileCheck2, Trophy, ClipboardList, ChevronDown, UserCheck, Users,
  RotateCcw, AlertTriangle, Check, ListChecks, Edit3, ChevronUp, Link, Wifi, WifiOff, FileUp, Move, PieChart, Info
} from 'lucide-react';
import { 
  exportDetailedGuestsExcel, 
  exportGiftsExcel, 
  exportMcFlowExcel, 
  exportIntroductionsExcel, 
  exportLotteryExcel,
  parseGuestsFromExcel,
  parseGiftsFromExcel,
  parseMcFlowFromExcel
} from '../services/geminiService';

const FlowPanel: React.FC = () => {
  const { 
    settings, updateSettings, addFlowFile, removeFlowFile, isAdmin, loginAdmin, logoutAdmin, guests, 
    overwriteGuestsFromDraft, addGuestsFromDraft, clearAllData, clearGuestsOnly, clearGiftsOnly, clearMcFlowOnly,
    resetGlobalEventState, isCloudConnected 
  } = useEvent();
  const [showLoginModal, setShowLoginModal] = useState(false); 
  const [loginPassword, setLoginPassword] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUploadType, setCurrentUploadType] = useState<'guests_file' | 'gifts_file' | 'mcflow_file' | 'schedule' | 'slides' | null>(null);
  const [importMode, setImportMode] = useState<'add' | 'overwrite'>('add');

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  }, []);

  const downloadStoredFile = (type: string) => {
    const file = settings.flowFiles?.find(f => f.type === type);
    if (!file || (!file.data && !file.url)) {
      alert("尚未上傳流程檔案，請聯繫管理員上傳 Excel 流程。");
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
    const file = e.target.files?.[0];
    if (!file || !currentUploadType) return;

    let confirmMsg = "";
    if (currentUploadType === 'guests_file' && importMode === 'overwrite') confirmMsg = "您選擇了「覆蓋全新名單」。將刪除雲端所有報到紀錄，確定嗎？";
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

  const handleDetailedClear = async (action: () => Promise<void>) => {
    if (!isAdmin) { setShowLoginModal(true); return; }
    try {
        await action();
        alert('雲端資料清理成功，已同步至所有設備。');
    } catch (e: any) { alert('清理失敗: ' + e.message); }
  }

  const getTargetGroup = (g: Guest): string => {
    const title = g.title || '';
    const category = (g.category || '').toString();
    const fullInfo = (title + category).toLowerCase();
    if (category.includes('YB') || category.includes('會友')) return 'YB';
    if (category.includes('OB') || category.includes('特友')) return 'OB';
    const govKeywords = ['政府', '議會', '立委', '市長', '縣長', '局長', '議員', '主任'];
    if (govKeywords.some(k => fullInfo.includes(k)) && !fullInfo.includes('分會')) return 'VIP';
    if (category.includes('總會') || title.includes('總會')) return 'HQ';
    if (category.includes('友會') || title.includes('會')) return 'VISITING';
    return 'VIP';
  };

  // 1. 司儀流程監控數據
  const flowMonitoring = useMemo(() => {
    const steps = settings.mcFlowSteps || [];
    const uncompleted = steps.filter(s => !s.isCompleted);
    const current = uncompleted[0] || { title: '活動流程已全部結束', time: '' };
    const upcoming = uncompleted.slice(1, 5);
    return { current, upcoming };
  }, [settings.mcFlowSteps]);

  // 2. 禮品頒發進度數據 (當前獎項 + 接續 4 個)
  const giftMonitoring = useMemo(() => {
    const items = settings.giftItems || [];
    const total = items.length;
    const completed = items.filter(i => i.isPresented).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const unpresented = items.filter(i => !i.isPresented);
    const currentGift = unpresented[0] || null;
    const next4Gifts = unpresented.slice(1, 5);
    
    return { completed, total, percent, currentGift, next4Gifts };
  }, [settings.giftItems]);

  // 3. 貴賓介紹進度數據
  const introMonitoring = useMemo(() => {
    const presentGuests = guests.filter(g => g.isCheckedIn);
    const introduced = presentGuests.filter(g => g.isIntroduced).length;
    const totalPresent = presentGuests.length;
    const percent = totalPresent > 0 ? Math.round((introduced / totalPresent) * 100) : 0;

    const toHalfWidth = (str: string) => str.replace(/[\uff01-\uff5e]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)).replace(/\u3000/g, ' ');
    const getWeight = (g: Guest): number => {
      const t = toHalfWidth((g.title || '') + (g.category || '')).toLowerCase();
      if (t.includes('政府') || t.includes('議會')) return 1;
      if (t.includes('總會')) return 2;
      if (t.includes('會長')) return 3;
      if (t.includes('主席')) return 4;
      if (t.includes('友會') || t.includes('兄弟會')) return 5;
      return 10;
    };

    const upcoming = presentGuests
      .filter(g => !g.isIntroduced)
      .sort((a, b) => getWeight(a) - getWeight(b))
      .slice(0, 4);

    return { introduced, totalPresent, percent, upcoming };
  }, [guests]);

  const registrationStats = useMemo(() => {
    const categories = [{ key: 'YB', label: '會友 YB', color: 'bg-blue-500' }, { key: 'OB', label: '特友 OB', color: 'bg-orange-500' }, { key: 'HQ', label: '總會貴賓', color: 'bg-indigo-500' }, { key: 'VISITING', label: '友會貴賓', color: 'bg-green-500' }, { key: 'VIP', label: '貴賓 VIP', color: 'bg-purple-500' }];
    const details = categories.map(cat => {
      const groupGuests = guests.filter(g => getTargetGroup(g) === cat.key);
      return { ...cat, checked: groupGuests.filter(g => g.isCheckedIn).length, total: groupGuests.length };
    });
    const totalChecked = guests.filter(g => g.isCheckedIn).length;
    return { details, totalChecked, totalCount: guests.length, totalPercent: guests.length > 0 ? Math.round((totalChecked / guests.length) * 100) : 0 };
  }, [guests]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginAdmin(loginPassword)) { setShowLoginModal(false); setLoginPassword(""); }
    else alert("密碼錯誤");
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 pb-60 bg-[#F2F2F7] min-h-screen">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

      {/* 頂部區域 */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white space-y-6">
        <div className="flex justify-between items-center">
           <div className="flex items-center gap-2">
             <Activity className="text-blue-500" size={20} strokeWidth={3} />
             <span className="text-gray-400 font-black tracking-widest text-xs">EVENT DASHBOARD</span>
           </div>
           <div className="flex items-center gap-2">
             <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black ${isCloudConnected ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                <Wifi size={12}/> {isCloudConnected ? '雲端同步中' : '斷線/離線'}
             </div>
             <button onClick={() => isAdmin ? logoutAdmin() : setShowLoginModal(true)} className="p-2.5 bg-[#F2F2F7] rounded-xl">
               {isAdmin ? <Unlock size={18} className="text-[#007AFF]"/> : <Lock size={18} className="text-gray-300"/>}
             </button>
           </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-black">{settings.eventName}</h1>
        <div onClick={() => setIsScheduleExpanded(!isScheduleExpanded)} className="bg-[#F2F2F7] rounded-3xl p-6 relative cursor-pointer hover:bg-[#E8E8EE] transition-all">
          <p className={`text-lg font-light leading-relaxed ${isScheduleExpanded ? '' : 'line-clamp-3'}`}>
            {settings.briefSchedule || "尚無活動內容摘要"}
          </p>
          <div className="flex justify-center mt-3 text-gray-300"><ChevronDown size={20} className={isScheduleExpanded ? 'rotate-180' : ''}/></div>
        </div>
      </div>

      {/* 看板區域 */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-4"><TrendingUp size={24} className="text-blue-600"/><h4 className="text-xl font-black text-slate-800">活動即時看板</h4></div>
        
        {/* 報到總覽卡片 */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white flex flex-col md:flex-row gap-6 md:gap-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500/10" />
          <div className="flex-1 flex flex-col justify-between space-y-4">
            <div className="flex items-center gap-2"><Clock size={16} className="text-blue-500"/><span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">報到總覽數據</span></div>
            <div className="flex items-baseline gap-2"><span className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-none">{registrationStats.totalChecked}</span><span className="text-lg font-bold text-slate-300">/ {registrationStats.totalCount}</span></div>
            <div className="mt-auto space-y-2">
              <div className="flex justify-between items-end"><span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Progress</span><p className="text-[10px] font-black text-blue-600">{registrationStats.totalPercent}%</p></div>
              <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-50 shadow-inner"><div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${registrationStats.totalPercent}%` }} /></div>
            </div>
          </div>
          <div className="w-full md:w-auto md:min-w-[280px] border-t md:border-t-0 md:border-l border-gray-50 pt-4 md:pt-0 md:pl-8 flex flex-col justify-center gap-3">
             <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                {registrationStats.details.map(detail => (
                  <div key={detail.key} className="flex flex-col gap-0">
                    <div className="flex items-center gap-1"><div className={`w-1.5 h-1.5 rounded-full ${detail.color}`} /><span className="text-[9px] font-black text-gray-400 uppercase">{detail.label.replace('貴賓', '')}</span></div>
                    <div className="flex items-baseline gap-1"><span className="text-base font-black text-slate-700">{detail.checked}</span><span className="text-[9px] font-bold text-slate-200">/ {detail.total}</span></div>
                  </div>
                ))}
             </div>
             {/* 所有人都可以點擊的下載按鈕 */}
             <div className="mt-2 pt-2 border-t border-gray-50">
                <button 
                  onClick={() => downloadStoredFile('schedule')}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-600 rounded-2xl font-black text-[11px] hover:bg-blue-100 transition-all active:scale-95 shadow-sm border border-blue-100/50"
                >
                  <Download size={14} />
                  下載完整活動流程
                </button>
             </div>
          </div>
        </div>

        {/* 1. 司儀流程監控 */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-600">
              <ListChecks size={20} strokeWidth={3} />
              <span className="font-black uppercase tracking-widest text-xs">司儀流程監控</span>
            </div>
            {flowMonitoring.current.time && (
               <div className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black">
                 <Clock size={11} /> {flowMonitoring.current.time}
               </div>
             )}
          </div>
          <div className="flex items-start gap-4">
            <div className="w-1 h-8 bg-blue-600 rounded-full animate-pulse mt-1" />
            <h3 className="text-xl md:text-3xl font-black text-slate-900 flex-1">{flowMonitoring.current.title}</h3>
          </div>
          
          {flowMonitoring.upcoming.length > 0 && (
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">預告流程 (UPCOMING)</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {flowMonitoring.upcoming.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-transparent hover:border-blue-100 transition-all">
                    <span className="text-xs font-black text-slate-300">#{(idx + 2)}</span>
                    <span className="text-sm font-bold text-slate-700 truncate flex-1">{item.title}</span>
                    {item.time && <span className="text-[10px] font-black text-slate-400">{item.time}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. 禮品頒發進度 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-orange-500">
                <Award size={20} strokeWidth={3} />
                <span className="font-black uppercase tracking-widest text-xs">禮品頒發進度</span>
              </div>
              <span className="text-lg font-black text-orange-600">{giftMonitoring.percent}%</span>
            </div>
            
            <div className="space-y-1">
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">當前頒發獎項</span>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                {giftMonitoring.currentGift ? giftMonitoring.currentGift.name : "活動獎項已全數頒發"}
              </h3>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-900">{giftMonitoring.completed}</span>
              <span className="text-base font-bold text-slate-300">/ {giftMonitoring.total} 件已完成</span>
            </div>
            
            <div className="w-full h-2 bg-orange-50 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${giftMonitoring.percent}%` }} />
            </div>
            
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">接續 4 項獎項預告</span>
              <div className="space-y-2">
                {giftMonitoring.next4Gifts.map((gift) => (
                  <div key={gift.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <ChevronRight size={10} className="text-orange-300 shrink-0" />
                      <span className="text-xs font-bold text-slate-500 truncate">{gift.name}</span>
                    </div>
                    <span className="text-[9px] font-black text-slate-300 shrink-0 tabular-nums">#{gift.sequence}</span>
                  </div>
                ))}
                {giftMonitoring.next4Gifts.length === 0 && <span className="text-[10px] font-bold text-slate-300 italic">無後續禮品預告</span>}
              </div>
            </div>
          </div>

          {/* 3. 貴賓介紹進度 */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600">
                <Mic2 size={20} strokeWidth={3} />
                <span className="font-black uppercase tracking-widest text-xs">貴賓介紹現況</span>
              </div>
              <span className="text-lg font-black text-indigo-600">{introMonitoring.percent}%</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-slate-900">{introMonitoring.introduced}</span>
              <span className="text-lg font-bold text-slate-300">/ {introMonitoring.totalPresent} 位已報到</span>
            </div>
            <div className="w-full h-2 bg-indigo-50 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${introMonitoring.percent}%` }} />
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">待介紹貴賓預告</span>
                <span className="text-[10px] font-black text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded">NEXT 4</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {introMonitoring.upcoming.map((g) => (
                  <div key={g.id} className="p-2 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                    <p className="text-xs font-black text-slate-800 truncate">{g.name}</p>
                    <p className="text-[8px] font-bold text-indigo-400 truncate mt-0.5">{g.title || '貴賓'}</p>
                  </div>
                ))}
                {introMonitoring.upcoming.length === 0 && (
                   <div className="col-span-2 py-2 text-center">
                     <span className="text-[10px] font-bold text-slate-300 italic">目前無待介紹貴賓</span>
                   </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <>
          <div className="bg-white rounded-[2.5rem] p-8 border border-white shadow-sm space-y-8">
            <div className="flex items-center gap-3"><FileUp size={24} className="text-blue-600" /><h4 className="text-xl font-black text-slate-800">人員名冊維護</h4></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => { setCurrentUploadType('guests_file'); setImportMode('add'); fileInputRef.current?.click(); }} className="flex flex-col items-center justify-center p-8 bg-blue-50 border-2 border-dashed border-blue-200 rounded-3xl group transition-all active:scale-95"><Users className="mb-2 text-blue-600 group-hover:scale-110" size={32} /><span className="text-lg font-black text-blue-900">累加/更新名單</span></button>
              <button onClick={() => { setCurrentUploadType('guests_file'); setImportMode('overwrite'); fileInputRef.current?.click(); }} className="flex flex-col items-center justify-center p-8 bg-red-50 border-2 border-dashed border-red-100 rounded-3xl group transition-all active:scale-95"><RotateCcw className="mb-2 text-red-600 group-hover:rotate-180" size={32} /><span className="text-lg font-black text-red-900">覆蓋全新名單</span></button>
            </div>
            {uploadProgress && <div className="flex items-center justify-center gap-2 py-4 bg-blue-500/10 rounded-2xl animate-pulse"><Loader2 className="animate-spin text-blue-600" size={20} /><span className="text-sm font-black text-blue-600">{uploadProgress}</span></div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { type: 'schedule', label: '上傳流程檔案', icon: ListTodo, color: 'emerald', desc: '更新活動詳細流程文件。' },
                { type: 'slides', label: '上傳簡報檔案', icon: Presentation, color: 'purple', desc: '更新活動呈現簡報。' },
              ].map(item => (
                <button key={item.type} onClick={() => { setCurrentUploadType(item.type as any); fileInputRef.current?.click(); }} className="flex items-start gap-4 p-5 bg-slate-50 border border-slate-100 rounded-[1.8rem] hover:bg-white hover:border-blue-200 group active:scale-[0.98] text-left">
                  <div className={`shrink-0 w-12 h-12 rounded-2xl bg-${item.color}-100 flex items-center justify-center group-hover:scale-110`}><item.icon size={24} className={`text-${item.color}-600`} /></div>
                  <div className="flex-1 space-y-1"><span className="block text-sm font-black text-slate-800">{item.label}</span><p className="text-[10px] font-bold text-slate-400 italic">{item.desc}</p></div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-6">
            <div className="flex items-center gap-3"><RefreshCcw size={24} className="text-red-400" /><h4 className="text-xl font-black">日常維護與重置</h4></div>
            <div className="space-y-4">
              <button onClick={() => resetGlobalEventState()} className="w-full flex items-center justify-center gap-3 p-5 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/10 group"><RotateCcw size={20} className="text-red-400 group-hover:rotate-[-90deg]" /><div className="text-left"><p className="font-black text-sm">重置今日活動進度</p><p className="text-[9px] text-white/40">不含名單</p></div></button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button onClick={() => handleDetailedClear(clearGuestsOnly)} className="flex flex-col items-center justify-center gap-2 p-5 bg-red-600/20 hover:bg-red-600/40 rounded-2xl border border-red-500/20 group"><Users size={24} className="text-red-400 group-hover:scale-110" /><p className="font-black text-sm">報到名單清除</p></button>
                <button onClick={() => handleDetailedClear(clearGiftsOnly)} className="flex flex-col items-center justify-center gap-2 p-5 bg-red-600/20 hover:bg-red-600/40 rounded-2xl border border-red-500/20 group"><Award size={24} className="text-red-400 group-hover:scale-110" /><p className="font-black text-sm">禮品資料清除</p></button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { label: '報到總表', icon: ClipboardList, fn: () => exportDetailedGuestsExcel(guests, settings.eventName, getTargetGroup) },
              { label: '禮品狀態', icon: Award, fn: () => exportGiftsExcel(settings.giftItems || [], settings.eventName) },
              { label: '介紹現況', icon: Mic2, fn: () => exportIntroductionsExcel(guests, settings.eventName) },
              { label: '抽獎結果', icon: Trophy, fn: () => exportLotteryExcel(guests, settings.eventName) },
              { label: '司儀講稿', icon: FileText, fn: () => exportMcFlowExcel(settings.mcFlowSteps || [], settings.eventName) },
              { label: '流程檔案', icon: ListTodo, fn: () => downloadStoredFile('schedule') }
            ].map(item => (
              <button key={item.label} onClick={item.fn} className="bg-white p-4 rounded-2xl shadow-sm border border-white flex flex-col items-center gap-2 hover:bg-slate-50 transition-all"><item.icon size={18} className="text-blue-500" /><span className="text-[10px] font-black text-slate-500">{item.label}</span></button>
            ))}
          </div>
        </>
      )}

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
    </div>
  );
};

export default FlowPanel;