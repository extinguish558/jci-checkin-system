
import React, { useMemo, useState } from 'react';
import { useEvent } from '../context/EventContext';
import { GuestCategory, Guest } from '../types';
import { CheckCircle2, Circle, RefreshCw, Mic2, ChevronDown, ChevronUp, Handshake, Lock, Unlock, X } from 'lucide-react';

interface VipCardProps {
  guest: Guest;
  side: 'left' | 'right';
  onToggle: (id: string) => void;
}

const VipCard: React.FC<VipCardProps> = ({ guest, side, onToggle }) => (
  <div 
      onClick={() => onToggle(guest.id)}
      className={`cursor-pointer transition-all duration-200 rounded-2xl border p-4 md:p-5 mb-3 relative group
          ${side === 'left' 
              ? 'bg-white border-white shadow-[0_4px_15px_rgba(0,0,0,0.03)] active:scale-[0.98]' 
              : 'bg-gray-200/50 border-transparent opacity-60'}
      `}
  >
      <div className="flex items-center gap-3 md:gap-4">
          <div className={`shrink-0 ${side === 'left' ? 'text-[#007AFF]' : 'text-green-600'}`}>
              {side === 'left' ? <Circle size={24} strokeWidth={3} /> : <CheckCircle2 size={24} strokeWidth={3} />}
          </div>
          
          <div className="flex-1 min-w-0">
               <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className={`text-lg md:text-xl font-black leading-tight ${side === 'left' ? 'text-black' : 'text-gray-400 line-through'}`}>
                      {guest.name}
                  </span>
                  <span className={`text-[11px] md:text-sm font-bold leading-tight ${side === 'left' ? 'text-[#007AFF]' : 'text-gray-400'}`}>
                      {guest.title}
                  </span>
               </div>
               {guest.note && (
                   <div className="text-[10px] text-orange-700 font-black bg-orange-50 px-2 py-0.5 rounded-lg mt-2 inline-block border border-orange-100">
                       {guest.note}
                   </div>
               )}
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${guest.round === 2 ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                R{guest.round || 1}
            </span>
          </div>
      </div>
  </div>
);

const McPanel: React.FC = () => {
  const { guests, toggleIntroduced, resetIntroductions, isAdmin, loginAdmin, logoutAdmin } = useEvent();
  const [activeTab, setActiveTab] = useState<'vip' | 'roster'>('vip');
  const [filterRound, setFilterRound] = useState<number | 'all'>('all');

  const [isUnintroExpanded, setIsUnintroExpanded] = useState(true);
  const [isIntroExpanded, setIsIntroExpanded] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginAdmin(loginPassword)) {
        setShowLoginModal(false);
        setLoginPassword("");
    } else {
        alert("密碼錯誤");
    }
  };

  const presentGuests = useMemo(() => guests.filter(g => g.isCheckedIn), [guests]);

  const toHalfWidth = (str: string) => {
      return str.replace(/[\uff01-\uff5e]/g, function(ch) {
          return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
      }).replace(/\u3000/g, ' ');
  };

  const getTitleNumber = (title: string): number => {
      if (!title) return 999999;
      const normalizedTitle = toHalfWidth(title);
      if (normalizedTitle.includes('創會')) return 0;
      const match = normalizedTitle.match(/(\d+)/);
      return match ? parseInt(match[0], 10) : 999999;
  };

  const stableSortByTitleNumber = (a: Guest, b: Guest) => {
      const numA = getTitleNumber(a.title);
      const numB = getTitleNumber(b.title);
      if (numA !== numB) return numA - numB;
      return a.name.localeCompare(b.name, "zh-TW");
  };

  const groupedUnintroduced = useMemo(() => {
      const groups = {
          gov: [] as Guest[],
          presidents: [] as Guest[],
          chairmen: [] as Guest[],
          hq: [] as Guest[],
          visiting: [] as Guest[],
          vips: [] as Guest[]
      };

      presentGuests.forEach(g => {
          if (g.isIntroduced) return;
          const effectiveRound = g.round || 1;
          if (filterRound !== 'all' && effectiveRound !== filterRound) return;
          if (!g.title || g.title.trim() === '') return;
          if (g.title.includes('見習會友')) return;

          const title = g.title.trim();
          const normalizedTitle = toHalfWidth(title); 
          const fullInfo = (normalizedTitle + (g.category || '')).toLowerCase();
          
          // 精確政府關鍵字清單
          const govKeywords = ['政府', '議會', '立委', '市長', '縣長', '局長'];
          
          const isGovStrict = govKeywords.some(k => fullInfo.includes(k));
          const isPresident = normalizedTitle.includes('會長') || g.category === GuestCategory.PAST_PRESIDENT;
          const isChairman = normalizedTitle.includes('主席') || g.category === GuestCategory.PAST_CHAIRMAN;
          const isHQ = normalizedTitle.includes('總會') || g.category === GuestCategory.HQ_GUEST;
          const isVisiting = g.category === GuestCategory.VISITING_CHAPTER || 
                            ['母會', '友會', '兄弟會', '姊妹會', '分會', '友好', '聯誼'].some(k => normalizedTitle.includes(k));
          
          // 判定規則：
          // 1. 符合精確政府關鍵字 且 不屬於青商體系 -> 歸入長官區
          if (isGovStrict && !normalizedTitle.includes('總會') && !normalizedTitle.includes('分會')) {
              groups.gov.push(g);
          } else if (isPresident) {
              groups.presidents.push(g);
          } else if (isChairman) {
              groups.chairmen.push(g);
          } else if (isHQ) {
              groups.hq.push(g);
          } else if (isVisiting) {
              groups.visiting.push(g);
          } else {
              groups.vips.push(g);
          }
      });

      const sortListByTime = (l: Guest[]) => l.sort((a,b) => (a.checkInTime || '').localeCompare(b.checkInTime || ''));
      
      sortListByTime(groups.gov);
      groups.presidents.sort(stableSortByTitleNumber);
      groups.chairmen.sort(stableSortByTitleNumber);
      sortListByTime(groups.hq);
      sortListByTime(groups.visiting);
      sortListByTime(groups.vips);
      return groups;
  }, [presentGuests, filterRound]);

  const introducedGuests = useMemo(() => {
    return presentGuests.filter(g => {
        const effectiveRound = g.round || 1;
        const matchesRound = (filterRound === 'all' || effectiveRound === filterRound);
        return g.isIntroduced && matchesRound;
    }).sort((a, b) => (a.name).localeCompare(b.name, "zh-TW"));
  }, [presentGuests, filterRound]);

  const vipStats = useMemo(() => {
      const relevantGuests = presentGuests.filter(g => {
          const effectiveRound = g.round || 1;
          const matchesRound = (filterRound === 'all' || effectiveRound === filterRound);
          const hasTitle = g.title && g.title.trim() !== '';
          const isProbation = g.title.includes('見習會友');
          return matchesRound && hasTitle && !isProbation;
      });
      const total = relevantGuests.length;
      const intro = relevantGuests.filter(g => g.isIntroduced).length;
      return { total, intro, remain: total - intro };
  }, [presentGuests, filterRound]);

  return (
    <div className="w-full flex flex-col p-4 md:p-8 space-y-6 pb-32 animate-in fade-in duration-500 bg-[#F2F2F7] min-h-screen">
        
        {/* Header Card */}
        <div className="bg-white rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] p-6 md:p-8 border border-white space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                 <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-blue-50 text-[#007AFF] rounded-2xl flex items-center justify-center">
                        <Mic2 size={20} />
                    </div>
                    <h2 className="text-2xl font-black text-black tracking-tight">司儀播報模式</h2>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="bg-[#F2F2F7] p-1 rounded-xl flex text-[11px] font-black shadow-inner">
                        <button onClick={() => setActiveTab('vip')} className={`px-4 md:px-6 py-2.5 rounded-lg transition-all ${activeTab === 'vip' ? 'bg-white shadow-md text-black' : 'text-gray-400'}`}>智能介紹</button>
                        <button onClick={() => setActiveTab('roster')} className={`px-4 md:px-6 py-2.5 rounded-lg transition-all ${activeTab === 'roster' ? 'bg-white shadow-md text-black' : 'text-gray-400'}`}>完整名單</button>
                    </div>
                    <button onClick={() => isAdmin ? logoutAdmin() : setShowLoginModal(true)} className="p-3 bg-[#F2F2F7] rounded-2xl transition-all hover:bg-gray-100">
                      {isAdmin ? <Unlock size={20} className="text-[#007AFF]"/> : <Lock size={20} className="text-gray-300"/>}
                    </button>
                 </div>
            </div>

            <div className="space-y-5">
                <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
                    {[{ label: '全部', val: 'all' as const }, { label: 'R1 梯次', val: 1 }, { label: 'R2 梯次', val: 2 }].map(btn => (
                        <button key={btn.label} onClick={() => setFilterRound(btn.val)} className={`flex-1 py-2.5 rounded-xl text-[11px] font-black transition-all ${filterRound === btn.val ? 'bg-white text-[#007AFF] shadow-sm' : 'text-gray-400'}`}>{btn.label}</button>
                    ))}
                </div>
                <div className="flex justify-between items-center px-2">
                    <div className="flex gap-4 text-[11px] font-black uppercase tracking-tighter tabular-nums">
                        <span className="text-gray-400">已到: {vipStats.total}</span>
                        <span className="text-orange-600 underline underline-offset-4 decoration-2">待介: {vipStats.remain}</span>
                        <span className="text-green-600">已介: {vipStats.intro}</span>
                    </div>
                    <button onClick={resetIntroductions} className="text-[11px] font-black text-gray-300 hover:text-red-500 flex items-center gap-1 transition-colors">
                        <RefreshCw size={12}/> 重置
                    </button>
                </div>
            </div>
        </div>

        {/* Lists Content */}
        {activeTab === 'vip' ? (
            <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* 待介紹區域 */}
                <div className="bg-white rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-white overflow-hidden flex-[2] w-full">
                    <div className="bg-[#007AFF] px-6 py-5 flex justify-between items-center cursor-pointer" onClick={() => setIsUnintroExpanded(!isUnintroExpanded)}>
                        <div className="flex items-center gap-3 text-white font-black tracking-tight">
                            <Mic2 size={20}/> <span>待介紹區域</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="bg-white/20 text-white text-[11px] px-3 py-1 rounded-full font-black tabular-nums">{vipStats.remain}</span>
                            {isUnintroExpanded ? <ChevronUp size={20} className="text-white/50"/> : <ChevronDown size={20} className="text-white/50"/>}
                        </div>
                    </div>
                    {isUnintroExpanded && (
                        <div className="p-4 md:p-8 bg-gray-50/20">
                            {groupedUnintroduced.gov.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4 border-b border-red-50 pb-2">長官貴賓 (政府機關)</h3>
                                    {groupedUnintroduced.gov.map(g => <VipCard key={g.id} guest={g} side="left" onToggle={toggleIntroduced} />)}
                                </div>
                            )}
                            {groupedUnintroduced.presidents.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-4 border-b border-yellow-50 pb-2">歷屆會長</h3>
                                    {groupedUnintroduced.presidents.map(g => <VipCard key={g.id} guest={g} side="left" onToggle={toggleIntroduced} />)}
                                </div>
                            )}
                            {groupedUnintroduced.chairmen.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-4 border-b border-orange-50 pb-2">歷屆主席</h3>
                                    {groupedUnintroduced.chairmen.map(g => <VipCard key={g.id} guest={g} side="left" onToggle={toggleIntroduced} />)}
                                </div>
                            )}
                            {groupedUnintroduced.hq.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="text-[10px] font-black text-[#007AFF] uppercase tracking-widest mb-4 border-b border-blue-50 pb-2">總會長官</h3>
                                    {groupedUnintroduced.hq.map(g => <VipCard key={g.id} guest={g} side="left" onToggle={toggleIntroduced} />)}
                                </div>
                            )}
                            {groupedUnintroduced.visiting.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-4 border-b border-green-50 pb-2 flex items-center gap-2">
                                        <Handshake size={14}/> 友會/聯誼會來訪
                                    </h3>
                                    {groupedUnintroduced.visiting.map(g => <VipCard key={g.id} guest={g} side="left" onToggle={toggleIntroduced} />)}
                                </div>
                            )}
                            {groupedUnintroduced.vips.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">其他嘉賓</h3>
                                    {groupedUnintroduced.vips.map(g => <VipCard key={g.id} guest={g} side="left" onToggle={toggleIntroduced} />)}
                                </div>
                            )}
                            {vipStats.remain === 0 && <div className="py-24 text-center text-gray-300 font-black italic tracking-widest">目前暫無待介紹名單</div>}
                        </div>
                    )}
                </div>

                {/* 已介紹區域 */}
                <div className="bg-gray-200/50 rounded-[2.5rem] border border-transparent overflow-hidden flex-1 w-full lg:max-w-md sticky top-8">
                    <div className="px-6 py-5 flex justify-between items-center cursor-pointer" onClick={() => setIsIntroExpanded(!isIntroExpanded)}>
                        <div className="flex items-center gap-3 text-gray-400 font-black text-[11px] uppercase tracking-wider">
                            <CheckCircle2 size={16}/> <span>已介紹紀錄</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-gray-400 text-[11px] font-black tabular-nums">{vipStats.intro}</span>
                            {isIntroExpanded ? <ChevronUp size={18} className="text-gray-300"/> : <ChevronDown size={18} className="text-gray-300"/>}
                        </div>
                    </div>
                    {isIntroExpanded && (
                        <div className="p-4 md:p-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                            {introducedGuests.map(g => (
                                <VipCard key={g.id} guest={g} side="right" onToggle={toggleIntroduced} />
                            ))}
                            {vipStats.intro === 0 && <div className="py-12 text-center text-gray-400 text-xs font-bold italic">尚無已介紹資料</div>}
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-white overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-50 font-black text-black text-xl flex justify-between items-center">
                    <span>報到人員總覽</span>
                    <span className="text-[#007AFF] text-[10px] bg-blue-50 px-3 py-1 rounded-full">{presentGuests.length} 人</span>
                </div>
                <div className="p-4 space-y-3 bg-gray-50/30">
                    {presentGuests.map(g => (
                        <div key={g.id} className="p-4 md:p-5 bg-white rounded-[1.5rem] flex items-center shadow-[0_2px_10px_rgba(0,0,0,0.01)] border border-white">
                            <div className="min-w-0 flex-1 pr-4">
                                <div className="flex flex-wrap items-baseline gap-x-2">
                                  <div className="font-black text-black text-lg md:text-xl leading-tight">{g.name}</div>
                                  <div className="text-[10px] md:text-[11px] text-gray-400 font-bold uppercase tracking-tight">{g.title}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-3 py-1 rounded-lg">{g.category}</span>
                                {g.isIntroduced && <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-lg">已播報</span>}
                            </div>
                        </div>
                    ))}
                    {presentGuests.length === 0 && <div className="py-32 text-center text-gray-300 font-black italic tracking-widest">目前尚無人員報到</div>}
                </div>
            </div>
        )}

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

export default McPanel;
