
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useEvent } from '../context/EventContext';
import { Trophy, Lock, Unlock, Users, RotateCcw, Loader2, Zap, Star, AlertTriangle, ChevronDown, Database, ClipboardList } from 'lucide-react';
import { Guest } from '../types';

const LotteryPanel: React.FC = () => {
  const { 
    drawWinner, guests, settings, jumpToLotteryRound, 
    isAdmin, unlockedSections, loginAdmin, logoutAdmin,
    resetLottery
  } = useEvent();
  
  const isUnlocked = isAdmin || unlockedSections.lottery;
  
  const [currentWinnerBatch, setCurrentWinnerBatch] = useState<Guest[]>([]);
  const [animatingWinner, setAnimatingWinner] = useState<Guest | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [drawCount, setDrawCount] = useState<number>(1);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [confirmState, setConfirmState] = useState<'idle' | 'armed'>('idle');
  
  const [reelItems, setReelItems] = useState<Guest[]>([]);
  const [reelOffset, setReelOffset] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const animationFrameRef = useRef<number>(0);
  const armTimerRef = useRef<any>(null);

  const ITEM_HEIGHT = 120; 
  const TOTAL_REEL_ITEMS = 30;

  // 當前系統設定的抽獎輪次
  const currentActiveRound = settings.lotteryRoundCounter;

  // 動態抽獎池：過濾掉已經在「當前選中輪次」中獎的人
  const eligibleGuests = useMemo(() => guests.filter(g => g.isCheckedIn), [guests]);
  const currentPoolSize = useMemo(() => {
    // 排除掉已經在當前輪次中獎的人
    return eligibleGuests.filter(g => !g.wonRounds?.includes(currentActiveRound)).length;
  }, [eligibleGuests, currentActiveRound]);

  // 歷史名單映射
  const historyMap = useMemo(() => {
    const rounds: Record<number, Guest[]> = {};
    guests.forEach(g => {
      if (g.wonRounds && g.wonRounds.length > 0) {
        g.wonRounds.forEach(r => {
          if (!rounds[r]) rounds[r] = [];
          rounds[r].push(g);
        });
      }
    });
    return rounds;
  }, [guests]);

  const generateReel = (winner: Guest) => {
    // 拉霸池也根據當前輪次動態生成（增加視覺真實感）
    const pool = eligibleGuests.length > 0 ? eligibleGuests : guests;
    const items: Guest[] = [];
    for (let i = 0; i < TOTAL_REEL_ITEMS - 1; i++) {
      items.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    items.push(winner);
    return items;
  };

  const runSingleDraw = (winner: Guest, duration: number): Promise<void> => {
    return new Promise((resolve) => {
      setReelItems(generateReel(winner));
      setAnimatingWinner(null);
      setIsFlashing(false);
      
      const startTime = performance.now();
      const targetPos = (TOTAL_REEL_ITEMS - 1) * ITEM_HEIGHT;

      const animate = (time: number) => {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 4);
        setReelOffset(ease * targetPos);
        setCurrentSpeed((1 - progress) * 15);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setAnimatingWinner(winner);
          setIsFlashing(true);
          setCurrentSpeed(0);
          
          setTimeout(() => {
            setIsFlashing(false);
            resolve();
          }, 1000);
        }
      };
      animationFrameRef.current = requestAnimationFrame(animate);
    });
  };

  const startBatchDraw = async () => {
    if (currentPoolSize === 0) return;
    setIsAnimating(true);
    setCurrentWinnerBatch([]);
    const countToDraw = Math.min(drawCount, currentPoolSize);
    const winners: Guest[] = [];
    
    for (let i = 0; i < countToDraw; i++) {
      // 這裡 drawWinner 會使用 settings.lotteryRoundCounter 作為寫入輪次
      const w = drawWinner(); 
      if (w) {
        const duration = i === 0 ? 6000 : 2000;
        await runSingleDraw(w, duration);
        winners.push(w);
        setCurrentWinnerBatch([...winners]);
      }
    }
    setIsAnimating(false);
  };

  const handleDrawClick = () => {
    if (!isUnlocked) { setShowLoginModal(true); return; }
    if (isAnimating) return;
    if (confirmState === 'armed') {
      if (armTimerRef.current) clearTimeout(armTimerRef.current);
      setConfirmState('idle');
      return;
    }
    setConfirmState('armed');
    armTimerRef.current = setTimeout(() => {
      setConfirmState('idle');
      startBatchDraw();
    }, 1200);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginAdmin(loginPassword)) { setShowLoginModal(false); setLoginPassword(""); }
    else alert("密碼錯誤");
  };

  return (
    <div className="min-h-screen bg-[#020306] flex flex-col items-center pb-64 px-4 overflow-hidden font-sans">
      
      <style>{`
        @keyframes winner-quantum-flash {
          0%, 100% { transform: scale(1.1); filter: brightness(1) drop-shadow(0 0 10px rgba(255,255,255,0.2)); }
          50% { transform: scale(1.25); filter: brightness(2.5) drop-shadow(0 0 40px rgba(255,255,255,0.8)); }
        }
        .animate-winner-flash {
          animation: winner-quantum-flash 0.3s ease-in-out infinite;
        }
      `}</style>

      {/* 1. 主舞台 */}
      <div 
        onClick={handleDrawClick}
        className={`relative mt-4 md:mt-8 w-full max-w-7xl h-[70vh] md:h-[75vh] rounded-[2.5rem] md:rounded-[3rem] flex flex-col transition-all duration-1000 border border-white/5 overflow-hidden z-10 shadow-3xl
          ${confirmState === 'armed' ? 'bg-red-950/10' : isAnimating ? 'bg-blue-950/5' : 'bg-slate-900/5'}
        `}
      >
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_40%,_rgba(30,58,138,0.06),_transparent_80%)]"></div>

        <header className="relative w-full p-6 md:p-8 z-30 border-b border-white/5 bg-gradient-to-b from-black/95 to-transparent flex items-center justify-between">
           <div className="flex items-center gap-6">
              <div className="p-3 md:p-3 bg-yellow-500 rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.25)] shrink-0 animate-pulse">
                <Trophy size={20} className="text-black md:w-6 md:h-6" />
              </div>
              <div className="text-left">
                 <h2 className="text-white font-black text-lg md:text-3xl tracking-tight leading-none italic drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                   {settings.eventName}
                 </h2>
                 <p className="text-white/20 font-bold text-[7px] md:text-[9px] uppercase tracking-[0.5em] mt-2 italic">Active Target: ROUND {currentActiveRound}</p>
              </div>
           </div>
           
           <div className="px-4 py-2 bg-white/5 rounded-full border border-white/10 flex items-center gap-2.5">
              <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[9px] md:text-base font-black text-white italic tracking-tighter tabular-nums opacity-60">ROUND {currentActiveRound} POOL: {currentPoolSize}</span>
           </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <div className="relative w-full md:w-[32%] h-[30%] md:h-full flex flex-col items-center justify-center overflow-hidden bg-black/60 border-r border-white/5">
            <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-black via-transparent to-black opacity-60"></div>
            <div className="absolute inset-x-0 h-[50px] md:h-[ITEM_HEIGHT] top-1/2 -translate-y-1/2 border-y border-white/15 bg-white/[0.03] pointer-events-none z-20"></div>
            <div className="relative w-full h-full flex items-center justify-center">
               {reelItems.length > 0 ? (
                  <div 
                    className="absolute w-full"
                    style={{ 
                      transform: `translateY(${-reelOffset}px)`,
                      top: '50%',
                      marginTop: `-${ITEM_HEIGHT/2}px`,
                      filter: isAnimating && !animatingWinner ? `blur(${Math.min(currentSpeed, 6)}px)` : 'none'
                    }}
                  >
                    {reelItems.map((g, idx) => {
                      const isWinner = idx === reelItems.length - 1 && animatingWinner;
                      return (
                        <div key={`${g.id}-${idx}`} className="flex flex-col items-center justify-center text-center px-4" style={{ height: `${ITEM_HEIGHT}px` }}>
                          <span className={`font-black italic transition-all duration-300 whitespace-nowrap leading-none tracking-tighter ${
                            isWinner 
                              ? `text-white text-3xl md:text-6xl drop-shadow-[0_0_30px_rgba(255,255,255,0.6)] ${isFlashing ? 'animate-winner-flash' : 'scale-110'}` 
                              : 'text-white/35 text-xl md:text-3xl'
                          }`}>
                            {g.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
               ) : (
                  <div className="opacity-10"><RotateCcw size={32} className="animate-spin-slow" /></div>
               )}
            </div>
          </div>

          {/* 右側：即時結果顯示區 (只顯示該輪次剛剛抽出的名單) */}
          <div className={`relative w-full md:w-[68%] h-[70%] md:h-full p-4 md:p-6 overflow-hidden transition-all duration-1000
            ${isAnimating || currentWinnerBatch.length > 0 ? 'bg-blue-900/15 ring-inset ring-1 ring-blue-500/20' : 'bg-black/40'}
          `}>
             <div className="flex items-center gap-2 mb-4 opacity-40">
                <Zap size={14} className="text-blue-400" />
                <span className="text-[10px] font-black text-white tracking-[0.4em] uppercase italic">Current Extraction Session</span>
             </div>

             <div className="h-full flex flex-col gap-2 pb-24 overflow-y-auto no-scrollbar">
                {currentWinnerBatch.length > 0 ? (
                  currentWinnerBatch.map((w, idx) => (
                    <div key={`${w.id}-${idx}`} className="flex items-center p-3 md:p-5 bg-white/[0.05] border border-white/10 rounded-xl md:rounded-[1.5rem] animate-in slide-in-from-right-10 fade-in duration-700 shadow-2xl group hover:bg-white/[0.08] transition-all">
                      <div className="w-8 h-8 md:w-14 md:h-14 bg-blue-600 rounded-lg md:rounded-2xl flex items-center justify-center font-black italic text-white text-[10px] md:text-xl shrink-0 mr-4 md:mr-6 shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                        #{idx+1}
                      </div>
                      <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-6 flex-1 min-w-0 pr-8">
                        <h3 className="font-black text-white text-xl md:text-3xl tracking-tighter italic whitespace-nowrap leading-none">{w.name}</h3>
                        <span className="text-[10px] md:text-xl text-yellow-500/50 font-black uppercase tracking-widest italic truncate border-l border-white/10 pl-4 md:pl-6">{w.title || '貴賓'}</span>
                      </div>
                      <div className="opacity-20 group-hover:opacity-100 group-hover:scale-125 transition-all"><Star size={18} className="text-yellow-500" /></div>
                    </div>
                  ))
                ) : !isAnimating && (
                  <div className="h-full flex flex-col items-center justify-center opacity-5">
                     <Users size={80} strokeWidth={1} />
                     <p className="font-black tracking-[1.2em] text-[8px] uppercase mt-8 italic">Awaiting Draw for Round {currentActiveRound}</p>
                  </div>
                )}
                
                {isAnimating && currentWinnerBatch.length < drawCount && (
                  <div className="p-8 md:p-14 border border-dashed border-white/20 rounded-[2rem] flex items-center justify-center gap-6 animate-pulse bg-white/[0.02] mt-4">
                     <Loader2 size={32} className="animate-spin text-blue-500" />
                     <span className="text-xs md:text-2xl font-black text-white/20 uppercase tracking-[0.5em] italic">Quantum Syncing...</span>
                  </div>
                )}
             </div>
          </div>
        </div>

        {confirmState === 'armed' && (
           <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/98 backdrop-blur-3xl animate-in fade-in duration-500 text-center">
              <AlertTriangle size={80} className="text-red-500 mb-6 animate-bounce" />
              <h1 className="text-lg md:text-4xl font-black text-white tracking-tighter italic uppercase">提取授權：ROUND {currentActiveRound}</h1>
              <p className="text-[8px] md:text-xs text-white/30 font-black tracking-[0.8em] mt-6">AWAITING QUANTUM TRIGGER</p>
           </div>
        )}
      </div>

      {/* 2. 控制列與分頁系統 */}
      <div className="mt-8 md:mt-12 w-full max-w-4xl space-y-6 z-20">
        
        <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full relative group">
                <Users size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700" />
                <select 
                  value={drawCount} 
                  onChange={(e) => setDrawCount(Number(e.target.value))} 
                  className="w-full h-12 md:h-16 pl-14 md:pl-16 pr-10 bg-white/[0.03] border border-white/5 rounded-full font-black text-[10px] md:text-sm text-white appearance-none outline-none shadow-xl"
                >
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n} className="bg-slate-950">連續提取 {n} 位嘉賓</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700" />
            </div>

            <div className="flex gap-4 shrink-0">
                <button 
                  onClick={() => { if(window.confirm('確定重置今日所有得獎紀錄？')) resetLottery(); }} 
                  className="w-12 h-12 md:w-16 md:h-16 bg-red-600/5 text-red-500 hover:bg-red-600 hover:text-white rounded-full flex items-center justify-center transition-all border border-red-500/10 shadow-xl"
                >
                  <RotateCcw size={18} />
                </button>
                <button 
                  onClick={() => isUnlocked ? logoutAdmin() : setShowLoginModal(true)} 
                  className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all border border-white/5 shadow-xl ${isUnlocked ? 'bg-blue-600/20 text-blue-500' : 'bg-white/5 text-slate-700'}`}
                >
                  {isUnlocked ? <Unlock size={18} /> : <Lock size={18} />}
                </button>
            </div>
        </div>

        {/* 分頁按鈕：點擊即切換全域抽獎輪次 */}
        <div className="flex items-end px-2 md:px-4">
           <div className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar">
              {[1, 2, 3, 4, 5].map(r => (
                <button 
                  key={r} 
                  onClick={() => {
                    // 同步邏輯：點擊分頁即切換抽獎目標輪次
                    if (isUnlocked) {
                        jumpToLotteryRound(r);
                        // 清空當下這一把的顯示，因為已經換輪次了
                        setCurrentWinnerBatch([]);
                    } else {
                        setShowLoginModal(true);
                    }
                  }} 
                  className={`relative px-6 md:px-10 h-10 md:h-14 rounded-t-2xl md:rounded-t-[2.2rem] font-black text-[10px] md:text-lg transition-all
                    ${currentActiveRound === r 
                      ? 'bg-[#15171e] text-white border-t border-x border-white/10' 
                      : 'text-slate-600 hover:text-slate-400 bg-black/20 hover:bg-black/40'}
                  `}
                >
                  R{r}
                  {currentActiveRound === r && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-blue-500 shadow-[0_0_12px_#3b82f6]"></div>
                  )}
                </button>
              ))}
           </div>
        </div>

        {/* 歷史存檔區：根據當前選中輪次顯示名單 */}
        <div className="relative bg-[#15171e] rounded-[2rem] md:rounded-[3rem] border border-white/10 shadow-3xl overflow-hidden min-h-[450px]">
           <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
              <Database size={350} />
           </div>

           <div className="p-6 md:p-10 flex items-center justify-between border-b border-white/5 bg-black/25 relative z-10">
              <div className="flex items-center gap-5">
                 <div className="w-12 h-12 md:w-16 md:h-16 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500 shadow-inner">
                    <ClipboardList size={24} />
                 </div>
                 <div>
                    <h3 className="text-white font-black text-xl md:text-3xl italic tracking-tighter">Round {currentActiveRound} Extraction Archives</h3>
                    <p className="text-slate-500 font-bold text-[8px] md:text-xs uppercase tracking-[0.4em] mt-2 italic">此分頁之歷史得獎存檔</p>
                 </div>
              </div>
              <div className="text-right">
                 <span className="text-blue-500 font-black text-2xl md:text-5xl tabular-nums italic drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">{(historyMap[currentActiveRound] || []).length}</span>
                 <p className="text-slate-600 font-bold text-[8px] md:text-[10px] uppercase tracking-widest mt-1">Total Records</p>
              </div>
           </div>

           <div className="p-4 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 relative z-10">
              {(historyMap[currentActiveRound] || []).map((w, idx) => (
                <div key={`${w.id}-${currentActiveRound}-${idx}`} className="flex items-center justify-between p-5 md:px-8 md:py-6 bg-white/[0.03] rounded-[1.8rem] border border-white/5 hover:border-blue-500/25 hover:bg-white/[0.05] transition-all group shadow-lg">
                   <div className="flex items-center gap-5 min-w-0">
                      <span className="text-[10px] md:text-sm font-black text-slate-600 italic tracking-widest">#{idx+1}</span>
                      <div className="min-w-0">
                        <div className={`font-black text-white italic tracking-tighter leading-none whitespace-nowrap overflow-visible ${
                          w.name.length >= 5 ? 'text-sm md:text-2xl' : 'text-lg md:text-3xl'
                        }`}>
                          {w.name}
                        </div>
                        <div className="text-[8px] md:text-sm text-slate-600 font-bold truncate uppercase tracking-[0.2em] italic mt-3 border-l border-white/5 pl-4">
                          {w.title || '貴賓'}
                        </div>
                      </div>
                   </div>
                   <Star size={16} className="text-yellow-500/10 group-hover:text-yellow-500/50 group-hover:rotate-45 transition-all duration-500" />
                </div>
              ))}

              {(historyMap[currentActiveRound] || []).length === 0 && (
                <div className="col-span-full py-32 flex flex-col items-center justify-center opacity-10">
                   <Database size={80} strokeWidth={1} className="animate-pulse" />
                   <p className="text-base font-black tracking-[1.5em] text-center uppercase mt-10 italic">No Winners for Round {currentActiveRound} yet</p>
                </div>
              )}
           </div>
        </div>
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 ios-blur bg-black/98 z-[500] flex items-center justify-center p-6">
          <div className="bg-[#0b0c10] border border-white/10 rounded-[3rem] p-10 md:p-16 max-w-sm w-full shadow-3xl flex flex-col items-center gap-8 text-center animate-in zoom-in-95 duration-500">
            <h3 className="text-base md:text-2xl font-black text-white tracking-[0.5em] italic uppercase">Security Authority</h3>
            <form onSubmit={handleLoginSubmit} className="w-full space-y-10">
              <input type="password" placeholder="••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-8 px-6 text-center text-5xl md:text-7xl font-black text-white outline-none tracking-[1em] focus:bg-white/10 transition-all" autoFocus />
              <div className="flex gap-6">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-6 font-black text-slate-600 text-[10px] md:text-xs uppercase tracking-[0.4em]">Abort</button>
                <button type="submit" className="flex-1 py-6 bg-blue-600 text-white font-black rounded-2xl text-[10px] md:text-xs uppercase tracking-[0.4em] active:scale-95">Unlock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LotteryPanel;
