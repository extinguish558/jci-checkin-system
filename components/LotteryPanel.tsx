
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useEvent } from '../context/EventContext';
import { Trophy, Lock, Unlock, Users, RotateCcw, Loader2, Zap, Star, AlertTriangle, ChevronDown, Database, ClipboardList, Volume2, VolumeX, Gift, Snowflake, Heart, Sparkles, Package, MoveHorizontal, Filter, UserCheck } from 'lucide-react';
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
  
  // 贊助特效狀態
  const [showSponsorAlert, setShowSponsorAlert] = useState<Sponsorship | null>(null);
  const lastSponsorshipTimeRef = useRef<number>(0);

  const [reelItems, setReelItems] = useState<Guest[]>([]);
  const [reelOffset, setReelOffset] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const animationFrameRef = useRef<number>(0);
  const armTimerRef = useRef<any>(null);

  // 贊助名單輪播控制 (中央區域用)
  const [sponsorIndex, setSponsorIndex] = useState(0);
  const sponsors = settings.sponsorships || [];

  // 抽獎池配置顯示邏輯
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

  // 音效引用
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
    if (audioRefs.current.win) { audioRefs.current.win.volume = 0.9; }
    if (audioRefs.current.sponsor) { audioRefs.current.sponsor.volume = 0.8; }
    
    return () => {
      if (audioRefs.current) {
        (Object.values(audioRefs.current) as HTMLAudioElement[]).forEach(s => s.pause());
      }
    };
  }, []);

  const playSound = (type: 'tick' | 'roll' | 'win' | 'bgm' | 'sponsor', stopOthers = false) => {
    if (isMuted || !audioRefs.current) return;
    const sound = audioRefs.current[type];
    if (stopOthers) {
      (Object.values(audioRefs.current) as HTMLAudioElement[]).forEach(s => { 
        if (s !== audioRefs.current?.bgm) { s.pause(); s.currentTime = 0; } 
      });
    }
    if (type === 'bgm') { if (sound.paused) sound.play().catch(() => {}); return; }
    sound.currentTime = 0;
    sound.play().catch(() => {});
  };

  const stopSound = (type: 'roll') => {
    if (audioRefs.current) { audioRefs.current[type].pause(); audioRefs.current[type].currentTime = 0; }
  };

  // 監聽贊助觸發器
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

  // 修改抽獎池統計邏輯：計算 未中獎人數 / 抽獎池總人數
  const poolStats = useMemo(() => {
    const poolConfig = settings.lotteryPoolConfig || { includedCategories: Object.values(GuestCategory), includedIndividualIds: [] };
    
    const poolMembers = eligibleGuests.filter(g => {
      // 如果完全沒設定 config，預設全體已報到人員
      if (!settings.lotteryPoolConfig) return true;
      
      const isInCategory = poolConfig.includedCategories.includes(g.category);
      const isExplicitlyIncluded = poolConfig.includedIndividualIds.includes(g.id);
      return isInCategory || isExplicitlyIncluded;
    });

    const totalInPool = poolMembers.length;
    // 尚未獲得任何獎項的人數
    const notWonYetCount = poolMembers.filter(g => !g.isWinner).length;

    return { 
      notWonYetCount, 
      totalInPool 
    };
  }, [eligibleGuests, settings.lotteryPoolConfig]);

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
    const pool = eligibleGuests.length > 0 ? eligibleGuests : guests;
    const items: Guest[] = [];
    for (let i = 0; i < TOTAL_REEL_ITEMS - 1; i++) {
      items.push(pool[Math.floor(Math.random() * pool.length)]);
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
          if (navigator.vibrate) navigator.vibrate([100, 50, 200]);
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
    if (confirmState === 'armed') {
      if (armTimerRef.current) clearTimeout(armTimerRef.current);
      setConfirmState('idle');
      return;
    }
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
        @keyframes winner-celebration {
          0%, 100% { transform: scale(1.1); filter: brightness(1) drop-shadow(0 0 15px rgba(255,215,0,0.3)); }
          50% { transform: scale(1.3); filter: brightness(2.5) drop-shadow(0 0 45px rgba(255,215,0,0.9)); }
        }
        .animate-winner-win { animation: winner-celebration 0.4s ease-in-out infinite; }
        .animate-snow-drift { animation: snowDrift 10s linear infinite; }
        @keyframes snowDrift {
          0% { transform: translateY(-100%) rotate(0deg); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
        @keyframes sponsor-float {
          0% { transform: translateX(100%); opacity: 0; }
          10%, 90% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(-100%); opacity: 0; }
        }
        .sponsor-entry { animation: sponsor-float 4s ease-in-out infinite; }
        
        @keyframes sponsor-pop {
          0% { transform: scale(0) rotate(-10deg); opacity: 0; }
          60% { transform: scale(1.05) rotate(2deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .sponsor-alert-anim { animation: sponsor-pop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards; }
        
        @keyframes glow-line {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .glow-active { background: linear-gradient(90deg, transparent, #fbbf24, transparent); background-size: 200% 100%; animation: glow-line 2s linear infinite; }

        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee { animation: marquee 30s linear infinite; }
        
        .animate-pool-marquee { animation: marquee 20s linear infinite; }
      `}</style>

      {/* 贊助慶祝全螢幕特效 */}
      {showSponsorAlert && (
        <div 
          onClick={() => setShowSponsorAlert(null)}
          className="fixed inset-0 z-[1000] flex items-center justify-center cursor-pointer group"
        >
            <div className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-in fade-in duration-500"></div>
            <div className="sponsor-alert-anim relative flex flex-col items-center text-center p-8 md:p-12 bg-amber-950/85 border-2 md:border-4 border-amber-500 rounded-[2.5rem] md:rounded-[3.5rem] shadow-[0_0_80px_rgba(251,191,36,0.4)] w-[90%] max-w-4xl">
                <div className="mb-4 md:mb-6 flex gap-4 md:gap-6">
                    <Sparkles size={48} className="text-yellow-400 animate-bounce" />
                    <div className="relative">
                      <Heart size={64} fill="#F59E0B" className="text-amber-500 animate-pulse" />
                      <div className="absolute inset-0 flex items-center justify-center text-white"><Star size={24} fill="currentColor" /></div>
                    </div>
                    <Sparkles size={48} className="text-yellow-400 animate-bounce delay-150" />
                </div>
                
                <div className="bg-amber-500 text-amber-950 px-4 md:px-6 py-1 rounded-full text-[10px] md:text-xs font-black tracking-[0.5em] uppercase mb-4 md:mb-6 italic shadow-lg">榮耀時刻</div>
                
                <div className="space-y-2 md:space-y-3">
                    <p className="text-5xl md:text-8xl font-black text-white italic tracking-tighter drop-shadow-2xl">{showSponsorAlert.name}</p>
                    <p className="text-lg md:text-3xl font-black text-amber-300 uppercase tracking-widest italic">{showSponsorAlert.title || '榮譽贊助貴賓'}</p>
                </div>
                
                <div className="mt-8 md:mt-12 flex flex-col gap-3 md:gap-4 items-center w-full">
                    {showSponsorAlert.itemName ? (
                      <div className="flex items-center gap-2 md:gap-3 px-6 md:px-10 py-3 md:py-5 bg-blue-600 rounded-2xl md:rounded-3xl border border-blue-400 shadow-xl">
                        <Package size={24} className="text-white md:w-8 md:h-8" />
                        <span className="text-xl md:text-5xl font-black text-white italic tracking-tight">{showSponsorAlert.itemName}</span>
                      </div>
                    ) : (
                      <div className="px-8 md:px-12 py-4 md:py-6 bg-white rounded-full shadow-[0_0_40px_rgba(255,255,255,0.3)] border-2 md:border-4 border-amber-100 flex items-center gap-3 md:gap-4">
                        <span className="text-amber-600 text-2xl md:text-3xl font-black">NT$</span>
                        <span className="text-4xl md:text-7xl font-black text-amber-600 tabular-nums">{showSponsorAlert.amount.toLocaleString()}</span>
                      </div>
                    )}
                </div>
                
                <div className="mt-8 md:mt-12 flex flex-col items-center gap-2">
                    <p className="text-white/40 font-black text-[10px] md:text-xs uppercase tracking-[0.8em] animate-pulse">感謝您支持青商，貢獻嘉義</p>
                    <div className="text-white/20 font-bold text-[8px] md:text-[10px] flex items-center gap-2 mt-4 uppercase tracking-widest">
                       <Zap size={10} /> 點擊任意處立即關閉
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* 聖誕背景裝飾 */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute animate-snow-drift text-white/10" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 10}s`, animationDuration: `${5 + Math.random() * 10}s` }}>
            <Snowflake size={10 + Math.random() * 20} />
          </div>
        ))}
      </div>

      {/* 1. 主舞台 */}
      <div 
        onClick={handleDrawClick}
        className={`relative mt-4 md:mt-8 w-full max-w-7xl h-[70vh] md:h-[75vh] rounded-[2.5rem] md:rounded-[3rem] flex flex-col transition-all duration-1000 border border-white/5 overflow-hidden z-10 shadow-3xl
          ${confirmState === 'armed' ? 'bg-red-950/20' : isAnimating ? 'bg-blue-950/10' : 'bg-slate-900/5'}
        `}
      >
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_40%,_rgba(185,28,28,0.1),_transparent_80%)]"></div>

        <header className="relative w-full p-6 md:p-8 z-30 border-b border-white/5 bg-gradient-to-b from-black/95 to-transparent flex items-center justify-between">
           <div className="flex items-center gap-6">
              <div className="p-3 md:p-3 bg-red-600 rounded-xl shadow-[0_0_25px_rgba(220,38,38,0.4)] shrink-0 animate-pulse">
                <Gift size={20} className="text-white md:w-6 md:h-6" />
              </div>
              <div className="text-left">
                 <h2 className="text-white font-black text-lg md:text-3xl tracking-tight leading-none italic drop-shadow(0 4px 12px rgba(0,0,0,0.8))">{settings.eventName}</h2>
                 <p className="text-red-500 font-bold text-[7px] md:text-[9px] uppercase tracking-[0.5em] mt-2 italic">Merry Christmas · ROUND {currentActiveRound}</p>
              </div>
           </div>
           
           <div className="flex items-center gap-4">
              <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className={`w-10 h-10 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all border border-white/5 ${isMuted ? 'bg-white/5 text-white/20' : 'bg-red-600/20 text-red-400'}`}>
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <div className="px-4 py-2 bg-white/5 rounded-full border border-white/10 flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {/* 修改點：顯示 未中獎人數 / 總池人數 */}
                <span className="text-[9px] md:text-base font-black text-white italic tracking-tighter tabular-nums opacity-60 uppercase">
                  {poolStats.notWonYetCount} / {poolStats.totalInPool}
                </span>
              </div>
           </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* 左側：滾輪 */}
          <div className="relative w-full md:w-[32%] h-[30%] md:h-full flex flex-col items-center justify-center overflow-hidden bg-black/60 border-r border-white/5">
            <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-black via-transparent to-black opacity-60"></div>
            <div className="absolute inset-x-0 h-[50px] md:h-[ITEM_HEIGHT] top-1/2 -translate-y-1/2 border-y border-white/15 bg-red-500/5 pointer-events-none z-20 shadow-[inset_0_0_40px_rgba(255,255,255,0.02)]"></div>
            <div className="relative w-full h-full flex items-center justify-center">
               {reelItems.length > 0 ? (
                  <div 
                    className="absolute w-full"
                    style={{ 
                      transform: `translateY(${-reelOffset}px)`,
                      top: '50%',
                      marginTop: `-${ITEM_HEIGHT/2}px`,
                      filter: isAnimating && !animatingWinner ? `blur(${Math.min(currentSpeed, 5)}px)` : 'none'
                    }}
                  >
                    {reelItems.map((g, idx) => {
                      const isWinner = idx === reelItems.length - 1 && animatingWinner;
                      return (
                        <div key={`${g.id}-${idx}`} className="flex flex-col items-center justify-center text-center px-4" style={{ height: `${ITEM_HEIGHT}px` }}>
                          <span className={`font-black italic transition-all duration-300 whitespace-nowrap leading-none tracking-tighter ${
                            isWinner 
                              ? `text-yellow-400 text-3xl md:text-6xl drop-shadow(0 0 30px rgba(255,215,0,0.8)) ${isFlashing ? 'animate-winner-win' : 'scale-110'}` 
                              : 'text-white/35 text-xl md:text-3xl'
                          }`}>
                            {g.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
               ) : (
                  <div className="flex flex-col items-center gap-4 opacity-10">
                    <Gift size={40} className="animate-bounce text-red-500" />
                    <p className="text-[8px] font-black tracking-[0.5em] uppercase text-white">Unlock Holiday Magic</p>
                  </div>
               )}
            </div>
          </div>

          {/* 右側：顯示區 */}
          <div className={`relative w-full md:w-[68%] h-[70%] md:h-full flex flex-col transition-all duration-1000
            ${isAnimating || currentWinnerBatch.length > 0 ? 'bg-red-900/10 ring-inset ring-1 ring-red-500/20' : 'bg-black/40'}
          `}>
             <div className="p-4 md:p-6 flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 mb-4 opacity-40">
                    <Snowflake size={14} className="text-red-400" />
                    <span className="text-[10px] font-black text-white tracking-[0.4em] uppercase italic">{currentWinnerBatch.length > 0 || isAnimating ? 'Holiday Ceremony Sync' : 'Honor Roll Display'}</span>
                </div>

                <div className="flex-1 flex flex-col gap-2 overflow-y-auto no-scrollbar">
                    {currentWinnerBatch.length > 0 ? (
                    currentWinnerBatch.map((w, idx) => (
                        <div key={`${w.id}-${idx}`} className="flex items-center p-3 md:p-5 bg-white/[0.05] border border-white/10 rounded-xl md:rounded-[1.5rem] animate-in slide-in-from-right-10 fade-in duration-700 shadow-2xl group hover:bg-white/[0.08] transition-all">
                        <div className="w-8 h-8 md:w-14 md:h-14 bg-gradient-to-br from-red-600 to-orange-600 rounded-lg md:rounded-2xl flex items-center justify-center font-black italic text-white text-[10px] md:text-xl shrink-0 mr-4 md:mr-6 shadow-[0_4px_15px_rgba(220,38,38,0.4)]">#{idx+1}</div>
                        <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-6 flex-1 min-w-0 pr-8">
                            <h3 className="font-black text-white text-xl md:text-3xl tracking-tighter italic whitespace-nowrap leading-none drop-shadow-md">{w.name}</h3>
                            <span className="text-[10px] md:text-xl text-yellow-500/60 font-black uppercase tracking-widest italic truncate border-l border-white/10 pl-4 md:pl-6">{w.title || '貴賓'}</span>
                        </div>
                        <div className="opacity-20 group-hover:opacity-100 group-hover:scale-125 transition-all text-yellow-500"><Star size={22} fill="currentColor" /></div>
                        </div>
                    ))
                    ) : isAnimating ? (
                    <div className="p-8 md:p-14 border border-dashed border-red-500/20 rounded-[2rem] flex flex-col items-center justify-center gap-6 animate-pulse bg-red-500/[0.02] mt-4">
                        <Loader2 size={32} className="animate-spin text-red-500" />
                        <span className="text-xs md:text-2xl font-black text-white/20 uppercase tracking-[0.5em] italic">Orchestrating Winner...</span>
                    </div>
                    ) : (
                    <div className="h-full flex flex-col items-center justify-center">
                        {sponsors.length > 0 ? (
                        <div key={sponsorIndex} className="sponsor-entry flex flex-col items-center text-center space-y-6">
                            <div className="p-6 bg-amber-500/10 rounded-full border border-amber-500/20 shadow-[0_0_50px_rgba(245,158,11,0.1)]"><Heart size={64} className="text-amber-500 animate-pulse" fill="currentColor" /></div>
                            <div className="space-y-4">
                                <h3 className="text-4xl md:text-7xl font-black text-amber-500 italic tracking-tighter drop-shadow-lg">{sponsors[sponsorIndex].name}</h3>
                                <p className="text-lg md:text-2xl font-bold text-white/40 uppercase tracking-[0.5em]">{sponsors[sponsorIndex].title || '榮譽贊助貴賓'}</p>
                                
                                {/* 中央輪播顯示邏輯優化 */}
                                {sponsors[sponsorIndex].itemName ? (
                                    <div className="bg-blue-600/20 text-blue-400 px-8 py-3 rounded-2xl border border-blue-500/30 flex items-center gap-3 mt-4 animate-in zoom-in duration-500">
                                        <Package size={28} />
                                        <span className="text-xl md:text-4xl font-black italic tracking-tight">{sponsors[sponsorIndex].itemName}</span>
                                    </div>
                                ) : (
                                    <div className="inline-block px-10 py-4 bg-white/5 rounded-full border border-white/10 mt-6 animate-in zoom-in duration-500">
                                        <span className="text-3xl md:text-5xl font-black text-yellow-400 tabular-nums">NT$ {sponsors[sponsorIndex].amount.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] font-black text-white/10 uppercase tracking-[1em] mt-8 italic">Sponsorship Honor Roll</p>
                        </div>
                        ) : (
                        <div className="opacity-5 flex flex-col items-center">
                            <Trophy size={80} strokeWidth={1} className="text-white" />
                            <p className="font-black tracking-[1.2em] text-[8px] uppercase mt-8 italic text-white">Waiting for Santa's Signal</p>
                        </div>
                        )}
                    </div>
                    )}
                </div>
             </div>

             {/* 底部贊助芳名即時滾動條 */}
             {sponsors.length > 0 && (
                <div className="bg-black/80 border-t border-white/10 h-16 md:h-24 flex items-center overflow-hidden relative group">
                    <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black z-10"></div>
                    <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black z-10"></div>
                    
                    <div className="flex animate-marquee whitespace-nowrap">
                        {[...sponsors, ...sponsors].map((s, i) => (
                            <div key={`${s.id}-${i}`} className="flex items-center gap-4 px-12 md:px-20 border-r border-white/5">
                                <Heart size={16} fill="#F59E0B" className="text-amber-500 shrink-0" />
                                <div className="flex items-baseline gap-3">
                                    <span className="text-amber-400 font-black text-xl md:text-3xl italic tracking-tighter">{s.name}</span>
                                    <span className="text-white/30 font-bold text-[10px] md:text-sm uppercase tracking-widest">{s.title || '會友'}</span>
                                </div>
                                
                                {s.itemName ? (
                                    <div className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
                                        <Package size={14} className="text-blue-400" />
                                        <span className="text-blue-400 font-black text-[10px] md:text-lg italic">{s.itemName}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
                                        <span className="text-yellow-500/40 font-black text-[9px] md:text-xs tracking-widest uppercase">NT$</span>
                                        <span className="text-white font-black text-lg md:text-3xl tabular-nums tracking-tighter">{s.amount.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
             )}
          </div>
        </div>

        {confirmState === 'armed' && (
           <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/98 backdrop-blur-3xl animate-in fade-in duration-500 text-center">
              <Gift size={80} className="text-red-500 mb-6 animate-bounce" />
              <h1 className="text-lg md:text-4xl font-black text-white tracking-tighter italic uppercase">INITIATING HOLIDAY BROADCAST</h1>
              <p className="text-[8px] md:text-xs text-white/30 font-black tracking-[0.8em] mt-6">QUANTUM FESTIVAL SYNC</p>
           </div>
        )}
      </div>

      {/* 2. 控制台 */}
      <div className="mt-8 md:mt-12 w-full max-w-4xl space-y-4 md:space-y-6 z-20">
        
        {/* 抽獎池動態顯示跑馬燈 (對應紅色範圍) */}
        <div className="relative h-10 md:h-12 bg-white/5 rounded-2xl border border-white/10 overflow-hidden flex items-center shadow-inner group">
          <div className="absolute left-0 top-0 bottom-0 px-4 bg-slate-900/80 z-20 flex items-center gap-2 border-r border-white/10">
            <Filter size={14} className="text-red-500" />
            <span className="text-[10px] md:text-xs font-black text-white uppercase tracking-widest">Active Pool</span>
          </div>
          <div className="flex animate-pool-marquee whitespace-nowrap pl-24 md:pl-32">
             <span className="text-[10px] md:text-base font-black text-slate-400 italic pr-24 md:pr-40">{poolConfigInfo}</span>
             <span className="text-[10px] md:text-base font-black text-slate-400 italic pr-24 md:pr-40">{poolConfigInfo}</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full relative group">
                <Users size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700" />
                <select value={drawCount} onChange={(e) => setDrawCount(Number(e.target.value))} className="w-full h-12 md:h-16 pl-14 md:pl-16 pr-10 bg-white/[0.03] border border-white/5 rounded-full font-black text-[10px] md:text-sm text-white appearance-none outline-none shadow-xl">
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n} className="bg-slate-950">Celebrate Draw x{n} Lucky Ones</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700" />
            </div>
            <div className="flex gap-4 shrink-0">
                <button onClick={handleResetClick} className="w-12 h-12 md:w-16 md:h-16 bg-red-600/5 text-red-500 hover:bg-red-600 hover:text-white rounded-full flex items-center justify-center transition-all border border-red-500/10 shadow-xl"><RotateCcw size={18} /></button>
                <button onClick={() => isUnlocked ? logoutAdmin() : setShowLoginModal(true)} className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all border border-white/5 shadow-xl ${isUnlocked ? 'bg-red-600/20 text-red-500' : 'bg-white/5 text-slate-700'}`}>{isUnlocked ? <Unlock size={18} /> : <Lock size={18} />}</button>
            </div>
        </div>

        {/* 3. 歷史分頁 */}
        <div className="flex items-end px-2 md:px-4">
           <div className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar">
              {[1, 2, 3, 4, 5].map(r => (
                <button key={r} onClick={() => isUnlocked ? jumpToLotteryRound(r) : setShowLoginModal(true)} className={`relative px-6 md:px-10 h-10 md:h-14 rounded-t-2xl md:rounded-t-[2.2rem] font-black text-[10px] md:text-lg transition-all ${currentActiveRound === r ? 'bg-[#1a1c24] text-red-500 border-t border-x border-red-500/20' : 'text-slate-600 hover:text-slate-400 bg-black/20 hover:bg-black/40'}`}>
                  R{r}{currentActiveRound === r && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-red-500 shadow-[0_0_12px_#ef4444]"></div>}
                </button>
              ))}
           </div>
        </div>

        <div className="relative bg-[#15171e] rounded-[2rem] md:rounded-[3rem] border border-white/10 shadow-3xl overflow-hidden min-h-[450px]">
           <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center text-red-500"><Gift size={350} /></div>
           <div className="p-6 md:p-10 flex items-center justify-between border-b border-white/5 bg-black/25 relative z-10">
              <div className="flex items-center gap-5">
                 <div className="w-12 h-12 md:w-16 md:h-16 bg-red-600/10 rounded-2xl flex items-center justify-center text-red-500 shadow-inner"><ClipboardList size={24} /></div>
                 <div>
                    <h3 className="text-white font-black text-xl md:text-3xl italic tracking-tighter">Round {currentActiveRound} Hall of Fame</h3>
                    <p className="text-slate-500 font-bold text-[8px] md:text-xs uppercase tracking-[0.4em] mt-2 italic">Holiday Winners Record</p>
                 </div>
              </div>
              <div className="text-right">
                 <span className="text-red-500 font-black text-2xl md:text-5xl tabular-nums italic drop-shadow(0 0 15px rgba(239,68,68,0.3))">{(historyMap[currentActiveRound] || []).length}</span>
                 <p className="text-slate-600 font-bold text-[8px] md:text-[10px] uppercase tracking-widest mt-1">Luck Records</p>
              </div>
           </div>
           <div className="p-4 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 relative z-10">
              {(historyMap[currentActiveRound] || []).map((w, idx) => (
                <div key={`${w.id}-${currentActiveRound}-${idx}`} className="flex items-center justify-between p-5 md:px-8 md:py-6 bg-white/[0.03] rounded-[1.8rem] border border-white/5 hover:border-red-500/25 hover:bg-white/[0.05] transition-all group shadow-lg">
                   <div className="flex items-center gap-5 min-w-0">
                      <span className="text-[10px] md:text-sm font-black text-slate-600 italic tracking-widest">#{idx+1}</span>
                      <div className="min-w-0">
                        <div className={`font-black text-white italic tracking-tighter leading-none whitespace-nowrap overflow-visible ${w.name.length >= 5 ? 'text-sm md:text-2xl' : 'text-lg md:text-3xl'}`}>{w.name}</div>
                        <div className="text-[8px] md:text-sm text-slate-600 font-bold truncate uppercase tracking-[0.2em] italic mt-3 border-l border-white/5 pl-4">{w.title || '貴賓'}</div>
                      </div>
                   </div>
                   <Star size={16} className="text-yellow-500/10 group-hover:text-yellow-500/50 group-hover:rotate-45 transition-all duration-500" />
                </div>
              ))}
              {(historyMap[currentActiveRound] || []).length === 0 && (
                <div className="col-span-full py-32 flex flex-col items-center justify-center opacity-10">
                   <Gift size={80} strokeWidth={1} className="animate-pulse text-red-500" /><p className="text-base font-black tracking-[1.5em] text-center uppercase mt-10 italic text-white">Archive Empty: Round {currentActiveRound}</p>
                </div>
              )}
           </div>
        </div>
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 ios-blur bg-black/98 z-[500] flex items-center justify-center p-6">
          <div className="bg-[#0b0c10] border border-white/10 rounded-[3rem] p-10 md:p-16 max-sm w-full shadow-3xl flex flex-col items-center gap-8 text-center animate-in zoom-in-95 duration-500">
            <h3 className="text-base md:text-2xl font-black text-white tracking-[0.5em] italic uppercase">Holiday Admin Access</h3>
            <form onSubmit={handleLoginSubmit} className="w-full space-y-10">
              <input type="password" placeholder="••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-8 px-6 text-center text-5xl md:text-7xl font-black text-white outline-none tracking-[1em] focus:bg-white/10 transition-all" autoFocus />
              <div className="flex gap-6"><button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-6 font-black text-slate-600 text-[10px] md:text-xs uppercase tracking-[0.4em]">Abort</button><button type="submit" className="flex-1 py-6 bg-red-600 text-white font-black rounded-2xl text-[10px] md:text-xs uppercase tracking-[0.4em] active:scale-95">Verify</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LotteryPanel;
