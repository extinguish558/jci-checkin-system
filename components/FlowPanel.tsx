
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useEvent } from '../context/EventContext';
import { FlowFile, GuestCategory } from '../types';
import { 
  FileSpreadsheet, FileText, Presentation, Trash2, Settings, Lock, Unlock, 
  Plus, ListTodo, ShieldCheck, Download, Loader2, Info, Eye, Upload, X, 
  Activity, CheckCircle2, Mic2, Award, ChevronDown, ChevronUp, Maximize2, Minimize2, 
  PlayCircle, Users, PieChart, Users2, TrendingUp
} from 'lucide-react';

const FlowPanel: React.FC = () => {
  const { settings, updateSettings, addFlowFile, removeFlowFile, isAdmin, loginAdmin, logoutAdmin, guests } = useEvent();
  const [showLoginModal, setShowLoginModal] = useState(false); 
  const [loginPassword, setLoginPassword] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadType, setUploadType] = useState<'schedule' | 'gifts' | 'slides' | null>(null);
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  // 報到數據統計邏輯
  const checkInStats = useMemo(() => {
    const total = guests.length;
    const present = guests.filter(g => g.isCheckedIn).length;
    const percent = total > 0 ? Math.round((present / total) * 100) : 0;

    const categories = [
      { label: 'YB', color: 'bg-blue-500', key: 'YB' },
      { label: 'OB', color: 'bg-orange-500', key: 'OB' },
      { label: '貴賓', color: 'bg-purple-500', key: 'VIP' },
      { label: '友會', color: 'bg-green-500', key: 'VISITING' },
      { label: '總會', color: 'bg-indigo-500', key: 'HQ' }
    ];

    const breakdown = categories.map(cat => {
      const list = guests.filter(g => {
        const catStr = (g.category || '').toString();
        const title = (g.title || '').toString();
        if (cat.key === 'YB') return catStr.includes('YB') || catStr.includes('會友');
        if (cat.key === 'OB') return catStr.includes('OB') || catStr.includes('特友');
        if (cat.key === 'HQ') return catStr.includes('總會') || title.includes('總會');
        if (cat.key === 'VISITING') return catStr.includes('友會') || title.includes('會');
        return true; // VIP & Others
      });
      
      // 過濾 VIP 類別 (避免重複計算)
      let finalCount = list.length;
      let finalPresent = list.filter(g => g.isCheckedIn).length;
      
      return { ...cat, total: finalCount, present: finalPresent };
    });

    return { total, present, percent, breakdown };
  }, [guests]);

  // 深度進度監控邏輯
  const liveStats = useMemo(() => {
    const mcSteps = settings.mcFlowSteps || [];
    const mcCompleted = mcSteps.filter(s => s.isCompleted).length;
    const currentStep = mcSteps.find(s => !s.isCompleted);
    const mcPercent = mcSteps.length > 0 ? Math.round((mcCompleted / mcSteps.length) * 100) : 0;

    const giftItems = settings.giftItems || [];
    const giftsPresented = giftItems.filter(i => i.isPresented).length;
    const nextGift = giftItems.find(i => !i.isPresented);
    const giftsPercent = giftItems.length > 0 ? Math.round((giftsPresented / giftItems.length) * 100) : 0;

    const checkedInVips = guests.filter(g => g.isCheckedIn && g.title && !g.title.includes('見習'));
    const introducedVips = checkedInVips.filter(g => g.isIntroduced).length;
    const remainingVips = checkedInVips.length - introducedVips;
    const vipsPercent = checkedInVips.length > 0 ? Math.round((introducedVips / checkedInVips.length) * 100) : 0;

    return {
      mc: { 
        current: mcCompleted, 
        total: mcSteps.length, 
        percent: mcPercent, 
        activeTitle: currentStep ? currentStep.title : (mcSteps.length > 0 ? '流程已全部完成' : '尚未匯入流程')
      },
      gifts: { 
        current: giftsPresented, 
        total: giftItems.length, 
        percent: giftsPercent,
        activeTitle: nextGift ? nextGift.name : (giftItems.length > 0 ? '所有禮品已頒發' : '尚未匯入禮品')
      },
      vips: { 
        current: introducedVips, 
        total: checkedInVips.length, 
        remaining: remainingVips,
        percent: vipsPercent 
      }
    };
  }, [settings.mcFlowSteps, settings.giftItems, guests]);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.max(80, textarea.scrollHeight);
      textarea.style.height = `${newHeight}px`; 
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [settings.briefSchedule, isScheduleExpanded]);

  const triggerUpload = (type: 'schedule' | 'gifts' | 'slides') => {
    if (!isAdmin) {
      alert("請先登入管理模式再進行上傳。");
      return;
    }
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
    } catch (err) {
      alert("處理失敗");
    } finally {
      setIsUploading(false);
      setUploadType(null);
    }
  };

  const handlePreview = (file: FlowFile) => {
    if (!file.data) return;
    const byteCharacters = atob(file.data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
    const blob = new Blob([new Uint8Array(byteNumbers)], { type: file.mimeType });
    window.open(window.URL.createObjectURL(blob), '_blank');
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 pb-60 animate-in fade-in duration-500 bg-[#F2F2F7] min-h-screen">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

      {/* 活動配置主卡片 */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_15px_50px_rgba(0,0,0,0.03)] border border-white space-y-8">
        <div className="flex justify-between items-center">
           <div className="flex items-center gap-2">
             <Activity className="text-blue-500" size={18} strokeWidth={3} />
             <span className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Event Control Center</span>
           </div>
           <button onClick={() => isAdmin ? logoutAdmin() : setShowLoginModal(true)} className="p-3 bg-[#F2F2F7] rounded-2xl transition-all hover:bg-gray-100">
             {isAdmin ? <Unlock size={20} className="text-[#007AFF]"/> : <Lock size={20} className="text-gray-300"/>}
           </button>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-1">典禮主題名稱</label>
          <input 
            type="text" 
            value={settings.eventName} 
            onChange={(e) => updateSettings({ eventName: e.target.value })}
            className="w-full bg-transparent border-none text-2xl md:text-4xl font-black text-black focus:ring-0 p-0 placeholder:text-gray-100"
            disabled={!isAdmin}
          />
        </div>

        {/* 精簡流程摘要 */}
        <div className={`rounded-[2rem] transition-all duration-500 overflow-hidden relative group border ${isScheduleExpanded ? 'bg-white border-blue-100' : 'bg-[#F2F2F7] border-transparent'}`}>
            <div className="px-6 py-4 flex justify-between items-center border-b border-transparent group-hover:border-gray-100/50 transition-colors">
                <div className="flex items-center gap-2">
                    <ListTodo size={16} className="text-blue-500" />
                    <h3 className="font-black text-[11px] text-gray-400 uppercase tracking-widest">精簡流程摘要</h3>
                </div>
                <button 
                  onClick={() => setIsScheduleExpanded(!isScheduleExpanded)}
                  className="p-2 hover:bg-white rounded-xl text-gray-400 transition-all shadow-sm"
                >
                  {isScheduleExpanded ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
                </button>
            </div>
            
            <div className={`p-6 transition-all duration-500 ${isScheduleExpanded ? 'max-h-[1000px]' : 'max-h-[140px]'}`}>
              <textarea 
                  ref={textareaRef}
                  value={settings.briefSchedule || ''}
                  onChange={(e) => {
                    updateSettings({ briefSchedule: e.target.value });
                    adjustHeight();
                  }}
                  placeholder="點擊此處輸入活動流程重點摘要..."
                  className={`w-full bg-transparent border-none text-xl md:text-2xl font-light text-black leading-snug placeholder:text-gray-200 focus:ring-0 p-0 resize-none overflow-hidden ${!isAdmin ? 'cursor-default' : 'cursor-text'}`}
                  disabled={!isAdmin}
              />
              {!isScheduleExpanded && settings.briefSchedule && settings.briefSchedule.length > 50 && (
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#F2F2F7] to-transparent pointer-events-none" />
              )}
            </div>
        </div>
      </div>

      {/* 全新：報到總覽看板 */}
      <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-[0_15px_50px_rgba(0,0,0,0.03)] border border-white space-y-6">
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-2">
               <TrendingUp className="text-[#007AFF]" size={18} strokeWidth={3} />
               <span className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Real-time Check-in Analytics</span>
             </div>
             <div className="bg-blue-50 text-[#007AFF] px-3 py-1 rounded-full text-[11px] font-black tabular-nums">
                報到率 {checkInStats.percent}%
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
             {/* 總進度圈 */}
             <div className="flex flex-col items-center justify-center p-6 bg-[#F2F2F7] rounded-[2rem] relative overflow-hidden group">
                <div className="text-6xl md:text-7xl font-black text-black tabular-nums leading-none">
                  {checkInStats.present}
                </div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">已報到總人數 / {checkInStats.total}</div>
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200">
                   <div className="h-full bg-[#007AFF] transition-all duration-1000" style={{ width: `${checkInStats.percent}%` }} />
                </div>
             </div>

             {/* 分類清單 */}
             <div className="space-y-3">
                {checkInStats.breakdown.map(cat => (
                  <div key={cat.label} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${cat.color} group-hover:scale-150 transition-transform`} />
                      <span className="text-sm font-black text-gray-500">{cat.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-black tabular-nums">{cat.present}</span>
                      <span className="text-[10px] font-bold text-gray-300">/ {cat.total}</span>
                    </div>
                  </div>
                ))}
             </div>
          </div>
      </div>

      {/* 核心監控區 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 司儀流程監控 */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-white flex flex-col gap-4 relative overflow-hidden group">
            <div className="flex justify-between items-center">
              <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                <ListTodo size={20} strokeWidth={2.5} />
              </div>
              <div className="text-right">
                 <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest">目前進行</div>
                 <div className="text-xs font-black text-blue-500 tabular-nums">{liveStats.mc.percent}%</div>
              </div>
            </div>
            <div className="flex-1 space-y-1">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">司儀流程</h4>
                <p className="text-lg font-black text-black leading-tight line-clamp-2">{liveStats.mc.activeTitle}</p>
            </div>
            <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${liveStats.mc.percent}%` }} />
            </div>
        </div>

        {/* 禮品頒贈監控 */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-white flex flex-col gap-4 relative overflow-hidden group">
            <div className="flex justify-between items-center">
              <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center">
                <Award size={20} strokeWidth={2.5} />
              </div>
              <div className="text-right">
                 <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest">頒發進度</div>
                 <div className="text-xs font-black text-orange-500 tabular-nums">{liveStats.gifts.percent}%</div>
              </div>
            </div>
            <div className="flex-1 space-y-1">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">禮品頒贈</h4>
                <p className="text-lg font-black text-black leading-tight line-clamp-2">{liveStats.gifts.activeTitle}</p>
            </div>
            <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${liveStats.gifts.percent}%` }} />
            </div>
        </div>

        {/* 貴賓介紹監控 */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-white flex flex-col gap-4 relative overflow-hidden group">
            <div className="flex justify-between items-center">
              <div className="w-10 h-10 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center">
                <Mic2 size={20} strokeWidth={2.5} />
              </div>
              <div className="text-right">
                 <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest">介紹比例</div>
                 <div className="text-xs font-black text-purple-500 tabular-nums">{liveStats.vips.percent}%</div>
              </div>
            </div>
            <div className="flex-1 space-y-1">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">貴賓介紹</h4>
                <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-black text-black tabular-nums">{liveStats.vips.remaining}</p>
                    <p className="text-sm font-black text-gray-300">位貴賓待介紹</p>
                </div>
            </div>
            <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${liveStats.vips.percent}%` }} />
            </div>
        </div>
      </div>

      {/* 檔案資源區 */}
      <div className="space-y-4 pt-2">
        <h4 className="px-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
          檔案資源庫 <div className="h-px flex-1 bg-gray-200 ml-2"></div>
        </h4>
        
        <div className="grid grid-cols-1 gap-3">
          {(['schedule', 'gifts', 'slides'] as const).map((type) => {
            const file = (settings.flowFiles || []).find(f => f.type === type);
            const labels = { schedule: '活動流程表', gifts: '得獎禮品清單', slides: '大會簡報投影片' };
            return (
              <div 
                key={type} 
                className="bg-white rounded-[2rem] p-4 md:p-5 shadow-sm border border-white flex items-center gap-4 transition-all hover:shadow-md cursor-pointer group"
                onClick={() => file && handlePreview(file)}
              >
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${type === 'schedule' ? 'bg-blue-50 text-blue-500' : type === 'gifts' ? 'bg-orange-50 text-orange-500' : 'bg-purple-50 text-purple-500'}`}>
                    {type === 'schedule' ? <FileText size={24} /> : type === 'gifts' ? <FileSpreadsheet size={24} /> : <Presentation size={24} />}
                 </div>
                 
                 <div className="flex-1 min-w-0">
                    <h3 className="font-black text-black text-base">{labels[type]}</h3>
                    <div className="text-[10px] text-gray-400 font-bold truncate mt-0.5">
                      {file ? file.name : isAdmin ? '等待上傳中...' : '管理員尚未提供'}
                    </div>
                 </div>

                 {isAdmin ? (
                   <button 
                    onClick={(e) => { e.stopPropagation(); triggerUpload(type); }}
                    className="p-3 bg-gray-50 rounded-xl text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-all"
                   >
                     {isUploading && uploadType === type ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                   </button>
                 ) : file && (
                   <div className="p-3 bg-blue-50 rounded-xl text-blue-500">
                      <Download size={20} />
                   </div>
                 )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[250] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] p-10 max-w-xs w-full shadow-2xl flex flex-col items-center gap-8 border border-white/20">
            <h3 className="text-2xl font-black text-black tracking-tight">管理員授權</h3>
            <form onSubmit={handleLoginSubmit} className="w-full space-y-6">
              <input 
                type="password" 
                placeholder="••••" 
                value={loginPassword} 
                onChange={e => setLoginPassword(e.target.value)}
                className="w-full bg-[#F2F2F7] border-none rounded-2xl py-6 px-4 text-center text-4xl font-black focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                autoFocus
              />
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-4 font-black text-gray-400">取消</button>
                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-[1.2rem] shadow-xl shadow-blue-200 active:scale-95 transition-all">確認</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowPanel;
