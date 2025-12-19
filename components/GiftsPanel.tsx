
import React, { useState, useMemo, useEffect } from 'react';
import { useEvent } from '../context/EventContext';
import { CheckCircle2, Circle, UserCheck, Lock, Unlock, Award, TrendingUp, ListChecks, ChevronRight, Clock, AlertTriangle, Move } from 'lucide-react';

const GiftsPanel: React.FC = () => {
  const { settings, toggleGiftPresented, isAdmin, unlockedSections, loginAdmin, logoutAdmin } = useEvent();
  const isUnlocked = isAdmin || unlockedSections.gifts;
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [isSticky, setIsSticky] = useState(false);
  
  // 當前流程標題是否展開的狀態
  const [isFlowTitleExpanded, setIsFlowTitleExpanded] = useState(false);

  // 監聽主區塊捲動狀態
  useEffect(() => {
    const handleScroll = (e: any) => {
      // 觸發門檻降低，吸附感更即時
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

  // 自動定位到當前進度：精確捲動至視窗 3/5 處 (即從頂部計算 60% 位置，呈現於畫面偏下處)
  useEffect(() => {
    const firstUnpresented = giftItems.find(i => !i.isPresented);
    if (firstUnpresented) {
      // 縮短延遲，讓「直接呈現」的感覺更強烈
      const timer = setTimeout(() => {
        const el = document.getElementById(`gift-${firstUnpresented.id}`);
        const mainEl = document.querySelector('main');
        if (el && mainEl) {
          // 計算目標捲動位置
          // 邏輯：元素中心點位於 main 容器高度的 60% 處 (3/5 位置)
          const targetViewPos = mainEl.clientHeight * 0.6;
          const scrollTarget = el.offsetTop - targetViewPos + (el.clientHeight / 2);
          
          mainEl.scrollTo({
            top: scrollTarget,
            behavior: 'smooth'
          });
        }
      }, 150); 
      return () => clearTimeout(timer);
    }
  }, []); // 僅在元件掛載時執行一次

  // 計算司儀流程進度：當前 + 4 個預告
  const flowProgress = useMemo(() => {
    const uncompleted = mcSteps.filter(s => !s.isCompleted);
    const current = uncompleted[0] || { title: '活動流程已全部結束', time: '' };
    const previews = uncompleted.slice(1, 5); // 接下來四個項目，優化 2x2 排版
    return { current, previews };
  }, [mcSteps]);

  // 當流程改變時，自動重置標題為縮略狀態
  useEffect(() => {
    setIsFlowTitleExpanded(false);
  }, [flowProgress.current.title]);

  // 偵測是否為致詞環節
  const isSpeechStep = useMemo(() => {
    return flowProgress.current.title.includes('致詞');
  }, [flowProgress.current.title]);

  return (
    <div className="p-3 md:p-8 max-w-5xl mx-auto space-y-3 md:space-y-6 pb-32 relative">
      {/* 標題區 */}
      <div className="flex justify-between items-start px-2 mb-2 md:mb-0">
        <div>
          <h2 className="text-xl md:text-3xl font-black text-black">禮品頒贈系統</h2>
          <p className="text-[9px] md:text-xs font-bold text-gray-400 mt-1 uppercase tracking-[0.2em]">GIFT PRESENTATION</p>
        </div>
        <button onClick={() => isUnlocked ? logoutAdmin() : setShowLoginModal(true)} className="p-2 md:p-3 bg-white rounded-xl md:rounded-2xl shadow-sm border border-white transition-all active:scale-90">
          {isUnlocked ? <Unlock size={18} className="text-[#007AFF]"/> : <Lock size={18} className="text-gray-300"/>}
        </button>
      </div>

      {/* 智慧置頂容器 - 手機版更加壓縮以釋放空間 */}
      <div className={`sticky top-0 z-40 -mx-3 md:-mx-8 px-3 md:px-8 py-2 transition-all duration-300 ${isSticky ? 'ios-blur bg-[#F2F2F7]/90 shadow-lg border-b border-white/40' : ''}`}>
        
        {/* 司儀流程監控區 */}
        <div className={`bg-white transition-all duration-500 overflow-hidden relative shadow-sm border-2 ${isSticky ? 'p-2 md:p-5 rounded-xl mb-1.5' : 'p-4 md:p-8 rounded-[1.8rem] md:rounded-[2.5rem] mb-3'} ${isSpeechStep ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 'border-white'}`}>
          
          {/* 致詞警告標籤 (移動司儀台提示) */}
          {isSpeechStep && (
            <div className={`absolute top-0 right-0 bg-red-600 text-white font-black px-3 md:px-6 py-1 md:py-2 rounded-bl-2xl flex items-center gap-1.5 shadow-lg z-10 animate-pulse ${isSticky ? 'text-[7px] md:text-[10px]' : 'text-[9px] md:text-sm'}`}>
              <Move size={12} className="animate-bounce" />
              <span>提醒：移動司儀台</span>
            </div>
          )}

          <div className={`flex items-center justify-between transition-all ${isSticky ? 'mb-1.5' : 'mb-3 md:mb-4'}`}>
             <div className={`flex items-center gap-1.5 ${isSpeechStep ? 'text-red-600' : 'text-[#007AFF]'}`}>
               <ListChecks size={isSticky ? 12 : 16} strokeWidth={3} />
               <span className={`font-black uppercase tracking-widest ${isSticky ? 'text-[7px]' : 'text-[9px] md:text-xs'}`}>
                 {isSpeechStep ? '致詞中' : '司儀流程'}
               </span>
             </div>
             {flowProgress.current.time && (
               <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-black ${isSticky ? 'text-[7px]' : 'text-[9px] md:text-xs'} ${isSpeechStep ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-[#007AFF]'}`}>
                 <Clock size={isSticky ? 9 : 11} /> {flowProgress.current.time}
               </div>
             )}
          </div>
          
          <div className={`flex items-start gap-2 md:gap-4 transition-all ${isSticky ? 'mb-1' : 'mb-4 md:mb-6'}`}>
            <div className={`rounded-full animate-pulse mt-1 transition-all ${isSticky ? 'w-0.5 h-3 md:h-4' : 'w-1 h-6 md:h-8'} ${isSpeechStep ? 'bg-red-600' : 'bg-[#007AFF]'}`} />
            {/* 標題區：點擊展開/隱藏功能 */}
            <h3 
              onClick={() => setIsFlowTitleExpanded(!isFlowTitleExpanded)}
              className={`font-black leading-tight transition-all flex-1 cursor-pointer select-none ${isSticky ? 'text-xs md:text-lg' : 'text-base md:text-3xl'} ${isSpeechStep ? 'text-red-700' : 'text-slate-950'} ${!isFlowTitleExpanded ? 'line-clamp-1' : ''}`}
            >
              {flowProgress.current.title}
            </h3>
          </div>

          {/* 預告流程 - 置頂時在寬版螢幕顯示 */}
          {flowProgress.previews.length > 0 && (
            <div className={`pt-2 md:pt-4 border-t border-gray-100 transition-all ${isSticky ? 'hidden md:block' : 'block'}`}>
               <div className="text-[7px] md:text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-2 md:mb-3">預告流程 (UPCOMING)</div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 md:gap-y-2">
                  {flowProgress.previews.map((preview, idx) => (
                    <div key={preview.id} className="flex items-center gap-1.5 md:gap-2 group border-b border-gray-50/50 pb-0.5 md:pb-1">
                      <span className="text-[8px] md:text-[11px] font-black text-gray-300 tabular-nums w-3 md:w-4 shrink-0">{idx + 1}</span>
                      <ChevronRight size={8} className="text-gray-200 shrink-0" />
                      <span className="text-[10px] md:text-sm font-bold text-gray-500 truncate group-hover:text-slate-900 transition-colors flex-1">
                        {preview.title}
                      </span>
                      {preview.time && <span className="text-[7px] md:text-[10px] font-black text-gray-300 ml-1 md:ml-2 tabular-nums shrink-0">{preview.time}</span>}
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>

        {/* 禮品頒發進度儀表板 */}
        <div className={`bg-white transition-all duration-500 overflow-hidden shadow-sm border border-white ${isSticky ? 'p-2 md:p-5 rounded-xl' : 'p-4 md:p-8 rounded-[1.8rem] md:rounded-[2.5rem]'}`}>
          <div className={`flex justify-between items-end transition-all ${isSticky ? 'mb-2' : 'mb-3 md:mb-4'}`}>
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
              <div className={`font-black text-slate-400 uppercase tracking-widest ${isSticky ? 'text-[7px]' : 'text-[9px] md:text-xs mb-0.5 md:mb-1'}`}>完成率</div>
              <div className={`font-black text-orange-500 transition-all ${isSticky ? 'text-sm md:text-2xl' : 'text-xl md:text-4xl'}`}>{stats.percent}%</div>
            </div>
          </div>
          
          <div className={`w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner transition-all ${isSticky ? 'h-1 md:h-1.5' : 'h-2 md:h-4'}`}>
            <div 
              className="h-full bg-orange-500 transition-all duration-1000 shadow-[0_0_8px_rgba(249,115,22,0.4)]" 
              style={{ width: `${stats.percent}%` }} 
            />
          </div>
        </div>
      </div>

      {/* 禮品清單 - 增加頂部間距並優化卡片顯示 */}
      <div className="space-y-3 md:space-y-6 pt-28 md:pt-32 px-1">
        {giftItems.map((item) => (
          <div 
            key={item.id} 
            id={`gift-${item.id}`}
            onClick={() => triggerAction(() => toggleGiftPresented(item.id))} 
            className={`p-4 md:p-8 rounded-[1.5rem] md:rounded-[3rem] border transition-all cursor-pointer flex flex-col gap-3 md:gap-6 ${item.isPresented ? 'bg-gray-100/60 opacity-60 grayscale-[0.5]' : 'bg-white border-white shadow-sm hover:shadow-md active:scale-[0.98]'}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                 <div className={`transition-colors ${item.isPresented ? 'text-green-600' : 'text-orange-400'}`}>
                   {item.isPresented ? <CheckCircle2 size={20} md:size={24} strokeWidth={3} /> : <Circle size={20} md:size={24} strokeWidth={2.5} />}
                 </div>
                 <div className="flex flex-col">
                   <span className="text-[7px] md:text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-0.5 md:mb-1">SEQUENCE</span>
                   <span className="text-xs md:text-lg font-black text-slate-400"># {item.sequence}</span>
                 </div>
              </div>
              {item.quantity && (
                <div className="bg-blue-50 text-[#007AFF] px-2 py-1 md:px-4 md:py-2 rounded-lg md:rounded-xl border border-blue-100 flex items-center gap-1 md:gap-2">
                  <span className="text-[7px] md:text-[10px] font-black uppercase tracking-widest opacity-60">QTY</span>
                  <span className="text-[10px] md:text-base font-black">{item.quantity}</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-col md:flex-row gap-3 md:gap-8 justify-between md:items-center">
               <h3 className={`text-base md:text-3xl font-black tracking-tight ${item.isPresented ? 'text-slate-400' : 'text-slate-900'}`}>{item.name}</h3>
               <div className={`px-3 py-1.5 md:px-6 md:py-3 rounded-xl md:rounded-[1.4rem] flex items-center gap-2 md:gap-3 self-start md:self-auto transition-colors ${item.isPresented ? 'bg-slate-200/50' : 'bg-[#F2F2F7]'}`}>
                 <UserCheck size={14} md:size={16} className={item.isPresented ? 'text-slate-400' : 'text-blue-500'} />
                 <span className={`text-[11px] md:text-lg font-black ${item.isPresented ? 'text-slate-400' : 'text-blue-600'}`}>{item.recipient}</span>
               </div>
            </div>
          </div>
        ))}
        {giftItems.length === 0 && (
          <div className="py-24 md:py-32 text-center">
            <Award size={36} md:size={48} className="mx-auto text-slate-100 mb-3 md:mb-4" />
            <p className="text-slate-300 font-black italic text-sm md:text-lg">尚無禮品頒贈資料</p>
          </div>
        )}
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[250] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-10 w-full max-w-xs shadow-2xl flex flex-col items-center gap-6 md:gap-8 border border-white/20">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-50 text-orange-500 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-inner">
              <Lock size={24} md:size={32} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-xl md:text-2xl font-black text-black">功能授權</h3>
              <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Gift Admin Access</p>
            </div>
            <form onSubmit={handleLoginSubmit} className="w-full space-y-5 md:space-y-6 text-center">
              <p className="text-[9px] md:text-[10px] font-bold text-[#007AFF]">密碼提示：1111</p>
              <input type="password" placeholder="••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-[#F2F2F7] border-none rounded-xl md:rounded-2xl py-4 md:py-5 px-4 text-center text-3xl md:text-4xl font-black outline-none tracking-widest" autoFocus />
              <div className="flex gap-2 md:gap-3 pt-2">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-3 md:py-4 font-black text-gray-400 text-xs md:text-sm">取消</button>
                <button type="submit" className="flex-1 py-3 md:py-4 bg-orange-500 text-white font-black rounded-xl md:rounded-2xl shadow-xl active:scale-95 text-xs md:text-sm transition-transform">確認</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GiftsPanel;
