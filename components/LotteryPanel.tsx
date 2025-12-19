
import React, { useState, useMemo } from 'react';
import { useEvent } from '../context/EventContext';
import { Trophy, Play, Sparkles, PartyPopper, Lock, Unlock, Users, ChevronDown } from 'lucide-react';
import { Guest } from '../types';

const LotteryPanel: React.FC = () => {
  const { drawWinner, guests, settings, jumpToLotteryRound, isAdmin, unlockedSections, loginAdmin, logoutAdmin } = useEvent();
  const isUnlocked = isAdmin || unlockedSections.lottery;
  
  const [batchWinners, setBatchWinners] = useState<Guest[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
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
  const currentPoolSize = useMemo(() => eligibleGuests.filter(g => !g.wonRounds?.includes(currentRound)).length, [eligibleGuests, currentRound]);

  // 歷史得獎清單 (按輪次分組，每輪內部按得獎順序排列)
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
            
        return {
            round: roundNum,
            list: list
        };
    });
  }, [guests]);

  const handleDraw = () => {
    if (!isUnlocked) { setShowLoginModal(true); return; }
    if (currentPoolSize === 0) {
        alert("本輪已無可抽獎名額");
        return;
    }
    
    setIsAnimating(true);
    setBatchWinners([]);
    
    // 模擬抽獎動畫
    setTimeout(() => {
        setIsAnimating(false);
        const winners: Guest[] = [];
        const count = Math.min(drawCount, currentPoolSize);
        
        for (let i = 0; i < count; i++) {
            const w = drawWinner();
            if (w) winners.push(w);
        }
        setBatchWinners(winners);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center pb-40 px-4">
      <div className="w-full max-w-5xl py-8 md:py-12 space-y-8">
        
        {/* 控制面板 */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-[3rem] border border-white shadow-sm">
          <div className="flex items-center gap-5">
             <div className="bg-indigo-600 text-white p-5 rounded-[2rem] shadow-lg"><Trophy size={32} /></div>
             <div>
                <h1 className="text-2xl font-black text-slate-900 leading-tight">抽獎儀表板</h1>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">第 {currentRound} 輪</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">LOTTERY ROUND</span>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="flex bg-gray-100 p-1 rounded-2xl gap-1">
               {[1, 2, 3, 4, 5].map(r => (
                 <button key={r} onClick={() => isUnlocked ? jumpToLotteryRound(r) : setShowLoginModal(true)} className={`w-10 h-10 rounded-xl font-black text-sm transition-all ${currentRound === r ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-gray-200'}`}>{r}</button>
               ))}
             </div>
             <button onClick={() => isUnlocked ? logoutAdmin() : setShowLoginModal(true)} className="p-3 bg-[#F2F2F7] rounded-2xl">
               {isUnlocked ? <Unlock size={20} className="text-indigo-600"/> : <Lock size={20} className="text-gray-300"/>}
             </button>
          </div>
        </div>

        {/* 抽獎主展示區域 */}
        <div className="relative min-h-[450px] w-full bg-white/50 backdrop-blur-3xl rounded-[3.5rem] border-4 border-white shadow-2xl flex flex-col items-center justify-center p-8 md:p-12 overflow-hidden">
            <div className="absolute top-6 right-10 flex items-center gap-2 text-slate-400 font-black text-sm">
              <Users size={16} /> 本輪獎池餘額: {currentPoolSize} 人
            </div>

            {isAnimating ? (
              <div className="flex flex-col items-center gap-10">
                <div className="text-9xl md:text-[12rem] font-black italic animate-bounce text-indigo-600 drop-shadow-2xl">?</div>
                <div className="flex gap-4">
                    <div className="w-4 h-4 bg-indigo-300 rounded-full animate-ping"></div>
                    <div className="w-4 h-4 bg-indigo-500 rounded-full animate-ping delay-150"></div>
                    <div className="w-4 h-4 bg-indigo-700 rounded-full animate-ping delay-300"></div>
                </div>
              </div>
            ) : batchWinners.length === 0 ? (
              <div className="text-center space-y-6">
                <PartyPopper size={100} className="mx-auto text-indigo-100" />
                <div className="space-y-2">
                    <h2 className="text-4xl md:text-5xl font-black text-slate-200 uppercase tracking-widest italic">Ready to Win</h2>
                    <p className="text-slate-300 font-bold text-lg uppercase tracking-[0.5em]">點擊下方按鈕開始抽獎</p>
                </div>
              </div>
            ) : (
              <div className={`grid gap-4 w-full animate-in zoom-in-95 duration-500 max-h-[500px] overflow-y-auto no-scrollbar p-2 ${
                batchWinners.length === 1 ? 'grid-cols-1' : 
                batchWinners.length <= 4 ? 'grid-cols-1 md:grid-cols-2' : 
                'grid-cols-2 lg:grid-cols-3'
              }`}>
                {batchWinners.map(w => (
                  <div key={w.id} className="bg-white rounded-[2.5rem] p-8 border border-white text-center shadow-xl transform transition-all hover:scale-105 group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
                    <Sparkles size={16} className="absolute top-4 right-4 text-indigo-200" />
                    <div className="text-indigo-600 font-black text-[10px] uppercase tracking-widest mb-2 opacity-60">Lucky Winner</div>
                    <div className="text-3xl md:text-4xl font-black text-slate-950 truncate px-2">{w.name}</div>
                    <div className="text-sm text-slate-400 font-bold truncate mt-2">{w.title}</div>
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* 抽獎控制區：人數選擇 + 抽獎按鈕 */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-5">
           <div className="relative w-full md:w-auto group">
             <label className="absolute -top-6 left-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">抽獎人數</label>
             <div className="relative">
                <select 
                value={drawCount} 
                onChange={(e) => setDrawCount(Number(e.target.value))}
                className="h-24 w-full md:w-48 bg-white border-none rounded-[2.5rem] pl-10 pr-12 font-black text-3xl text-slate-900 shadow-xl appearance-none focus:ring-4 focus:ring-indigo-500/20 cursor-pointer transition-all"
                >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n} 人</option>)}
                </select>
                <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                    <ChevronDown size={28} />
                </div>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                    <Users size={20} />
                </div>
             </div>
           </div>

           <button 
             onClick={handleDraw} 
             disabled={isAnimating || currentPoolSize === 0} 
             className="flex-1 md:flex-initial h-24 px-20 bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-500 text-white text-3xl font-black rounded-[2.5rem] shadow-2xl hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 flex items-center justify-center gap-6 transition-all ring-8 ring-indigo-500/10"
           >
             <Play fill="white" size={32} className={isAnimating ? 'animate-pulse' : ''} />
             <span>{isAnimating ? '揭曉中...' : '開 始 抽 獎'}</span>
           </button>
        </div>

        {/* 得獎歷史清單 (分輪次顯示) */}
        <div className="space-y-6 pt-12">
            <div className="flex items-center justify-between px-8">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Sparkles size={14} className="text-indigo-400" />
                    各輪得獎歷史清單 (按得獎順序排列)
                </h4>
            </div>
            
            <div className="space-y-6">
                {historyData.map(group => {
                    const isMultiWinnerRound = group.list.length > 1;
                    return (
                        <div key={group.round} className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-white">
                            <div className="bg-slate-50/80 px-10 py-5 flex justify-between items-center border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-xs font-black">{group.round}</div>
                                    <span className="font-black text-slate-700">第 {group.round} 輪得獎名單</span>
                                </div>
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Total {group.list.length} Winners</span>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                                {group.list.map((w, idx) => (
                                    <div 
                                        key={w.id} 
                                        className={`flex items-center justify-between p-5 rounded-[1.5rem] border transition-colors ${
                                            isMultiWinnerRound 
                                                ? 'bg-blue-50/60 border-blue-100 hover:bg-blue-100/70' 
                                                : 'bg-white border-gray-100 hover:border-indigo-200'
                                        }`}
                                    >
                                        <div className="min-w-0 flex items-center gap-4">
                                            <div className="text-[10px] font-black text-indigo-300">{idx + 1}</div>
                                            <div>
                                                <div className="font-black text-slate-950 text-lg truncate">{w.name}</div>
                                                <div className="text-[11px] text-slate-400 font-bold truncate mt-0.5">{w.title}</div>
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex flex-col items-end gap-1 ml-4">
                                            <div className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${isMultiWinnerRound ? 'bg-blue-200 text-blue-700' : 'bg-indigo-100 text-indigo-600'}`}>
                                                {isMultiWinnerRound ? 'Batch Winner' : 'Single Draw'}
                                            </div>
                                            <div className="text-[9px] font-bold text-slate-300 tabular-nums">ROUND {group.round}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
                {historyData.length === 0 && (
                    <div className="text-center py-20 bg-white/40 rounded-[3rem] border-2 border-dashed border-gray-200">
                        <p className="text-gray-300 font-black italic text-lg">期待第一位幸運兒誕生...</p>
                    </div>
                )}
            </div>
        </div>
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[250] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] p-10 max-w-xs w-full shadow-2xl flex flex-col items-center gap-8 text-center border border-white/20">
            <h3 className="text-2xl font-black text-black">抽獎儀表解鎖</h3>
            <form onSubmit={handleLoginSubmit} className="w-full space-y-6">
              <p className="text-xs text-gray-400">請輸入抽獎解鎖密碼 (3333)</p>
              <input type="password" placeholder="••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-[#F2F2F7] border-none rounded-2xl py-6 px-4 text-center text-4xl font-black focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all" autoFocus />
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-4 font-black text-gray-400">取消</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-transform">解鎖權限</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LotteryPanel;
