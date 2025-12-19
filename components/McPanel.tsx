
import React, { useMemo, useState } from 'react';
import { useEvent } from '../context/EventContext';
import { GuestCategory, Guest } from '../types';
import { CheckCircle2, Circle, Mic2, Lock, Unlock, ArrowLeft, RotateCcw } from 'lucide-react';

interface VipCardProps {
  guest: Guest;
  isIntroduced: boolean;
  onToggle: (id: string) => void;
}

const VipCard: React.FC<VipCardProps> = ({ guest, isIntroduced, onToggle }) => (
  <div 
    onClick={() => onToggle(guest.id)} 
    className={`transition-all duration-200 rounded-2xl border p-4 md:p-5 mb-3 cursor-pointer group ${
      !isIntroduced 
        ? 'bg-white border-white shadow-sm hover:scale-[1.01] active:scale-[0.98]' 
        : 'bg-gray-200/40 border-transparent opacity-60 hover:opacity-100'
    }`}
  >
      <div className="flex items-center gap-4">
          <div className={`shrink-0 ${!isIntroduced ? 'text-[#007AFF]' : 'text-orange-500'}`}>
            {!isIntroduced ? (
                <Circle size={22} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
            ) : (
                <RotateCcw size={22} strokeWidth={3} className="group-hover:rotate-[-45deg] transition-transform" />
            )}
          </div>
          <div className="flex-1 min-w-0">
               <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className={`text-lg md:text-xl font-black leading-tight ${!isIntroduced ? 'text-black' : 'text-gray-400 line-through'}`}>
                    {guest.name}
                  </span>
                  <span className={`text-[11px] md:text-sm font-bold leading-tight ${!isIntroduced ? 'text-[#007AFF]' : 'text-gray-400'}`}>
                    {guest.title}
                  </span>
               </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {!isIntroduced && guest.isCheckedIn && (
                <span className="text-[10px] font-black text-green-500 bg-green-50 px-2 py-1 rounded-lg">現場</span>
            )}
            <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${guest.round === 2 ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                R{guest.round || 1}
            </span>
          </div>
      </div>
  </div>
);

const McPanel: React.FC = () => {
  const { guests, toggleIntroduced, isAdmin, unlockedSections, loginAdmin, logoutAdmin } = useEvent();
  const isUnlocked = isAdmin || unlockedSections.mc;
  const [filterRound, setFilterRound] = useState<number | 'all'>('all');
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

  const triggerAction = (action: () => void) => {
    if (!isUnlocked) {
      setShowLoginModal(true);
      return;
    }
    action();
  };

  const presentGuests = useMemo(() => guests.filter(g => g.isCheckedIn), [guests]);

  // 工具函式：全形轉半形
  const toHalfWidth = (str: string) => str.replace(/[\uff01-\uff5e]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)).replace(/\u3000/g, ' ');
  
  // 工具函式：提取職稱中的數字（用於屆數排序）
  const getTitleNumber = (title: string): number => {
      if (!title) return 999999;
      const normalizedTitle = toHalfWidth(title);
      if (normalizedTitle.includes('創會')) return 0;
      const match = normalizedTitle.match(/(\d+)/);
      return match ? parseInt(match[0], 10) : 999999;
  };

  // 工具函式：獲取友會分類權重
  const getVisitingWeight = (title: string): number => {
    const t = toHalfWidth(title);
    if (t.includes('母會')) return 1;
    if (t.includes('兄弟會')) return 2;
    if (t.includes('聯誼會')) return 3;
    if (t.includes('分會')) return 4;
    if (t.includes('友好會')) return 5;
    if (t.includes('姊妹會')) return 6;
    if (t.includes('友會')) return 7;
    return 99;
  };

  const listData = useMemo(() => {
    const groups = {
        gov: { label: '政府貴賓', list: [] as Guest[] },
        presidents: { label: '歷屆會長', list: [] as Guest[] },
        chairmen: { label: '歷屆主席', list: [] as Guest[] },
        hq: { label: '總會貴賓', list: [] as Guest[] },
        visiting: { label: '友會貴賓', list: [] as Guest[] },
        vips: { label: '其他貴賓', list: [] as Guest[] }
    };
    const introducedList = [] as Guest[];

    presentGuests.forEach(g => {
        const effectiveRound = g.round || 1;
        if (filterRound !== 'all' && effectiveRound !== filterRound) return;
        if (!g.title || g.title.includes('見習會友')) return;

        if (g.isIntroduced) {
            introducedList.push(g);
            return;
        }

        const normalizedTitle = toHalfWidth(g.title.trim());
        const category = g.category || '';
        const fullInfo = (normalizedTitle + category).toLowerCase();
        
        const govKeywords = ['政府', '議會', '立委', '市長', '縣長', '局長', '議員', '主任'];

        // 優先順序判斷
        if (govKeywords.some(k => fullInfo.includes(k)) && !normalizedTitle.includes('總會') && !normalizedTitle.includes('分會')) {
            groups.gov.list.push(g);
        } else if (normalizedTitle.includes('會長') || category === GuestCategory.PAST_PRESIDENT) {
            groups.presidents.list.push(g);
        } else if (normalizedTitle.includes('主席') || category === GuestCategory.PAST_CHAIRMAN) {
            groups.chairmen.list.push(g);
        } else if (normalizedTitle.includes('總會') || category === GuestCategory.HQ_GUEST) {
            groups.hq.list.push(g);
        } else if (
            category === GuestCategory.VISITING_CHAPTER || 
            ['母會', '友會', '兄弟會', '姊妹會', '分會', '聯誼會', '友好會'].some(k => normalizedTitle.includes(k))
        ) {
            groups.visiting.list.push(g);
        } else {
            groups.vips.list.push(g);
        }
    });

    // 排序邏輯
    const sortByTitleNum = (l: Guest[]) => l.sort((a, b) => getTitleNumber(a.title) - getTitleNumber(b.title));
    const sortByTime = (l: Guest[]) => l.sort((a, b) => (a.checkInTime || '').localeCompare(b.checkInTime || ''));
    
    // 友會特定排序：母會-兄弟會-聯誼會-分會-友好會
    const sortVisiting = (l: Guest[]) => l.sort((a, b) => {
        const weightA = getVisitingWeight(a.title);
        const weightB = getVisitingWeight(b.title);
        if (weightA !== weightB) return weightA - weightB;
        return (a.checkInTime || '').localeCompare(b.checkInTime || '');
    });

    sortByTime(groups.gov.list);
    sortByTitleNum(groups.presidents.list);
    sortByTitleNum(groups.chairmen.list);
    sortByTime(groups.hq.list);
    sortVisiting(groups.visiting.list);
    sortByTime(groups.vips.list);

    return {
        unintroducedGroups: Object.values(groups).filter(g => g.list.length > 0),
        introduced: introducedList.sort((a, b) => (b.checkInTime || '').localeCompare(a.checkInTime || ''))
    };
  }, [presentGuests, filterRound]);

  const totalUnintroduced = useMemo(() => 
    listData.unintroducedGroups.reduce((acc, g) => acc + g.list.length, 0)
  , [listData]);

  return (
    <div className="w-full flex flex-col p-4 md:p-8 space-y-6 pb-32 bg-[#F2F2F7] min-h-screen">
        {/* 頂部操作列 */}
        <div className="bg-white rounded-[2.5rem] shadow-sm p-6 md:p-8 border border-white flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3"><Mic2 size={24} className="text-[#007AFF]" /><h2 className="text-2xl font-black text-black">司儀播報模式</h2></div>
            <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl w-full md:w-auto">
                {[{ label: '全部', val: 'all' as const }, { label: 'R1 梯次', val: 1 }, { label: 'R2 梯次', val: 2 }].map(btn => (
                    <button key={btn.label} onClick={() => setFilterRound(btn.val)} className={`flex-1 md:px-6 py-2.5 rounded-xl text-[11px] font-black transition-all ${filterRound === btn.val ? 'bg-white text-[#007AFF] shadow-sm' : 'text-gray-400'}`}>{btn.label}</button>
                ))}
            </div>
            <button onClick={() => isUnlocked ? logoutAdmin() : setShowLoginModal(true)} className="p-3 bg-[#F2F2F7] rounded-2xl shrink-0">
                {isUnlocked ? <Unlock size={20} className="text-[#007AFF]"/> : <Lock size={20} className="text-gray-300"/>}
            </button>
        </div>

        {/* 主版面：2/3 vs 1/3 雙欄佈局 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* 待介紹區域 (占 2/3 版面) */}
            <div className="lg:col-span-2 space-y-8">
                <div className="bg-[#007AFF] rounded-t-[2.5rem] p-6 -mx-2 md:mx-0 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-4 text-white">
                        <Mic2 size={28} />
                        <h2 className="text-2xl font-black tracking-tight">待介紹區域</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 ios-blur px-4 py-1.5 rounded-full text-white font-black text-sm">
                            {totalUnintroduced}
                        </div>
                        <RotateCcw size={20} className="text-white/60" />
                    </div>
                </div>

                <div className="space-y-10">
                    {listData.unintroducedGroups.map(group => (
                        <div key={group.label} className="space-y-4">
                            <h3 className="px-6 text-sm font-black text-orange-500 tracking-wider uppercase">{group.label}</h3>
                            <div className="space-y-1">
                                {group.list.map(g => (
                                    <VipCard key={g.id} guest={g} isIntroduced={false} onToggle={(id) => triggerAction(() => toggleIntroduced(id))} />
                                ))}
                            </div>
                        </div>
                    ))}
                    
                    {listData.unintroducedGroups.length === 0 && (
                        <div className="py-24 text-center bg-white/50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                            <p className="text-gray-400 font-bold italic">目前無待介紹貴賓</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 已介紹區域 (占 1/3 版面) */}
            <div className="lg:col-span-1 space-y-4">
                <div className="flex items-center justify-between px-6 mb-2">
                    <span className="text-[11px] font-black text-slate-400 tracking-widest uppercase">已介紹名單 ({listData.introduced.length})</span>
                    {listData.introduced.length > 0 && (
                        <span className="text-[9px] font-bold text-gray-300">點擊可撤回</span>
                    )}
                </div>
                <div className="space-y-1">
                    {listData.introduced.map(g => (
                        <VipCard key={g.id} guest={g} isIntroduced={true} onToggle={(id) => triggerAction(() => toggleIntroduced(id))} />
                    ))}
                    {listData.introduced.length === 0 && (
                        <div className="py-12 text-center text-gray-300 font-bold text-xs italic bg-gray-50/50 rounded-[2rem] border border-gray-100">
                            尚無介紹紀錄
                        </div>
                    )}
                </div>
            </div>
        </div>

        {showLoginModal && (
          <div className="fixed inset-0 ios-blur bg-black/40 z-[250] flex items-center justify-center p-6">
            <div className="bg-white rounded-[2.5rem] p-8 max-xs w-full shadow-2xl flex flex-col items-center gap-6">
              <h3 className="text-xl font-black text-black text-center">播報模式授權</h3>
              <form onSubmit={handleLoginSubmit} className="w-full space-y-4 text-center">
                <p className="text-xs text-gray-400">輸入解鎖密碼 (2222)</p>
                <input type="password" placeholder="密碼" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-[#F2F2F7] border-none rounded-2xl py-5 px-4 text-center text-3xl font-black outline-none" autoFocus />
                <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-4 font-black text-gray-400">取消</button>
                    <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl">確認</button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
};

export default McPanel;
