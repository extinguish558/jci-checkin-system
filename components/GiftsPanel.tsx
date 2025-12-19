
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
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-4 md:space-y-6 pb-32 relative">
      {/* 標題區 */}
      <div className="flex justify-between items-start px-2">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-black">禮品頒贈系統</h2>
          <p className="text-[10px] md:text-xs font-bold text-gray-400 mt-1 uppercase tracking-[0.2em]">GIFT PRESENTATION & FLOW MONITOR</p>
        </div>
        <button onClick={() => isUnlocked ? logoutAdmin() : setShowLoginModal(true)} className="p-3 bg-white rounded-2xl shadow-sm border border-white transition-all active:scale-90">
          {isUnlocked ? <Unlock size={20} className="text-[#007AFF]"/> : <Lock size={20} className="text-gray-300"/>}
        </button>
      </div>

      {/* 智慧置頂容器 - 整合司儀流程與進度條 */}
      <div className={`sticky top-0 z-40 -mx-4 md:-mx-8 px-4 md:px-8 py-2 transition-all duration-300 ${isSticky ? 'ios-blur bg-[#F2F2F7]/80 shadow-lg border-b border-white/40' : ''}`}>
        
        {/* 司儀流程監控區 */}
        <div className={`bg-white transition-all duration-500 overflow-hidden relative shadow-sm border-2 ${isSticky ? 'p-3 md:p-5 rounded-2xl mb-2' : 'p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] mb-4'} ${isSpeechStep ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-white'}`}>
          
          {/* 致詞警告標籤 (移動司儀台提示) */}
          {isSpeechStep && (
            <div className={`absolute top-0 right-0 bg-red-600 text-white font-black px-4 md:px-6 py-1 md:py-2 rounded-bl-3xl flex items-center gap-2 shadow-lg z-10 animate-pulse ${isSticky ? 'text-[8px] md:text-[10px]' : 'text-[10px] md:text-sm'}`}>
              <Move size={14} className="animate-bounce" />
              <span>提醒：請移動司儀台</span>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
             <div className={`flex items-center gap-2 ${isSpeechStep ? 'text-red-600' : 'text-[#007AFF]'}`}>
               <ListChecks size={isSticky ? 14 : 18} strokeWidth={3} />
               <span className={`font-black uppercase tracking-widest ${isSticky ? 'text-[8px]' : 'text-[10px] md:text-xs'}`}>
                 {isSpeechStep ? '致詞進行中！' : '當前司儀流程'}
               </span>
             </div>
             {flowProgress.current.time && (
               <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-black ${isSticky ? 'text-[8px]' : 'text-[10px] md:text-xs'} ${isSpeechStep ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-[#007AFF]'}`}>
                 <Clock size={isSticky ? 10 : 12} /> {flowProgress.current.time}
               </div>
             )}
          </div>
          
          <div className={`flex items-start gap-3 md:gap-4 transition-all ${isSticky ? 'mb-2' : 'mb-6'}`}>
            <div className={`rounded-full animate-pulse mt-1.5 transition-all ${isSticky ? 'w-1 h-4' : 'w-1.5 h-8'} ${isSpeechStep ? 'bg-red-600' : 'bg-[#007AFF]'}`} />
            {/* 標題區：點擊展開/隱藏功能 */}
            <h3 
              onClick={() => setIsFlowTitleExpanded(!isFlowTitleExpanded)}
              className={`font-black leading-tight transition-all flex-1 cursor-pointer select-none ${isSticky ? 'text-sm md:text-lg' : 'text-xl md:text-3xl'} ${isSpeechStep ? 'text-red-700' : 'text-slate-950'} ${!isFlowTitleExpanded ? 'line-clamp-1' : ''}`}
            >
              {flowProgress.current.title}
            </h3>
          </div>

          {/* 預告流程 - 置頂時在寬版螢幕顯示 */}
          {flowProgress.previews.length > 0 && (
            <div className={`pt-4 border-t border-gray-100 transition-all ${isSticky ? 'hidden md:block' : 'block'}`}>
               <div className="text-[8px] md:text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-3">預告流程 (UPCOMING)</div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                  {flowProgress.previews.map((preview, idx) => (
                    <div key={preview.id} className="flex items-center gap-2 group border-b border-gray-50/50 pb-1">
                      <span className="text-[9px] md:text-[11px] font-black text-gray-300 tabular-nums w-4 shrink-0">{idx + 1}</span>
                      <ChevronRight size={10} className="text-gray-200 shrink-0" />
                      <span className="text-[11px] md:text-sm font-bold text-gray-500 truncate group-hover:text-slate-900 transition-colors flex-1">
                        {preview.title}
                      </span>
                      {preview.time && <span className="text-[8px] md:text-[10px] font-black text-gray-300 ml-2 tabular-nums shrink-0">{preview.time}</span>}
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>

        {/* 禮品頒發進度儀表板 */}
        <div className={`bg-white transition-all duration-500 overflow-hidden shadow-sm border border-white ${isSticky ? 'p-3 md:p-5 rounded-2xl' : 'p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem]'}`}>
          <div className="flex justify-between items-end mb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-orange-500">
                <Award size={isSticky ? 12 : 18} strokeWidth={3} />
                <span className={`font-black uppercase tracking-widest ${isSticky ? 'text-[8px]' : 'text-[10px] md:text-xs'}`}>禮品頒發進度</span>
              </div>
              <div className="flex items-baseline gap-1 md:gap-3">
                <span className={`font-black text-slate-900 transition-all ${isSticky ? 'text-2xl md:text-3xl' : 'text-4xl md:text-6xl'}`}>{stats.completed}</span>
                <span className={`font-bold text-slate-300 transition-all ${isSticky ? 'text-xs md:text-lg' : 'text-sm md:text-2xl'}`}>/ {stats.total}</span>
              </div>
            </div>
            <div className="text-right">
              <div className={`font-black text-slate-400 uppercase tracking-widest ${isSticky ? 'text-[8px]' : 'text-[10px] md:text-xs mb-1'}`}>完成率</div>
              <div className={`font-black text-orange-500 transition-all ${isSticky ? 'text-lg md:text-2xl' : 'text-2xl md:text-4xl'}`}>{stats.percent}%</div>
            </div>
          </div>
          
          <div className={`w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner transition-all ${isSticky ? 'h-1.5' : 'h-3 md:h-4'}`}>
            <div 
              className="h-full bg-orange-500 transition-all duration-1000 shadow-[0_0_12px_rgba(249,115,22,0.5)]" 
              style={{ width: `${stats.percent}%` }} 
            />
          </div>
        </div>
      </div>

      {/* 禮品清單 */}
      <div className="space-y-4 md:space-y-6 pt-4 px-2">
        {giftItems.map((item) => (
          <div key={item.id} onClick={() => triggerAction(() => toggleGiftPresented(item.id))} className={`p-5 md:p-8 rounded-[2rem] md:rounded-[3rem] border transition-all cursor-pointer flex flex-col gap-4 md:gap-6 ${item.isPresented ? 'bg-gray-100/60 opacity-60 grayscale-[0.5]' : 'bg-white border-white shadow-sm hover:shadow-md hover:scale-[1.01]'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className={`transition-colors ${item.isPresented ? 'text-green-600' : 'text-orange-400'}`}>
                   {item.isPresented ? <CheckCircle2 size={24} strokeWidth={3} /> : <Circle size={24} strokeWidth={2.5} />}
                 </div>
                 <div className="flex flex-col">
                   <span className="text-[9px] md:text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-1">SEQUENCE</span>
                   <span className="text-sm md:text-lg font-black text-slate-400"># {item.sequence}</span>
                 </div>
              </div>
              {item.quantity && (
                <div className="bg-blue-50 text-[#007AFF] px-3 py-1.5 md:px-4 md:py-2 rounded-xl border border-blue-100 flex items-center gap-2">
                  <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-60">QTY</span>
                  <span className="text-xs md:text-base font-black">{item.quantity}</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 md:gap-8 justify-between md:items-center">
               <h3 className={`text-xl md:text-3xl font-black tracking-tight ${item.isPresented ? 'text-slate-400' : 'text-slate-900'}`}>{item.name}</h3>
               <div className={`px-4 py-2 md:px-6 md:py-3 rounded-2xl md:rounded-[1.4rem] flex items-center gap-3 self-start md:self-auto transition-colors ${item.isPresented ? 'bg-slate-200/50' : 'bg-[#F2F2F7]'}`}>
                 <UserCheck size={16} className={item.isPresented ? 'text-slate-400' : 'text-blue-500'} />
                 <span className={`text-sm md:text-lg font-black ${item.isPresented ? 'text-slate-400' : 'text-blue-600'}`}>{item.recipient}</span>
               </div>
            </div>
          </div>
        ))}
        {giftItems.length === 0 && (
          <div className="py-32 text-center">
            <Award size={48} className="mx-auto text-slate-100 mb-4" />
            <p className="text-slate-300 font-black italic text-lg">尚無禮品頒贈資料</p>
          </div>
        )}
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[250] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-xs shadow-2xl flex flex-col items-center gap-8 border border-white/20">
            <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center shadow-inner">
              <Lock size={32} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-2xl font-black text-black">功能授權</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gift Admin Access</p>
            </div>
            <form onSubmit={handleLoginSubmit} className="w-full space-y-6 text-center">
              <p className="text-[10px] font-bold text-[#007AFF]">密碼提示：1111</p>
              <input type="password" placeholder="••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-[#F2F2F7] border-none rounded-2xl py-5 px-4 text-center text-4xl font-black outline-none tracking-widest" autoFocus />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-4 font-black text-gray-400 text-sm">取消</button>
                <button type="submit" className="flex-1 py-4 bg-orange-500 text-white font-black rounded-2xl shadow-xl active:scale-95 text-sm transition-transform">確認授權</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GiftsPanel;
