import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useEvent } from '../context/EventContext';
import { 
  CheckCircle2, Circle, UserCheck, Lock, Unlock, Award, TrendingUp, 
  ListChecks, ChevronRight, Clock, AlertTriangle, Move, FileUp, Trash2, Loader2 
} from 'lucide-react';
import { parseGiftsFromExcel } from '../services/geminiService';

const GiftsPanel: React.FC = () => {
  const { 
    settings, updateSettings, toggleGiftPresented, clearGiftsOnly,
    isAdmin, unlockedSections, loginAdmin, logoutAdmin 
  } = useEvent();
  
  const isUnlocked = isAdmin || unlockedSections.gifts;
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [isSticky, setIsSticky] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFlowTitleExpanded, setIsFlowTitleExpanded] = useState(false);

  useEffect(() => {
    const handleScroll = (e: any) => {
      setIsSticky(e.target.scrollTop > 20);
    };
    const mainEl = document.querySelector('main');
    mainEl?.addEventListener('scroll', handleScroll);
    return () => mainEl?.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginAdmin(loginPassword)) {
        setShowLoginModal(false);
        setLoginPassword("");
    } else {
        alert("密碼錯誤");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(`偵測到新 Excel：${file.name}\n這將覆蓋現有的禮品清單，確定嗎？`)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setUploadProgress("正在解析禮品清單...");

    try {
      const items = await parseGiftsFromExcel(file);
      const metaFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: 'gifts_file' as const,
        mimeType: file.type,
        size: file.size,
        uploadTime: new Date().toISOString(),
      };

      setUploadProgress("正在同步至雲端...");
      const filteredFiles = (settings.flowFiles || []).filter(f => f.type !== 'gifts_file');

      await updateSettings({ 
        giftItems: items,
        flowFiles: [...filteredFiles, metaFile]
      });
      
      setUploadProgress("禮品清單更新成功！");
      setTimeout(() => setUploadProgress(null), 2000);
    } catch (error: any) {
      alert("禮品解析失敗: " + error.message);
      setUploadProgress(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearGifts = async () => {
    if (window.confirm("【全數清空警告】\n確定要刪除雲端上的所有禮品資料嗎？\n此操作不可復原。")) {
      setUploadProgress("正在清空資料...");
      try {
        await clearGiftsOnly();
        alert("資料已清空");
      } catch (e: any) {
        alert("清空失敗");
      } finally {
        setUploadProgress(null);
      }
    }
  };

  const triggerAction = (action: () => void) => {
    if (!isUnlocked) {
      setShowLoginModal(true);
      return;
    }
    action();
  };

  const giftItems = settings.giftItems || [];
  const mcSteps = settings.mcFlowSteps || [];

  const stats = useMemo(() => {
    const total = giftItems.length;
    const completed = giftItems.filter(i => i.isPresented).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [giftItems]);

  const upcomingGiftPreviews = useMemo(() => {
    return giftItems.filter(i => !i.isPresented).slice(0, 4);
  }, [giftItems]);

  useEffect(() => {
    const firstUnpresented = giftItems.find(i => !i.isPresented);
    if (firstUnpresented) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`gift-${firstUnpresented.id}`);
        const mainEl = document.querySelector('main');
        if (el && mainEl) {
          const targetViewPos = mainEl.clientHeight * 0.6;
          const scrollTarget = el.offsetTop - targetViewPos + (el.clientHeight / 2);
          mainEl.scrollTo({ top: scrollTarget, behavior: 'smooth' });
        }
      }, 150); 
      return () => clearTimeout(timer);
    }
  }, []); 

  const flowProgress = useMemo(() => {
    const uncompleted = mcSteps.filter(s => !s.isCompleted);
    const current = uncompleted[0] || { title: '活動流程已全部結束', time: '' };
    return { current };
  }, [mcSteps]);

  const isSpeechStep = useMemo(() => {
    return flowProgress.current.title.includes('致詞');
  }, [flowProgress.current.title]);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-4 md:space-y-6 pb-32 relative">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls" />
      
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-orange-500 rounded-full" />
          <div>
            <h2 className="text-xl md:text-3xl font-black text-black">禮品頒贈系統</h2>
            <p className="text-[9px] md:text-xs font-bold text-gray-400 mt-1 uppercase tracking-[0.2em]">GIFT PRESENTATION</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {isUnlocked && (
            <>
              <button onClick={() => fileInputRef.current?.click()} className="p-2.5 md:p-3.5 bg-white text-orange-600 rounded-xl md:rounded-2xl shadow-sm border border-white hover:bg-orange-50 transition-all active:scale-90 flex items-center gap-2">
                {isUploading ? <Loader2 size={18} className="animate-spin" /> : <FileUp size={18} />}
                <span className="hidden md:block text-xs font-black">上傳清單</span>
              </button>
              <button onClick={handleClearGifts} className="p-2.5 md:p-3.5 bg-white text-red-500 rounded-xl md:rounded-2xl shadow-sm border border-white hover:bg-red-50 transition-all active:scale-90">
                <Trash2 size={18} />
              </button>
            </>
          )}
          <button onClick={() => isUnlocked ? logoutAdmin() : setShowLoginModal(true)} className="p-2.5 md:p-3.5 bg-white rounded-xl md:rounded-2xl shadow-sm border border-white transition-all active:scale-90">
            {isUnlocked ? <Unlock size={18} className="text-[#007AFF]"/> : <Lock size={18} className="text-gray-300"/>}
          </button>
        </div>
      </div>

      <div className={`sticky top-0 z-40 -mx-4 md:-mx-8 px-4 md:px-8 py-2 transition-all duration-300 ${isSticky ? 'ios-blur bg-[#F2F2F7]/90 shadow-lg border-b border-white/40' : ''}`}>
        <div className={`bg-white transition-all duration-500 overflow-hidden relative shadow-sm border-2 ${isSticky ? 'p-2 md:p-5 rounded-xl mb-1.5' : 'p-4 md:p-8 rounded-[1.8rem] md:rounded-[2.5rem] mb-3'} ${isSpeechStep ? 'border-red-500' : 'border-white'}`}>
          <div className="flex items-center justify-between mb-2">
             <div className={`flex items-center gap-1.5 ${isSpeechStep ? 'text-red-600' : 'text-[#007AFF]'}`}>
               <ListChecks size={isSticky ? 12 : 16} strokeWidth={3} />
               <span className={`font-black uppercase tracking-widest ${isSticky ? 'text-[7px]' : 'text-[9px] md:text-xs'}`}>
                 {isSpeechStep ? '致詞中' : '司儀流程'}
               </span>
             </div>
          </div>
          <h3 className={`font-black leading-tight transition-all flex-1 ${isSticky ? 'text-xs md:text-lg' : 'text-base md:text-3xl'}`}>
            {flowProgress.current.title}
          </h3>
        </div>

        <div className={`bg-white transition-all duration-500 overflow-hidden shadow-sm border border-white ${isSticky ? 'p-2 md:p-5 rounded-xl' : 'p-4 md:p-8 rounded-[1.8rem] md:rounded-[2.5rem]'}`}>
          <div className="flex justify-between items-end mb-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-orange-500">
                <Award size={isSticky ? 10 : 16} strokeWidth={3} />
                <span className={`font-black uppercase tracking-widest ${isSticky ? 'text-[7px]' : 'text-[9px] md:text-xs'}`}>頒發進度</span>
              </div>
              <div className="flex items-baseline gap-1 md:gap-3">
                <span className={`font-black text-slate-900 transition-all ${isSticky ? 'text-lg md:text-3xl' : 'text-3xl md:text-6xl'}`}>{stats.completed}</span>
                <span className={`font-bold text-slate-300 transition-all ${isSticky ? 'text-[10px] md:text-2xl' : 'text-xs md:text-2xl'}`}>/ {stats.total}</span>
              </div>
            </div>
            <div className="text-right">
              <div className={`font-black text-orange-500 transition-all ${isSticky ? 'text-sm md:text-2xl' : 'text-xl md:text-4xl'}`}>{stats.percent}%</div>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${stats.percent}%` }} />
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-24 px-1">
        {giftItems.map((item) => (
          <div key={item.id} id={`gift-${item.id}`} onClick={() => triggerAction(() => toggleGiftPresented(item.id))} className={`p-4 md:p-8 rounded-[1.5rem] border transition-all cursor-pointer flex flex-col gap-3 ${item.isPresented ? 'bg-gray-100/60 opacity-60 grayscale-[0.5]' : 'bg-white border-white shadow-sm hover:shadow-md'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <div className={item.isPresented ? 'text-green-600' : 'text-orange-400'}>
                   {item.isPresented ? <CheckCircle2 size={24} strokeWidth={3} /> : <Circle size={24} strokeWidth={2.5} />}
                 </div>
                 <span className="text-xs md:text-lg font-black text-slate-400"># {item.sequence}</span>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-3 justify-between md:items-center">
               <h3 className={`text-base md:text-3xl font-black ${item.isPresented ? 'text-slate-400' : 'text-slate-900'}`}>{item.name}</h3>
               <div className={`px-4 py-2 rounded-xl flex items-center gap-2 self-start md:self-auto ${item.isPresented ? 'bg-slate-200/50' : 'bg-[#F2F2F7]'}`}>
                 <UserCheck size={16} className={item.isPresented ? 'text-slate-400' : 'text-blue-500'} />
                 <span className={`text-sm md:text-lg font-black ${item.isPresented ? 'text-slate-400' : 'text-blue-600'}`}>{item.recipient}</span>
               </div>
            </div>
          </div>
        ))}
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[250] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-xs shadow-2xl flex flex-col items-center gap-6">
            <h3 className="text-xl font-black text-black text-center">功能授權</h3>
            <form onSubmit={handleLoginSubmit} className="w-full space-y-4">
              <input type="password" placeholder="••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-[#F2F2F7] border-none rounded-xl py-5 px-4 text-center text-3xl font-black outline-none" autoFocus />
              <div className="flex gap-2"><button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-4 font-black text-gray-400">取消</button><button type="submit" className="flex-1 py-4 bg-orange-500 text-white font-black rounded-xl">確認</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GiftsPanel;