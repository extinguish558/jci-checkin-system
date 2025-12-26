
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useEvent } from '../context/EventContext';
import { Guest, GuestCategory, Sponsorship } from '../types';
import { Search, Clock, Shield, Globe, Handshake, LayoutGrid, Lock, Unlock, UserPlus, X, Edit2, Trash2, PieChart, Users, ChevronRight, ChevronDown, Coins, Heart, Star, Trash, PlusCircle, Package, Loader2, Edit3, Info } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const { 
      settings, addGuestsFromDraft, guests, 
      toggleCheckInRound, isAdmin, unlockedSections, updateGuestInfo, deleteGuest,
      addSponsorship, updateSponsorship, deleteSponsorship
  } = useEvent();

  const isUnlocked = isAdmin || unlockedSections.registration;

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('YB');
  const [isSticky, setIsSticky] = useState(false);

  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualGuest, setManualGuest] = useState({ name: '', title: '', category: GuestCategory.MEMBER_YB });

  const [isSubmittingSponsorship, setIsSubmittingSponsorship] = useState(false);
  const [showManualSponsorAdd, setShowManualSponsorAdd] = useState(false);
  const [manualSponsorship, setManualSponsorship] = useState({ name: '', title: '', amount: '', itemName: '' });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [showEditSponsorshipModal, setShowEditSponsorshipModal] = useState(false);
  const [editingSponsorship, setEditingSponsorship] = useState<Sponsorship | null>(null);

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  }, []);

  const triggerAction = (action: () => void) => {
    if (!isUnlocked) return alert("請點擊右上角鎖頭解鎖功能");
    action();
  };

  const getTargetGroup = useCallback((g: Guest): string => {
      const title = g.title || '';
      const category = (g.category || '').toString();
      const fullInfo = (title + category).toLowerCase();
      if (category.includes('YB') || category.includes('會友')) return 'YB';
      if (category.includes('OB') || category.includes('特友')) return 'OB';
      const govKeywords = ['政府', '議會', '立委', '市長', '縣長', '局長', '議員', '主任'];
      if (govKeywords.some(k => fullInfo.includes(k)) && !fullInfo.includes('分會')) return 'VIP';
      if (category.includes('總會') || title.includes('總會')) return 'HQ';
      if (category.includes('友會') || title.includes('會')) return 'VISITING';
      return 'VIP';
  }, []);

  const statsOverview = useMemo(() => {
    const categories = [
      { key: 'YB', label: '會友 YB', color: 'bg-blue-500' },
      { key: 'OB', label: '特友 OB', color: 'bg-orange-500' },
      { key: 'HQ', label: '總會貴賓', color: 'bg-indigo-500' },
      { key: 'VISITING', label: '友會貴賓', color: 'bg-green-500' },
      { key: 'VIP', label: '貴賓 VIP', color: 'bg-purple-500' },
      { key: 'SPONSOR', label: '贊助芳名', color: 'bg-amber-500' },
    ];
    const details = categories.map(cat => {
      if (cat.key === 'SPONSOR') return { ...cat, checked: (settings.sponsorships || []).length, total: (settings.sponsorships || []).length };
      const groupGuests = guests.filter(g => getTargetGroup(g) === cat.key);
      return { ...cat, checked: groupGuests.filter(g => g.isCheckedIn).length, total: groupGuests.length };
    });
    const totalChecked = guests.filter(g => g.isCheckedIn).length;
    return { details, totalChecked, totalCount: guests.length, totalPercent: guests.length > 0 ? Math.round((totalChecked / guests.length) * 100) : 0 };
  }, [guests, getTargetGroup, settings.sponsorships]);

  const groupedData = useMemo(() => {
      const search = searchTerm.trim().toLowerCase();
      const filtered = guests.filter(g => g.name.toLowerCase().includes(search) || g.title.toLowerCase().includes(search));
      const groupConfig = [
        { key: 'YB', title: '會友 YB', color: 'text-blue-500', icon: LayoutGrid },
        { key: 'OB', title: '特友 OB', color: 'text-orange-500', icon: Clock },
        { key: 'HQ', title: '總會貴賓', color: 'text-indigo-500', icon: Globe },
        { key: 'VISITING', title: '友會來訪', color: 'text-green-500', icon: Handshake },
        { key: 'VIP', title: '貴賓 VIP', color: 'text-purple-500', icon: Shield },
        { key: 'SPONSOR', title: '贊助芳名', color: 'text-amber-500', icon: Coins },
      ];
      return groupConfig.map(config => {
          if (config.key === 'SPONSOR') {
            const list = (settings.sponsorships || []).filter(s => s.name.toLowerCase().includes(search) || s.title.toLowerCase().includes(search));
            return { ...config, list: list.sort((a, b) => b.timestamp.localeCompare(a.timestamp)), checkedCount: list.length, totalCount: list.length };
          }
          const list = filtered.filter(g => getTargetGroup(g) === config.key);
          return { ...config, list: list.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true })), checkedCount: list.filter(g => g.isCheckedIn).length, totalCount: list.length };
      });
  }, [guests, searchTerm, getTargetGroup, settings.sponsorships]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualGuest.name.trim()) return;
    const draft = { name: manualGuest.name.trim(), title: manualGuest.title.trim(), category: manualGuest.category, hasSignature: true, code: `M-${Date.now().toString().slice(-4)}` };
    await addGuestsFromDraft([draft], new Date());
    setManualGuest({ name: '', title: '', category: GuestCategory.MEMBER_YB });
    setShowManualAdd(false);
  };

  const handleSponsorshipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSponsorship.name.trim()) return;
    setIsSubmittingSponsorship(true);
    await addSponsorship({ name: manualSponsorship.name.trim(), title: manualSponsorship.title.trim(), amount: Number(manualSponsorship.amount) || 0, itemName: manualSponsorship.itemName.trim() });
    setManualSponsorship({ name: '', title: '', amount: '', itemName: '' });
    setShowManualSponsorAdd(false);
    setIsSubmittingSponsorship(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuest) return;
    await updateGuestInfo(editingGuest.id, { name: editingGuest.name, title: editingGuest.title, category: editingGuest.category });
    setShowEditModal(false);
    setEditingGuest(null);
  };

  const handleEditSponsorshipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSponsorship) return;
    await updateSponsorship(editingSponsorship.id, { name: editingSponsorship.name, title: editingSponsorship.title, amount: editingSponsorship.amount, itemName: editingSponsorship.itemName });
    setShowEditSponsorshipModal(false);
    setEditingSponsorship(null);
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-40 px-4 md:px-8 py-3 bg-[#F2F2F7]">
        <div className="flex bg-white/50 backdrop-blur-md p-1 rounded-[2.2rem] overflow-x-auto gap-1 border border-white shadow-sm no-scrollbar md:justify-center">
            {groupedData.map(group => (
                <button key={group.key} onClick={() => setActiveTab(group.key)} className={`px-4 md:px-7 py-2 md:py-3.5 rounded-[1.8rem] font-black text-xs md:text-sm whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === group.key ? 'bg-white text-slate-900 shadow-sm border border-gray-100' : 'text-slate-400 hover:text-slate-600'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${group.color.replace('text-', 'bg-')}`} />
                  {group.title.split(' ')[0]} 
                  <span className="text-[10px] opacity-40">({group.totalCount})</span>
                </button>
            ))}
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 pb-48 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 bg-white rounded-[3rem] p-8 shadow-sm border border-white flex flex-col md:flex-row gap-8 relative overflow-hidden">
              <div className="flex-1 flex flex-col justify-between space-y-4">
                <div className="flex items-center gap-2"><PieChart size={16} className="text-blue-500" /><span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">即時動態數據</span></div>
                <div className="flex items-baseline gap-4">
                    <span className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-none">{statsOverview.totalChecked}</span>
                    <span className="text-xl font-bold text-slate-300">/ {statsOverview.totalCount} 已報到</span>
                </div>
                <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-50"><div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${statsOverview.totalPercent}%` }} /></div>
              </div>
              <div className="w-full md:w-auto md:min-w-[240px] border-t md:border-t-0 md:border-l border-gray-50 pt-4 md:pt-0 md:pl-8 grid grid-cols-2 gap-2">
                 {statsOverview.details.map(detail => (
                   <div key={detail.key} className="flex flex-col">
                     <span className="text-[9px] font-black text-gray-400 uppercase">{detail.label.split(' ')[0]}</span>
                     <span className="text-sm font-black text-slate-700">{detail.checked}</span>
                   </div>
                 ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
                <button onClick={() => triggerAction(() => setShowManualAdd(true))} className="w-full bg-[#007AFF] p-5 rounded-2xl md:rounded-3xl shadow-lg flex items-center justify-center gap-3 text-white active:scale-95 transition-all"><UserPlus size={24} /><span className="text-sm font-black uppercase tracking-[0.2em]">新增人員</span></button>
                <button onClick={() => triggerAction(() => setShowManualSponsorAdd(true))} className="w-full bg-amber-500 p-5 rounded-2xl md:rounded-3xl shadow-lg flex items-center justify-center gap-3 text-white active:scale-95 transition-all"><Heart size={24} fill="currentColor" /><span className="text-sm font-black uppercase tracking-[0.2em]">錄入贊助</span></button>
                <div className="relative"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"/><input type="text" placeholder="搜尋..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-white rounded-2xl md:rounded-3xl shadow-sm border border-white outline-none" /></div>
            </div>
        </div>

        {groupedData.filter(g => g.key === activeTab).map(group => (
            <div key={group.key} className="bg-white rounded-[3rem] shadow-sm border border-white overflow-hidden">
                <div className="px-10 py-5 border-b border-gray-50 flex justify-between items-center bg-slate-50/40">
                  <div className="flex items-center gap-3"><group.icon size={20} className={group.color} /><h3 className={`font-black text-sm md:text-lg uppercase ${group.color}`}>{group.title} 名單</h3></div>
                </div>
                <div className="divide-y divide-gray-50">
                    {group.key === 'SPONSOR' ? (
                        (group.list as Sponsorship[]).map((s) => (
                            <div key={s.id} className="px-10 py-6 flex items-center justify-between hover:bg-amber-50/20 transition-all">
                              <div className="flex items-center gap-5 min-w-0 flex-1">
                                 <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0"><Heart size={24} fill="currentColor" /></div>
                                 <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-3"><span className="font-black text-2xl text-slate-900 tracking-tighter truncate">{s.name}</span><span className="text-sm font-bold text-slate-400 uppercase">{s.title || '會友'}</span></div>
                                    {s.itemName && <div className="text-blue-600 font-black text-xs flex items-center gap-1"><Package size={12}/>{s.itemName}</div>}
                                 </div>
                              </div>
                              <div className="flex items-center gap-4">
                                 <span className="text-2xl font-black text-amber-600 tabular-nums">NT$ {s.amount.toLocaleString()}</span>
                                 <button onClick={() => triggerAction(() => { setEditingSponsorship(s); setShowEditSponsorshipModal(true); })} className="p-2 text-slate-300 hover:text-amber-500"><Edit3 size={18} /></button>
                              </div>
                            </div>
                        ))
                    ) : (
                        (group.list as Guest[]).map((g, idx) => (
                            <div key={g.id} className="px-8 py-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                              <div className="flex items-center gap-5 min-w-0 flex-1">
                                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center font-black text-xs shrink-0 ${g.isCheckedIn ? 'bg-blue-600 text-white border-blue-500' : 'bg-gray-50 text-gray-300 border-gray-100'}`}>{g.code || idx + 1}</div>
                                <div className="flex-1 min-w-0"><div className="flex items-baseline gap-3"><span className={`font-black text-2xl tracking-tighter truncate ${g.isCheckedIn ? 'text-slate-900' : 'text-slate-300'}`}>{g.name}</span><span className="text-sm font-bold text-slate-400 uppercase">({g.title || '貴賓'})</span></div></div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => triggerAction(() => { setEditingGuest(g); setShowEditModal(true); })} className="p-2 text-slate-300 hover:text-blue-500"><Edit2 size={18}/></button>
                                {[1, 2].map(r => (<button key={r} onClick={() => triggerAction(() => toggleCheckInRound(g.id, r))} className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${g.attendedRounds?.includes(r) ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 text-slate-300 hover:bg-gray-100'}`}>R{r}</button>))}
                              </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        ))}
      </div>

      {/* 錄入/編輯彈窗 */}
      {showManualAdd && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl space-y-6">
            <h3 className="text-2xl font-black text-slate-900 text-center uppercase tracking-tighter">Add New Guest</h3>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <input type="text" value={manualGuest.name} onChange={e => setManualGuest({...manualGuest, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none" placeholder="姓名" required />
              <input type="text" value={manualGuest.title} onChange={e => setManualGuest({...manualGuest, title: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none" placeholder="職稱" />
              <select value={manualGuest.category} onChange={e => setManualGuest({...manualGuest, category: e.target.value as GuestCategory})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none">{Object.values(GuestCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowManualAdd(false)} className="flex-1 py-4 font-black text-slate-400">取消</button><button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl">確定新增</button></div>
            </form>
          </div>
        </div>
      )}

      {showManualSponsorAdd && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl space-y-6">
            <h3 className="text-2xl font-black text-slate-900 text-center uppercase tracking-tighter italic">錄入贊助</h3>
            <form onSubmit={handleSponsorshipSubmit} className="space-y-4">
              <input type="text" value={manualSponsorship.name} onChange={e => setManualSponsorship({...manualSponsorship, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none" placeholder="姓名" required />
              <input type="text" value={manualSponsorship.title} onChange={e => setManualSponsorship({...manualSponsorship, title: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none" placeholder="職稱" />
              <input type="text" value={manualSponsorship.itemName} onChange={e => setManualSponsorship({...manualSponsorship, itemName: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none" placeholder="贊助品項" />
              <input type="number" value={manualSponsorship.amount} onChange={e => setManualSponsorship({...manualSponsorship, amount: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none" placeholder="贊助金額 (NT$)" />
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowManualSponsorAdd(false)} className="flex-1 py-4 font-black text-slate-400">取消</button><button type="submit" className="flex-1 py-4 bg-amber-500 text-white font-black rounded-2xl">確定錄入</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
