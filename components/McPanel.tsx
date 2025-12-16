import React, { useMemo, useState } from 'react';
import { useEvent } from '../context/EventContext';
import { GuestCategory, Guest } from '../types';
import { CheckCircle2, Circle, RefreshCw, Mic2, Users, ListFilter, ArrowRight, ChevronDown, ChevronUp, Crown, Star, User, Layers, Globe } from 'lucide-react';

interface VipCardProps {
  guest: Guest;
  side: 'left' | 'right';
  onToggle: (id: string) => void;
}

const VipCard: React.FC<VipCardProps> = ({ guest, side, onToggle }) => (
  <div 
      onClick={() => onToggle(guest.id)}
      className={`cursor-pointer transition-all duration-300 transform rounded-lg border p-4 mb-2 relative group
          ${side === 'left' 
              ? 'bg-white border-indigo-100 shadow-sm hover:shadow-md hover:border-indigo-300 hover:-translate-y-1' 
              : 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100 hover:bg-white'}
      `}
  >
      <div className="flex items-center gap-3">
           {/* Indicator Icon */}
          <div className={`shrink-0 transition-colors ${side === 'left' ? 'text-indigo-200 group-hover:text-indigo-500' : 'text-green-500'}`}>
              {side === 'left' ? <Circle size={24} /> : <CheckCircle2 size={24} />}
          </div>
          
          <div className="flex-1">
               <div className="flex flex-wrap items-baseline gap-2">
                  <span className={`text-xl font-bold ${side === 'left' ? 'text-slate-900' : 'text-slate-500 line-through'}`}>
                      {guest.name}
                  </span>
                  <span className={`text-sm font-medium ${side === 'left' ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {guest.title}
                  </span>
               </div>
               {guest.note && (
                   <div className="text-xs text-orange-600 mt-1 font-medium bg-orange-50 inline-block px-1 rounded">
                       備註: {guest.note}
                   </div>
               )}
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className={`text-[10px] font-bold px-1 rounded ${guest.round === 1 ? 'bg-indigo-50 text-indigo-500 border border-indigo-100' : 'bg-purple-50 text-purple-500 border border-purple-100'}`}>
                {(guest.round || 1) === 1 ? '第一梯次' : (guest.round === 2 ? '第二梯次' : `R${guest.round}`)}
            </span>
            {side === 'left' && <span className="text-[10px] bg-slate-100 text-slate-400 px-1 rounded">{guest.category}</span>}
          </div>
      </div>
      
      {/* Action Hint */}
      {side === 'left' && (
           <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-indigo-500 transition-opacity">
               <ArrowRight size={20} />
           </div>
      )}
  </div>
);

const McPanel: React.FC = () => {
  const { guests, toggleIntroduced, resetIntroductions } = useEvent();
  const [activeTab, setActiveTab] = useState<'vip' | 'roster'>('vip');
  const [filterRound, setFilterRound] = useState<number | 'all'>('all');

  // Collapsible state
  const [isUnintroExpanded, setIsUnintroExpanded] = useState(true);
  const [isIntroExpanded, setIsIntroExpanded] = useState(false); // Default closed on mobile to save space for unintroduced

  // 1. Data Processing
  // All Checked-in
  const presentGuests = useMemo(() => guests.filter(g => g.isCheckedIn), [guests]);
  // All Absent
  const absentGuests = useMemo(() => guests.filter(g => !g.isCheckedIn), [guests]);

  // VIP Categories Definition for History (Show ALL categories in history)
  const allHistoryCategories = [
      GuestCategory.HQ_GUEST, // Added priority to history
      GuestCategory.PAST_PRESIDENT,
      GuestCategory.PAST_CHAIRMAN,
      GuestCategory.GOV_OFFICIAL,
      GuestCategory.VISITING_CHAPTER,
      GuestCategory.MEMBER_OB,
      GuestCategory.MEMBER_YB,
      GuestCategory.OTHER
  ];

  // Helper: Normalize Full-width characters to Half-width (Fixes Cloud Data Issues)
  const toHalfWidth = (str: string) => {
      return str.replace(/[\uff01-\uff5e]/g, function(ch) {
          return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
      }).replace(/\u3000/g, ' ');
  };

  // Helper for sorting generic lists
  const sortGuests = (list: Guest[]) => {
      return list.sort((a, b) => {
        if ((a.round || 0) !== (b.round || 0)) return (a.round || 0) - (b.round || 0);
        return (a.checkInTime || '').localeCompare(b.checkInTime || '');
      });
  };

  // Helper: Extract number from title for sorting (e.g. "第30屆" -> 30, "112年度" -> 112)
  const getTitleNumber = (title: string): number => {
      if (!title) return 999999;
      
      // Normalize first to handle "第４０屆" (Full width numbers)
      const normalizedTitle = toHalfWidth(title);

      if (normalizedTitle.includes('創會')) return 0; // "Founding" priority
      
      const match = normalizedTitle.match(/(\d+)/);
      return match ? parseInt(match[0], 10) : 999999; // If no number, put at end
  };

  // Helper: Stable Sort (Primary: Number, Secondary: Name)
  // This prevents the list from jumping around if numbers are equal or missing
  const stableSortByTitleNumber = (a: Guest, b: Guest) => {
      const numA = getTitleNumber(a.title);
      const numB = getTitleNumber(b.title);
      
      if (numA !== numB) return numA - numB;
      
      // Fallback to name to ensure stability
      return a.name.localeCompare(b.name, "zh-TW");
  };

  // Grouping for "To Be Introduced" (Left Column) - With Strict Rules
  const groupedUnintroduced = useMemo(() => {
      const groups = {
          hq: [] as Guest[], // New HQ Group
          presidents: [] as Guest[],
          chairmen: [] as Guest[],
          vips: [] as Guest[]
      };

      presentGuests.forEach(g => {
          // Rule 1: Must not be introduced yet
          if (g.isIntroduced) return;
          
          // Rule 2: Filter by Round
          const effectiveRound = g.round || 1;
          if (filterRound !== 'all' && effectiveRound !== filterRound) return;
          
          // Rule 3: STRICT Requirement - Must have a Title
          if (!g.title || g.title.trim() === '') return;

          // Rule 4: Exclude '見習會友'
          if (g.title.includes('見習會友')) return;

          // Categorization Logic:
          const title = g.title.trim();
          const normalizedTitle = toHalfWidth(title); 
          
          // Improved Logic: Explicitly check for keywords
          // PRIORITY 1: HEADQUARTERS (總會)
          const isHQ = normalizedTitle.includes('總會') || g.category === GuestCategory.HQ_GUEST;
          
          // PRIORITY 2: PRESIDENTS
          const isPresident = normalizedTitle.includes('會長') || g.category === GuestCategory.PAST_PRESIDENT;
          
          // PRIORITY 3: CHAIRMEN
          const isChairman = normalizedTitle.includes('主席') || g.category === GuestCategory.PAST_CHAIRMAN;
          
          if (isHQ) {
              groups.hq.push(g);
          } else if (isPresident) {
              groups.presidents.push(g);
          } else if (isChairman) {
              groups.chairmen.push(g);
          } else {
              // Everyone else goes to VIPs
              groups.vips.push(g);
          }
      });

      // Sorting Logic
      // 1. HQ: Sort by Check-in time (First come first serve usually for HQ unless specific rank)
      sortGuests(groups.hq);

      // 2. Presidents: Sort by Title Number (Session/Term) - Ascending
      groups.presidents.sort(stableSortByTitleNumber);
      
      // 3. Chairmen: Sort by Title Number (Year) - Ascending
      groups.chairmen.sort(stableSortByTitleNumber);
      
      // 4. VIPs: Default sort
      sortGuests(groups.vips);

      return groups;
  }, [presentGuests, filterRound]);


  // Grouping for "Already Introduced" (Right Column) - Keep detailed categories
  const groupedIntroduced = useMemo(() => {
    const groups: Record<string, Guest[]> = {};
    allHistoryCategories.forEach(cat => groups[cat] = []);

    presentGuests.forEach(guest => {
      if (!guest.isIntroduced) return; // Only introduced
      
      const effectiveRound = guest.round || 1;
      if (filterRound !== 'all' && effectiveRound !== filterRound) return;
      
      if (allHistoryCategories.includes(guest.category)) {
          groups[guest.category].push(guest);
      }
    });

    // Sort
    Object.keys(groups).forEach(key => sortGuests(groups[key]));
    return groups;
  }, [presentGuests, filterRound]);

  // Stats for VIPs (Counts based on what is shown in the left column)
  const vipStats = useMemo(() => {
      // Logic: Total tracked in the "VIP Intro" system vs those introduced
      // Updated to match the filtering logic: Must have title
      
      const relevantGuests = presentGuests.filter(g => {
          const effectiveRound = g.round || 1;
          const matchesRound = (filterRound === 'all' || effectiveRound === filterRound);
          const hasTitle = g.title && g.title.trim() !== '';
          const isProbation = g.title.includes('見習會友');
          
          // Only count guests who would actually appear in the list (must have title, not probation)
          return matchesRound && hasTitle && !isProbation;
      });
      
      const total = relevantGuests.length;
      const intro = relevantGuests.filter(g => g.isIntroduced).length;
      
      return { total, intro, remain: total - intro };
  }, [presentGuests, filterRound]);

  // Render Helper for Split View Lists (Used for Roster Tab)
  const renderGuestList = (list: Guest[], title: string, isPresent: boolean) => {
      // Filter list for Roster Tab based on round as well
      const filteredList = list.filter(g => {
          const effectiveRound = g.round || 1;
          return filterRound === 'all' || effectiveRound === filterRound;
      });
      
      return (
        <div className={`flex-1 flex flex-col h-full overflow-hidden rounded-xl border ${isPresent ? 'border-blue-200 bg-white' : 'border-slate-200 bg-slate-100'}`}>
            <div className={`p-3 font-bold text-center border-b flex justify-between items-center px-4 ${isPresent ? 'bg-blue-50 text-blue-800' : 'bg-slate-200 text-slate-700'}`}>
                <span>{title}</span>
                <span className="text-xs bg-white/50 px-2 py-1 rounded-full">{filteredList.length} 人</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {filteredList.map(g => (
                    <div key={g.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex justify-between items-center">
                        <div>
                            <div className="font-bold text-slate-800 text-lg">{g.name}</div>
                            <div className="text-sm text-slate-500">{g.title} {g.note && <span className="text-xs text-orange-500 ml-1">({g.note})</span>}</div>
                        </div>
                        <span className={`text-[10px] px-2 py-1 rounded truncate max-w-[100px] font-medium
                            ${g.category === GuestCategory.MEMBER_YB ? 'bg-yellow-100 text-yellow-800' : 
                                g.category === GuestCategory.MEMBER_OB ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-500'}
                        `}>
                            {g.category}
                        </span>
                    </div>
                ))}
                {filteredList.length === 0 && <div className="text-center text-slate-400 py-10">無資料</div>}
            </div>
        </div>
      );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24 font-sans">
        {/* Header & Tabs */}
        <div className="sticky top-0 z-10 bg-white shadow-md rounded-xl p-4 mb-6 border-b border-slate-200">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                 <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-indigo-900 flex items-center gap-2">
                        <Mic2 className="text-indigo-600" /> 司儀專用面板
                    </h2>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setActiveTab('vip')}
                        className={`px-6 py-2 rounded-md text-sm font-bold transition-all shadow-sm ${activeTab === 'vip' ? 'bg-white text-indigo-600 shadow' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <span className="flex items-center gap-2"><ListFilter size={16}/> VIP 介紹模式</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('roster')}
                        className={`px-6 py-2 rounded-md text-sm font-bold transition-all shadow-sm ${activeTab === 'roster' ? 'bg-white text-indigo-600 shadow' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <span className="flex items-center gap-2"><Users size={16}/> 總名單狀態</span>
                    </button>
                </div>
            </div>

            {/* Filters (Apply to BOTH Tabs) */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 mb-2">
                 <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar w-full md:w-auto">
                    <button 
                        onClick={() => setFilterRound('all')}
                        className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors border ${filterRound === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                        <Layers size={14} /> 全部
                    </button>
                    <button 
                        onClick={() => setFilterRound(1)}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors border ${filterRound === 1 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                        第一梯次
                    </button>
                    <button 
                        onClick={() => setFilterRound(2)}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors border ${filterRound === 2 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                        第二梯次
                    </button>
                </div>

                {/* VIP Stats (Only in VIP tab) */}
                {activeTab === 'vip' && (
                    <div className="flex items-center gap-4">
                         <div className="flex gap-3 text-sm">
                            <div className="px-2 py-1"><span className="font-bold text-indigo-700">{vipStats.total}</span> <span className="text-slate-500 text-xs">符合</span></div>
                            <div className="border-l border-indigo-200 px-2 py-1"><span className="font-bold text-orange-500">{vipStats.remain}</span> <span className="text-slate-500 text-xs">未介紹</span></div>
                            <div className="border-l border-indigo-200 px-2 py-1"><span className="font-bold text-green-600">{vipStats.intro}</span> <span className="text-slate-500 text-xs">已介紹</span></div>
                        </div>
                        <button onClick={resetIntroductions} className="text-xs text-slate-400 flex items-center gap-1 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors">
                            <RefreshCw size={12} /> 重置
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* Content Area */}
        {activeTab === 'vip' ? (
             <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-280px)] min-h-[500px]">
                {/* LEFT: Unintroduced (Grouped into 4 Categories) */}
                <div className={`${isUnintroExpanded ? 'flex-1' : 'flex-none h-14'} bg-white rounded-xl shadow-sm border border-indigo-200 flex flex-col overflow-hidden transition-all duration-300`}>
                    <div 
                        className="bg-indigo-50 p-3 font-bold text-indigo-900 border-b border-indigo-100 flex justify-between items-center cursor-pointer select-none hover:bg-indigo-100 transition-colors"
                        onClick={() => setIsUnintroExpanded(!isUnintroExpanded)}
                    >
                        <span className="flex items-center gap-2"><Mic2 size={18}/> 待介紹貴賓 <span className="text-xs font-normal text-indigo-500 opacity-70">(點擊收折)</span></span>
                        <div className="flex items-center gap-2">
                            <span className="bg-indigo-200 text-indigo-800 text-xs px-2 py-1 rounded-full">{vipStats.remain}</span>
                            {isUnintroExpanded ? <ChevronUp size={18} className="text-indigo-400"/> : <ChevronDown size={18} className="text-indigo-400"/>}
                        </div>
                    </div>
                    {isUnintroExpanded && (
                        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar bg-slate-50/50">
                            
                            {/* 1. HQ (總會) - Highest Priority */}
                            {groupedUnintroduced.hq.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-bold text-indigo-800 uppercase mb-3 flex items-center gap-2 border-b border-indigo-100 pb-1">
                                        <Globe size={16} className="text-blue-500" fill="currentColor"/> 總會長官/貴賓 ({groupedUnintroduced.hq.length})
                                    </h3>
                                    {groupedUnintroduced.hq.map(g => <VipCard key={g.id} guest={g} side="left" onToggle={toggleIntroduced} />)}
                                </div>
                            )}

                            {/* 2. PRESIDENTS - Sorted by Term */}
                            {groupedUnintroduced.presidents.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-bold text-indigo-800 uppercase mb-3 flex items-center gap-2 border-b border-indigo-100 pb-1">
                                        <Crown size={16} className="text-yellow-500" fill="currentColor"/> 歷屆會長 (依屆次) ({groupedUnintroduced.presidents.length})
                                    </h3>
                                    {groupedUnintroduced.presidents.map(g => <VipCard key={g.id} guest={g} side="left" onToggle={toggleIntroduced} />)}
                                </div>
                            )}

                            {/* 3. CHAIRMEN - Sorted by Year */}
                            {groupedUnintroduced.chairmen.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-bold text-indigo-800 uppercase mb-3 flex items-center gap-2 border-b border-indigo-100 pb-1">
                                        <Star size={16} className="text-orange-400" fill="currentColor"/> 歷屆主席 (依年度) ({groupedUnintroduced.chairmen.length})
                                    </h3>
                                    {groupedUnintroduced.chairmen.map(g => <VipCard key={g.id} guest={g} side="left" onToggle={toggleIntroduced} />)}
                                </div>
                            )}

                            {/* 4. ALL OTHER VIPS (With Titles) */}
                            {groupedUnintroduced.vips.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-bold text-indigo-800 uppercase mb-3 flex items-center gap-2 border-b border-indigo-100 pb-1">
                                        <User size={16} className="text-indigo-500" /> 貴賓介紹 ({groupedUnintroduced.vips.length})
                                    </h3>
                                    {groupedUnintroduced.vips.map(g => <VipCard key={g.id} guest={g} side="left" onToggle={toggleIntroduced} />)}
                                </div>
                            )}

                            {vipStats.remain === 0 && <div className="text-center text-slate-400 py-10 mt-10">
                                {filterRound !== 'all' ? `本梯次 待介紹清單為空 (無職稱者不顯示)` : `目前無待介紹貴賓 (無職稱者不顯示)`}
                            </div>}
                        </div>
                    )}
                </div>

                {/* RIGHT: Introduced (Detailed Categories) */}
                <div className={`${isIntroExpanded ? 'flex-1' : 'flex-none h-14'} bg-slate-100 rounded-xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300`}>
                    <div 
                        className="bg-slate-200 p-3 font-bold text-slate-600 border-b border-slate-300 flex justify-between items-center cursor-pointer select-none hover:bg-slate-300 transition-colors"
                        onClick={() => setIsIntroExpanded(!isIntroExpanded)}
                    >
                        <span className="flex items-center gap-2"><CheckCircle2 size={18}/> 已介紹清單 <span className="text-xs font-normal text-slate-500 opacity-70">(點擊收折)</span></span>
                        <div className="flex items-center gap-2">
                            <span className="bg-slate-300 text-slate-700 text-xs px-2 py-1 rounded-full">{vipStats.intro}</span>
                            {isIntroExpanded ? <ChevronUp size={18} className="text-slate-400"/> : <ChevronDown size={18} className="text-slate-400"/>}
                        </div>
                    </div>
                    {isIntroExpanded && (
                        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                            {(Object.entries(groupedIntroduced) as [string, Guest[]][]).map(([category, list]) => {
                                if (list.length === 0) return null;
                                return (
                                    <div key={category} className="mb-4">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 ml-1">{category}</h3>
                                        {list.map(g => <VipCard key={g.id} guest={g} side="right" onToggle={toggleIntroduced} />)}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        ) : (
            /* Roster Split View */
            <div className="h-[calc(100vh-220px)] flex flex-col md:flex-row gap-4">
                {renderGuestList(presentGuests, "已報到名單 (Checked In)", true)}
                {renderGuestList(absentGuests, "未報到名單 (Absent)", false)}
            </div>
        )}
    </div>
  );
};

export default McPanel;
