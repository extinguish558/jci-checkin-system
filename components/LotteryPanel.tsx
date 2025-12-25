
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useEvent } from '../context/EventContext';
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
  
  // 動畫計時器引用，用於精確控制減速階段
  const animationTimerRef = useRef<any>(null);

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  }, []);

  const eligibleGuests = useMemo(() => guests.filter(g => g.isCheckedIn), [guests]);
  const currentRound = settings.lotteryRoundCounter;
  const currentPoolSize = useMemo(() => eligibleGuests.filter(g => !g.wonRounds?.includes(currentRound)).length, [eligibleGuests, currentRound]);

  // 高階變頻拉霸邏輯：模擬慣性減速
  const runSlotAnimation = useCallback((totalDuration: number) => {
    const startTime = Date.now();
    
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / totalDuration;

      if (progress < 1) {
        // 更新顯示名稱
        const randomGuest = eligibleGuests[Math.floor(Math.random() * eligibleGuests.length)];
        if (randomGuest) {
          setCurrentSlotName({ name: randomGuest.name, title: randomGuest.title });
        }

        // 動態延遲計算 (減速公式)
        // 0-40%: 40ms (超高速)
        // 40-75%: 40ms -> 200ms (線性減速)
        // 75-95%: 200ms -> 600ms (極慢爬行)
        // 95-100%: 800ms (最終定格前震盪)
        let nextDelay = 40;
        if (progress > 0.95) nextDelay = 850;
        else if (progress > 0.85) nextDelay = 600;
        else if (progress > 0.7) nextDelay = 350;
        else if (progress > 0.4) nextDelay = 40 + (progress - 0.4) * 500;

        animationTimerRef.current = setTimeout(tick, nextDelay);
      }
    };

    tick();
  }, [eligibleGuests]);

  const handleDraw = useCallback(() => {
    if (!isUnlocked) { setShowLoginModal(true); return; }
    if (currentPoolSize === 0) {
        alert("本輪已無可抽獎名額");
        return;
    }
    
    if (!window.confirm(`【確認開始】\n第 ${currentRound} 輪抽獎，共 ${drawCount} 位名額。\n準備好開始了嗎？`)) return;

    setIsAnimating(true);
    setBatchWinners([]); // 清除上次結果
    
    // 動畫總長度約 7.5 秒，營造強烈緊張感
    const ANIMATION_DURATION = 7500;
    runSlotAnimation(ANIMATION_DURATION);
    
    setTimeout(() => {
        clearTimeout(animationTimerRef.current);
        setIsAnimating(false);
        
        const winners: Guest[] = [];
        const count = Math.min(drawCount, currentPoolSize);
        for (let i = 0; i < count; i++) {
            const w = drawWinner();
            if (w) winners.push(w);
        }
        setBatchWinners(winners);
    }, ANIMATION_DURATION + 500); 
  }, [isUnlocked, currentPoolSize, currentRound, drawCount, drawWinner, runSlotAnimation]);

  // 修復重置功能：確保 UI 同步更新
  const handleHardReset = async () => {
      if (!isUnlocked) { setShowLoginModal(true); return; }
      if (!window.confirm("【全域系統重置】\n確定要清空所有得獎紀錄並回到第 1 輪嗎？\n此操作無法撤回！")) return;
      
      setIsResetting(true);
      try {
          // 清除組件本地顯示狀態
          setBatchWinners([]);
          setCurrentSlotName({ name: "READY", title: "CLICK TO START" });
          
          // 執行 Context 中的重置 (包含 Firebase 同步)
          await resetLottery();
          
          // 強制跳回第一輪 (Context 內的 resetLottery 已包含此邏輯，這裡再次確保)
          jumpToLotteryRound(1);
          
          alert("系統已完成重置！");
      } catch (e) {
          console.error(e);
          alert("重置過程發生錯誤");
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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center pb-48 px-4 md:px-8">
      
      {/* 沉浸式大螢幕得獎框 */}
      <div 
        onClick={() => !isAnimating && handleDraw()}
        className={`group relative mt-4 md:mt-10 w-full max-w-7xl h-[60vh] md:h-[68vh] rounded-[2.5rem] md:rounded-[4rem] flex flex-col items-center justify-center cursor-pointer transition-all duration-1000 border-4 overflow-hidden
          ${isAnimating 
            ? 'bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 border-indigo-500/50 shadow-[0_0_120px_rgba(99,102,241,0.25)]' 
            : batchWinners.length > 0 
              ? 'bg-slate-900 border-yellow-500/40 shadow-[0_0_100px_rgba(234,179,8,0.2)]'
              : 'bg-slate-900 border-white/5 hover:border-indigo-500/30 shadow-2xl'
          }`}
      >
        {/* 動態星光特效 */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent"></div>
          {isAnimating && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 animate-pulse"></div>}
        </div>

        {/* 框內邊緣標題列 */}
        <div className="absolute top-0 left-0 right-0 p-6 md:p-10 flex flex-col md:flex-row justify-between items-center gap-4 bg-gradient-to-b from-black/60 to-transparent z-10">
           <div className="flex items-center gap-3 md:gap-5">
              <div className="p-3 md:p-4 bg-yellow-500 text-black rounded-2xl md:rounded-3xl shadow-[0_0_20px_rgba(234,179,8,0.4)] animate-bounce"><Trophy size={24} /></div>
              <div className="text-center md:text-left">
                 <h2 className="text-xl md:text-3xl font-black text-white tracking-tighter uppercase">第 {currentRound} 輪 抽獎儀表板</h2>
                 <p className="text-[9px] md:text-[11px] font-black text-yellow-500/80 uppercase tracking-[0.4em] mt-1">LOTTERY PHASE {currentRound} SYSTEM LIVE</p>
              </div>
           </div>
           <div className="flex items-center gap-3 px-6 py-2 bg-white/10 rounded-full border border-white/10 backdrop-blur-md">
              <Users size={16} className="text-indigo-400" />
              <span className="text-xs md:text-base font-black text-white/90 tabular-nums">候選名單: {currentPoolSize} 人</span>
           </div>
        </div>

        {/* 核心顯示區：拉霸動畫 / 得獎名單 */}
        <div className="w-full h-full flex items-center justify-center p-6 md:p-12 mt-10 md:mt-20">
            {isAnimating ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="relative">
                   <div className="text-3xl md:text-6xl font-black text-indigo-400/30 blur-[2px] mb-2">{currentSlotName.title}</div>
                   <div className="text-6xl md:text-[10rem] font-black text-white italic tracking-tighter drop-shadow-[0_0_50px_rgba(255,255,255,0.4)] transition-all">
                     {currentSlotName.name}
                   </div>
                   <div className="absolute -inset-16 bg-indigo-500/10 blur-[100px] rounded-full animate-pulse"></div>
                </div>
                <div className="mt-8 flex gap-3">
                  {[1,2,3,4].map(i => <div key={i} className={`w-3 h-3 md:w-4 md:h-4 rounded-full bg-indigo-500 animate-bounce`} style={{animationDelay: `${i*0.2}s`}}></div>)}
                </div>
              </div>
            ) : batchWinners.length === 0 ? (
              <div className="group flex flex-col items-center gap-8 text-center">
                 <div className="relative">
                    <div className="w-32 h-32 md:w-56 md:h-56 bg-white/5 border border-white/10 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-500/10 transition-all duration-700">
                       <Play size={64} fill="white" className="ml-2 text-white group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <Star className="absolute -top-4 -right-4 text-yellow-500 animate-spin-slow" size={32} />
                 </div>
                 <div className="space-y-3">
                    <h1 className="text-4xl md:text-8xl font-black text-white tracking-tighter uppercase italic opacity-20 group-hover:opacity-100 transition-all duration-700">READY TO WIN</h1>
                    <p className="text-slate-500 font-bold text-xs md:text-xl uppercase tracking-[0.5em] group-hover:text-indigo-400 transition-colors">點擊螢幕區域 開始本輪抽獎</p>
                 </div>
              </div>
            ) : (
              <div className={`grid gap-4 md:gap-6 w-full h-full max-h-[85%] animate-in zoom-in-95 duration-1000 overflow-y-auto no-scrollbar py-10 px-4 ${
                batchWinners.length === 1 ? 'grid-cols-1' : 
                batchWinners.length <= 4 ? 'grid-cols-1 md:grid-cols-2' : 
                'grid-cols-2 lg:grid-cols-3'
              }`}>
                {batchWinners.map(w => (
                  <div key={w.id} className="bg-white/5 backdrop-blur-2xl rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-14 border border-white/10 text-center shadow-2xl relative overflow-hidden group/card hover:bg-white/15 transition-all flex flex-col justify-center items-center">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-yellow-500 to-transparent" />
                    <Sparkles size={28} className="absolute top-6 right-6 text-yellow-500 animate-pulse" />
                    <div className="text-yellow-500 font-black text-[10px] md:text-xs uppercase tracking-[0.4em] mb-4 md:mb-6">LUCKY WINNER</div>
                    <div className="text-4xl md:text-8xl font-black text-white truncate w-full px-2 tracking-tighter leading-none">{w.name}</div>
                    <div className="text-sm md:text-2xl text-slate-400 font-bold truncate w-full mt-4 md:mt-8 uppercase tracking-[0.2em]">{w.title || '貴賓'}</div>
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* 底部導引 */}
        {!isAnimating && (
           <div className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-30 group-hover:opacity-100 group-hover:translate-y-[-10px] transition-all">
              <div className="px-10 py-3 bg-white/5 border border-white/10 rounded-full text-white/60 text-[10px] md:text-xs font-black tracking-[0.4em] uppercase">CLICK ANYWHERE TO START</div>
           </div>
        )}
      </div>

      {/* 控制中心：手機版優化佈局 */}
      <div className="mt-8 md:mt-14 w-full max-w-5xl bg-slate-900/40 p-4 md:p-5 rounded-[2.5rem] md:rounded-[4rem] border border-white/5 backdrop-blur-2xl">
        <div className="flex flex-col gap-4">
            
            {/* 上層：輪次選擇 (寬度撐滿) */}
            <div className="flex bg-black/40 p-1.5 rounded-2xl md:rounded-[2rem] gap-1.5 w-full">
              {[1, 2, 3, 4, 5].map(r => (
                <button 
                  key={r} 
                  onClick={() => isUnlocked ? jumpToLotteryRound(r) : setShowLoginModal(true)} 
                  className={`flex-1 h-12 md:h-14 rounded-xl md:rounded-2xl font-black text-sm md:text-lg transition-all ${currentRound === r ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  R{r}
                </button>
              ))}
            </div>

            {/* 下層：功能設定 (抽獎人數、重置、解鎖) */}
            <div className="flex items-center gap-3 w-full">
               <div className="relative flex-1">
                  <Users size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <select 
                    value={drawCount} 
                    onChange={(e) => setDrawCount(Number(e.target.value))}
                    className="w-full h-14 md:h-16 pl-14 pr-10 bg-black/40 border-none rounded-2xl md:rounded-[2rem] font-black text-base md:text-xl text-white appearance-none focus:ring-4 focus:ring-indigo-500/20 transition-all cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 10, 15, 20].map(n => <option key={n} value={n}>{n} 人 / 次</option>)}
                  </select>
                  <ChevronDown size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
               </div>

               <button 
                 onClick={handleHardReset}
                 disabled={isResetting}
                 className={`w-14 md:w-16 h-14 md:h-16 bg-red-500/15 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl md:rounded-[2rem] flex items-center justify-center transition-all active:scale-90 ${isResetting ? 'animate-pulse' : ''}`}
                 title="全域重置"
               >
                 {isResetting ? <Loader2 size={24} className="animate-spin" /> : <RotateCcw size={24} />}
               </button>

               <button 
                 onClick={() => isUnlocked ? logoutAdmin() : setShowLoginModal(true)} 
                 className={`w-14 md:w-16 h-14 md:h-16 rounded-2xl md:rounded-[2rem] flex items-center justify-center transition-all ${isUnlocked ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-slate-400'}`}
               >
                 {isUnlocked ? <Unlock size={24} /> : <Lock size={24} />}
               </button>
            </div>
        </div>
      </div>

      {/* 歷史得獎名單 */}
      <div className="w-full max-w-5xl space-y-8 mt-16 md:mt-24">
          <div className="flex items-center justify-between px-6">
              <h4 className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-[0.5em] flex items-center gap-4">
                  <Star size={16} className="text-yellow-500" />
                  各輪得獎歷史實況
              </h4>
          </div>
          
          <div className="space-y-6 md:space-y-10">
              {historyData.map(group => (
                  <div key={group.round} className="bg-slate-900/40 rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden border border-white/5 backdrop-blur-xl">
                      <div className="bg-white/5 px-8 md:px-12 py-5 md:py-7 flex justify-between items-center border-b border-white/5">
                          <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-xs font-black">R{group.round}</div>
                              <span className="font-black text-slate-200 uppercase tracking-[0.2em] text-sm md:text-lg">ROUND {group.round} WINNERS</span>
                          </div>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{group.list.length} LUCKY GUESTS</span>
                      </div>
                      <div className="p-6 md:p-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
                          {group.list.map((w, idx) => (
                              <div key={`${w.id}-${group.round}`} className="flex items-center justify-between p-5 md:p-6 bg-white/5 rounded-2xl md:rounded-3xl border border-white/5 hover:bg-white/10 transition-all group/item">
                                  <div className="min-w-0">
                                      <div className="font-black text-white text-lg md:text-xl truncate tracking-tight">{w.name}</div>
                                      <div className="text-[10px] md:text-xs text-slate-500 font-bold truncate mt-1 uppercase tracking-widest">{w.title || '貴賓'}</div>
                                  </div>
                                  {isUnlocked && (
                                      <button 
                                          onClick={(e) => { e.stopPropagation(); if(window.confirm(`確定撤回 ${w.name} 的中獎資格嗎？`)) removeWinnerFromRound(w.id, group.round); }}
                                          className="w-9 h-9 bg-red-500/15 text-red-500 rounded-xl md:opacity-0 group-hover/item:opacity-100 transition-all flex items-center justify-center hover:bg-red-500 hover:text-white"
                                      >
                                          <X size={16} />
                                      </button>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
              {historyData.length === 0 && (
                 <div className="py-20 text-center bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                    <Star size={32} className="mx-auto text-slate-800 mb-4" />
                    <p className="text-slate-600 font-black italic tracking-widest">目前尚無得獎紀錄</p>
                 </div>
              )}
          </div>
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 ios-blur bg-black/60 z-[300] flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-white/10 rounded-[3rem] p-10 max-w-xs w-full shadow-2xl flex flex-col items-center gap-8 text-center">
            <h3 className="text-2xl font-black text-white tracking-tight">抽獎系統授權</h3>
            <form onSubmit={handleLoginSubmit} className="w-full space-y-6">
              <p className="text-[10px] font-bold text-indigo-400">密碼提示：3333</p>
              <input type="password" placeholder="••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 px-4 text-center text-4xl font-black text-white focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all" autoFocus />
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-4 font-black text-slate-500">取消</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-transform">解鎖</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LotteryPanel;
