
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useEvent } from '../context/EventContext';
import { FlowFile, GuestCategory, Guest } from '../types';
import { 
  FileSpreadsheet, FileText, Presentation, Trash2, Lock, Unlock, 
  ListTodo, Download, Loader2, Upload, X, 
  Activity, CheckCircle2, Mic2, Award, ChevronRight,
  TrendingUp, RefreshCcw, Database, BellRing, Clock, FileBox,
  FileCheck2, Trophy, ClipboardList, ChevronDown, UserCheck, Users,
  RotateCcw, AlertTriangle, Check, ListChecks, Edit3, ChevronUp
} from 'lucide-react';
import { 
  exportDetailedGuestsExcel, 
  exportGiftsExcel, 
  exportMcFlowExcel, 
  exportIntroductionsExcel, 
  exportLotteryExcel 
} from '../services/geminiService';

const FlowPanel: React.FC = () => {
  const { settings, updateSettings, addFlowFile, removeFlowFile, isAdmin, loginAdmin, logoutAdmin, guests, resetSpecificRecords, clearAllData } = useEvent();
  const [showLoginModal, setShowLoginModal] = useState(false); 
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetOptions, setResetOptions] = useState({ flow: false, gifts: false, checkin: false, lottery: false });
  
  const [loginPassword, setLoginPassword] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadType, setUploadType] = useState<'schedule' | 'gifts' | 'slides' | 'mcflow' | null>(null);
  
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(false);
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [editScheduleText, setEditScheduleText] = useState(settings.briefSchedule || '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginAdmin(loginPassword)) {
        setShowLoginModal(false);
        setLoginPassword("");
    } else {
        alert("密碼錯誤");
    }
  };

  const handlePreview = (file: FlowFile) => {
    if (!file.data) {
        if (file.url) {
            window.open(file.url, '_blank');
        } else {
            alert("檔案內容為空");
        }
        return;
    }

    try {
        const binaryString = atob(file.data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: file.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Download failed:", error);
        alert("下載失敗");
    }
  };

  const getTargetGroup = (g: Guest): string => {
    const title = g.title || '';
    const category = (g.category || '').toString();
    const fullInfo = (title + category).toLowerCase();
    if (category.includes('YB') || category.includes('會友')) return 'YB';
    if (category.includes('OB') || category.includes('特友')) return 'OB';
    const govKeywords = ['政府', '議會', '立委', '市長', '縣長', '局長', '議員', '主任'];
    const isGovStrict = govKeywords.some(k => fullInfo.includes(k));
    if ((category === GuestCategory.GOV_OFFICIAL || isGovStrict) && !fullInfo.includes('總會') && !fullInfo.includes('分會')) return 'VIP';
    if (category.includes('總會') || title.includes('總會')) return 'HQ';
    if (category.includes('友會') || title.includes('會') || title.includes('聯誼') || title.includes('友好')) return 'VISITING';
    return 'VIP';
  };

  const dashboardData = useMemo(() => {
    const groups = [
      { key: 'YB', label: '會友 YB', color: 'bg-blue-500' },
      { key: 'OB', label: '特友 OB', color: 'bg-orange-500' },
      { key: 'HQ', label: '總會貴賓', color: 'bg-indigo-500' },
      { key: 'VISITING', label: '友會貴賓', color: 'bg-green-500' },
      { key: 'VIP', label: '貴賓 VIP', color: 'bg-purple-500' },
    ];

    const stats = groups.map(group => {
      const groupGuests = guests.filter(g => getTargetGroup(g) === group.key);
      const checkedIn = groupGuests.filter(g => g.isCheckedIn).length;
      const total = groupGuests.length;
      return { ...group, checkedIn, total };
    });

    const totalCheckedIn = guests.filter(g => g.isCheckedIn).length;
    const totalCount = guests.length;
    const totalPercent = totalCount > 0 ? Math.round((totalCheckedIn / totalCount) * 100) : 0;

    return { stats, totalCheckedIn, totalCount, totalPercent };
  }, [guests]);

  const liveStats = useMemo(() => {
    const mcSteps = settings.mcFlowSteps || [];
    const mcCompletedCount = mcSteps.filter(s => s.isCompleted).length;
    const uncompletedMc = mcSteps.filter(s => !s.isCompleted);
    
    const giftItems = settings.giftItems || [];
    const giftsPresentedCount = giftItems.filter(i => i.isPresented).length;
    const unpresentedGifts = giftItems.filter(i => !i.isPresented);
    
    const checkedInVips = guests.filter(g => g.isCheckedIn && g.title && !g.title.includes('見習'));
    const introducedVipsCount = checkedInVips.filter(g => g.isIntroduced).length;
    const remainingVips = checkedInVips.filter(g => !g.isIntroduced);

    return {
      mc: { 
        active: uncompletedMc[0]?.title || '流程已結束', 
        previews: uncompletedMc.slice(1, 3).map(s => s.title),
        current: mcCompletedCount,
        total: mcSteps.length,
        percent: mcSteps.length > 0 ? Math.round((mcCompletedCount / mcSteps.length) * 100) : 0 
      },
      gifts: { 
        active: unpresentedGifts[0]?.name || '頒獎已結束', 
        previews: unpresentedGifts.slice(1, 3).map(i => i.name),
        current: giftsPresentedCount,
        total: giftItems.length,
        percent: giftItems.length > 0 ? Math.round((giftsPresentedCount / giftItems.length) * 100) : 0 
      },
      vips: { 
        count: remainingVips.length,
        active: remainingVips[0]?.name || '介紹已結束',
        previews: remainingVips.slice(1, 3).map(g => g.name),
        current: introducedVipsCount,
        total: checkedInVips.length,
        percent: checkedInVips.length > 0 ? Math.round((introducedVipsCount / checkedInVips.length) * 100) : 0 
      }
    };
  }, [settings, guests]);

  const triggerUpload = (type: 'schedule' | 'gifts' | 'slides' | 'mcflow') => {
    if (!isAdmin) { setShowLoginModal(true); return; }
    setUploadType(type);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadType) return;
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const newFile: FlowFile = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: uploadType,
          mimeType: file.type,
          size: file.size,
          uploadTime: new Date().toISOString(),
          data: base64
        };
        await addFlowFile(newFile);
      };
      reader.readAsDataURL(file);
    } catch (err) { alert("處理失敗"); } finally { setIsUploading(false); setUploadType(null); }
  };

  const handleExecuteReset = async () => {
    if (!Object.values(resetOptions).some(v => v)) {
        alert("請至少選擇一個重置項目");
        return;
    }
    if (confirm("確定要重置所選的活動紀錄嗎？此動作僅清空紀錄，將保留所有名單與上傳檔案。")) {
        await resetSpecificRecords(resetOptions);
        setShowResetModal(false);
        setResetOptions({ flow: false, gifts: false, checkin: false, lottery: false });
        alert("重置成功");
    }
  };

  const handleSaveSchedule = async () => {
    await updateSettings({ briefSchedule: editScheduleText });
    setIsEditingSchedule(false);
  };

  const openEditSchedule = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditScheduleText(settings.briefSchedule || '');
    setIsEditingSchedule(true);
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 pb-60 bg-[#F2F2F7] min-h-screen">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

      {/* 活動配置 */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white space-y-8">
        <div className="flex justify-between items-center">
           <div className="flex items-center gap-2"><Activity className="text-blue-500" size={18} strokeWidth={3} /><span className="text-gray-400 font-black tracking-widest text-[10px]">EVENT CONTROL</span></div>
           <div className="flex items-center gap-3">
             {isAdmin && (
               <button onClick={openEditSchedule} className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-colors">
                 <Edit3 size={20} />
               </button>
             )}
             <button onClick={() => isAdmin ? logoutAdmin() : setShowLoginModal(true)} className="p-3 bg-[#F2F2F7] rounded-2xl">
               {isAdmin ? <Unlock size={20} className="text-[#007AFF]"/> : <Lock size={20} className="text-gray-300"/>}
             </button>
           </div>
        </div>
        
        <input 
          type="text" 
          value={settings.eventName} 
          onChange={(e) => isAdmin && updateSettings({ eventName: e.target.value })}
          className="w-full bg-transparent border-none text-2xl md:text-4xl font-black text-black focus:ring-0 p-0"
          placeholder="活動名稱"
          readOnly={!isAdmin}
        />

        {/* 流程摘要顯示區塊 */}
        <div 
          onClick={() => setIsScheduleExpanded(!isScheduleExpanded)}
          className={`bg-[#F2F2F7] rounded-[2rem] p-7 relative cursor-pointer group transition-all duration-300 ${isScheduleExpanded ? 'shadow-inner' : 'hover:bg-[#E8E8EE]'}`}
        >
           <div className={`text-xl font-light text-black whitespace-pre-wrap transition-all duration-300 ${isScheduleExpanded ? '' : 'line-clamp-4'}`}>
              {settings.briefSchedule || (
                <span className="text-gray-300 italic">點擊編輯或上傳活動流程摘要...</span>
              )}
           </div>
           
           <div className="mt-4 flex items-center justify-center text-gray-300 group-hover:text-blue-500 transition-colors">
              {isScheduleExpanded ? (
                <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest">
                  <ChevronUp size={16} /> 點擊收合流程
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest">
                  <ChevronDown size={16} /> 點擊展開全文
                </div>
              )}
           </div>
        </div>
      </div>

      {/* 智慧報到儀表板 */}
      <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-white flex flex-col md:flex-row gap-8 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-2 h-full bg-blue-500/10" />
        
        {/* 左側：大數據顯示 */}
        <div className="flex-1 flex flex-col justify-between space-y-6">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-blue-500" />
            <span className="text-[11px] font-black text-slate-400 tracking-wider uppercase">報到總覽數據分析</span>
          </div>
          
          <div className="flex items-baseline gap-4">
            <span className="text-8xl font-black text-slate-900 tracking-tighter leading-none">{dashboardData.totalCheckedIn}</span>
            <span className="text-2xl font-bold text-slate-300">/ {dashboardData.totalCount}</span>
          </div>

          <div className="mt-auto space-y-2">
            <div className="flex justify-between items-end">
               <span className="text-[9px] font-black text-blue-500 tracking-widest">REAL-TIME PROGRESS</span>
               <p className="text-[11px] font-black text-blue-600">當前報到率 {dashboardData.totalPercent}%</p>
            </div>
            <div className="w-full h-2.5 bg-gray-50 rounded-full overflow-hidden border border-gray-50 shadow-inner">
              <div className="h-full bg-blue-500 transition-all duration-1000 shadow-[0_0_12px_rgba(59,130,246,0.5)]" style={{ width: `${dashboardData.totalPercent}%` }} />
            </div>
          </div>
        </div>

        {/* 右側：類別狀態分欄 */}
        <div className="w-full md:w-auto md:min-w-[240px] border-l border-gray-50 pl-8 flex flex-col justify-center gap-4">
           <h4 className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mb-2">Categories Status</h4>
           <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              {dashboardData.stats.map(detail => (
                <div key={detail.key} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${detail.color}`} />
                    <span className="text-[10px] font-black text-gray-400 uppercase truncate">{detail.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-black text-slate-700">{detail.checkedIn}</span>
                    <span className="text-[10px] font-bold text-slate-200">/ {detail.total}</span>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* 流程監控數據 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 流程監控 */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-white flex flex-col gap-3 min-h-[180px]">
             <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center shrink-0"><ListTodo size={20} /></div>
             <div>
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase">當前流程</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-gray-300 tabular-nums">{liveStats.mc.current} / {liveStats.mc.total}</span>
                    <span className="text-[10px] font-black text-blue-500 tabular-nums">{liveStats.mc.percent}%</span>
                  </div>
                </div>
                <p className="text-sm font-black text-black leading-tight line-clamp-1">{liveStats.mc.active}</p>
             </div>
             {liveStats.mc.previews.length > 0 && (
               <div className="space-y-1 mt-1 opacity-50">
                 <h5 className="text-[9px] font-bold text-gray-400">活動預告：</h5>
                 {liveStats.mc.previews.map((p, idx) => (
                   <p key={idx} className="text-[10px] font-bold text-gray-600 truncate">· {p}</p>
                 ))}
               </div>
             )}
             <div className="w-full h-1 bg-gray-50 rounded-full mt-auto"><div className="h-full bg-blue-500 transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]" style={{ width: `${liveStats.mc.percent}%` }} /></div>
        </div>

        {/* 禮品監控 */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-white flex flex-col gap-3 min-h-[180px]">
             <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center shrink-0"><Award size={20} /></div>
             <div>
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase">當前禮品</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-gray-300 tabular-nums">{liveStats.gifts.current} / {liveStats.gifts.total}</span>
                    <span className="text-[10px] font-black text-orange-500 tabular-nums">{liveStats.gifts.percent}%</span>
                  </div>
                </div>
                <p className="text-sm font-black text-black leading-tight line-clamp-1">{liveStats.gifts.active}</p>
             </div>
             {liveStats.gifts.previews.length > 0 && (
               <div className="space-y-1 mt-1 opacity-50">
                 <h5 className="text-[9px] font-bold text-gray-400">活動預告：</h5>
                 {liveStats.gifts.previews.map((p, idx) => (
                   <p key={idx} className="text-[10px] font-bold text-gray-600 truncate">· {p}</p>
                 ))}
               </div>
             )}
             <div className="w-full h-1 bg-gray-50 rounded-full mt-auto"><div className="h-full bg-orange-500 transition-all duration-500 shadow-[0_0_8px_rgba(249,115,22,0.3)]" style={{ width: `${liveStats.gifts.percent}%` }} /></div>
        </div>

        {/* 待介紹監控 */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-white flex flex-col gap-3 min-h-[180px]">
             <div className="w-10 h-10 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center shrink-0"><Mic2 size={20} /></div>
             <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase">當前介紹 ({liveStats.vips.count})</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-gray-300 tabular-nums">{liveStats.vips.current} / {liveStats.vips.total}</span>
                      <span className="text-[10px] font-black text-purple-500 tabular-nums">{liveStats.vips.percent}%</span>
                    </div>
                </div>
                <p className="text-sm font-black text-black leading-tight line-clamp-1">{liveStats.vips.active}</p>
             </div>
             {liveStats.vips.previews.length > 0 && (
               <div className="space-y-1 mt-1 opacity-50">
                 <h5 className="text-[9px] font-bold text-gray-400">活動預告：</h5>
                 {liveStats.vips.previews.map((p, idx) => (
                   <p key={idx} className="text-[10px] font-bold text-gray-600 truncate">· {p}</p>
                 ))}
               </div>
             )}
             <div className="w-full h-1 bg-gray-50 rounded-full mt-auto"><div className="h-full bg-purple-500 transition-all duration-500 shadow-[0_0_8px_rgba(168,85,247,0.3)]" style={{ width: `${liveStats.vips.percent}%` }} /></div>
        </div>
      </div>

      {/* 檔案資源區 */}
      <div className="space-y-4">
        <h4 className="px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">雲端檔案同步</h4>
        <div className="grid grid-cols-1 gap-3">
          {(['schedule', 'mcflow', 'gifts', 'slides'] as const).map((type) => {
            const file = (settings.flowFiles || []).find(f => f.type === type);
            const labels = { schedule: '活動流程表', mcflow: '司儀腳本', gifts: '得獎禮品', slides: '大會簡報' };
            return (
              <div key={type} className="bg-white rounded-[2rem] p-4 flex items-center gap-4 shadow-sm border border-white transition-transform active:scale-[0.99]">
                 <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center">
                    {type === 'schedule' ? <FileText size={20}/> : type === 'mcflow' ? <FileBox size={20}/> : type === 'gifts' ? <FileSpreadsheet size={20}/> : <Presentation size={20}/>}
                 </div>
                 <div className="flex-1 min-w-0">
                    <h3 className="font-black text-black text-sm">{labels[type]}</h3>
                    <div className="text-[10px] text-gray-400 truncate">{file ? file.name : '尚未上傳'}</div>
                 </div>
                 <div className="flex items-center gap-2">
                    {isAdmin && (
                      <>
                        {file && <button onClick={() => removeFlowFile(file.id)} className="p-2 text-red-400 transition-colors hover:text-red-600"><Trash2 size={18}/></button>}
                        <button onClick={() => triggerUpload(type)} className="p-2 text-blue-500 transition-colors hover:text-blue-700">{isUploading && uploadType === type ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}</button>
                      </>
                    )}
                    {file && <button onClick={() => handlePreview(file)} className="p-2 text-gray-400 transition-colors hover:text-gray-600"><Download size={18}/></button>}
                 </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 系統報表匯出區塊 */}
      <div className="space-y-4 pt-6">
        <h4 className="px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">系統報表匯出 (Excel 下載)</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
                { label: '嘉賓名冊', icon: ClipboardList, color: 'text-blue-500', fn: () => exportDetailedGuestsExcel(guests, settings.eventName, getTargetGroup) },
                { label: '禮品狀態', icon: Award, color: 'text-orange-500', fn: () => exportGiftsExcel(settings.giftItems || [], settings.eventName) },
                { label: '活動流程', icon: ListTodo, color: 'text-indigo-500', fn: () => exportMcFlowExcel(settings.mcFlowSteps || [], settings.eventName) },
                { label: '介紹現況', icon: Mic2, color: 'text-purple-500', fn: () => exportIntroductionsExcel(guests, settings.eventName) },
                { label: '抽獎結果', icon: Trophy, color: 'text-amber-500', fn: () => exportLotteryExcel(guests, settings.eventName) }
            ].map(report => (
                <button key={report.label} onClick={report.fn} className="bg-white p-4 rounded-3xl shadow-sm border border-white flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 group">
                    <report.icon size={20} className={`${report.color} group-hover:scale-110 transition-transform`} />
                    <span className="text-[10px] font-black text-gray-500">{report.label}</span>
                </button>
            ))}
        </div>
      </div>

      {/* 流程摘要編輯視窗 */}
      {isEditingSchedule && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[400] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] p-8 w-full max-w-2xl shadow-2xl space-y-6 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-black">編輯活動流程摘要</h3>
              <button onClick={() => setIsEditingSchedule(false)} className="p-2 text-gray-400 hover:text-black transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <textarea 
              value={editScheduleText}
              onChange={(e) => setEditScheduleText(e.target.value)}
              placeholder="請輸入活動流程摘要細節..."
              className="flex-1 w-full bg-[#F2F2F7] border-none rounded-[2rem] p-6 text-xl font-light text-black focus:ring-4 focus:ring-blue-500/10 outline-none resize-none custom-scrollbar"
            />
            
            <div className="flex gap-4">
              <button onClick={() => setIsEditingSchedule(false)} className="flex-1 py-4 font-black text-gray-400">取消</button>
              <button onClick={handleSaveSchedule} className="flex-2 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 active:scale-95 transition-transform">儲存流程變更</button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="bg-white rounded-[2.5rem] p-8 border-2 border-red-50 flex gap-4 mt-8">
          <button onClick={() => setShowResetModal(true)} className="flex-1 bg-red-50 text-red-600 p-5 rounded-2xl font-black text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"><RotateCcw size={18}/>重置活動紀錄</button>
          <button onClick={clearAllData} className="flex-1 bg-gray-900 text-white p-5 rounded-2xl font-black text-sm active:scale-95 transition-transform">完全清空系統</button>
        </div>
      )}

      {/* 重置選單彈出視窗 */}
      {showResetModal && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[300] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] p-8 w-full max-w-sm shadow-2xl space-y-8">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <RotateCcw size={32} />
              </div>
              <h3 className="text-2xl font-black text-black">選擇重置範圍</h3>
              <p className="text-xs font-bold text-gray-400">僅重置紀錄狀態，<span className="text-red-500">保留檔案與名單資料</span></p>
            </div>

            <div className="space-y-3">
              {[
                { id: 'flow', label: '司儀流程紀錄', icon: ListChecks },
                { id: 'gifts', label: '禮品頒贈狀態', icon: Award },
                { id: 'checkin', label: '嘉賓報到狀態', icon: UserCheck },
                { id: 'lottery', label: '抽獎得獎紀錄', icon: Trophy },
              ].map(opt => (
                <button 
                  key={opt.id} 
                  onClick={() => setResetOptions(prev => ({ ...prev, [opt.id]: !(prev as any)[opt.id] }))}
                  className={`w-full p-5 rounded-2xl border-2 flex items-center justify-between transition-all ${ (resetOptions as any)[opt.id] ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-100'}`}
                >
                  <div className="flex items-center gap-4">
                    <opt.icon size={20} className={(resetOptions as any)[opt.id] ? 'text-blue-600' : 'text-gray-300'} />
                    <span className={`font-black text-sm ${ (resetOptions as any)[opt.id] ? 'text-blue-700' : 'text-gray-400'}`}>{opt.label}</span>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${ (resetOptions as any)[opt.id] ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-200'}`}>
                    { (resetOptions as any)[opt.id] && <Check size={14} strokeWidth={4} /> }
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-4">
              <button onClick={() => setShowResetModal(false)} className="flex-1 py-4 font-black text-gray-400 text-sm">取消</button>
              <button onClick={handleExecuteReset} className="flex-1 py-4 bg-red-500 text-white font-black rounded-2xl text-sm shadow-lg shadow-red-200 active:scale-95 transition-transform">執行重置</button>
            </div>
          </div>
        </div>
      )}

      {showLoginModal && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[250] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] p-10 max-w-xs w-full shadow-2xl flex flex-col items-center gap-8 border border-white/20">
            <h3 className="text-2xl font-black text-black">管理員授權</h3>
            <form onSubmit={handleLoginSubmit} className="w-full space-y-6">
              <input type="password" placeholder="••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-[#F2F2F7] border-none rounded-2xl py-6 px-4 text-center text-4xl font-black focus:ring-4 focus:ring-blue-500/20 outline-none" autoFocus />
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-4 font-black text-gray-400">取消</button>
                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-[1.2rem] shadow-xl active:scale-95">確認</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowPanel;
