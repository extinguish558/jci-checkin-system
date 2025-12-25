
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useEvent } from '../context/EventContext';
// Added X to the imports from lucide-react
import { Trophy, Play, Sparkles, PartyPopper, Lock, Unlock, Users, ChevronDown, RotateCcw, Loader2, Zap, Star, X } from 'lucide-react';
import { Guest } from '../types';

const LotteryPanel: React.FC = () => {
  const { 
    drawWinner, guests, settings, jumpToLotteryRound, 
    isAdmin, unlockedSections, loginAdmin, logoutAdmin,
    resetLottery, removeWinnerFromRound
  } = useEvent();
  
  const isUnlocked = isAdmin || unlockedSections.lottery;
  
  const [batchWinners, setBatchWinners] = useState<Guest[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [drawCount, setDrawCount] = useState<number>(1);
  const [currentSlotName, setCurrentSlotName] = useState<{name: string, title: string}>({ name: "READY", title: "CLICK TO START" });

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  }, []);

  const eligibleGuests = useMemo(() => guests.filter(g => g.isCheckedIn), [guests]);
  const currentRound = settings.lotteryRoundCounter;
  const currentPoolSize = useMemo(() => eligibleGuests.filter(g => !g.wonRounds?.includes(currentRound)).length, [eligibleGuests, currentRound]);

  // 拉霸動畫邏輯
  useEffect(() => {
    let interval: any;
    if (isAnimating && eligibleGuests.length > 0) {
      interval = setInterval(() => {
        const randomGuest = eligibleGuests[Math.floor(Math.random() * eligibleGuests.length)];
        setCurrentSlotName({ name: randomGuest.name, title: randomGuest.title });
      }, 60); // 高速切換
    }
    return () => clearInterval(interval);
  }, [isAnimating, eligibleGuests]);

  const handleDraw = useCallback(() => {
    if (!isUnlocked) { setShowLoginModal(true); return; }
    if (currentPoolSize === 0) {
        alert("本輪已無可抽獎名額");
        return;
    }
    
    if (!window.confirm(`確認開始第 ${currentRound} 輪抽獎？\n本次將抽選出 ${drawCount} 位得獎者。`)) return;

    setIsAnimating(true);
    setBatchWinners([]);
    
    // 延長抽獎時間增加緊張感
    setTimeout(() => {
        setIsAnimating(false);
        const winners: Guest[] = [];
        const count = Math.min(drawCount, currentPoolSize);
        
        for (let i = 0; i < count; i++) {
            const w = drawWinner();
            if (w) winners.push(w);
        }
        setBatchWinners(winners);
    }, 3000); 
  }, [isUnlocked, currentPoolSize, currentRound, drawCount, drawWinner]);

  const handleHardReset = async () => {
      if (!isUnlocked) { setShowLoginModal(true); return; }
      if (!window.confirm("【警告】確定要重置所有得獎紀錄嗎？此動作不可撤回。")) return;
      
      setIsResetting(true);
      try {
          await resetLottery();
          setBatchWinners([]);
          setCurrentSlotName({ name: "READY", title: "CLICK TO START" });
      } finally {
          setIsResetting(false);
      }
  };

  const historyData = useMemo(() => {
    const winners = guests.filter(g => g.isWinner);
    const rounds = Array.from(new Set(winners.flatMap(g => g.wonRounds))).sort((a: any, b: any) => (b as number) - (a as number));
    return rounds.map(r => {
        const roundNum = r as number;
        const list = winners
            .filter(g => g.wonRounds.includes(roundNum))
            .sort((a, b) => {
                const timeA = a.wonTimes?.[roundNum.toString()] || '';
                const timeB = b.wonTimes?.[roundNum.toString()] || '';
                return timeA.localeCompare(timeB);
            });
        return { round: roundNum, list };
    });
  }, [guests]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginAdmin(loginPassword)) {
        setShowLoginModal(false);
        setLoginPassword("");
    } else {
        alert("密碼錯誤");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center pb-40 px-4 md:px-8">
      
      {/* 超級展示大框 */}
      <div 
        onClick={() => !isAnimating && handleDraw()}
        className={`group relative mt-6 md:mt-10 w-full max-w-7xl h-[55vh] md:h-[65vh] rounded-[3rem] md:rounded-[4rem] flex flex-col items-center justify-center cursor-pointer transition-all duration-700 border-4 overflow-hidden
          ${isAnimating 
            ? 'bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 border-indigo-400/50 shadow-[0_0_80px_rgba(129,140,248,0.3)]' 
            : batchWinners.length > 0 
              ? 'bg-slate-900 border-yellow-500/30 shadow-[0_0_100px_rgba(234,179,8,0.15)]'
              : 'bg-slate-900 border-white/5 hover:border-indigo-500/30 shadow-2xl'
          }`}
      >
        {/* 背景裝飾 */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent"></div>
          {isAnimating && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 animate-pulse"></div>}
        </div>

        {/* 框內標題列 */}
        <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center bg-gradient-to-b from-black/40 to-transparent">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500 text-black rounded-2xl shadow-lg animate-bounce"><Trophy size={24} /></div>
              <div>
                 <h2 className="text-xl md:text-2xl font-black text-white tracking-tighter">第 {currentRound} 輪抽獎儀表板</h2>
                 <p className="text-[10px] font-black text-yellow-500/60 uppercase tracking-[0.3em]">Phase {currentRound} System Live</p>
              </div>
           </div>
           <div className="flex items-center gap-3 px-5 py-2 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
              <Users size={16} className="text-indigo-400" />
              <span className="text-xs md:text-sm font-black text-white/80 tabular-nums">候選名單: {currentPoolSize} 人</span>
           </div>
        </div>

        {/* 動畫/結果主視窗 */}
        <div className="w-full h-full flex items-center justify-center p-6 md:p-12">
            {isAnimating ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="relative">
                   <div className="text-4xl md:text-6xl font-black text-indigo-400/30 blur-[1px] mb-2">{currentSlotName.title}</div>
                   <div className="text-6xl md:text-[9rem] font-black text-white italic tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] animate-in fade-in zoom-in-50 duration-75">
                     {currentSlotName.name}
                   </div>
                   <div className="absolute -inset-10 bg-indigo-500/10 blur-[60px] rounded-full animate-pulse"></div>
                </div>
                <div className="mt-8 flex gap-3">
                  {[1,2,3].map(i => <div key={i} className={`w-3 h-3 rounded-full bg-indigo-500 animate-bounce`} style={{animationDelay: `${i*0.2}s`}}></div>)}
                </div>
              </div>
            ) : batchWinners.length === 0 ? (
              <div className="group flex flex-col items-center gap-8 text-center">
                 <div className="relative">
                    <div className="w-32 h-32 md:w-48 md:h-48 bg-white/5 border border-white/10 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-500/10 transition-all duration-700">
                       <Play size={64} fill="white" className="ml-2 text-white group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <Star className="absolute -top-4 -right-4 text-yellow-500 animate-spin-slow" size={32} />
                 </div>
                 <div className="space-y-3">
                    <h1 className="text-4xl md:text-7xl font-black text-white tracking-tighter uppercase italic opacity-20 group-hover:opacity-100 transition-opacity">Ready to Draw</h1>
                    <p className="text-slate-500 font-bold text-sm md:text-lg uppercase tracking-[0.5em] group-hover:text-indigo-400 transition-colors">點擊螢幕任何位置開始抽獎</p>
                 </div>
              </div>
            ) : (
              <div className={`grid gap-4 w-full animate-in zoom-in-95 duration-700 overflow-y-auto no-scrollbar py-20 px-4 ${
                batchWinners.length === 1 ? 'grid-cols-1' : 
                batchWinners.length <= 4 ? 'grid-cols-1 md:grid-cols-2' : 
                'grid-cols-2 lg:grid-cols-3'
              }`}>
                {batchWinners.map(w => (
                  <div key={w.id} className="bg-white/5 backdrop-blur-md rounded-[2.5rem] p-8 md:p-12 border border-white/10 text-center shadow-2xl relative overflow-hidden group/card hover:bg-white/10 transition-all">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-transparent" />
                    <Sparkles size={24} className="absolute top-6 right-6 text-yellow-500 animate-pulse" />
                    <div className="text-yellow-500 font-black text-[10px] uppercase tracking-[0.3em] mb-4">LUCKY WINNER</div>
                    <div className="text-4xl md:text-6xl font-black text-white truncate px-2 tracking-tighter">{w.name}</div>
                    <div className="text-sm md:text-xl text-slate-400 font-bold truncate mt-4 uppercase tracking-widest">{w.title || '貴賓'}</div>
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* 底部裝飾按鈕：僅在非動畫時顯示 */}
        {!isAnimating && (
           <div className="absolute bottom-8 left-1/2 -translate-x-1/2 group-hover:translate-y-[-10px] transition-transform">
              <div className="px-8 py-3 bg-white/5 border border-white/10 rounded-full text-white/40 text-[10px] font-black tracking-[0.4em] uppercase">Click Frame to Start</div>
           </div>
        )}
      </div>

      {/* 控制中心整合操作列 */}
      <div className="mt-8 md:mt-12 w-full max-w-5xl flex flex-col md:flex-row items-center justify-center gap-4 bg-slate-900/50 p-4 rounded-[3rem] border border-white/5 backdrop-blur-xl">
        
        {/* 輪次控制區 */}
        <div className="flex bg-black/40 p-1.5 rounded-2xl gap-1.5">
          {[1, 2, 3, 4, 5].map(r => (
            <button key={r} onClick={() => isUnlocked ? jumpToLotteryRound(r) : setShowLoginModal(true)} className={`w-12 h-12 rounded-xl font-black text-sm transition-all ${currentRound === r ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{r}</button>
          ))}
        </div>

        {/* 重置與設定區 */}
        <div className="h-10 w-px bg-white/5 hidden md:block"></div>
        
        <div className="flex items-center gap-3">
           <div className="relative group">
              <Users size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <select 
                value={drawCount} 
                onChange={(e) => setDrawCount(Number(e.target.value))}
                className="h-14 pl-12 pr-10 bg-black/40 border-none rounded-2xl font-black text-lg text-white appearance-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer min-w-[140px]"
              >
                {[1, 2, 3, 4, 5, 10, 15, 20].map(n => <option key={n} value={n}>{n} 人 / 抽</option>)}
              </select>
              <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
           </div>

           <button 
             onClick={handleHardReset}
             disabled={isResetting}
             className="w-14 h-14 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl flex items-center justify-center transition-all active:scale-90"
             title="重置全部紀錄"
           >
             {isResetting ? <Loader2 size={24} className="animate-spin" /> : <RotateCcw size={24} />}
           </button>

           <button onClick={() => isUnlocked ? logoutAdmin() : setShowLoginModal(true)} className="w-14 h-14 bg-white/5 text-slate-400 hover:text-indigo-400 rounded-2xl flex items-center justify-center transition-all">
             {isUnlocked ? <Unlock size={24} /> : <Lock size={24} />}
           </button>
        </div>
      </div>

      {/* 歷史得獎紀錄區 (維持原本設計但微調配色) */}
      <div className="w-full max-w-5xl space-y-8 mt-16">
          <div className="flex items-center justify-between px-8">
              <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
                  <Star size={14} className="text-yellow-500" />
                  各輪得獎歷史實況
              </h4>
          </div>
          
          <div className="space-y-6">
              {historyData.map(group => (
                  <div key={group.round} className="bg-slate-900/40 rounded-[2.5rem] overflow-hidden border border-white/5 backdrop-blur-sm">
                      <div className="bg-white/5 px-10 py-5 flex justify-between items-center border-b border-white/5">
                          <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-xs font-black">{group.round}</div>
                              <span className="font-black text-slate-200 uppercase tracking-widest text-sm">ROUND {group.round} WINNERS</span>
                          </div>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{group.list.length} LUCKY SOULS</span>
                      </div>
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {group.list.map((w, idx) => (
                              <div key={`${w.id}-${group.round}`} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group/item">
                                  <div className="min-w-0">
                                      <div className="font-black text-white text-lg truncate tracking-tight">{w.name}</div>
                                      <div className="text-[10px] text-slate-500 font-bold truncate mt-1 uppercase tracking-widest">{w.title || '貴賓'}</div>
                                  </div>
                                  {isUnlocked && (
                                      <button 
                                          onClick={(e) => { e.stopPropagation(); if(window.confirm(`撤回 ${w.name}？`)) removeWinnerFromRound(w.id, group.round); }}
                                          className="w-8 h-8 bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover/item:opacity-100 transition-all flex items-center justify-center"
                                      >
                                          {/* Fixed: Use imported X icon */}
                                          <X size={14} />
                                      </button>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 ios-blur bg-black/60 z-[300] flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-white/10 rounded-[3rem] p-10 max-w-xs w-full shadow-2xl flex flex-col items-center gap-8 text-center">
            <h3 className="text-2xl font-black text-white tracking-tight">抽獎系統解鎖</h3>
            <form onSubmit={handleLoginSubmit} className="w-full space-y-6">
              <p className="text-xs font-bold text-indigo-400">密碼提示：3333</p>
              <input type="password" placeholder="••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 px-4 text-center text-4xl font-black text-white focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all" autoFocus />
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-4 font-black text-slate-500">取消</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-transform">解鎖權限</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// 隨機星星動畫裝飾
const StarDecoration = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
            <div 
                key={i}
                className="absolute bg-white rounded-full opacity-20 animate-pulse"
                style={{
                    width: Math.random() * 4 + 'px',
                    height: Math.random() * 4 + 'px',
                    top: Math.random() * 100 + '%',
                    left: Math.random() * 100 + '%',
                    animationDelay: Math.random() * 5 + 's'
                }}
            />
        ))}
    </div>
);

export default LotteryPanel;
