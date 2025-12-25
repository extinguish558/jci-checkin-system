
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useEvent } from '../context/EventContext';
import { Guest, GuestCategory, Sponsorship } from '../types';
import { Search, Clock, Shield, Globe, Handshake, LayoutGrid, Lock, Unlock, UserPlus, X, Edit2, Trash2, PieChart, Users, ChevronRight, ChevronDown, Coins, Heart, Star, Trash, PlusCircle, Package, Loader2, Edit3, Info } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const { 
      settings, addGuestsFromDraft, guests, 
      toggleCheckInRound, isAdmin, unlockedSections, loginAdmin, logoutAdmin, updateGuestInfo, deleteGuest,
      addSponsorship, updateSponsorship, deleteSponsorship
  } = useEvent();

  const isUnlocked = isAdmin || unlockedSections.registration;

  const [searchTerm, setSearchTerm] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [activeTab, setActiveTab] = useState<string>('YB');
  const [isSticky, setIsSticky] = useState(false);

  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualGuest, setManualGuest] = useState({ name: '', title: '', category: GuestCategory.MEMBER_YB });

  // 贊助錄入與狀態
  const [isSubmittingSponsorship, setIsSubmittingSponsorship] = useState(false);
  const [showManualSponsorAdd, setShowManualSponsorAdd] = useState(false);
  const [manualSponsorship, setManualSponsorship] = useState({ name: '', title: '', amount: '', itemName: '' });

  // 編輯嘉賓與贊助狀態
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  
  const [showEditSponsorshipModal, setShowEditSponsorshipModal] = useState(false);
  const [editingSponsorship, setEditingSponsorship] = useState<Sponsorship | null>(null);

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  }, []);

  useEffect(() => {
    const handleScroll = (e: any) => { setIsSticky(e.target.scrollTop > 10); };
    const mainEl = document.querySelector('main');
    mainEl?.addEventListener('scroll', handleScroll);
    return () => mainEl?.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (loginAdmin(loginPassword)) { setShowLoginModal(false); setLoginPassword(""); }
      else alert("密碼錯誤");
  };

  const triggerAction = (action: () => void) => {
    if (!isUnlocked) { setShowLoginModal(true); return; }
    action();
  };

  const getTargetGroup = useCallback((g: Guest): string => {
      const title = g.title || '';
      const category = (g.category || '').toString();
      const fullInfo = (title + category).toLowerCase();
      if (category.includes('YB') || category.includes('會友')) return 'YB';
      if (category.includes('OB') || category.includes('特友')) return 'OB';
      const govKeywords = ['政府', '議會', '立委', '市長', '縣長', '局長', '議員', '主任'];
      const isGovStrict = govKeywords.some(k => fullInfo.includes(k));
      if ((category === GuestCategory.GOV_OFFICIAL || isGovStrict) && !fullInfo.includes('總會') && !fullInfo.includes('分會')) return 'VIP';
      if (category.includes('總會') || title.includes('總會')) return 'HQ';
      if (category.includes('友會') || title.includes('會') || title.includes('聯誼') || title.includes('友好')) return 'VISITING';
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
      if (cat.key === 'SPONSOR') {
          return { ...cat, checked: (settings.sponsorships || []).length, total: (settings.sponsorships || []).length };
      }
      const groupGuests = guests.filter(g => getTargetGroup(g) === cat.key);
      const checked = groupGuests.filter(g => g.isCheckedIn).length;
      const total = groupGuests.length;
      return { ...cat, checked, total };
    });
    const totalChecked = guests.filter(g => g.isCheckedIn).length;
    const totalCount = guests.length;
    const totalPercent = totalCount > 0 ? Math.round((totalChecked / totalCount) * 100) : 0;
    return { details, totalChecked, totalCount, totalPercent };
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
            const list = (settings.sponsorships || []).filter(s => s.name.toLowerCase().includes(search) || s.title.toLowerCase().includes(search) || (s.itemName || '').toLowerCase().includes(search));
            return {
                ...config,
                list: list.sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
                checkedCount: list.length,
                totalCount: list.length
            };
          }
          const list = filtered.filter(g => getTargetGroup(g) === config.key);
          return {
              ...config,
              list: list.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true })),
              checkedCount: list.filter(g => g.isCheckedIn).length,
              totalCount: list.length
          };
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

  const handleSponsorshipSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualSponsorship.name.trim()) { alert("請輸入贊助者姓名"); return; }
    
    // 擇一填寫驗證
    if (!manualSponsorship.itemName.trim() && (!manualSponsorship.amount || Number(manualSponsorship.amount) <= 0)) {
        alert("請填寫「贊助品項」或「贊助金額」其中之一");
        return;
    }
    
    setIsSubmittingSponsorship(true);
    try {
        await addSponsorship({
            name: manualSponsorship.name.trim(),
            title: manualSponsorship.title.trim(),
            amount: Number(manualSponsorship.amount) || 0,
            itemName: manualSponsorship.itemName.trim()
        });
        setManualSponsorship({ name: '', title: '', amount: '', itemName: '' });
        setShowManualSponsorAdd(false);
    } catch (e) {
        // 錯誤已在 Context 層處理
    } finally {
        setIsSubmittingSponsorship(false);
    }
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

    // 擇一填寫驗證
    if (!editingSponsorship.itemName?.trim() && (!editingSponsorship.amount || Number(editingSponsorship.amount) <= 0)) {
        alert("請填寫「贊助品項」或「贊助金額」其中之一");
        return;
    }

    await updateSponsorship(editingSponsorship.id, { 
        name: editingSponsorship.name, 
        title: editingSponsorship.title, 
        amount: editingSponsorship.amount,
        itemName: editingSponsorship.itemName
    });
    setShowEditSponsorshipModal(false);
    setEditingSponsorship(null);
  };

  const handleDeleteClick = (id: string, name: string) => {
    if (window.confirm(`確定要刪除嘉賓「${name}」嗎？此操作不可復原。`)) { deleteGuest(id); }
  };

  const totalSponsorshipAmount = useMemo(() => {
    return (settings.sponsorships || []).reduce((acc, curr) => acc + curr.amount, 0);
  }, [settings.sponsorships]);

  return (
    <div className="flex flex-col min-h-full">
      <div className={`sticky top-0 z-40 px-4 md:px-8 py-2 md:py-3 transition-all duration-300 ${isSticky ? 'ios-blur bg-white/70 shadow-md border-b border-white/20' : 'bg-[#F2F2F7]'}`}>
        <div className="flex bg-white/50 backdrop-blur-md p-1 rounded-[1.2rem] md:rounded-[2.2rem] overflow-x-auto md:overflow-x-visible gap-1 border border-white shadow-sm no-scrollbar md:justify-center">
            {groupedData.map(group => (
                <button 
                  key={group.key} 
                  onClick={() => setActiveTab(group.key)} 
                  className={`px-3 md:px-7 py-2 md:py-3.5 rounded-[1rem] md:rounded-[1.8rem] font-black text-[10px] md:text-sm whitespace-nowrap transition-all flex items-center gap-1.5 md:gap-2 ${activeTab === group.key ? 'bg-white text-slate-900 shadow-sm border border-gray-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${group.key === 'YB' ? 'bg-blue-500' : group.key === 'OB' ? 'bg-orange-500' : group.key === 'HQ' ? 'bg-indigo-500' : group.key === 'VISITING' ? 'bg-green-500' : group.key === 'VIP' ? 'bg-purple-500' : 'bg-amber-500'}`} />
                  {group.title.split(' ')[0]} 
                  <span className={`text-[8px] md:text-[11px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === group.key ? 'bg-slate-100 text-slate-600' : 'text-slate-300'}`}>{group.totalCount}</span>
                </button>
            ))}
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-5 md:space-y-6 pb-48 w-full">
        <div className="flex justify-between items-center mb-1 px-1">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-black">報到與贊助管理</h2>
              <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">{settings.eventName}</p>
            </div>
            <button onClick={() => isUnlocked ? logoutAdmin() : setShowLoginModal(true)} className="p-2.5 md:p-3 bg-white rounded-2xl shadow-sm border border-white">
              {isUnlocked ? <Unlock size={18} className="text-[#007AFF]"/> : <Lock size={18} className="text-gray-300"/>}
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 items-stretch">
            <div className="md:col-span-2 bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 shadow-sm border border-white flex flex-col md:flex-row gap-6 md:gap-8 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500/10" />
              <div className="flex-1 flex flex-col justify-between space-y-4">
                <div className="flex items-center gap-2"><PieChart size={16} className="text-blue-500" /><span className="text-[9px] md:text-[11px] font-black text-slate-400 tracking-wider uppercase">即時動態數據</span></div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline gap-2 md:gap-4">
                    <span className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-none">{statsOverview.totalChecked}</span>
                    <span className="text-lg md:text-xl font-bold text-slate-300">已報到 / {statsOverview.totalCount}</span>
                  </div>
                  {totalSponsorshipAmount > 0 && (
                    <div className="flex items-baseline gap-2 text-amber-600 mt-2">
                        <Coins size={20} className="shrink-0" />
                        <span className="text-2xl md:text-3xl font-black tabular-nums tracking-tighter italic">NT$ {totalSponsorshipAmount.toLocaleString()}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest ml-1">贊助總額</span>
                    </div>
                  )}
                </div>
                <div className="mt-auto space-y-2">
                  <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-50 shadow-inner"><div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${statsOverview.totalPercent}%` }} /></div>
                </div>
              </div>
              <div className="w-full md:w-auto md:min-w-[280px] border-t md:border-t-0 md:border-l border-gray-50 pt-4 md:pt-0 md:pl-8 flex flex-col justify-center gap-2">
                 {statsOverview.details.map(detail => (
                   <div key={detail.key} className="flex items-center justify-between text-[11px] font-bold">
                     <div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${detail.color}`} /><span className="text-gray-400 uppercase">{detail.label.split(' ')[0]}</span></div>
                     <span className="text-slate-700">{detail.checked}</span>
                   </div>
                 ))}
              </div>
            </div>

            <div className="md:col-span-1 flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => triggerAction(() => setShowManualAdd(true))} className="w-full bg-[#007AFF] p-5 rounded-2xl md:rounded-3xl shadow-lg flex items-center justify-center gap-3 text-white active:scale-95 transition-all"><UserPlus size={24} /><span className="text-sm font-black uppercase tracking-[0.2em]">新增人員</span></button>
                <button onClick={() => triggerAction(() => setShowManualSponsorAdd(true))} className="w-full bg-amber-500 p-5 rounded-2xl md:rounded-3xl shadow-lg flex items-center justify-center gap-3 text-white active:scale-95 transition-all"><Heart size={24} fill="currentColor" /><span className="text-sm font-black uppercase tracking-[0.2em]">錄入贊助</span></button>
                <div className="relative group"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5"/><input type="text" placeholder="搜尋姓名或關鍵字..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-5 bg-white rounded-2xl md:rounded-3xl shadow-sm border border-white outline-none focus:ring-4 focus:ring-[#007AFF]/5 transition-all text-sm font-medium" /></div>
              </div>
            </div>
        </div>

        <div className="space-y-4">
            {groupedData.filter(g => g.key === activeTab).map(group => (
                <div key={group.key} className={`bg-white rounded-[2rem] md:rounded-[3rem] shadow-sm border border-white overflow-hidden ${group.key === 'SPONSOR' ? 'ring-1 ring-amber-500/10' : ''}`}>
                    <div className="px-6 md:px-10 py-5 border-b border-gray-50 flex justify-between items-center bg-slate-50/40">
                      <div className="flex items-center gap-3"><group.icon size={20} className={group.color} /><h3 className={`font-black text-sm md:text-lg tracking-tight uppercase ${group.color}`}>{group.title} 名單</h3></div>
                      <div className="px-3 py-1 bg-white rounded-full border border-gray-100 shadow-sm"><span className="text-xs font-black text-slate-900">{group.checkedCount}</span></div>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {group.key === 'SPONSOR' ? (
                            (group.list as Sponsorship[]).map((s) => (
                                <div key={s.id} className="px-6 md:px-10 py-5 md:py-6 flex items-center justify-between hover:bg-amber-50/20 transition-all group">
                                  <div className="flex items-center gap-5 min-w-0 flex-1">
                                     <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shadow-sm border border-amber-100 shrink-0"><Heart size={22} fill="currentColor" /></div>
                                     <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-3 flex-wrap">
                                            <span className="font-black text-lg md:text-2xl text-slate-900 tracking-tighter truncate leading-none">{s.name}</span>
                                            <span className="text-[10px] md:text-sm font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">({s.title || '會友'})</span>
                                            {s.itemName && (
                                                <div className="flex items-center gap-1 text-[9px] md:text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100"><Package size={14} /> {s.itemName}</div>
                                            )}
                                        </div>
                                     </div>
                                  </div>
                                  <div className="flex items-center gap-4 shrink-0">
                                     <div className="text-right"><p className="text-xl md:text-3xl font-black text-amber-600 tabular-nums leading-none">NT$ {s.amount.toLocaleString()}</p></div>
                                     {isUnlocked && (
                                       <div className="flex gap-1">
                                          <button onClick={() => { setEditingSponsorship(s); setShowEditSponsorshipModal(true); }} className="p-2 bg-slate-50 text-slate-300 rounded-lg transition-all hover:bg-amber-500 hover:text-white shadow-sm border border-gray-100"><Edit3 size={16} /></button>
                                          <button onClick={() => { if(window.confirm('確定移除此筆贊助紀錄？')) deleteSponsorship(s.id); }} className="p-2 bg-slate-50 text-slate-300 rounded-lg transition-all hover:bg-red-500 hover:text-white shadow-sm border border-gray-100"><Trash2 size={16} /></button>
                                       </div>
                                     )}
                                  </div>
                                </div>
                            ))
                        ) : (
                            (group.list as Guest[]).map((g, idx) => (
                                <div key={g.id} className="px-6 md:px-8 py-5 md:py-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                                  <div className="flex items-center gap-5 min-w-0 flex-1">
                                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl border flex items-center justify-center font-black text-[10px] md:text-xs shrink-0 transition-all ${g.isCheckedIn ? 'bg-blue-600 text-white border-blue-500 shadow-sm' : 'bg-gray-50 text-gray-300 border-gray-100'}`}>{g.code || idx + 1}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-3">
                                          <span className={`font-black text-lg md:text-2xl tracking-tighter truncate ${g.isCheckedIn ? 'text-slate-900' : 'text-slate-300'}`}>{g.name}</span>
                                          <span className="text-[10px] md:text-sm font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">({g.title || '貴賓'})</span>
                                          {g.isCheckedIn && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                                        </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 items-center shrink-0">
                                      {isUnlocked && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => { setEditingGuest(g); setShowEditModal(true); }} className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-lg hover:bg-blue-50 hover:text-blue-500 border border-gray-100"><Edit2 size={14}/></button>
                                          <button onClick={() => handleDeleteClick(g.id, g.name)} className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-500 border border-gray-100"><Trash2 size={14}/></button>
                                        </div>
                                      )}
                                      <div className="flex gap-1 p-0.5 bg-slate-50 rounded-xl border border-gray-100">
                                        {[1, 2].map(r => (
                                          <button key={r} onClick={() => triggerAction(() => toggleCheckInRound(g.id, r))} className={`w-8 h-8 md:w-10 md:h-10 rounded-lg font-black text-[10px] md:text-xs transition-all active:scale-90 ${g.attendedRounds?.includes(r) ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-300'}`}>R{r}</button>
                                        ))}
                                      </div>
                                  </div>
                                </div>
                            ))
                        )}
                        {group.list.length === 0 && (
                          <div className="py-24 text-center"><Users size={40} className="mx-auto text-slate-100 mb-3" /><p className="text-slate-300 font-black italic text-sm tracking-widest uppercase">No Records Found</p></div>
                        )}
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* 錄入贊助視窗 */}
      {showManualSponsorAdd && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-900 text-center italic tracking-tighter">錄入贊助資訊</h3>
            <form onSubmit={handleSponsorshipSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">姓名與職稱</label>
                <input type="text" value={manualSponsorship.name} onChange={e => setManualSponsorship({...manualSponsorship, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none" placeholder="贊助者姓名" required />
                <input type="text" value={manualSponsorship.title} onChange={e => setManualSponsorship({...manualSponsorship, title: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none" placeholder="職稱 (如：會兄、委員)" />
              </div>
              
              <div className="bg-amber-50/30 p-4 rounded-[1.8rem] border border-amber-100/50 space-y-3">
                 <div className="flex items-center gap-2 text-amber-600 mb-1">
                    <Info size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">贊助內容 (擇一填寫)</span>
                 </div>
                 <input type="text" value={manualSponsorship.itemName} onChange={e => setManualSponsorship({...manualSponsorship, itemName: e.target.value})} className="w-full bg-white border border-amber-100/30 rounded-2xl p-4 font-black text-sm outline-none shadow-sm" placeholder="贊助品項 (例如：高級禮盒)" />
                 <div className="flex items-center justify-center py-1">
                    <div className="h-[1px] flex-1 bg-amber-100/50"></div>
                    <span className="px-3 text-[10px] font-black text-amber-300 uppercase italic">OR</span>
                    <div className="h-[1px] flex-1 bg-amber-100/50"></div>
                 </div>
                 <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 font-black">NT$</span>
                    <input type="number" value={manualSponsorship.amount} onChange={e => setManualSponsorship({...manualSponsorship, amount: e.target.value})} className="w-full pl-14 bg-white border border-amber-100/30 rounded-2xl p-4 font-black text-lg outline-none shadow-sm tabular-nums" placeholder="0" />
                 </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowManualSponsorAdd(false)} className="flex-1 py-4 font-black text-slate-400">取消</button>
                <button type="submit" disabled={isSubmittingSponsorship} className="flex-1 py-4 bg-amber-500 text-white font-black rounded-2xl shadow-lg flex items-center justify-center gap-2">
                    {isSubmittingSponsorship ? <Loader2 size={16} className="animate-spin" /> : <Heart size={16} fill="currentColor" />}
                    確認錄入
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 編輯贊助視窗 */}
      {showEditSponsorshipModal && editingSponsorship && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[320] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-900 text-center italic tracking-tighter">編輯贊助資訊</h3>
            <form onSubmit={handleEditSponsorshipSubmit} className="space-y-4">
              <input type="text" value={editingSponsorship.name} onChange={e => setEditingSponsorship({...editingSponsorship, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none" placeholder="贊助者姓名" required />
              <input type="text" value={editingSponsorship.title} onChange={e => setEditingSponsorship({...editingSponsorship, title: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none" placeholder="職稱" />
              
              <div className="bg-amber-50/30 p-4 rounded-[1.8rem] border border-amber-100/50 space-y-3">
                 <div className="flex items-center gap-2 text-amber-600 mb-1"><Info size={14} /><span className="text-[10px] font-black uppercase tracking-widest">贊助內容 (擇一填寫)</span></div>
                 <input type="text" value={editingSponsorship.itemName || ''} onChange={e => setEditingSponsorship({...editingSponsorship, itemName: e.target.value})} className="w-full bg-white border border-amber-100/30 rounded-2xl p-4 font-black text-sm outline-none shadow-sm" placeholder="贊助品項" />
                 <div className="flex items-center justify-center py-1"><div className="h-[1px] flex-1 bg-amber-100/50"></div><span className="px-3 text-[10px] font-black text-amber-300 uppercase italic">OR</span><div className="h-[1px] flex-1 bg-amber-100/50"></div></div>
                 <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 font-black">NT$</span>
                    <input type="number" value={editingSponsorship.amount} onChange={e => setEditingSponsorship({...editingSponsorship, amount: Number(e.target.value)})} className="w-full pl-14 bg-white border border-amber-100/30 rounded-2xl p-4 font-black text-lg outline-none shadow-sm tabular-nums" placeholder="0" />
                 </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowEditSponsorshipModal(false); setEditingSponsorship(null); }} className="flex-1 py-4 font-black text-slate-400">取消</button>
                <button type="submit" className="flex-1 py-4 bg-amber-500 text-white font-black rounded-2xl shadow-lg">確認修改</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showManualAdd && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-900 text-center uppercase tracking-tighter italic">Add New Guest</h3>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <input type="text" value={manualGuest.name} onChange={e => setManualGuest({...manualGuest, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none" placeholder="嘉賓姓名" required />
              <input type="text" value={manualGuest.title} onChange={e => setManualGuest({...manualGuest, title: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none" placeholder="職稱 / 頭銜" />
              <select value={manualGuest.category} onChange={e => setManualGuest({...manualGuest, category: e.target.value as GuestCategory})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none appearance-none">{Object.values(GuestCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowManualAdd(false)} className="flex-1 py-4 font-black text-slate-400">取消</button><button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg">確定新增</button></div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingGuest && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[310] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-900 text-center italic tracking-tighter">Update Profile</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <input type="text" value={editingGuest.name} onChange={e => setEditingGuest({...editingGuest, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none" required />
              <input type="text" value={editingGuest.title} onChange={e => setEditingGuest({...editingGuest, title: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none" />
              <select value={editingGuest.category} onChange={e => setEditingGuest({...editingGuest, category: e.target.value as GuestCategory})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none appearance-none">{Object.values(GuestCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => { setShowEditModal(false); setEditingGuest(null); }} className="flex-1 py-4 font-black text-slate-400">取消</button><button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg">儲存修改</button></div>
            </form>
          </div>
        </div>
      )}

      {showLoginModal && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[250] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-xs shadow-2xl flex flex-col items-center gap-6 border border-white/20">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shadow-inner shrink-0"><Lock size={32} /></div>
            <h3 className="text-2xl font-black text-slate-900 text-center uppercase tracking-tighter">Admin Access</h3>
            <form onSubmit={handleLoginSubmit} className="w-full space-y-5 text-center">
              <p className="text-[10px] font-bold text-[#007AFF]">密碼提示：0000</p>
              <input type="password" placeholder="••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-slate-50 border-none rounded-[1.5rem] py-5 px-4 text-center text-4xl font-black outline-none tracking-widest" autoFocus />
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-4 font-black text-gray-300">取消</button><button type="submit" className="flex-1 py-4 bg-slate-900 text-white font-black rounded-[1.2rem] shadow-xl">解鎖權限</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
