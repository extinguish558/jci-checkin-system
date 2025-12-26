
import React, { useMemo, useState, useEffect } from 'react';
import { useEvent } from '../context/EventContext';
import { GuestCategory, Guest } from '../types';
import { CheckCircle2, Circle, Mic2, ArrowLeft, RotateCcw } from 'lucide-react';

interface VipCardProps {
  guest: Guest;
  isIntroduced: boolean;
  onToggle: (id: string) => void;
}

const VipCard: React.FC<VipCardProps> = ({ guest, isIntroduced, onToggle }) => (
  <div onClick={() => onToggle(guest.id)} className={`transition-all duration-200 rounded-2xl border p-4 md:p-5 mb-3 cursor-pointer group ${!isIntroduced ? 'bg-white border-white shadow-sm hover:scale-[1.01]' : 'bg-gray-200/40 opacity-60'}`}>
      <div className="flex items-center gap-4">
          <div className={`shrink-0 ${!isIntroduced ? 'text-[#007AFF]' : 'text-orange-500'}`}>{!isIntroduced ? <Circle size={22} strokeWidth={3} /> : <RotateCcw size={22} strokeWidth={3} />}</div>
          <div className="flex-1 min-w-0"><div className="flex flex-wrap items-baseline gap-x-2"><span className={`text-lg md:text-xl font-black ${!isIntroduced ? 'text-black' : 'text-gray-400 line-through'}`}>{guest.name}</span><span className={`text-[11px] md:text-sm font-bold ${!isIntroduced ? 'text-[#007AFF]' : 'text-gray-400'}`}>{guest.title}</span></div></div>
          <div className="shrink-0 flex items-center gap-2">{!isIntroduced && guest.isCheckedIn && <span className="text-[10px] font-black text-green-500 bg-green-50 px-2 py-1 rounded-lg">現場</span>}<span className={`text-[10px] font-black px-2 py-1 rounded-lg ${guest.round === 2 ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>R{guest.round || 1}</span></div>
      </div>
  </div>
);

const McPanel: React.FC = () => {
  const { guests, toggleIntroduced, isAdmin, unlockedSections } = useEvent();
  const isUnlocked = isAdmin || unlockedSections.mc;
  const [filterRound, setFilterRound] = useState<number | 'all'>('all');

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  }, []);

  const triggerAction = (action: () => void) => {
    if (!isUnlocked) return alert("請由右上角解鎖權限");
    action();
  };

  const presentGuests = useMemo(() => guests.filter(g => g.isCheckedIn), [guests]);

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
        if (filterRound !== 'all' && (g.round || 1) !== filterRound) return;
        if (g.isIntroduced) { introducedList.push(g); return; }
        const title = (g.title || '').toLowerCase();
        if (title.includes('政府') || title.includes('市長') || title.includes('議員')) groups.gov.list.push(g);
        else if (title.includes('會長')) groups.presidents.list.push(g);
        else if (title.includes('主席')) groups.chairmen.list.push(g);
        else if (title.includes('總會')) groups.hq.list.push(g);
        else if (title.includes('友會') || title.includes('分會')) groups.visiting.list.push(g);
        else groups.vips.list.push(g);
    });

    return { unintroducedGroups: Object.values(groups).filter(g => g.list.length > 0), introduced: introducedList };
  }, [presentGuests, filterRound]);

  return (
    <div className="w-full flex flex-col p-4 md:p-8 space-y-6 pb-32 bg-[#F2F2F7] min-h-screen">
        <div className="bg-white rounded-[2.5rem] shadow-sm p-6 md:p-8 border border-white flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3 self-start md:self-auto"><Mic2 size={24} className="text-[#007AFF]" /><h2 className="text-2xl font-black text-black">司儀播報模式</h2></div>
            <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl w-full md:w-auto">
                {[{ label: '全部', val: 'all' as const }, { label: 'R1 梯次', val: 1 }, { label: 'R2 梯次', val: 2 }].map(btn => (
                    <button key={btn.label} onClick={() => setFilterRound(btn.val)} className={`flex-1 md:px-6 py-2.5 rounded-xl text-[11px] font-black transition-all ${filterRound === btn.val ? 'bg-white text-[#007AFF] shadow-sm' : 'text-gray-400'}`}>{btn.label}</button>
                ))}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <div className="bg-[#007AFF] rounded-t-[2.5rem] p-6 flex items-center justify-between shadow-lg text-white"><div className="flex items-center gap-4"><Mic2 size={28} /><h2 className="text-2xl font-black">待介紹區域</h2></div><div className="bg-white/20 px-4 py-1.5 rounded-full font-black text-sm">ACTIVE</div></div>
                <div className="space-y-10">
                    {listData.unintroducedGroups.map(group => (
                        <div key={group.label} className="space-y-4"><h3 className="px-6 text-sm font-black text-orange-500 uppercase tracking-widest">{group.label}</h3><div className="space-y-1">{group.list.map(g => (<VipCard key={g.id} guest={g} isIntroduced={false} onToggle={(id) => triggerAction(() => toggleIntroduced(id))} />))}</div></div>
                    ))}
                </div>
            </div>
            <div className="lg:col-span-1 space-y-4"><span className="text-[11px] font-black text-slate-400 px-6">已介紹 ({listData.introduced.length})</span><div className="space-y-1">{listData.introduced.map(g => (<VipCard key={g.id} guest={g} isIntroduced={true} onToggle={(id) => triggerAction(() => toggleIntroduced(id))} />))}</div></div>
        </div>
    </div>
  );
};

export default McPanel;
