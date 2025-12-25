
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useEvent } from '../context/EventContext';
import { Trophy, Sparkles, PartyPopper, Lock, Unlock, Users, ChevronDown, RotateCcw, Loader2, Zap, Star, X, AlertTriangle } from 'lucide-react';
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
  
  const [confirmState, setConfirmState] = useState<'idle' | 'armed'>('idle');
  const armTimerRef = useRef<any>(null);

  const [allReels, setAllReels] = useState<Guest[][]>([]);
  const [reelOffset, setReelOffset] = useState(0);
  const animationFrameRef = useRef<number>(0);
  
  // 核心參數調整：高度與總量保持，增加流暢度
  const ITEM_HEIGHT = 160; 
  const TOTAL_ITEMS = 110; 

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
    return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const eligibleGuests = useMemo(() => guests.filter(g => g.isCheckedIn), [guests]);
  const currentRound = settings.lotteryRoundCounter;
  const currentPoolSize = useMemo(() => eligibleGuests.filter(g => !g.wonRounds?.includes(currentRound)).length, [eligibleGuests, currentRound]);

  const startSlotAnimation = useCallback((winners: Guest[]) => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    
    setIsAnimating(true);
    setBatchWinners([]);
    
    const pool = eligibleGuests.length > 0 ? eligibleGuests : guests;
    const newReels: Guest[][] = winners.map(winner => {
        const reel: Guest[] = [];
        for (let i = 0; i < TOTAL_ITEMS - 1; i++) {
            reel.push(pool[Math.floor(Math.random() * pool.length)]);
        }
        reel.push(winner);
        return reel;
    });
    
    setAllReels(newReels);
    
    let speed = 140; 
    let currentPos = 0;
    const targetPos = (TOTAL_ITEMS - 1) * ITEM_HEIGHT;

    const animate = () => {
        currentPos += speed;
        const progress = currentPos / targetPos;

        // 優化阻尼曲線
        if (progress > 0.98) speed *= 0.88; 
        else if (progress > 0.85) speed *= 0.96; 
        else if (progress > 0.3) speed *= 0.993; 

        if (speed < 0.8) speed = 0.8; 

        if (currentPos >= targetPos) {
            setReelOffset(targetPos);
            setTimeout(() => {
                setIsAnimating(false);
                setBatchWinners(winners);
            }, 350);
            animationFrameRef.current = 0;
            return;
        }

        setReelOffset(currentPos);
        animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [eligibleGuests, guests, ITEM_HEIGHT, TOTAL_ITEMS]);

  const handleDrawClick = () => {
    if (!isUnlocked) { setShowLoginModal(true); return; }
    if (isAnimating) return;
    if (currentPoolSize === 0) { alert("名單已空"); return; }

    if (confirmState === 'armed') {
        if (armTimerRef.current) { clearTimeout(armTimerRef.current); armTimerRef.current = null; }
        setConfirmState('idle');
        return;
    }

    setConfirmState('armed');
    armTimerRef.current = setTimeout(() => {
        setConfirmState('idle');
        const winners: Guest[] = [];
        const countToDraw = Math.min(drawCount, currentPoolSize);
        for (let i = 0; i < countToDraw; i++) {
            const w = drawWinner();
            if (w) winners.push(w);
        }
        if (winners.length > 0) startSlotAnimation(winners);
    }, 2000);
  };

  const handleHardReset = async () => {
      if (!isUnlocked) { setShowLoginModal(true); return; }
      if (!window.confirm("確定重置所有抽獎紀錄？")) return;
      setIsResetting(true);
      try {
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
          setBatchWinners([]);
          setAllReels([]);
          setReelOffset(0);
          await resetLottery();
          jumpToLotteryRound(1);
      } finally { setIsResetting(false); }
  };

  const historyData = useMemo(() => {
    const winners = guests.filter(g => g.isWinner);
    const rounds = Array.from(new Set(winners.flatMap(g => g.wonRounds))).sort((a: any, b: any) => (b as number) - (a as number));
    return rounds.map(r => ({
        round: r as number,
        list: winners.filter(g => g.wonRounds.includes(r as number)).sort((a, b) => (a.wonTimes?.[r] || '').localeCompare(b.wonTimes?.[r] || ''))
    }));
  }, [guests]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginAdmin(loginPassword)) { setShowLoginModal(false); setLoginPassword(""); }
    else alert("密碼錯誤");
  };

  const getNameSize = (count: number) => {
    if (count === 1) return 'text-[clamp(2.5rem,8vw,6rem)]';
    if (count <= 2) return 'text-[clamp(2rem,6vw,4.5rem)]';
    if (count <= 3) return 'text-[clamp(1.5rem,5vw,3.5rem)]';
    return 'text-[clamp(1.2rem,4vw,2.5rem)]';
  };

  const getTitleSize = (count: number) => {
    if (count === 1) return 'text-[10px] md:text-xl';
    return 'text-[8px] md:text-sm';
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center pb-64 px-4 md:px-8 overflow-hidden font-sans">
      
      {/* 沉浸式抽獎舞台 */}
      <div 
        onClick={handleDrawClick}
        className={`group relative mt-4 md:mt-10 w-full max-w-6xl h-[45vh] md:h-[60vh] rounded-[2rem] md:rounded-[4rem] flex flex-col items-center justify-center cursor-pointer transition-all duration-700 border border-white/5 overflow-hidden
          ${confirmState === 'armed' ? 'bg-red-950/10 shadow-[inset_0_0_100px_rgba(239,68,68,0.1)]' : 
            isAnimating ? 'bg-blue-900/5 shadow-[inset_0_0_150px_rgba(59,130,246,0.1)]' : 
            batchWinners.length > 0 ? 'bg-yellow-900/5 shadow-[inset_0_0_200px_rgba(234,179,8,0.1)]' : 
            'bg-slate-900/20 shadow-2xl'}
        `}
      >
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(30,58,138,0.06),_transparent)]"></div>
        
        {/* 舞台橫向聚焦帶 - 強化視覺 */}
        <div className={`absolute inset-x-0 h-[120px] md:h-[180px] z-20 pointer-events-none transition-all duration-1000 flex items-center justify-center
           ${isAnimating ? 'border-y-2 border-blue-500/30 bg-blue-500/[0.02]' : 
             batchWinners.length > 0 ? 'border-y-[3px] border-yellow-500/50 bg-yellow-500/[0.04] shadow-[0_0_60px_rgba(234,179,8,0.1)]' : 
             'border-y border-white/10'}
        `}>
           {/* 中心掃描光 */}
           <div className={`w-full h-[2px] absolute top-1/2 -translate-y-1/2 transition-all duration-700 ${isAnimating ? 'bg-blue-400 opacity-50 blur-[1px] animate-pulse' : 'bg-transparent'}`}></div>
        </div>

        {/* 頂部數據列 */}
        <div className="absolute top-0 left-0 right-0 p-6 md:p-12 flex justify-between items-center z-30">
           <div className="flex items-center gap-3 md:gap-5">
              <div className={`p-2.5 md:p-4 rounded-xl md:rounded-2xl transition-all duration-1000 ${confirmState === 'armed' ? 'bg-red-500 rotate-12' : 'bg-yellow-500'}`}>
                 <Trophy size={18} className="text-black md:w-8 md:h-8" />
              </div>
              <div className="text-left">
                 <h2 className="text-sm md:text-3xl font-black text-white tracking-tighter uppercase italic leading-none">R{currentRound} 抽獎中心</h2>
                 <p className="text-[6px] md:text-[8px] font-bold text-white/20 tracking-[0.3em] uppercase mt-1">Quantum Stage</p>
              </div>
           </div>
           <div className="px-4 py-1.5 md:px-7 md:py-3 bg-white/5 backdrop-blur-3xl rounded-full border border-white/10 flex items-center gap-2 md:gap-3 shadow-xl">
              <Users size={14} className="text-blue-400 md:w-5 md:h-5" />
              <span className="text-[10px] md:text-lg font-black text-white tabular-nums italic">POOL {currentPoolSize}</span>
           </div>
        </div>

        <div className="w-full h-full flex items-center justify-center relative z-10 px-4 md:px-20">
            {confirmState === 'armed' && (
               <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-red-950/90 backdrop-blur-3xl animate-in fade-in duration-500">
                  <AlertTriangle size={60} className="text-white mb-4 md:w-20 md:h-20 animate-bounce" />
                  <h1 className="text-2xl md:text-5xl font-black text-white tracking-tighter italic uppercase text-center">
                     即將啟動 <span className="text-yellow-400">{Math.min(drawCount, currentPoolSize)}</span> 位抽獎
                  </h1>
               </div>
            )}

            {/* 名單捲軸系統 - 強化旋轉時的可視度 */}
            <div className="w-full flex justify-center items-center h-full">
                {allReels.length > 0 ? (
                    allReels.map((reel, rIdx) => (
                        <div key={rIdx} className="flex-1 h-full overflow-hidden relative">
                            <div 
                              className="absolute w-full" 
                              style={{ 
                                transform: `translateY(${-reelOffset}px)`,
                                transition: 'none', 
                                top: '50%',
                                marginTop: `-${ITEM_HEIGHT/2}px`
                              }}
                            >
                                {reel.map((g, idx) => (
                                    <div 
                                      key={`${g.id}-${idx}`} 
                                      className="flex flex-col items-center justify-center w-full px-2 text-center"
                                      style={{ height: `${ITEM_HEIGHT}px` }}
                                    >
                                        <div className={`font-black italic tracking-tighter leading-none transition-all duration-300 ${getNameSize(allReels.length)} 
                                          ${!isAnimating && idx === reel.length - 1 
                                            ? 'text-white scale-110 drop-shadow-[0_0_30px_rgba(255,255,255,0.7)]' 
                                            : isAnimating 
                                              ? 'text-white/30 blur-[0.5px]' // 提高旋轉時的不透明度
                                              : 'text-white/5'
                                          }`}
                                        >
                                            {g.name}
                                        </div>
                                        <div className={`font-bold uppercase tracking-[0.2em] mt-3 md:mt-6 transition-all duration-300 ${getTitleSize(allReels.length)} 
                                          ${!isAnimating && idx === reel.length - 1 
                                            ? 'text-yellow-500 opacity-100' 
                                            : isAnimating 
                                              ? 'text-blue-500/20' 
                                              : 'text-transparent'
                                          }`}
                                        >
                                            {g.title || '嘉賓'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center gap-6">
                        <Zap size={60} className="text-white/5 md:w-32 md:h-32 animate-pulse" />
                        <span className="text-white/10 font-black tracking-[1em] text-xs uppercase italic">Waiting for Signal</span>
                    </div>
                )}
            </div>

            {!isAnimating && batchWinners.length > 0 && confirmState === 'idle' && (
                <div className="absolute top-[78%] animate-in zoom-in-50 slide-in-from-bottom-12 duration-1000 flex flex-col items-center z-30">
                    <div className="flex gap-6">
                        <Sparkles size={40} className="text-yellow-500 animate-pulse md:w-16 md:h-16" />
                        <PartyPopper size={40} className="text-yellow-500 animate-bounce md:w-16 md:h-16" />
                    </div>
                    <div className="mt-4 px-10 py-3 md:px-20 md:py-5 bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-black text-[10px] md:text-2xl rounded-full shadow-[0_20px_60px_rgba(234,179,8,0.4)] uppercase italic tracking-tighter border-b-4 border-yellow-800">
                       Success! Winner Selected
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* 控制台區域 - iPhone 高度適配 */}
      <div className="mt-10 md:mt-16 w-full max-w-4xl space-y-5">
        
        {/* R1-R5 切換鈕 - 更精緻的圓角 */}
        <div className="bg-slate-900/60 p-1.5 rounded-2xl md:rounded-[2rem] border border-white/5 flex gap-1.5 overflow-x-auto no-scrollbar backdrop-blur-xl">
          {[1, 2, 3, 4, 5].map(r => (
            <button 
              key={r} 
              onClick={() => isUnlocked ? jumpToLotteryRound(r) : setShowLoginModal(true)} 
              className={`flex-1 min-w-[55px] h-11 md:h-16 rounded-xl md:rounded-2xl font-black text-xs md:text-xl transition-all duration-500 ${currentRound === r ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              R{r}
            </button>
          ))}
        </div>

        {/* 參數設定列 */}
        <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
                <Users size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
                <select 
                  value={drawCount} 
                  onChange={(e) => setDrawCount(Number(e.target.value))}
                  className="w-full h-13 md:h-16 pl-12 pr-10 bg-slate-900/60 border border-white/5 rounded-2xl font-black text-xs md:text-lg text-white appearance-none outline-none cursor-pointer"
                >
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n} className="bg-slate-900">{n} 人並行抽獎</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>

            <div className="flex gap-4">
                <button 
                   onClick={handleHardReset}
                   disabled={isResetting}
                   className="flex-1 md:w-16 h-13 md:h-16 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-2xl flex items-center justify-center transition-all active:scale-90 border border-red-500/10"
                >
                   {isResetting ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />}
                </button>

                <button 
                  onClick={() => isUnlocked ? logoutAdmin() : setShowLoginModal(true)} 
                  className={`flex-1 md:w-16 h-13 md:h-16 rounded-2xl flex items-center justify-center transition-all border border-white/5 ${isUnlocked ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}
                >
                   {isUnlocked ? <Unlock size={18} /> : <Lock size={18} />}
                </button>
            </div>
        </div>
      </div>

      {/* 歷史榮譽牆 */}
      <div className="w-full max-w-4xl space-y-6 mt-16 md:mt-24 pb-64">
          <div className="flex items-center gap-4 px-4 border-l-4 border-yellow-500">
              <Star size={18} className="text-yellow-500" />
              <h4 className="text-[10px] md:text-lg font-black text-slate-500 uppercase tracking-[0.5em] italic">Honor Roll</h4>
          </div>
          
          <div className="space-y-4">
              {historyData.map(group => (
                  <div key={group.round} className="bg-slate-900/40 rounded-3xl overflow-hidden border border-white/5 backdrop-blur-2xl">
                      <div className="bg-white/5 px-6 py-4 flex justify-between items-center border-b border-white/5">
                          <div className="flex items-center gap-3">
                              <div className="w-9 h-9 md:w-12 md:h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center text-[10px] md:text-lg font-black italic">R{group.round}</div>
                              <span className="font-black text-slate-200 uppercase tracking-widest text-[11px] md:text-xl italic">ROUND {group.round}</span>
                          </div>
                          <span className="text-[9px] md:text-xs font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">{group.list.length} 位得獎</span>
                      </div>
                      
                      <div className="p-4 md:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {group.list.map((w) => (
                              <div key={`${w.id}-${group.round}`} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all group/item">
                                  <div className="min-w-0">
                                      <div className="font-black text-white text-sm md:text-lg truncate tracking-tight italic">{w.name}</div>
                                      <div className="text-[8px] md:text-[10px] text-slate-500 font-bold truncate mt-1 uppercase tracking-widest opacity-60">{w.title || '嘉賓'}</div>
                                  </div>
                                  {isUnlocked && (
                                      <button 
                                          onClick={(e) => { e.stopPropagation(); if(window.confirm(`撤銷「${w.name}」的中獎資格？`)) removeWinnerFromRound(w.id, group.round); }}
                                          className="w-8 h-8 md:w-9 md:h-9 bg-red-500/10 text-red-500 rounded-lg md:opacity-0 group-hover/item:opacity-100 transition-all flex items-center justify-center hover:bg-red-500 hover:text-white"
                                      >
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
        <div className="fixed inset-0 ios-blur bg-black/95 z-[500] flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 max-w-sm w-full shadow-3xl flex flex-col items-center gap-8 text-center animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black text-white tracking-tighter italic">ADMIN AUTH</h3>
            <form onSubmit={handleLoginSubmit} className="w-full space-y-6">
              <input type="password" placeholder="••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-2xl py-6 px-4 text-center text-5xl font-black text-white outline-none tracking-widest" autoFocus />
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-4 font-black text-slate-500 text-xs uppercase">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-xl text-xs uppercase shadow-xl">Unlock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LotteryPanel;
