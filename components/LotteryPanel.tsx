import React, { useState, useEffect, useMemo } from 'react';
import { useEvent, DrawMode } from '../context/EventContext';
import { Trophy, Play, PartyPopper, Settings2, SkipForward, Users, CheckCircle, Circle, Repeat } from 'lucide-react';
import { Guest } from '../types';

const LotteryPanel: React.FC = () => {
  const { drawWinner, guests, settings, jumpToLotteryRound } = useEvent();
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
  // Total Checked In (Base Pool)
  const totalPool = eligibleGuests.length;
  // Winners IN THIS ROUND
  const roundWinners = eligibleGuests.filter(g => g.wonRounds && g.wonRounds.includes(currentRound)).length;
  // Available to win IN THIS ROUND
  const roundAvailable = totalPool - roundWinners;

  const getPoolSize = () => {
      switch(drawMode) {
          case 'winners_only': 
             // Logic: Must be a winner from OTHER rounds, but NOT this round
             return eligibleGuests.filter(g => g.isWinner && !g.wonRounds?.includes(currentRound)).length;
          case 'all': 
          case 'default': 
             // Standard: Checked in AND hasn't won this round
             return roundAvailable;
          default: return roundAvailable;
      }
  };
  
  const currentPoolSize = getPoolSize();

  // Group winners by Round, sort rounds descending
  const groupedWinners = useMemo(() => {
      const groups: Record<number, Guest[]> = {};
      
      // Iterate all guests to find winners of each round
      guests.forEach(g => {
          if (g.wonRounds && g.wonRounds.length > 0) {
              g.wonRounds.forEach(round => {
                  if (!groups[round]) groups[round] = [];
                  groups[round].push(g);
              });
          }
      });

      // Sort rounds descending (e.g., 5, 4, 3, 2, 1)
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
        {/* Top Bar with Round Selectors */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4 shrink-0">
            <div className="flex items-center gap-4">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500 drop-shadow-sm text-center md:text-left">
                        {settings.eventName || "活動抽獎"}
                    </h1>
                    <div className="text-indigo-200 mt-1 flex items-center justify-center md:justify-start gap-2">
                        <Trophy size={16} /> <span className="text-white/80">目前進行：</span> <span className="text-yellow-400 font-bold text-xl">第 {currentRound} 輪</span>
                    </div>
                </div>
            </div>

            {/* Round Buttons */}
            <div className="flex bg-black/30 p-1.5 rounded-xl gap-1 overflow-x-auto max-w-full">
                {[1, 2, 3, 4, 5].map(r => (
                    <button
                        key={r}
                        onClick={() => handleSelectRound(r)}
                        className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all
                            ${currentRound === r 
                                ? 'bg-yellow-500 text-black shadow-lg scale-105' 
                                : 'text-white/60 hover:bg-white/10 hover:text-white'}
                        `}
                    >
                        第 {r} 輪
                    </button>
                ))}
            </div>

            <div className="text-right hidden md:block">
                <div className="text-3xl font-mono font-bold text-white/90">
                    {currentTime.toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                </div>
                <button onClick={() => setShowSettings(!showSettings)} className="mt-2 text-white/50 hover:text-white flex items-center gap-1 ml-auto text-xs">
                    <Settings2 size={12} /> 設定
                </button>
            </div>
        </div>

        {/* Settings */}
        {showSettings && (
            <div className="mb-4 bg-black/30 p-2 rounded-lg text-center flex justify-center gap-2 shrink-0">
                 {(['default', 'all', 'winners_only'] as DrawMode[]).map(mode => (
                    <button key={mode} onClick={() => setDrawMode(mode)} className={`px-3 py-1 rounded text-xs ${drawMode === mode ? 'bg-yellow-500 text-black font-bold' : 'bg-white/10'}`}>
                        {mode === 'default' ? '標準 (獨立輪次)' : (mode === 'all' ? '大亂鬥' : '獎上加獎')}
                    </button>
                 ))}
            </div>
        )}

        {/* Main Stage */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 text-center border border-white/20 shadow-2xl mb-6 min-h-[250px] md:min-h-[300px] flex flex-col justify-center items-center relative overflow-hidden shrink-0">
            {isAnimating && (
                <div className="absolute inset-0 flex items-center justify-center bg-indigo-900/90 z-20 backdrop-blur-sm">
                    <div className="text-6xl font-black text-yellow-400 animate-bounce">?</div>
                </div>
            )}

            {!currentWinner && !isAnimating && (
                <div className="text-white/50">
                    <Trophy size={60} className="mx-auto mb-2 opacity-50"/>
                    <p className="text-lg">第 {currentRound} 輪抽獎池: <span className="text-white font-bold">{currentPoolSize}</span> 人</p>
                    <p className="text-sm mt-2 opacity-70">點擊 START 開始抽獎 (所有已報到且本輪未中獎者)</p>
                </div>
            )}

            {currentWinner && !isAnimating && (
                <div className="animate-bounce-in w-full">
                    <div className="text-yellow-400 mb-2 font-bold tracking-widest uppercase animate-pulse">Congratulations</div>
                    
                    {/* Only render title if it exists */}
                    {currentWinner.title && (
                        <div className="text-3xl text-indigo-200 font-bold mb-2 drop-shadow-md">{currentWinner.title}</div>
                    )}
                    
                    <div className="text-6xl md:text-7xl font-black mb-4 text-white drop-shadow-lg">{currentWinner.name}</div>
                    <span className="text-lg bg-indigo-600/50 px-4 py-1 rounded-full border border-white/10">{currentWinner.category}</span>
                </div>
            )}
        </div>

        {/* Controls & Stats */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-6 w-full max-w-3xl mx-auto shrink-0">
            {/* Stats Block - SPECIFIC TO CURRENT ROUND */}
            <div className="flex gap-4 bg-black/20 p-2 rounded-xl border border-white/5">
                <div className="text-center px-2">
                    <div className="text-xs text-indigo-300 mb-1 flex items-center justify-center gap-1"><Users size={12}/> 本輪資格</div>
                    <div className="text-xl font-bold text-white">{currentPoolSize}</div>
                </div>
                <div className="w-px bg-white/10"></div>
                <div className="text-center px-2">
                    <div className="text-xs text-green-400 mb-1 flex items-center justify-center gap-1"><CheckCircle size={12}/> 本輪已中</div>
                    <div className="text-xl font-bold text-green-400">{roundWinners}</div>
                </div>
                {/* 
                <div className="w-px bg-white/10"></div>
                <div className="text-center px-2">
                    <div className="text-xs text-slate-400 mb-1 flex items-center justify-center gap-1"><Circle size={12}/> 總已到</div>
                    <div className="text-xl font-bold text-slate-300">{totalPool}</div>
                </div>
                */}
            </div>

            {/* START Button */}
            <button
                onClick={handleDraw}
                disabled={isAnimating || currentPoolSize === 0}
                className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white text-2xl font-bold py-3 px-12 rounded-full shadow-[0_0_20px_rgba(251,191,36,0.4)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
            >
                <Play fill="currentColor" className="inline mr-2"/> {isAnimating ? '...' : 'START'}
            </button>
        </div>

        {/* Winner List - Grouped & Always Visible & Scrollable */}
        {groupedWinners.length > 0 && (
            <div className="w-full flex-1 min-h-0 flex flex-col">
                 <h3 className="text-center text-white/50 text-sm uppercase tracking-widest mb-2 shrink-0">得獎名單歷程</h3>
                 
                 {/* SCROLLABLE CONTAINER */}
                 <div className="overflow-y-auto custom-scrollbar space-y-4 pr-2 pb-4 flex-1">
                    {groupedWinners.map((group) => (
                        <div key={group.round} className={`rounded-xl border overflow-hidden ${group.round === currentRound ? 'bg-white/10 border-yellow-500/50' : 'bg-white/5 border-white/10'}`}>
                            <div className={`px-4 py-2 font-bold flex items-center gap-2 sticky top-0 z-10 backdrop-blur-md ${group.round === currentRound ? 'text-yellow-400 bg-black/20' : 'text-slate-300 bg-black/10'}`}>
                                <PartyPopper size={16} /> 第 {group.round} 輪得獎名單 ({group.list.length}人)
                            </div>
                            <div className="p-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {group.list.map((winner) => (
                                    <div key={`${winner.id}-${group.round}`} className="bg-black/20 p-3 rounded-lg border border-white/5 text-center relative group">
                                        <div className="text-lg font-bold text-white truncate">{winner.name}</div>
                                        <div className="text-xs text-indigo-200 truncate">{winner.title}</div>
                                        <span className="absolute top-1 right-1 text-[10px] text-white/30">{winner.category}</span>
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