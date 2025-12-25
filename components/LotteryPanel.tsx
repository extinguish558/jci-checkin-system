
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
  
  // 動畫計時器引用
  const animationTimerRef = useRef<any>(null);

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  }, []);

  const eligibleGuests = useMemo(() => guests.filter(g => g.isCheckedIn), [guests]);
  const currentRound = settings.lotteryRoundCounter;
  const currentPoolSize = useMemo(() => eligibleGuests.filter(g => !g.wonRounds?.includes(currentRound)).length, [eligibleGuests, currentRound]);

  // 進階拉霸動畫：變頻減速邏輯
  const runLotteryAnimation = useCallback((duration: number) => {
    let startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress < 1) {
        // 隨機選一個顯示
        const randomGuest = eligibleGuests[Math.floor(Math.random() * eligibleGuests.length)];
        if (randomGuest) {
          setCurrentSlotName({ name: randomGuest.name, title: randomGuest.title });
        }

        // 計算下一幀的延遲：隨著進度增加，延遲越來越長（減速）
        // 0-60% 進度：保持高速 (50ms)
        // 60-90% 進度：開始明顯減速 (100ms - 300ms)
        // 90-100% 進度：極慢定格感 (400ms - 800ms)
        let delay = 50;
        if (progress > 0.9) delay = 600;
        else if (progress > 0.7) delay = 300;
        else if (progress > 0.5) delay = 150;

        animationTimerRef.current = setTimeout(animate, delay);
      }
    };

    animate();
  }, [eligibleGuests]);

  const handleDraw = useCallback(() => {
    if (!isUnlocked) { setShowLoginModal(true); return; }
    if (currentPoolSize === 0) {
        alert("本輪已無可抽獎名額");
        return;
    }
    
    if (!window.confirm(`確認開始第 ${currentRound} 輪抽獎？\n本次將抽選出 ${drawCount} 位得獎者。`)) return;

    setIsAnimating(true);
    setBatchWinners([]);
    
    // 啟動變頻動畫，時長約 5.5 秒
    const animationDuration = 5500;
    runLotteryAnimation(animationDuration);
    
    // 動畫結束後正式產生成果
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
    }, animationDuration); 
  }, [isUnlocked, currentPoolSize, currentRound, drawCount, drawWinner, runLotteryAnimation]);

  const handleHardReset = async () => {
      if (!isUnlocked) { setShowLoginModal(true); return; }
      if (!window.confirm("【全域重置警告】\n確定要刪除所有輪次的得獎紀錄嗎？\n此動作將清空資料庫中所有中獎標籤，不可復原。")) return;
      
      setIsResetting(true);
      try {
          await resetLottery();
          setBatchWinners([]);
          setCurrentSlotName({ name: "READY", title: "CLICK TO START" });
          alert("抽獎紀錄已全數清空");
      } catch (e) {
          console.error(e);
          alert("重置失敗，請檢查網路連接");
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
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent"></div>
          {isAnimating && <div className="absolute inset-0 bg-white/5 animate-pulse"></div>}
        </div>

        {/* 框內標題列 */}
        <div className="absolute top-0 left-0 right-0 p-6 md:p-8 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent z-10">
           <div className="flex items-center gap-3 md:gap-4">
              <div className="p-2 md:p-3 bg-yellow-500 text-black rounded-xl md:rounded-2xl shadow-lg animate-bounce"><Trophy size={20} /></div>
              <div>
                 <h2 className="text-lg md:text-2xl font-black text-white tracking-tighter">第 {currentRound} 輪抽獎系統</h2>
                 <p className="text-[8px] md:text-[10px] font-black text-yellow-500/80 uppercase tracking-[0.2em]">Phase {currentRound} Live</p>
              </div>
           </div>
           <div className="flex items-center gap-2 px-3 md:px-5 py-1.5 md:py-2 bg-white/10 rounded-full border border-white/10 backdrop-blur-md">
              <Users size={14} className="text-indigo-400" />
              <span className="text-[10px] md:text-sm font-black text-white/80 tabular-nums">候選: {currentPoolSize} 人</span>
           </div>
        </div>

        {/* 動畫/結果主視窗 */}
        <div className="w-full h-full flex items-center justify-center p-4 md:p-12">
            {isAnimating ? (
              <div className="flex flex-col items-center gap-2 md:gap-4 text-center">
                <div className="relative">
                   <div className="text-2xl md:text-5xl font-black text-indigo-400/40 blur-[2px] mb-2">{currentSlotName.title}</div>
                   <div className="text-5xl md:text-[9rem] font-black text-white italic tracking-tighter drop-shadow-[0_0_40px_rgba(255,255,255,0.4)] animate-in fade-in zoom-in-50 duration-75">
                     {currentSlotName.name}
                   </div>
                   <div className="absolute -inset-10 bg-indigo-500/15 blur-[80px] rounded-full animate-pulse"></div>
                </div>
                <div className="mt-4 md:mt-8 flex gap-2">
                  {[1,2,3,4].map(i => <div key={i} className={`w-2 h-2 md:w-3 md:h-3 rounded-full bg-indigo-500 animate-bounce`} style={{animationDelay: `${i*0.15}s`}}></div>)}
                </div>
              </div>
            ) : batchWinners.length === 0 ? (
              <div className="group flex flex-col items-center gap-6 md:gap-8 text-center px-4">
                 <div className="relative">
                    <div className="w-28 h-28 md:w-48 md:h-48 bg-white/5 border border-white/10 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-500/10 transition-all duration-700">
                       <Play size={48} fill="white" className="ml-2 text-white group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <Star className="absolute -top-4 -right-4 text-yellow-500 animate-spin-slow" size={24} />
                 </div>
                 <div className="space-y-2 md:space-y-3">
                    <h1 className="text-3xl md:text-7xl font-black text-white tracking-tighter uppercase italic opacity-20 group-hover:opacity-100 transition-opacity">Ready to Win</h1>
                    <p className="text-slate-500 font-bold text-[10px] md:text-lg uppercase tracking-[0.4em] group-hover:text-indigo-400 transition-colors">點擊大框開始本輪抽獎</p>
                 </div>
              </div>
            ) : (
              <div className={`grid gap-3 md:gap-4 w-full h-full max-h-[80%] animate-in zoom-in-95 duration-1000 overflow-y-auto no-scrollbar py-10 px-2 md:px-4 ${
                batchWinners.length === 1 ? 'grid-cols-1' : 
                batchWinners.length <= 4 ? 'grid-cols-1 md:grid-cols-2' : 
                'grid-cols-2 lg:grid-cols-3'
              }`}>
                {batchWinners.map(w => (
                  <div key={w.id} className="bg-white/5 backdrop-blur-xl rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-12 border border-white/10 text-center shadow-2xl relative overflow-hidden group/card hover:bg-white/15 transition-all flex flex-col justify-center items-center">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500/80 to-transparent" />
                    <Sparkles size={20} className="absolute top-4 right-4 text-yellow-500 animate-pulse" />
                    <div className="text-yellow-500 font-black text-[8px] md:text-[10px] uppercase tracking-[0.3em] mb-2 md:mb-4">CONGRATULATIONS</div>
                    <div className="text-3xl md:text-6xl font-black text-white truncate w-full px-2 tracking-tighter leading-tight">{w.name}</div>
                    <div className="text-[10px] md:text-xl text-slate-400 font-bold truncate w-full mt-2 md:mt-4 uppercase tracking-widest leading-none">{w.title || '貴賓'}</div>
                  </div>
                ))}
              </div>
            )}
        </div>

        {!isAnimating && (
           <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-30 group-hover:opacity-100 transition-all">
              <div className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-white/60 text-[8px] md:text-[10px] font-black tracking-[0.3em] uppercase">Touch Screen to Start</div>
           </div>
        )}
      </div>

      {/* 控制中心操作列 - 手機版優化 */}
      <div className="mt-6 md:mt-12 w-full max-w-5xl bg-slate-900/40 p-3 md:p-4 rounded-[2rem] md:rounded-[3rem] border border-white/5 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* 輪次選擇 (R1-R5) */}
            <div className="flex bg-black/40 p-1 rounded-xl md:rounded-2xl gap-1 w-full md:w-auto">
              {[1, 2, 3, 4, 5].map(r => (
                <button 
                  key={r} 
                  onClick={() => isUnlocked ? jumpToLotteryRound(r) : setShowLoginModal(true)} 
                  className={`flex-1 md:w-12 h-10 md:h-12 rounded-lg md:rounded-xl font-black text-xs md:text-sm transition-all ${currentRound === r ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* 功能設定區 (人數、重置、解鎖) */}
            <div className="flex items-center justify-between w-full md:w-auto gap-2 md:gap-3">
               <div className="relative flex-1 md:flex-none">
                  <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <select 
                    value={drawCount} 
                    onChange={(e) => setDrawCount(Number(e.target.value))}
                    className="w-full md:w-auto h-12 md:h-14 pl-11 pr-10 bg-black/40 border-none rounded-xl md:rounded-2xl font-black text-sm md:text-lg text-white appearance-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 10, 15, 20].map(n => <option key={n} value={n}>{n} 人 / 抽</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
               </div>

               <div className="flex gap-2">
                 <button 
                   onClick={handleHardReset}
                   disabled={isResetting}
                   className={`w-12 md:w-14 h-12 md:h-14 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl md:rounded-2xl flex items-center justify-center transition-all active:scale-90 ${isResetting ? 'opacity-50' : ''}`}
                   title="清空得獎紀錄"
                 >
                   {isResetting ? <Loader2 size={20} className="animate-spin" /> : <RotateCcw size={20} />}
                 </button>

                 <button 
                   onClick={() => isUnlocked ? logoutAdmin() : setShowLoginModal(true)} 
                   className="w-12 md:w-14 h-12 md:h-14 bg-white/5 text-slate-400 hover:text-indigo-400 rounded-xl md:rounded-2xl flex items-center justify-center transition-all"
                 >
                   {isUnlocked ? <Unlock size={20} /> : <Lock size={20} />}
                 </button>
               </div>
            </div>
        </div>
      </div>

      {/* 歷史得獎紀錄區 */}
      <div className="w-full max-w-5xl space-y-6 md:space-y-8 mt-12 md:mt-16">
          <div className="px-4">
              <h4 className="text-[9px] md:text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
                  <Star size={14} className="text-yellow-500" />
                  各輪得獎歷史實況
              </h4>
          </div>
          
          <div className="space-y-4 md:space-y-6">
              {historyData.map(group => (
                  <div key={group.round} className="bg-slate-900/40 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border border-white/5 backdrop-blur-sm">
                      <div className="bg-white/5 px-6 md:px-10 py-4 md:py-5 flex justify-between items-center border-b border-white/5">
                          <div className="flex items-center gap-2 md:gap-3">
                              <div className="w-7 h-7 md:w-8 md:h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-[10px] md:text-xs font-black">{group.round}</div>
                              <span className="font-black text-slate-200 uppercase tracking-widest text-xs md:text-sm">ROUND {group.round}</span>
                          </div>
                          <span className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{group.list.length} WINNERS</span>
                      </div>
                      <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                          {group.list.map((w, idx) => (
                              <div key={`${w.id}-${group.round}`} className="flex items-center justify-between p-4 md:p-5 bg-white/5 rounded-xl md:rounded-2xl border border-white/5 hover:bg-white/10 transition-all group/item">
                                  <div className="min-w-0">
                                      <div className="font-black text-white text-base md:text-lg truncate tracking-tight">{w.name}</div>
                                      <div className="text-[8px] md:text-[10px] text-slate-500 font-bold truncate mt-0.5 md:mt-1 uppercase tracking-widest">{w.title || '貴賓'}</div>
                                  </div>
                                  {isUnlocked && (
                                      <button 
                                          onClick={(e) => { e.stopPropagation(); if(window.confirm(`確定撤回 ${w.name} 的中獎資格？`)) removeWinnerFromRound(w.id, group.round); }}
                                          className="w-7 h-7 md:w-8 md:h-8 bg-red-500/10 text-red-500 rounded-lg md:opacity-0 group-hover/item:opacity-100 transition-all flex items-center justify-center"
                                      >
                                          <X size={14} />
                                      </button>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
              {historyData.length === 0 && (
                 <div className="py-16 text-center text-slate-600 font-bold italic text-sm">暫無得獎紀錄</div>
              )}
          </div>
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 ios-blur bg-black/60 z-[300] flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10 max-w-xs w-full shadow-2xl flex flex-col items-center gap-6 md:gap-8 text-center">
            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">抽獎系統授權</h3>
            <form onSubmit={handleLoginSubmit} className="w-full space-y-4 md:space-y-6">
              <p className="text-[10px] font-bold text-indigo-400">系統密碼：3333</p>
              <input type="password" placeholder="••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 md:py-6 px-4 text-center text-3xl md:text-4xl font-black text-white focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all" autoFocus />
              <div className="flex gap-3 md:gap-4">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-3 md:py-4 font-black text-slate-500 text-xs md:text-sm">取消</button>
                <button type="submit" className="flex-1 py-3 md:py-4 bg-indigo-600 text-white font-black rounded-xl md:rounded-2xl shadow-xl active:scale-95 transition-transform text-xs md:text-sm">解鎖</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LotteryPanel;
