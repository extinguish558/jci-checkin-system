
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useEvent } from '../context/EventContext';
import { Trophy, Lock, Unlock, Users, RotateCcw, Loader2, Zap, Star, AlertTriangle, ChevronDown, Database, ClipboardList, Volume2, VolumeX, Gift, Snowflake, Heart, Sparkles, Package, MoveHorizontal, Filter, UserCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Guest, Sponsorship, GuestCategory } from '../types';

const LotteryPanel: React.FC = () => {
  const { 
    drawWinners, guests, settings, jumpToLotteryRound, 
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
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('lottery_muted') === 'true');
  
  const [showSponsorAlert, setShowSponsorAlert] = useState<Sponsorship | null>(null);
  const lastSponsorshipTimeRef = useRef<number>(0);

  const [reelItems, setReelItems] = useState<Guest[]>([]);
  const [reelOffset, setReelOffset] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const animationFrameRef = useRef<number>(0);
  const armTimerRef = useRef<any>(null);

  const [sponsorIndex, setSponsorIndex] = useState(0);
  const sponsors = settings.sponsorships || [];

  const poolConfigInfo = useMemo(() => {
    const config = settings.lotteryPoolConfig;
    if (!config) return "抽獎範圍：所有已報到貴賓";
    
    const cats = config.includedCategories;
    const ids = config.includedIndividualIds;
    
    let text = "當前抽獎範圍：";
    if (cats.length > 0) {
      text += `【類別】${cats.join('、')} `;
    }
    
    if (ids.length > 0) {
      const names = ids.map(id => guests.find(g => g.id === id)?.name).filter(Boolean);
      if (names.length > 0) {
        text += `| 【特邀嘉賓】${names.join('、')} `;
      }
    }
    
    if (cats.length === 0 && ids.length === 0) return "⚠️ 警告：目前抽獎池為空，請至系統設定配置";
    
    return text;
  }, [settings.lotteryPoolConfig, guests]);

  useEffect(() => {
    if (sponsors.length > 1 && !isAnimating && currentWinnerBatch.length === 0 && !showSponsorAlert) {
      const timer = setInterval(() => {
        setSponsorIndex(prev => (prev + 1) % sponsors.length);
      }, 4000);
      return () => clearInterval(timer);
    }
  }, [sponsors, isAnimating, currentWinnerBatch, showSponsorAlert]);

  const audioRefs = useRef<{
    tick: HTMLAudioElement;
    roll: HTMLAudioElement;
    win: HTMLAudioElement;
    bgm: HTMLAudioElement;
    sponsor: HTMLAudioElement;
  } | null>(null);

  useEffect(() => {
    audioRefs.current = {
      tick: new Audio('https://assets.mixkit.co/active_storage/sfx/1330/1330-preview.mp3'), 
      roll: new Audio('https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3'), 
      win: new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3'),  
      bgm: new Audio('https://assets.mixkit.co/active_storage/sfx/110/110-preview.mp3'),
      sponsor: new Audio('https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3'),
    };
    if (audioRefs.current.roll) { audioRefs.current.roll.loop = true; audioRefs.current.roll.volume = 0.6; }
    if (audioRefs.current.bgm) { audioRefs.current.bgm.loop = true; audioRefs.current.bgm.volume = 0.25; }
    return () => { if (audioRefs.current) { (Object.values(audioRefs.current) as HTMLAudioElement[]).forEach(s => s.pause()); } };
  }, []);

  const playSound = (type: 'tick' | 'roll' | 'win' | 'bgm' | 'sponsor', stopOthers = false) => {
    if (isMuted || !audioRefs.current) return;
    const sound = audioRefs.current[type];
    if (stopOthers) { (Object.values(audioRefs.current) as HTMLAudioElement[]).forEach(s => { if (s !== audioRefs.current?.bgm) { s.pause(); s.currentTime = 0; } }); }
    if (type === 'bgm') { if (sound.paused) sound.play().catch(() => {}); return; }
    sound.currentTime = 0;
    sound.play().catch(() => {});
  };

  const stopSound = (type: 'roll') => { if (audioRefs.current) { audioRefs.current[type].pause(); audioRefs.current[type].currentTime = 0; } };

  useEffect(() => {
    const trigger = settings.lastSponsorshipTrigger;
    if (trigger && trigger.timestamp > lastSponsorshipTimeRef.current) {
        lastSponsorshipTimeRef.current = trigger.timestamp;
        setShowSponsorAlert(trigger.sponsorship);
        playSound('sponsor', true);
        const timer = setTimeout(() => setShowSponsorAlert(null), 5000);
        return () => clearTimeout(timer);
    }
  }, [settings.lastSponsorshipTrigger]);

  const lastHandledTriggerRef = useRef<number>(0);
  const ITEM_HEIGHT = 120; 
  const TOTAL_REEL_ITEMS = 30;
  const currentActiveRound = settings.lotteryRoundCounter;

  const eligibleGuests = useMemo(() => guests.filter(g => g.isCheckedIn), [guests]);

  const poolStats = useMemo(() => {
    const poolConfig = settings.lotteryPoolConfig || { includedCategories: Object.values(GuestCategory), includedIndividualIds: [] };
    
    const poolMembers = eligibleGuests.filter(g => {
      if (!settings.lotteryPoolConfig) return true;
      const isInCategory = poolConfig.includedCategories.includes(g.category);
      const isExplicitlyIncluded = poolConfig.includedIndividualIds.includes(g.id);
      return isInCategory || isExplicitlyIncluded;
    });

    const totalInPool = poolMembers.length;
    const candidates = poolMembers.filter(g => !g.isWinner);
    const notWonYetCount = candidates.length;

    const breakdownData = [
        { key: 'YB', label: 'YB', color: 'text-blue-400', bg: 'bg-blue-500/10', count: 0 },
        { key: 'OB', label: 'OB', color: 'text-orange-400', bg: 'bg-orange-500/10', count: 0 },
        { key: 'PAST', label: '會長', color: 'text-indigo-400', bg: 'bg-indigo-500/10', count: 0 },
        { key: 'VIP', label: '貴賓', color: 'text-purple-400', bg: 'bg-purple-500/10', count: 0 }
    ];

    candidates.forEach(c => {
        if (c.category === GuestCategory.MEMBER_YB) breakdownData[0].count++;
        else if (c.category === GuestCategory.MEMBER_OB) breakdownData[1].count++;
        else if (c.category === GuestCategory.PAST_PRESIDENT || c.category === GuestCategory.PAST_CHAIRMAN) breakdownData[2].count++;
        else breakdownData[3].count++;
    });

    return { 
      notWonYetCount, 
      totalInPool,
      breakdown: breakdownData.filter(d => d.count > 0)
    };
  }, [eligibleGuests, settings.lotteryPoolConfig]);

  const historyMap = useMemo(() => {
    const rounds: Record<number, Guest[]> = {};
    guests.forEach(g => {
      if (g.wonRounds && g.wonRounds.length > 0) {
        g.wonRounds.forEach(r => { if (!rounds[r]) rounds[r] = []; rounds[r].push(g); });
      }
    });
    return rounds;
  }, [guests]);

  const generateReel = (winner: Guest) => {
    const pool = eligibleGuests.filter(g => !g.isWinner);
    const safePool = pool.length > 0 ? pool : guests;
    const items: Guest[] = [];
    for (let i = 0; i < TOTAL_REEL_ITEMS - 1; i++) {
      items.push(safePool[Math.floor(Math.random() * safePool.length)]);
    }
    items.push(winner);
    return items;
  };

  const runSingleDrawAnimation = (winner: Guest, duration: number): Promise<void> => {
    return new Promise((resolve) => {
      setReelItems(generateReel(winner));
      setAnimatingWinner(null);
      setIsFlashing(false);
      playSound('roll', true);
      const startTime = performance.now();
      const targetPos = (TOTAL_REEL_ITEMS - 1) * ITEM_HEIGHT;
      let lastTickPos = 0;
      const animate = (time: number) => {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 4);
        const currentPos = ease * targetPos;
        setReelOffset(currentPos);
        setCurrentSpeed((1 - progress) * 15);
        if (currentPos - lastTickPos > ITEM_HEIGHT) { playSound('tick'); lastTickPos = currentPos; }
        if (progress < 1) { animationFrameRef.current = requestAnimationFrame(animate); }
        else {
          stopSound('roll');
          playSound('win', true);
          setAnimatingWinner(winner);
          setIsFlashing(true);
          setCurrentSpeed(0);
          setTimeout(() => { setIsFlashing(false); resolve(); }, 1500);
        }
      };
      animationFrameRef.current = requestAnimationFrame(animate);
    });
  };

  useEffect(() => {
    const trigger = settings.lastDrawTrigger;
    if (!trigger) {
      setCurrentWinnerBatch([]);
      setAnimatingWinner(null);
      setReelItems([]);
      setReelOffset(0);
      setIsAnimating(false);
      return;
    }
    if (trigger.timestamp > lastHandledTriggerRef.current) {
      lastHandledTriggerRef.current = trigger.timestamp;
      const selectedWinners = trigger.winnerIds.map(id => guests.find(g => g.id === id)).filter(Boolean) as Guest[];
      if (selectedWinners.length > 0) {
        (async () => {
           setIsAnimating(true);
           setCurrentWinnerBatch([]);
           const winnersShown: Guest[] = [];
           for (let i = 0; i < selectedWinners.length; i++) {
             const w = selectedWinners[i];
             const duration = i === 0 ? 5500 : 2500;
             await runSingleDrawAnimation(w, duration);
             winnersShown.push(w);
             setCurrentWinnerBatch([...winnersShown]);
           }
           setIsAnimating(false);
        })();
      }
    }
  }, [settings.lastDrawTrigger, guests]);

  const handleDrawClick = () => {
    playSound('bgm');
    if (!isUnlocked) { setShowLoginModal(true); return; }
    if (isAnimating) return;
    if (poolStats.notWonYetCount === 0) { alert("抽獎池已清空，無剩餘可抽獎人員。"); return; }
    if (drawCount > poolStats.notWonYetCount) { alert(`賸餘人數不足！目前僅剩 ${poolStats.notWonYetCount} 人可抽。`); return; }
    if (confirmState === 'armed') { if (armTimerRef.current) clearTimeout(armTimerRef.current); setConfirmState('idle'); return; }
    setConfirmState('armed');
    armTimerRef.current = setTimeout(() => { setConfirmState('idle'); drawWinners(drawCount); }, 1200);
  };

  const handleResetClick = async () => {
    if (!isAdmin) { setShowLoginModal(true); return; }
    if (window.confirm('確定重置今日所有得獎紀錄？這會同步清空全場設備。')) {
      setCurrentWinnerBatch([]);
      setAnimatingWinner(null);
      await resetLottery();
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    localStorage.setItem('lottery_muted', String(nextMuted));
    if (nextMuted && audioRefs.current) { (Object.values(audioRefs.current) as HTMLAudioElement[]).forEach(s => s.pause()); }
    else { playSound('bgm'); }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginAdmin(loginPassword)) { setShowLoginModal(false); setLoginPassword(""); }
    else alert("密碼錯誤");
  };

  return (
    <div className="min-h-screen bg-[#020306] flex flex-col items-center pb-64 px-4 overflow-hidden font-sans">
      <style>{`
        @keyframes winner-celebration { 0%, 100% { transform: scale(1.1); filter: brightness(1) drop-shadow(0 0 15px rgba(255,215,0,0.3)); } 50% { transform: scale(1.3); filter: brightness(2.5) drop-shadow(0 0 45px rgba(255,215,0,0.9)); } }
        .animate-winner-win { animation: winner-celebration 0.4s ease-in-out infinite; }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 180s linear infinite; }
        .animate-pool-marquee { animation: marquee 120s linear infinite; }
      `}</style>

      {showSponsorAlert && (
        <div onClick={() => setShowSponsorAlert(null)} className="fixed inset-0 z-[1000] flex items-center justify-center cursor-pointer group">
            <div className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-in fade-in duration-500"></div>
            <div className="relative flex flex-col items-center text-center p-12 bg-amber-950/85 border-4 border-amber-500 rounded-[3.5rem] shadow-[0_0_80px_rgba(251,191,36,0.4)] w-[90%] max-w-4xl scale-in-center">
                <div className="mb-6 flex gap-6"><Sparkles size={48} className="text-yellow-400 animate-bounce" /><div className="relative"><Heart size={64} fill="#F59E0B" className="text-amber-500 animate-pulse" /><div className="absolute inset-0 flex items-center justify-center text-white"><Star size={24} fill="currentColor" /></div></div><Sparkles size={48} className="text-yellow-400 animate-bounce delay-150" /></div>
                <div className="bg-amber-500 text-amber-950 px-6 py-1 rounded-full text-xs font-black tracking-[0.5em] uppercase mb-6 italic shadow-lg">榮耀時刻</div>
                <p className="text-5xl md:text-8xl font-black text-white italic tracking-tighter drop-shadow-2xl">{showSponsorAlert.name}</p>
                <p className="text-lg md:text-3xl font-black text-amber-300 uppercase tracking-widest italic">{showSponsorAlert.title || '榮譽贊助貴賓'}</p>
                <div className="mt-12 flex flex-col gap-4 items-center w-full">
                    {showSponsorAlert.itemName ? (<div className="flex items-center gap-3 px-10 py-5 bg-blue-600 rounded-3xl border border-blue-400 shadow-xl"><Package size={32} className="text-white" /><span className="text-xl md:text-5xl font-black text-white italic tracking-tight">{showSponsorAlert.itemName}</span></div>) : (<div className="px-12 py-6 bg-white rounded-full shadow-[0_0_40px_rgba(255,255,255,0.3)] border-4 border-amber-100 flex items-center gap-4"><span className="text-amber-600 text-3xl font-black">NT$</span><span className="text-4xl md:text-7xl font-black text-amber-600 tabular-nums">{showSponsorAlert.amount.toLocaleString()}</span></div>)}
                </div>
            </div>
        </div>
      )}

      <div onClick={handleDrawClick} className={`relative mt-8 w-full max-w-7xl h-[75vh] rounded-[3rem] flex flex-col transition-all duration-1000 border border-white/5 overflow-hidden z-10 shadow-3xl ${confirmState === 'armed' ? 'bg-red-950/20' : isAnimating ? 'bg-blue-950/10' : 'bg-slate-900/5'}`}>
        <header className="relative w-full p-8 z-30 border-b border-white/5 bg-gradient-to-b from-black/95 to-transparent flex items-center justify-between">
           <div className="flex items-center gap-6">
              <div className="p-3 bg-red-600 rounded-xl shadow-[0_0_25px_rgba(220,38,38,0.4)] shrink-0 animate-pulse"><Gift size={24} className="text-white" /></div>
              <div className="text-left">
                 <h2 className="text-white font-black text-xl md:text-3xl tracking-tight leading-none italic">{settings.eventName}</h2>
                 <p className="text-red-500 font-bold text-[9px] uppercase tracking-[0.5em] mt-2 italic">Merry Christmas · ROUND {currentActiveRound}</p>
              </div>
           </div>
           
           <div className="flex items-center gap-4">
              <div className="hidden xl:flex items-center gap-2 mr-3 animate-in fade-in slide-in-from-right-4 duration-1000">
                 {poolStats.breakdown.map((item) => (
                    <div key={item.key} className={`flex items-center gap-2 px-4 py-2 ${item.bg} border border-white/5 rounded-2xl shadow-inner transition-all hover:scale-105`}>
                       <span className={`text-[10px] font-black uppercase tracking-widest ${item.color}`}>{item.label}</span>
                       <div className={`w-px h-3 bg-white/10`} />
                       <span className="text-sm font-black text-white tabular-nums italic">{item.count}</span>
                    </div>
                 ))}
              </div>

              <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all border border-white/5 ${isMuted ? 'bg-white/5 text-white/20' : 'bg-red-600/20 text-red-400'}`}>
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>
              
              <div className={`px-5 py-3 bg-white/5 rounded-full border border-white/10 flex items-center gap-3 transition-all ${poolStats.notWonYetCount === 0 ? 'bg-green-500/10 border-green-500/30' : ''}`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${poolStats.notWonYetCount === 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={`text-sm md:text-xl font-black italic tracking-tighter tabular-nums uppercase ${poolStats.notWonYetCount === 0 ? 'text-green-400' : 'text-white opacity-60'}`}>
                  {poolStats.notWonYetCount} / {poolStats.totalInPool}
                </span>
              </div>
           </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <div className="relative w-full md:w-[32%] h-[30%] md:h-full flex flex-col items-center justify-center overflow-hidden bg-black/60 border-r border-white/5">
            <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-black via-transparent to-black opacity-60"></div>
            <div className="absolute inset-x-0 h-[ITEM_HEIGHT] top-1/2 -translate-y-1/2 border-y border-white/15 bg-red-500/5 pointer-events-none z-20 shadow-[inset_0_0_40px_rgba(255,255,255,0.02)]"></div>
            <div className="relative w-full h-full flex items-center justify-center">
               {reelItems.length > 0 ? (
                  <div className="absolute w-full" style={{ transform: `translateY(${-reelOffset}px)`, top: '50%', marginTop: `-${ITEM_HEIGHT/2}px`, filter: isAnimating && !animatingWinner ? `blur(${Math.min(currentSpeed, 5)}px)` : 'none' }}>
                    {reelItems.map((g, idx) => (
                      <div key={`${g.id}-${idx}`} className="flex flex-col items-center justify-center text-center px-4" style={{ height: `${ITEM_HEIGHT}px` }}>
                        <span className={`font-black italic transition-all duration-300 whitespace-nowrap leading-none tracking-tighter ${idx === reelItems.length - 1 && animatingWinner ? `text-yellow-400 text-4xl md:text-6xl drop-shadow(0 0 30px rgba(255,215,0,0.8)) ${isFlashing ? 'animate-winner-win' : 'scale-110'}` : 'text-white/35 text-2xl md:text-3xl'}`}>{g.name}</span>
                      </div>
                    ))}
                  </div>
               ) : (<div className="flex flex-col items-center gap-4 opacity-10"><Gift size={48} className="animate-bounce text-red-500" /><p className="text-[10px] font-black tracking-[0.5em] uppercase text-white">Unlock Holiday Magic</p></div>)}
            </div>
          </div>

          <div className={`relative w-full md:w-[68%] h-[70%] md:h-full flex flex-col transition-all duration-1000 ${isAnimating || currentWinnerBatch.length > 0 ? 'bg-red-900/10 ring-inset ring-1 ring-red-500/20' : 'bg-black/40'}`}>
             <div className="p-6 flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 mb-4 opacity-40"><Snowflake size={14} className="text-red-400" /><span className="text-[10px] font-black text-white tracking-[0.4em] uppercase italic">{currentWinnerBatch.length > 0 || isAnimating ? 'Holiday Ceremony Sync' : 'Honor Roll Display'}</span></div>
                <div className="flex-1 flex flex-col gap-2 overflow-y-auto no-scrollbar">
                    {currentWinnerBatch.length > 0 ? (
                      currentWinnerBatch.map((w, idx) => (
                        <div key={`${w.id}-${idx}`} className="flex items-center p-5 bg-white/[0.05] border border-white/10 rounded-[1.5rem] animate-in slide-in-from-right-10 fade-in duration-700 shadow-2xl group hover:bg-white/[0.08] transition-all">
                          <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl md:rounded-2xl flex items-center justify-center font-black italic text-white text-sm md:text-xl shrink-0 mr-6 shadow-[0_4px_15px_rgba(220,38,38,0.4)]">#{idx+1}</div>
                          <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-6 flex-1 min-w-0 pr-8">
                              <h3 className="font-black text-white text-2xl md:text-4xl tracking-tighter italic whitespace-nowrap leading-none drop-shadow-md">{w.name}</h3>
                              <span className="text-xs md:text-xl text-yellow-500/60 font-black uppercase tracking-widest italic truncate border-l border-white/10 pl-6">{w.title || '貴賓'}</span>
                          </div>
                          <div className="opacity-20 group-hover:opacity-100 group-hover:scale-125 transition-all text-yellow-500"><Star size={24} fill="currentColor" /></div>
                        </div>
                      ))
                    ) : isAnimating ? (
                      <div className="p-14 border border-dashed border-red-500/20 rounded-[2rem] flex flex-col items-center justify-center gap-6 animate-pulse bg-red-500/[0.02] mt-4"><Loader2 size={40} className="animate-spin text-red-500" /><span className="text-2xl font-black text-white/20 uppercase tracking-[0.5em] italic">Orchestrating Winner...</span></div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center">
                        {poolStats.notWonYetCount === 0 ? (
                           <div className="flex flex-col items-center gap-8 animate-in fade-in duration-1000 scale-110">
                              <div className="p-10 bg-green-500/10 rounded-full border-2 border-green-500/30 shadow-[0_0_80px_rgba(34,197,94,0.3)]"><CheckCircle2 size={80} className="text-green-500 animate-pulse" /></div>
                              <div className="text-center space-y-4"><h3 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter uppercase">ALL PRIZES DRAWN</h3><p className="text-green-500/60 font-black text-sm uppercase tracking-[0.8em]">本輪次抽獎池已全數抽出</p></div>
                           </div>
                        ) : sponsors.length > 0 ? (
                        <div key={sponsorIndex} className="sponsor-entry flex flex-col items-center text-center space-y-6">
                            <div className="p-6 bg-amber-500/10 rounded-full border border-amber-500/20 shadow-[0_0_50px_rgba(245,158,11,0.1)]"><Heart size={64} className="text-amber-500 animate-pulse" fill="currentColor" /></div>
                            <div className="space-y-4">
                                <h3 className="text-4xl md:text-7xl font-black text-amber-500 italic tracking-tighter drop-shadow-lg">{sponsors[sponsorIndex].name}</h3>
                                <p className="text-lg md:text-2xl font-bold text-white/40 uppercase tracking-[0.5em]">{sponsors[sponsorIndex].title || '榮譽贊助貴賓'}</p>
                                {sponsors[sponsorIndex].itemName ? (<div className="bg-blue-600/20 text-blue-400 px-8 py-3 rounded-2xl border border-blue-500/30 flex items-center gap-3 mt-4 animate-in zoom-in duration-500"><Package size={32} /><span className="text-xl md:text-4xl font-black italic tracking-tight">{sponsors[sponsorIndex].itemName}</span></div>) : (<div className="inline-block px-10 py-4 bg-white/5 rounded-full border border-white/10 mt-6 animate-in zoom-in duration-500"><span className="text-3xl md:text-5xl font-black text-yellow-400 tabular-nums">NT$ {sponsors[sponsorIndex].amount.toLocaleString()}</span></div>)}
                            </div>
                            <p className="text-[10px] font-black text-white/10 uppercase tracking-[1em] mt-8 italic">Sponsorship Honor Roll</p>
                        </div>
                        ) : (<div className="opacity-5 flex flex-col items-center"><Trophy size={100} strokeWidth={1} className="text-white" /><p className="font-black tracking-[1.2em] text-[10px] uppercase mt-8 italic text-white">Waiting for Santa's Signal</p></div>)}
                      </div>
                    )}
                </div>
             </div>

             {sponsors.length > 0 && (
                <div className="bg-black/80 border-t border-white/10 h-24 flex items-center overflow-hidden relative group">
                    <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black z-10"></div>
                    <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black z-10"></div>
                    <div className="flex animate-marquee whitespace-nowrap">
                        {[...sponsors, ...sponsors].map((s, i) => (
                            <div key={`${s.id}-${i}`} className="flex items-center gap-4 px-20 border-r border-white/5">
                                <Heart size={20} fill="#F59E0B" className="text-amber-500 shrink-0" />
                                <div className="flex items-baseline gap-3"><span className="text-amber-400 font-black text-2xl md:text-3xl italic tracking-tighter">{s.name}</span><span className="text-white/30 font-bold text-sm uppercase tracking-widest">{s.title || '會友'}</span></div>
                                {s.itemName ? (<div className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full"><Package size={18} className="text-blue-400" /><span className="text-blue-400 font-black text-lg italic">{s.itemName}</span></div>) : (<div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10"><span className="text-yellow-500/40 font-black text-xs tracking-widest uppercase">NT$</span><span className="text-white font-black text-2xl tabular-nums tracking-tighter">{s.amount.toLocaleString()}</span></div>)}
                            </div>
                        ))}
                    </div>
                </div>
             )}
          </div>
        </div>

        {confirmState === 'armed' && (
           <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/98 backdrop-blur-3xl animate-in fade-in duration-500 text-center">
              <Gift size={100} className="text-red-500 mb-6 animate-bounce" />
              <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter italic uppercase">INITIATING HOLIDAY BROADCAST</h1>
              <p className="text-xs text-white/30 font-black tracking-[0.8em] mt-6">QUANTUM FESTIVAL SYNC</p>
           </div>
        )}
      </div>

      <div className="mt-12 w-full max-w-4xl space-y-6 z-20">
        <div className="relative h-12 bg-white/5 rounded-2xl border border-white/10 overflow-hidden flex items-center shadow-inner group">
          <div className="absolute left-0 top-0 bottom-0 px-4 bg-slate-900/80 z-20 flex items-center gap-2 border-r border-white/10"><Filter size={16} className="text-red-500" /><span className="text-xs font-black text-white uppercase tracking-widest">Active Pool</span></div>
          <div className="flex animate-pool-marquee whitespace-nowrap pl-32">
             <span className="text-base font-black text-slate-400 italic pr-40">{poolConfigInfo}</span>
             <span className="text-base font-black text-slate-400 italic pr-40">{poolConfigInfo}</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className={`flex-1 w-full relative group transition-all ${drawCount > poolStats.notWonYetCount ? 'ring-2 ring-red-500 rounded-full' : ''}`}>
                <Users size={20} className={`absolute left-6 top-1/2 -translate-y-1/2 transition-colors ${drawCount > poolStats.notWonYetCount ? 'text-red-500' : 'text-slate-700'}`} />
                <select value={drawCount} onChange={(e) => setDrawCount(Number(e.target.value))} className={`w-full h-16 pl-16 pr-10 bg-white/[0.03] border border-white/5 rounded-full font-black text-sm text-white appearance-none outline-none shadow-xl transition-all ${drawCount > poolStats.notWonYetCount ? 'text-red-500' : ''}`}>
                  {[1, 2, 3, 4, 5, 10, 20].map(n => <option key={n} value={n} className="bg-slate-950">Celebrate Draw x{n} Lucky Ones</option>)}
                </select>
                {drawCount > poolStats.notWonYetCount && (<div className="absolute -top-10 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-600 text-white text-[10px] font-black rounded-xl animate-bounce shadow-2xl flex items-center gap-2"><ShieldAlert size={14} /> 人數不足！剩餘 {poolStats.notWonYetCount}</div>)}
                <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700" />
            </div>
            <div className="flex gap-4 shrink-0">
                <button onClick={handleResetClick} className="w-16 h-16 bg-red-600/5 text-red-500 hover:bg-red-600 hover:text-white rounded-full flex items-center justify-center transition-all border border-red-500/10 shadow-xl"><RotateCcw size={24} /></button>
                <button onClick={() => isUnlocked ? logoutAdmin() : setShowLoginModal(true)} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all border border-white/5 shadow-xl ${isUnlocked ? 'bg-red-600/20 text-red-400' : 'bg-white/5 text-slate-700'}`}>{isUnlocked ? <Unlock size={24} /> : <Lock size={24} />}</button>
            </div>
        </div>

        <div className="flex items-end px-4">
           <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar">
              {[1, 2, 3, 4, 5].map(r => (
                <button key={r} onClick={() => isUnlocked ? jumpToLotteryRound(r) : setShowLoginModal(true)} className={`relative px-10 h-14 rounded-t-[2.2rem] font-black text-lg transition-all ${currentActiveRound === r ? 'bg-[#1a1c24] text-red-500 border-t border-x border-red-500/20' : 'text-slate-600 hover:text-slate-400 bg-black/20 hover:bg-black/40'}`}>
                  R{r}{currentActiveRound === r && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-red-500 shadow-[0_0_12px_#ef4444]"></div>}
                </button>
              ))}
           </div>
        </div>

        <div className="relative bg-[#15171e] rounded-[3rem] border border-white/10 shadow-3xl overflow-hidden min-h-[450px]">
           <div className="p-10 flex items-center justify-between border-b border-white/5 bg-black/25 relative z-10">
              <div className="flex items-center gap-5">
                 <div className="w-16 h-16 bg-red-600/10 rounded-2xl flex items-center justify-center text-red-500 shadow-inner"><ClipboardList size={32} /></div>
                 <div><h3 className="text-white font-black text-3xl italic tracking-tighter">Round {currentActiveRound} Hall of Fame</h3><p className="text-slate-500 font-bold text-xs uppercase tracking-[0.4em] mt-2 italic">Holiday Winners Record</p></div>
              </div>
              <div className="text-right"><span className="text-red-500 font-black text-5xl tabular-nums italic drop-shadow(0 0 15px rgba(239,68,68,0.3))">{(historyMap[currentActiveRound] || []).length}</span><p className="text-slate-600 font-bold text-[10px] uppercase tracking-widest mt-1">Luck Records</p></div>
           </div>
           <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              {(historyMap[currentActiveRound] || []).map((w, idx) => (
                <div key={`${w.id}-${currentActiveRound}-${idx}`} className="flex items-center justify-between px-8 py-6 bg-white/[0.03] rounded-[1.8rem] border border-white/5 hover:border-red-500/25 hover:bg-white/[0.05] transition-all group shadow-lg">
                   <div className="flex items-center gap-5 min-w-0">
                      <span className="text-sm font-black text-slate-600 italic tracking-widest">#{idx+1}</span>
                      <div className="min-w-0"><div className={`font-black text-white italic tracking-tighter leading-none truncate ${w.name.length >= 5 ? 'text-2xl' : 'text-3xl'}`}>{w.name}</div><div className="text-sm text-slate-600 font-bold truncate uppercase tracking-[0.2em] italic mt-3 border-l border-white/5 pl-4">{w.title || '貴賓'}</div></div>
                   </div>
                   <Star size={20} className="text-yellow-500/10 group-hover:text-yellow-500/50 group-hover:rotate-45 transition-all duration-500" />
                </div>
              ))}
              {(historyMap[currentActiveRound] || []).length === 0 && (<div className="col-span-full py-32 flex flex-col items-center justify-center opacity-10"><Gift size={80} strokeWidth={1} className="animate-pulse text-red-500" /><p className="text-base font-black tracking-[1.5em] text-center uppercase mt-10 italic text-white">Archive Empty: Round {currentActiveRound}</p></div>)}
           </div>
        </div>
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[300] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-xs shadow-2xl flex flex-col items-center gap-6">
            <h3 className="text-2xl font-black text-slate-900">權限驗證</h3>
            <form onSubmit={handleLoginSubmit} className="w-full space-y-4">
              <input type="password" placeholder="••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-[#F2F2F7] border-none rounded-2xl py-5 px-4 text-center text-4xl font-black outline-none" autoFocus />
              <div className="flex gap-3"><button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-4 font-black text-gray-400">取消</button><button type="submit" className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl">解鎖</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LotteryPanel;
