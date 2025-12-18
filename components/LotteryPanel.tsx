
import React, { useState, useEffect, useMemo } from 'react';
import { useEvent, DrawMode } from '../context/EventContext';
import { Trophy, Play, Sparkles, Star, PartyPopper, ChevronDown, Lock, Unlock, X } from 'lucide-react';
import { Guest } from '../types';

const LotteryPanel: React.FC = () => {
  const { drawWinner, guests, settings, jumpToLotteryRound, clearLotteryRound, isAdmin, loginAdmin, logoutAdmin } = useEvent();
  const [batchWinners, setBatchWinners] = useState<Guest[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  
  const [drawMode] = useState<DrawMode>('default');
  const [drawCount, setDrawCount] = useState<number>(1);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginAdmin(loginPassword)) {
        setShowLoginModal(false);
        setLoginPassword("");
    } else {
        alert("密碼錯誤");
    }
  };

  const eligibleGuests = useMemo(() => guests.filter(g => g.isCheckedIn), [guests]);
  const currentRound = settings.lotteryRoundCounter;

  const currentPoolSize = useMemo(() => {
    return eligibleGuests.filter(g => !g.wonRounds?.includes(currentRound)).length;
  }, [eligibleGuests, currentRound]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDraw = () => {
    if (currentPoolSize === 0) return;
    setIsAnimating(true);
    setBatchWinners([]);
    
    setTimeout(() => {
        setIsAnimating(false);
        const winners: Guest[] = [];
        const count = Math.min(drawCount, currentPoolSize);
        for (let i = 0; i < count; i++) {
            const w = drawWinner(drawMode);
            if (w) winners.push(w);
        }
        setBatchWinners(winners);
    }, 2000);
  };

  const groupedWinners = useMemo(() => {
      const groups: Record<number, Guest[]> = {};
      guests.forEach(g => {
          g.wonRounds?.forEach(r => {
              if (!groups[r]) groups[r] = [];
              groups[r].push(g);
          });
      });
      return Object.entries(groups).sort((a,b) => Number(b[0]) - Number(a[0]));
  }, [guests]);

  return (
    <div className="min-h-screen bg-[#F2F2F7] relative overflow-x-hidden flex flex-col items-center pb-40 px-4">
      
      {/* 活力慶典光暈 */}
      <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[60%] bg-blue-400/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[60%] bg-pink-400/10 blur-[120px] rounded-full animate-pulse pointer-events-none" />

      <div className="relative w-full max-w-6xl py-8 md:py-12 z-10 space-y-8 md:space-y-12">
        
        {/* Header Section */}
        <div className="flex flex-col gap-8 w-full items-center">
          {/* Title - Center Aligned */}
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 text-center leading-tight">
            {settings.eventName} <PartyPopper className="text-orange-500 inline-block mb-1 md:ml-2" size={32} />
          </h1>

          {/* Control Row - Integrated round selector and lock */}
          <div className="w-full flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 md:gap-5">
               <div className="bg-indigo-600/90 text-white px-5 py-2 rounded-full font-black text-sm md:text-base flex items-center gap-2 shadow-lg shadow-indigo-100 backdrop-blur-sm">
                 <Sparkles size={16} /> 第 {currentRound} 輪抽獎
               </div>
               <div className="text-xl md:text-2xl font-mono text-slate-400 font-black">
                {currentTime.toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' })}
               </div>

               {/* 輪次選擇器 - Moved to center row */}
               <div className="bg-white/80 backdrop-blur-xl p-1 rounded-xl flex gap-1 border border-white shadow-sm overflow-x-auto no-scrollbar ml-2">
                 {[1, 2, 3, 4, 5].map(r => (
                   <button 
                     key={r} 
                     onClick={() => jumpToLotteryRound(r)}
                     className={`w-9 h-9 md:w-10 md:h-10 rounded-lg font-black text-sm transition-all shrink-0 ${currentRound === r ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-white'}`}
                   >
                     {r}
                   </button>
                 ))}
               </div>
            </div>

            {/* Admin Lock - Moved to end of row */}
            <button onClick={() => isAdmin ? logoutAdmin() : setShowLoginModal(true)} className="p-3 bg-white rounded-2xl shadow-sm transition-all hover:bg-gray-50 border border-white shrink-0">
              {isAdmin ? <Unlock size={22} className="text-[#007AFF]"/> : <Lock size={22} className="text-gray-300"/>}
            </button>
          </div>
        </div>

        {/* 抽獎主舞台 */}
        <div className="relative min-h-[350px] md:aspect-[21/9] w-full bg-white/50 backdrop-blur-3xl rounded-[2.5rem] md:rounded-[3.5rem] border-4 border-white shadow-[0_40px_100px_rgba(0,0,0,0.06)] flex flex-col items-center justify-center overflow-hidden">
            
            {isAnimating && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-3xl animate-in fade-in duration-300">
                <div className="flex flex-col items-center gap-4">
                   <div className="text-[8rem] md:text-[14rem] font-black italic animate-bounce text-indigo-600">?</div>
                   <p className="text-indigo-400 font-black tracking-[0.3em] text-sm md:text-xl uppercase animate-pulse">LUCK IS COMING...</p>
                </div>
              </div>
            )}

            {batchWinners.length === 0 ? (
              <div className="text-center space-y-4 px-6">
                <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-6 rotate-3">
                   <Trophy size={40} className="text-amber-500" />
                </div>
                <div className="text-8xl md:text-[12rem] font-black tracking-tighter text-slate-950 leading-none tabular-nums">
                  {currentPoolSize}
                </div>
                <p className="text-slate-400 font-black text-lg md:text-2xl tracking-[0.3em] uppercase">待抽總人數</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 md:p-12 w-full animate-in zoom-in-95 duration-500 overflow-y-auto max-h-full">
                {batchWinners.map(w => (
                  <div key={w.id} className="bg-white rounded-[2rem] p-8 md:p-10 border border-white text-center space-y-3 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-500" />
                    <div className="text-indigo-600 font-black text-[10px] tracking-widest uppercase bg-indigo-50 py-1 px-3 rounded-full inline-block">CONGRATULATIONS</div>
                    <div className="text-4xl md:text-6xl font-black text-slate-950 truncate leading-tight">
                      {w.name}
                    </div>
                    <div className="text-lg md:text-xl text-slate-400 font-bold truncate">{w.title}</div>
                    <div className="pt-2 flex justify-center gap-1 opacity-40">
                       <Star className="text-amber-400 fill-amber-400" size={16} />
                       <Star className="text-amber-400 fill-amber-400" size={16} />
                       <Star className="text-amber-400 fill-amber-400" size={16} />
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* 控制區域 */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10">
           <div className="flex flex-col gap-2 w-full md:w-auto">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center md:text-left md:ml-4">抽取人數</span>
              <div className="relative">
                <select 
                  value={drawCount} 
                  onChange={e => setDrawCount(Number(e.target.value))}
                  className="w-full md:w-48 bg-white border-none text-slate-950 rounded-2xl px-8 py-5 text-2xl font-black appearance-none cursor-pointer shadow-sm hover:shadow-md transition-all text-center"
                >
                  {[1,2,3,4,5,10,20].map(n => <option key={n} value={n}>{n} 位</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                  <ChevronDown size={24} />
                </div>
           </div>
           </div>

           <button 
            onClick={handleDraw}
            disabled={isAnimating || currentPoolSize === 0}
            className="w-full md:w-auto h-24 md:h-28 px-16 md:px-24 bg-gradient-to-br from-indigo-600 to-indigo-500 text-white text-3xl md:text-4xl font-black rounded-[2rem] md:rounded-[2.5rem] shadow-2xl shadow-indigo-200 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-5"
           >
             <Play fill="white" size={32} />
             <span>{isAnimating ? '正在揭曉...' : '開始抽獎'}</span>
           </button>
        </div>

        {/* 歷史紀錄 */}
        {groupedWinners.length > 0 && (
          <div className="space-y-8 mt-12 md:mt-20">
            <div className="flex items-center gap-4 px-4">
                <div className="h-px bg-slate-200 flex-1" />
                <h3 className="text-lg md:text-xl font-black text-slate-300 tracking-widest uppercase">中獎歷史紀錄</h3>
                <div className="h-px bg-slate-200 flex-1" />
            </div>
            
            <div className="space-y-6">
               {groupedWinners.map(([round, list]) => (
                 <div key={round} className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-10 border border-white shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black border border-indigo-100">R{round}</div>
                        <h4 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">第 {round} 輪得獎名單</h4>
                      </div>
                      <button 
                        onClick={() => clearLotteryRound(Number(round))} 
                        className="text-red-500 font-bold text-[11px] bg-red-50 px-4 py-2 rounded-xl"
                      >
                        清空此輪
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                      {list.map(w => (
                        <div key={w.id} className="p-5 bg-white rounded-[1.5rem] border border-gray-100 text-center shadow-sm">
                           <div className="text-lg font-black text-slate-900 truncate">{w.name}</div>
                           <div className="text-[10px] text-slate-400 font-bold truncate mt-0.5">{w.title}</div>
                        </div>
                      ))}
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[250] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-8 max-xs w-full shadow-2xl flex flex-col items-center gap-6 border border-white/20">
            <h3 className="text-xl font-black text-black text-center tracking-tight">管理員授權</h3>
            <form onSubmit={handleLoginSubmit} className="w-full space-y-4">
              <input 
                type="password" 
                placeholder="密碼" 
                value={loginPassword} 
                onChange={e => setLoginPassword(e.target.value)}
                className="w-full bg-[#F2F2F7] border-none rounded-2xl py-5 px-4 text-center text-3xl font-black outline-none focus:ring-4 focus:ring-[#007AFF]/20 transition-all"
                autoFocus
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-4 font-black text-gray-400">取消</button>
                <button type="submit" className="flex-1 py-4 bg-[#007AFF] text-white font-black rounded-2xl shadow-xl shadow-blue-200 active:scale-95 transition-all">確認</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LotteryPanel;
