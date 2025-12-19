
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
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-5 md:space-y-6 pb-60 bg-[#F2F2F7] min-h-screen">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

      {/* 活動配置 */}
      <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-white space-y-6 md:space-y-8">
        <div className="flex justify-between items-center">
           <div className="flex items-center gap-1.5"><Activity className="text-blue-500" size={14} md:size={18} strokeWidth={3} /><span className="text-gray-400 font-black tracking-widest text-[9px] md:text-[10px]">EVENT CONTROL</span></div>
           <div className="flex items-center gap-2">
             {isAdmin && (
               <button onClick={openEditSchedule} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors">
                 <Edit3 size={18} />
               </button>
             )}
             <button onClick={() => isAdmin ? logoutAdmin() : setShowLoginModal(true)} className="p-2.5 bg-[#F2F2F7] rounded-xl">
               {isAdmin ? <Unlock size={18} className="text-[#007AFF]"/> : <Lock size={18} className="text-gray-300"/>}
             </button>
           </div>
        </div>
        
        <input 
          type="text" 
          value={settings.eventName} 
          onChange={(e) => isAdmin && updateSettings({ eventName: e.target.value })}
          className="w-full bg-transparent border-none text-xl md:text-4xl font-black text-black focus:ring-0 p-0"
          placeholder="活動名稱"
          readOnly={!isAdmin}
        />

        {/* 流程摘要顯示區塊 */}
        <div 
          onClick={() => setIsScheduleExpanded(!isScheduleExpanded)}
          className={`bg-[#F2F2F7] rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-7 relative cursor-pointer group transition-all duration-300 ${isScheduleExpanded ? 'shadow-inner' : 'hover:bg-[#E8E8EE]'}`}
        >
           <div className={`text-base md:text-xl font-light text-black whitespace-pre-wrap transition-all duration-300 ${isScheduleExpanded ? '' : 'line-clamp-3 md:line-clamp-4'}`}>
              {settings.briefSchedule || (
                <span className="text-gray-300 italic">點擊編輯或上傳活動流程摘要...</span>
              )}
           </div>
           
           <div className="mt-3 md:mt-4 flex items-center justify-center text-gray-300 group-hover:text-blue-500 transition-colors">
              {isScheduleExpanded ? (
                <div className="flex items-center gap-1 text-[8px] md:text-[10px] font-black uppercase tracking-widest">
                  <ChevronUp size={14} /> 收合
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[8px] md:text-[10px] font-black uppercase tracking-widest">
                  <ChevronDown size={14} /> 展開全文
                </div>
              )}
           </div>
        </div>
      </div>

      {/* 智慧報到儀表板 - 手機版字體縮小 */}
      <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 shadow-sm border border-white flex flex-col md:flex-row gap-6 md:gap-8 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500/10" />
        
        <div className="flex-1 flex flex-col justify-between space-y-4 md:space-y-6">
          <div className="flex items-center gap-1.5">
            <Clock size={16} className="text-blue-500" />
            <span className="text-[9px] md:text-[11px] font-black text-slate-400 tracking-wider uppercase">報到數據分析</span>
          </div>
          
          <div className="flex items-baseline gap-2 md:gap-4">
            <span className="text-5xl md:text-8xl font-black text-slate-900 tracking-tighter leading-none">{dashboardData.totalCheckedIn}</span>
            <span className="text-lg md:text-2xl font-bold text-slate-300">/ {dashboardData.totalCount}</span>
          </div>

          <div className="mt-auto space-y-1.5 md:space-y-2">
            <div className="flex justify-between items-end">
               <span className="text-[8px] md:text-[9px] font-black text-blue-500 tracking-widest uppercase">Progress</span>
               <p className="text-[10px] md:text-[11px] font-black text-blue-600">{dashboardData.totalPercent}%</p>
            </div>
            <div className="w-full h-2 md:h-2.5 bg-gray-50 rounded-full overflow-hidden border border-gray-50 shadow-inner">
              <div className="h-full bg-blue-500 transition-all duration-1000 shadow-[0_0_8px_rgba(59,130,246,0.4)]" style={{ width: `${dashboardData.totalPercent}%` }} />
            </div>
          </div>
        </div>

        <div className="w-full md:w-auto md:min-w-[240px] border-t md:border-t-0 md:border-l border-gray-50 pt-4 md:pt-0 md:pl-8 flex flex-col justify-center gap-3">
           <h4 className="text-[8px] md:text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1 md:mb-2">Categories</h4>
           <div className="grid grid-cols-3 xs:grid-cols-3 md:grid-cols-2 gap-y-3 gap-x-4">
              {dashboardData.stats.map(detail => (
                <div key={detail.key} className="flex flex-col gap-0">
                  <div className="flex items-center gap-1">
                    <div className={`w-1 h-1 rounded-full ${detail.color}`} />
                    <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase truncate">{detail.label.split(' ')[0]}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base md:text-lg font-black text-slate-700">{detail.checkedIn}</span>
                    <span className="text-[8px] font-bold text-slate-200">/ {detail.total}</span>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* 流程監控數據 - 手機版改為 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 流程監控 */}
        <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 shadow-sm border border-white flex flex-col gap-3 min-h-[160px] md:min-h-[180px]">
             <div className="w-9 h-9 md:w-10 md:h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center shrink-0"><ListTodo size={18} md:size={20} /></div>
             <div>
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase">當前流程</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] md:text-[10px] font-black text-gray-300 tabular-nums">{liveStats.mc.current}/{liveStats.mc.total}</span>
                    <span className="text-[9px] md:text-[10px] font-black text-blue-500 tabular-nums">{liveStats.mc.percent}%</span>
                  </div>
                </div>
                <p className="text-sm md:text-base font-black text-black leading-tight line-clamp-1">{liveStats.mc.active}</p>
             </div>
             {liveStats.mc.previews.length > 0 && (
               <div className="space-y-0.5 mt-0.5 opacity-50">
                 {liveStats.mc.previews.slice(0, 1).map((p, idx) => (
                   <p key={idx} className="text-[9px] md:text-[10px] font-bold text-gray-600 truncate">預告: {p}</p>
                 ))}
               </div>
             )}
             <div className="w-full h-1 bg-gray-50 rounded-full mt-auto"><div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${liveStats.mc.percent}%` }} /></div>
        </div>

        {/* 禮品監控 */}
        <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 shadow-sm border border-white flex flex-col gap-3 min-h-[160px] md:min-h-[180px]">
             <div className="w-9 h-9 md:w-10 md:h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center shrink-0"><Award size={18} md:size={20} /></div>
             <div>
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase">禮品進度</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] md:text-[10px] font-black text-gray-300 tabular-nums">{liveStats.gifts.current}/{liveStats.gifts.total}</span>
                    <span className="text-[9px] md:text-[10px] font-black text-orange-500 tabular-nums">{liveStats.gifts.percent}%</span>
                  </div>
                </div>
                <p className="text-sm md:text-base font-black text-black leading-tight line-clamp-1">{liveStats.gifts.active}</p>
             </div>
             <div className="w-full h-1 bg-gray-50 rounded-full mt-auto"><div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${liveStats.gifts.percent}%` }} /></div>
        </div>

        {/* 待介紹監控 */}
        <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 shadow-sm border border-white flex flex-col gap-3 min-h-[160px] md:min-h-[180px]">
             <div className="w-9 h-9 md:w-10 md:h-10 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center shrink-0"><Mic2 size={18} md:size={20} /></div>
             <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                    <h4 className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase">貴賓介紹</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] md:text-[10px] font-black text-gray-300 tabular-nums">{liveStats.vips.current}/{liveStats.vips.total}</span>
                      <span className="text-[9px] md:text-[10px] font-black text-purple-500 tabular-nums">{liveStats.vips.percent}%</span>
                    </div>
                </div>
                <p className="text-sm md:text-base font-black text-black leading-tight line-clamp-1">{liveStats.vips.active}</p>
             </div>
             <div className="w-full h-1 bg-gray-50 rounded-full mt-auto"><div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${liveStats.vips.percent}%` }} /></div>
        </div>
      </div>

      {/* 系統報表匯出區塊 - 手機版縮小 Padding */}
      <div className="space-y-3 pt-4">
        <h4 className="px-4 text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">系統報表下載</h4>
        <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-5 gap-2.5">
            {[
                { label: '嘉賓名冊', icon: ClipboardList, color: 'text-blue-500', fn: () => exportDetailedGuestsExcel(guests, settings.eventName, getTargetGroup) },
                { label: '禮品狀態', icon: Award, color: 'text-orange-500', fn: () => exportGiftsExcel(settings.giftItems || [], settings.eventName) },
                { label: '活動流程', icon: ListTodo, color: 'text-indigo-500', fn: () => exportMcFlowExcel(settings.mcFlowSteps || [], settings.eventName) },
                { label: '介紹現況', icon: Mic2, color: 'text-purple-500', fn: () => exportIntroductionsExcel(guests, settings.eventName) },
                { label: '抽獎結果', icon: Trophy, color: 'text-amber-500', fn: () => exportLotteryExcel(guests, settings.eventName) }
            ].map(report => (
                <button key={report.label} onClick={report.fn} className="bg-white p-3.5 md:p-4 rounded-2xl md:rounded-3xl shadow-sm border border-white flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 group">
                    <report.icon size={18} className={`${report.color} md:w-5 md:h-5`} />
                    <span className="text-[9px] md:text-[10px] font-black text-gray-500 truncate w-full px-1">{report.label}</span>
                </button>
            ))}
        </div>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-[2rem] p-6 border border-red-50 flex flex-col md:flex-row gap-3 mt-6">
          <button onClick={() => setShowResetModal(true)} className="flex-1 bg-red-50 text-red-600 p-4 rounded-xl font-black text-xs active:scale-95 transition-transform flex items-center justify-center gap-2"><RotateCcw size={16}/>重置紀錄</button>
          <button onClick={clearAllData} className="flex-1 bg-gray-900 text-white p-4 rounded-xl font-black text-xs active:scale-95 transition-transform">清空系統</button>
        </div>
      )}

      {showLoginModal && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[250] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-xs shadow-2xl flex flex-col items-center gap-6 border border-white/20">
            <h3 className="text-xl font-black text-black">管理員授權</h3>
            <form onSubmit={handleLoginSubmit} className="w-full space-y-5">
              <input type="password" placeholder="••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-[#F2F2F7] border-none rounded-2xl py-5 px-4 text-center text-4xl font-black outline-none" autoFocus />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-4 font-black text-gray-400 text-xs">取消</button>
                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-xl shadow-lg active:scale-95 text-xs">確認</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowPanel;
