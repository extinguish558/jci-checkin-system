
import React, { useMemo, useState } from 'react';
import { useEvent } from '../context/EventContext';
import { GuestCategory, Guest } from '../types';
import { CheckCircle2, Circle, RefreshCw, Mic2, Users, ListFilter, ArrowRight, ChevronDown, ChevronUp, Crown, Star, User, Layers, Globe, Landmark, Handshake } from 'lucide-react';

interface VipCardProps {
  guest: Guest;
  side: 'left' | 'right';
  onToggle: (id: string) => void;
}

const VipCard: React.FC<VipCardProps> = ({ guest, side, onToggle }) => (
  <div 
      onClick={() => onToggle(guest.id)}
      className={`cursor-pointer transition-all duration-300 transform rounded-xl border p-3 md:p-4 mb-2 relative group
          ${side === 'left' 
              ? 'bg-white border-indigo-100 shadow-sm hover:shadow-md hover:border-indigo-300' 
              : 'bg-slate-50 border-slate-200 opacity-60 hover:opacity-100 hover:bg-white'}
      `}
  >
      <div className="flex items-center gap-2 md:gap-3">
           {/* Indicator Icon */}
          <div className={`shrink-0 transition-colors ${side === 'left' ? 'text-indigo-200 group-hover:text-indigo-500' : 'text-green-500'}`}>
              {side === 'left' ? <Circle size={20} className="md:w-6 md:h-6" /> : <CheckCircle2 size={20} className="md:w-6 md:h-6" />}
          </div>
          
          <div className="flex-1 min-w-0">
               <div className="flex flex-col md:flex-row md:items-baseline md:gap-2">
                  <span className={`text-base md:text-xl font-black truncate ${side === 'left' ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                      {guest.name}
                  </span>
                  <span className={`text-[10px] md:text-sm font-bold truncate ${side === 'left' ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {guest.title}
                  </span>
               </div>
               {guest.note && (
                   <div className="text-[10px] text-orange-600 font-bold bg-orange-50 inline-block px-1.5 rounded mt-0.5">
                       {guest.note}
                   </div>
               )}
          </div>

          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <span className={`text-[8px] md:text-[10px] font-black px-1.5 py-0.5 rounded-full border ${guest.round === 1 ? 'bg-blue-50 text-blue-500 border-blue-100' : 'bg-purple-50 text-purple-500 border-purple-100'}`}>
                {guest.round === 1 ? 'R1' : (guest.round === 2 ? 'R2' : `R${guest.round || 1}`)}
            </span>
            {side === 'left' && <span className="text-[8px] md:text-[10px] text-slate-400 font-bold">{guest.category.substring(0, 4)}</span>}
          </div>
      </div>
  </div>
);

const McPanel: React.FC = () => {
  const { guests, toggleIntroduced, resetIntroductions } = useEvent();
  const [activeTab, setActiveTab] = useState<'vip' | 'roster'>('vip');
  const [filterRound, setFilterRound] = useState<number | 'all'>('all');

  // Collapsible state
  const [isUnintroExpanded, setIsUnintroExpanded] = useState(true);
  const [isIntroExpanded, setIsIntroExpanded] = useState(false); 

  // Data Processing
  const presentGuests = useMemo(() => guests.filter(g => g.isCheckedIn), [guests]);
  const absentGuests = useMemo(() => guests.filter(g => !g.isCheckedIn), [guests]);

  const toHalfWidth = (str: string) => {
      return str.replace(/[\uff01-\uff5e]/g, function(ch) {
          return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
      }).replace(/\u3000/g, ' ');
  };

  const sortGuests = (list: Guest[]) => {
      return list.sort((a, b) => {
        if ((a.round || 0) !== (b.round || 0)) return (a.round || 0) - (b.round || 0);
        return (a.checkInTime || '').localeCompare(b.checkInTime || '');
      });
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
          hq: [] as Guest[],
          presidents: [] as Guest[],
          chairmen: [] as Guest[],
          gov: [] as Guest[],
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
          const isHQ = normalizedTitle.includes('總會') || g.category === GuestCategory.HQ_GUEST;
          const isPresident = normalizedTitle.includes('會長') || g.category === GuestCategory.PAST_PRESIDENT;
          const isChairman = normalizedTitle.includes('主席') || g.category === GuestCategory.PAST_CHAIRMAN;
          
          const isVisiting = g.category === GuestCategory.VISITING_CHAPTER || 
                            ['母會', '友會', '兄弟會', '姊妹會', '分會', '聯誼會', '友好會'].some(k => normalizedTitle.includes(k));
          
          const isGov = g.category === GuestCategory.GOV_OFFICIAL || ['政府', '議員', '立委', '市長', '縣長', '局長', '部長', '院長', '總統', '市民代表', '鄉民代表'].some(k => normalizedTitle.includes(k));

          if (isHQ) groups.hq.push(g);
          else if (isPresident) groups.presidents.push(g);
          else if (isChairman) groups.chairmen.push(g);
          else if (isVisiting) groups.visiting.push(g);
          else if (isGov) groups.gov.push(g);
          else groups.vips.push(g);
      });

      sortGuests(groups.hq);
      groups.presidents.sort(stableSortByTitleNumber);
      groups.chairmen.sort(stableSortByTitleNumber);
      sortGuests(groups.gov);
      
      groups.visiting.sort((a, b) => {
          const getPriority = (title: string) => {
              const t = title || '';
              if (t.includes('母會')) return 0;
              if (t.includes('兄弟會')) return 1;
              if (t.includes('聯誼會')) return 2;
              if (t.includes('分會')) return 3;
              if (t.includes('友好會')) return 4;
              return 99;
          };
          const pA = getPriority(a.title);
          const pB = getPriority(b.title);
          if (pA !== pB) return pA - pB;
          return (a.checkInTime || '').localeCompare(b.checkInTime || '');
      });
      
      sortGuests(groups.vips);
      return groups;
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
    <div className="w-full h-full bg-slate-50 p-1.5 md:p-6 flex flex-col overflow-hidden font-sans pb-16">
        {/* Header & Tabs - 手機版極簡化 */}
        <div className="bg-white shadow-sm rounded-2xl p-3 md:p-5 mb-2 md:mb-4 border border-slate-200 shrink-0">
            <div className="flex justify-between items-center mb-3 md:mb-4">
                 <h2 className="text-xl md:text-2xl font-black text-indigo-900 flex items-center gap-2">
                    <Mic2 className="text-indigo-600" size={20} /> <span className="tracking-tight">司儀面板</span>
                 </h2>
                <div className="flex bg-slate-100 p-1 rounded-xl text-[10px] md:text-sm font-bold">
                    <button onClick={() => setActiveTab('vip')} className={`px-4 py-1.5 rounded-lg transition-all ${activeTab === 'vip' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>介紹模式</button>
                    <button onClick={() => setActiveTab('roster')} className={`px-4 py-1.5 rounded-lg transition-all ${activeTab === 'roster' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>總清單</button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-2 md:gap-4 bg-indigo-50/50 p-2 rounded-xl border border-indigo-100">
                 <div className="flex gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto">
                    {[
                        { label: '全部梯次', val: 'all' as const },
                        { label: '第一梯次', val: 1 },
                        { label: '第二梯次', val: 2 }
                    ].map(btn => (
                        <button 
                            key={btn.label}
                            onClick={() => setFilterRound(btn.val)}
                            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-black whitespace-nowrap transition-colors border ${filterRound === btn.val ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200'}`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                {activeTab === 'vip' && (
                    <div className="flex items-center justify-between w-full md:w-auto gap-4 px-1">
                         <div className="flex gap-3 text-[10px] md:text-xs font-black">
                            <div className="text-slate-400">共 {vipStats.total} 位</div>
                            <div className="text-orange-500">待介 {vipStats.remain}</div>
                            <div className="text-emerald-600">已介 {vipStats.intro}</div>
                        </div>
                        <button onClick={resetIntroductions} className="text-[10px] font-bold text-slate-400 hover:text-red-500 flex items-center gap-1">
                            <RefreshCw size={10}/> 重置
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* Content Area - 調整手機版高度佔比 */}
        <div className="flex-1 min-h-0">
            {activeTab === 'vip' ? (
                <div className="flex flex-col md:flex-row gap-2 md:gap-4 h-full">
                    {/* 待介紹區域 - 在手機上預設佔據絕大部分空間 */}
                    <div className={`${isUnintroExpanded ? 'flex-[10]' : 'flex-none h-12'} bg-white rounded-2xl shadow-sm border border-indigo-200 flex flex-col overflow-hidden transition-all duration-300`}>
                        <div 
                            className="bg-indigo-50 px-4 py-3 font-black text-indigo-900 border-b border-indigo-100 flex justify-between items-center cursor-pointer select-none"
                            onClick={() => {
                                setIsUnintroExpanded(!isUnintroExpanded);
                                if (!isUnintroExpanded) setIsIntroExpanded(false);
                            }}
                        >
                            <span className="flex items-center gap-2 text-sm md:text-base"><Mic2 size={16}/> 待介紹貴賓</span>
                            <div className="flex items-center gap-2">
                                <span className="bg-indigo-200 text-indigo-800 text-[10px] px-2 py-0.5 rounded-full font-black">{vipStats.remain}</span>
                                {isUnintroExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                            </div>
                        </div>
                        {isUnintroExpanded && (
                            <div className="flex-1 overflow-y-auto p-2 md:p-4 custom-scrollbar bg-slate-50/20">
                                {groupedUnintroduced.hq.length > 0 && (
                                    <div className="mb-4 md:mb-6">
                                        <h3 className="text-[10px] md:text-xs font-black text-indigo-800 uppercase mb-2 flex items-center gap-2 border-b border-indigo-100 pb-1">
                                            <Globe size={14} className="text-blue-500"/> 總會長官 ({groupedUnintroduced.hq.length})
                                        </h3>
                                        {groupedUnintroduced.hq.map(g => <VipCard key={g.id} guest={g} side="left" onToggle={toggleIntroduced} />)}
                                    </div>
                                )}
                                {groupedUnintroduced.presidents.length > 0 && (
                                    <div className="mb-4 md:mb-6">
                                        <h3 className="text-[10px] md:text-xs font-black text-indigo-800 uppercase mb-2 flex items-center gap-2 border-b border-indigo-100 pb-1">
                                            <Crown size={14} className="text-yellow-500"/> 歷屆會長 ({groupedUnintroduced.presidents.length})
                                        </h3>
                                        {groupedUnintroduced.presidents.map(g => <VipCard key={g.id} guest={g} side="left" onToggle={toggleIntroduced} />)}
                                    </div>
                                )}
                                {groupedUnintroduced.chairmen.length > 0 && (
                                    <div className="mb-4 md:mb-6">
                                        <h3 className="text-[10px] md:text-xs font-black text-indigo-800 uppercase mb-2 flex items-center gap-2 border-b border-indigo-100 pb-1">
                                            <Star size={14} className="text-orange-400"/> 歷屆主席 ({groupedUnintroduced.chairmen.length})
                                        </h3>
                                        {groupedUnintroduced.chairmen.map(g => <VipCard key={g.id} guest={g} side="left" onToggle={toggleIntroduced} />)}
                                    </div>
                                )}
                                {groupedUnintroduced.visiting.length > 0 && (
                                    <div className="mb-4 md:mb-6">
                                        <h3 className="text-[10px] md:text-xs font-black text-indigo-800 uppercase mb-2 flex items-center gap-2 border-b border-indigo-100 pb-1">
                                            <Handshake size={14} className="text-green-500" /> 友會貴賓 ({groupedUnintroduced.visiting.length})
                                        </h3>
                                        {groupedUnintroduced.visiting.map(g => <VipCard key={g.id} guest={g} side="left" onToggle={toggleIntroduced} />)}
                                    </div>
                                )}
                                {groupedUnintroduced.gov.length > 0 && (
                                    <div className="mb-4 md:mb-6">
                                        <h3 className="text-[10px] md:text-xs font-black text-indigo-800 uppercase mb-2 flex items-center gap-2 border-b border-indigo-100 pb-1">
                                            <Landmark size={14} className="text-red-500" /> 政府長官 ({groupedUnintroduced.gov.length})
                                        </h3>
                                        {groupedUnintroduced.gov.map(g => <VipCard key={g.id} guest={g} side="left" onToggle={toggleIntroduced} />)}
                                    </div>
                                )}
                                {groupedUnintroduced.vips.length > 0 && (
                                    <div className="mb-4 md:mb-6">
                                        <h3 className="text-[10px] md:text-xs font-black text-indigo-800 uppercase mb-2 flex items-center gap-2 border-b border-indigo-100 pb-1">
                                            <User size={14} className="text-indigo-500" /> 其他貴賓 ({groupedUnintroduced.vips.length})
                                        </h3>
                                        {groupedUnintroduced.vips.map(g => <VipCard key={g.id} guest={g} side="left" onToggle={toggleIntroduced} />)}
                                    </div>
                                )}
                                {vipStats.remain === 0 && <div className="text-center text-slate-300 py-20 font-bold">目前無待介紹貴賓</div>}
                            </div>
                        )}
                    </div>

                    {/* 已介紹區域 - 手機上預設收合 */}
                    <div className={`${isIntroExpanded ? 'flex-[10]' : 'flex-none h-12'} bg-slate-100 rounded-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300`}>
                        <div 
                            className="bg-slate-200 px-4 py-3 font-black text-slate-500 border-b border-slate-300 flex justify-between items-center cursor-pointer select-none"
                            onClick={() => {
                                setIsIntroExpanded(!isIntroExpanded);
                                if (!isIntroExpanded) setIsUnintroExpanded(false);
                            }}
                        >
                            <span className="flex items-center gap-2 text-sm md:text-base"><CheckCircle2 size={16}/> 已介紹清單</span>
                            <div className="flex items-center gap-2">
                                <span className="bg-slate-300 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-black">{vipStats.intro}</span>
                                {isIntroExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                            </div>
                        </div>
                        {isIntroExpanded && (
                            <div className="flex-1 overflow-y-auto p-2 md:p-4 custom-scrollbar">
                                {Object.entries(groupedUnintroduced).map(([key, _]) => {
                                    const list = guests.filter(g => g.isIntroduced && g.isCheckedIn);
                                    // 簡單過濾對應類別的人
                                    return (
                                        <div key={key} className="space-y-2">
                                            {/* 已介紹不分小組，直接列出 */}
                                        </div>
                                    )
                                })}
                                {presentGuests.filter(g => g.isIntroduced).map(g => (
                                    <VipCard key={g.id} guest={g} side="right" onToggle={toggleIntroduced} />
                                ))}
                                {vipStats.intro === 0 && <div className="text-center text-slate-400 py-10 text-xs font-bold">尚未介紹任何貴賓</div>}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col md:flex-row gap-2 md:gap-4 p-1">
                    {/* 總名單渲染部分保持原樣，但在手機上增加 padding 適配 */}
                    <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-2xl border border-blue-100 shadow-sm">
                        <div className="p-3 bg-blue-50/50 border-b font-black text-blue-800 text-xs flex justify-between">
                            <span>已報到</span>
                            <span>{presentGuests.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                            {presentGuests.map(g => (
                                <div key={g.id} className="p-2.5 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-100">
                                    <div className="min-w-0">
                                        <div className="font-black text-slate-800 truncate text-sm">{g.name}</div>
                                        <div className="text-[10px] text-slate-400 font-bold truncate">{g.title}</div>
                                    </div>
                                    <span className="text-[9px] font-black bg-white px-1.5 py-0.5 rounded border text-slate-400 shrink-0">{g.category.substring(0,2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default McPanel;
