
import React, { useState, useEffect, useMemo } from 'react';
import { useEvent, DrawMode } from '../context/EventContext';
import { Trophy, Play, PartyPopper, Settings2, SkipForward, Users, CheckCircle, Circle, Repeat, Download, FileSpreadsheet, Trash2, Clock } from 'lucide-react';
import { Guest } from '../types';
import { exportToExcel } from '../services/geminiService';

const LotteryPanel: React.FC = () => {
  const { drawWinner, guests, settings, jumpToLotteryRound, clearLotteryRound, isAdmin } = useEvent();
  const [currentWinner, setCurrentWinner] = useState<Guest | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [drawMode, setDrawMode] = useState<DrawMode>('default');
  const [showSettings, setShowSettings] = useState(false);

  // Filter only Checked In guests
  const eligibleGuests = useMemo(() => guests.filter(g => g.isCheckedIn), [guests]);
  
  // Current Round Info
  const currentRound = settings.lotteryRoundCounter;

  // Stats Calculations (Per Round)
  const totalPool = eligibleGuests.length;
  const roundWinners = eligibleGuests.filter(g => g.wonRounds && g.wonRounds.includes(currentRound)).length;
  const roundAvailable = totalPool - roundWinners;

  const getPoolSize = () => {
      switch(drawMode) {
          case 'winners_only': 
             return eligibleGuests.filter(g => g.isWinner && !g.wonRounds?.includes(currentRound)).length;
          case 'all': 
          case 'default': 
             return roundAvailable;
          default: return roundAvailable;
      }
  };
  
  const currentPoolSize = getPoolSize();

  const groupedWinners = useMemo(() => {
      const groups: Record<number, Guest[]> = {};
      guests.forEach(g => {
          if (g.wonRounds && g.wonRounds.length > 0) {
              g.wonRounds.forEach(round => {
                  if (!groups[round]) groups[round] = [];
                  groups[round].push(g);
              });
          }
      });
      return Object.entries(groups)
        .sort(([rA], [rB]) => Number(rB) - Number(rA))
        .map(([round, list]) => ({
            round: Number(round),
            list: list
        }));
  }, [guests]); 

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDraw = () => {
    setIsAnimating(true);
    setCurrentWinner(null);
    
    setTimeout(() => {
        setIsAnimating(false);
        const winner = drawWinner(drawMode);
        if (winner) setCurrentWinner(winner);
        else alert(getNoCandidateMessage(drawMode));
    }, 2000);
  };

  const handleSelectRound = (round: number) => {
      jumpToLotteryRound(round);
      setCurrentWinner(null);
  }

  const handleDownloadWinners = () => {
      if (guests.length === 0) return alert("目前沒有資料可以下載");
      exportToExcel(guests, settings.eventName);
  };
  
  const handleClearRound = (round: number) => {
      clearLotteryRound(round);
  };

  const getNoCandidateMessage = (mode: DrawMode) => {
      switch(mode) {
          case 'winners_only': return "沒有已中獎者可供抽選 (或本輪已全數中獎)";
          case 'all': return "沒有參加者";
          default: return "本輪已無可供抽選的人員 (所有人皆已中獎)！";
      }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 text-white p-4 flex flex-col items-center pb-24">
      <div className="w-full max-w-5xl flex flex-col h-full">
        
        {/* Header Layout Optimized */}
        <div className="flex flex-col mb-8 gap-6 shrink-0">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500 drop-shadow-sm leading-tight">
                        {settings.eventName || "活動抽獎"}
                    </h1>
                    <div className="text-indigo-200 mt-2 flex items-center gap-2">
                        <Trophy size={20} className="text-yellow-400" /> 
                        <span className="text-white/80 font-medium">目前進行中：</span> 
                        <span className="text-yellow-400 font-black text-2xl">第 {currentRound} 輪</span>
                    </div>
                </div>
                
                <div className="text-right hidden md:block ml-4">
                    <div className="text-4xl font-mono font-bold text-white/90 flex items-center gap-2 justify-end">
                        <Clock size={28} className="text-indigo-300" />
                        {currentTime.toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <button onClick={() => setShowSettings(!showSettings)} className="mt-3 text-white/50 hover:text-white flex items-center gap-1 ml-auto text-sm font-bold bg-white/5 px-3 py-1 rounded-full border border-white/10 transition-colors">
                        <Settings2 size={14} /> 抽獎模式設定
                    </button>
                </div>
            </div>

            {/* Round Buttons - 手機平板置中顯示優化 */}
            <div className="flex items-center justify-center lg:justify-start gap-4">
                <div className="flex bg-black/40 p-1.5 rounded-2xl gap-1.5 border border-white/10 shadow-inner overflow-x-auto max-w-full no-scrollbar">
                    {[1, 2, 3, 4, 5].map(r => (
                        <button
                            key={r}
                            onClick={() => handleSelectRound(r)}
                            className={`px-4 sm:px-8 py-2.5 rounded-xl font-black text-base whitespace-nowrap transition-all duration-300
                                ${currentRound === r 
                                    ? 'bg-gradient-to-b from-yellow-300 to-yellow-500 text-indigo-950 shadow-[0_0_15px_rgba(234,179,8,0.4)] scale-105' 
                                    : 'text-white/50 hover:bg-white/10 hover:text-white'}
                            `}
                        >
                            <span className="sm:hidden">R{r}</span>
                            <span className="hidden sm:inline">第 {r} 輪</span>
                        </button>
                    ))}
                </div>
                <div className="text-xs text-white/30 font-bold uppercase tracking-widest hidden lg:block">切換輪次</div>
            </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
            <div className="mb-6 bg-indigo-950/50 backdrop-blur-md p-3 rounded-2xl text-center flex flex-wrap justify-center gap-3 border border-indigo-500/30 animate-in slide-in-from-top-2 duration-300">
                 {(['default', 'all', 'winners_only'] as DrawMode[]).map(mode => (
                    <button 
                        key={mode} 
                        onClick={() => setDrawMode(mode)} 
                        className={`px-4 py-2 rounded-xl text-sm transition-all font-bold border ${drawMode === mode ? 'bg-yellow-500 text-indigo-950 border-yellow-400 shadow-lg' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
                    >
                        {mode === 'default' ? '🎯 標準 (獨立輪次)' : (mode === 'all' ? '🔥 大亂鬥 (不限資格)' : '💎 獎上加獎 (限已中獎者)')}
                    </button>
                 ))}
            </div>
        )}

        {/* Main Stage */}
        <div className="bg-white/10 backdrop-blur-lg rounded-[2.5rem] p-8 text-center border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)] mb-8 min-h-[300px] md:min-h-[350px] flex flex-col justify-center items-center relative overflow-hidden shrink-0 group">
            <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/10 to-transparent pointer-events-none"></div>
            
            {isAnimating && (
                <div className="absolute inset-0 flex items-center justify-center bg-indigo-950/90 z-20 backdrop-blur-md">
                    <div className="relative">
                        <div className="text-8xl font-black text-yellow-400 animate-bounce drop-shadow-[0_0_30px_rgba(250,204,21,0.6)]">?</div>
                        <div className="mt-4 text-indigo-200 font-bold tracking-[0.3em] animate-pulse">SYSTEM DRAWING...</div>
                    </div>
                </div>
            )}

            {!currentWinner && !isAnimating && (
                <div className="text-white/50 animate-in fade-in duration-700">
                    <Trophy size={80} className="mx-auto mb-4 opacity-20 text-yellow-500"/>
                    <div className="text-2xl font-medium mb-1">第 {currentRound} 輪 抽獎池</div>
                    <div className="text-5xl font-black text-white mb-4">{currentPoolSize} <span className="text-xl font-normal text-white/40">位符合資格</span></div>
                    <p className="text-sm bg-black/20 inline-block px-4 py-2 rounded-full border border-white/5">點擊下方 START 按鈕開始隨機抽選</p>
                </div>
            )}

            {currentWinner && !isAnimating && (
                <div className="animate-bounce-in w-full relative z-10">
                    <div className="text-yellow-400 mb-3 font-black tracking-[0.5em] uppercase text-xl drop-shadow-md">WINNER</div>
                    
                    {currentWinner.title && (
                        <div className="text-2xl md:text-3xl text-indigo-200 font-bold mb-3 drop-shadow-md bg-indigo-500/20 inline-block px-6 py-1 rounded-full border border-indigo-400/30">
                            {currentWinner.title}
                        </div>
                    )}
                    
                    <div className="text-7xl md:text-9xl font-black mb-6 text-white drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)] tracking-tight">
                        {currentWinner.name}
                    </div>
                    
                    <div className="flex justify-center gap-3">
                        <span className="text-xl font-bold bg-white text-indigo-900 px-6 py-2 rounded-2xl shadow-xl">{currentWinner.category}</span>
                        {currentWinner.code && <span className="text-xl font-bold bg-indigo-600/80 text-white px-6 py-2 rounded-2xl shadow-xl border border-white/20">#{currentWinner.code}</span>}
                    </div>
                </div>
            )}
        </div>

        {/* Controls & Stats */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-10 w-full max-w-4xl mx-auto shrink-0 px-4">
            <div className="flex gap-6 bg-black/30 backdrop-blur-sm p-4 rounded-[2rem] border border-white/10 shadow-xl">
                <div className="text-center px-4">
                    <div className="text-xs text-indigo-300 font-black mb-1 flex items-center justify-center gap-1 uppercase tracking-widest"><Users size={14}/> 本輪名單</div>
                    <div className="text-3xl font-black text-white">{currentPoolSize}</div>
                </div>
                <div className="w-px bg-white/10 h-10 self-center"></div>
                <div className="text-center px-4">
                    <div className="text-xs text-green-400 font-black mb-1 flex items-center justify-center gap-1 uppercase tracking-widest"><CheckCircle size={14}/> 本輪已中</div>
                    <div className="text-3xl font-black text-green-400">{roundWinners}</div>
                </div>
            </div>

            <button
                onClick={handleDraw}
                disabled={isAnimating || currentPoolSize === 0}
                className="group relative bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-600 text-indigo-950 text-4xl font-black py-6 px-16 rounded-[2.5rem] shadow-[0_15px_40px_rgba(234,179,8,0.4)] hover:shadow-[0_20px_50px_rgba(234,179,8,0.6)] hover:-translate-y-1 active:translate-y-0.5 transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed min-w-[280px]"
            >
                <div className="flex items-center justify-center gap-4">
                    <Play fill="currentColor" size={32} className="group-hover:scale-110 transition-transform" /> 
                    <span>{isAnimating ? '...' : 'START'}</span>
                </div>
            </button>
        </div>

        {/* Winner List */}
        {groupedWinners.length > 0 && (
            <div className="w-full flex-1 min-h-0 flex flex-col">
                 <div className="flex justify-between items-end mb-4 shrink-0 px-4">
                     <h3 className="text-white/40 text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2">
                        <FileSpreadsheet size={16} /> 得獎名單歷程錄
                     </h3>
                     <button onClick={handleDownloadWinners} className="text-sm flex items-center gap-2 text-green-400 hover:text-indigo-950 hover:bg-green-400 font-black border border-green-400/30 px-5 py-2 rounded-xl bg-green-400/5 transition-all">
                         <Download size={16}/> 匯出 Excel
                     </button>
                 </div>
                 
                 <div className="overflow-y-auto custom-scrollbar space-y-6 pr-2 pb-10 flex-1 px-2">
                    {groupedWinners.map((group) => (
                        <div key={group.round} className={`rounded-3xl border overflow-hidden transition-all duration-500 ${group.round === currentRound ? 'bg-white/10 border-yellow-500/50 shadow-[0_10px_30px_rgba(234,179,8,0.1)]' : 'bg-white/5 border-white/5'}`}>
                            <div className={`px-6 py-4 font-black flex items-center justify-between sticky top-0 z-10 backdrop-blur-xl ${group.round === currentRound ? 'text-yellow-400 bg-yellow-500/10' : 'text-slate-400 bg-white/5'}`}>
                                <span className="flex items-center gap-3 text-lg">
                                    <PartyPopper size={22} className={group.round === currentRound ? 'text-yellow-400' : 'text-slate-500'} /> 
                                    第 {group.round} 輪 <span className="text-sm font-bold opacity-60 ml-2">({group.list.length} 位獲獎者)</span>
                                </span>
                                <button 
                                    onClick={() => handleClearRound(group.round)}
                                    className="text-xs font-black flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white px-3 py-1.5 rounded-lg border border-red-500/20 transition-all"
                                >
                                    <Trash2 size={14}/> 清除此輪
                                </button>
                            </div>
                            <div className="p-5 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {group.list.map((winner) => (
                                    <div key={`${winner.id}-${group.round}`} className="bg-black/30 p-4 rounded-2xl border border-white/5 text-center relative group hover:border-yellow-500/30 transition-all hover:bg-black/50">
                                        <div className="text-xl font-black text-white truncate group-hover:text-yellow-400 transition-colors">{winner.name}</div>
                                        <div className="text-xs text-indigo-300 truncate mt-1 font-medium">{winner.title || '貴賓'}</div>
                                        <div className="mt-2 flex justify-center">
                                            <span className="text-[10px] font-black text-white/30 bg-white/5 px-2 py-0.5 rounded uppercase tracking-wider">{winner.category}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default LotteryPanel;
