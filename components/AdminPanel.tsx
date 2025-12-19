
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useEvent } from '../context/EventContext';
import { Guest, GuestCategory } from '../types';
import { Search, Clock, Shield, Globe, Handshake, LayoutGrid, Lock, Unlock, UserPlus, X, Edit2, Trash2, PieChart, Users, ChevronRight, ChevronDown } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const { 
      settings, addGuestsFromDraft, guests, 
      toggleCheckInRound, isAdmin, unlockedSections, loginAdmin, logoutAdmin, updateGuestInfo, deleteGuest
  } = useEvent();

  const isUnlocked = isAdmin || unlockedSections.registration;

  const [searchTerm, setSearchTerm] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [activeTab, setActiveTab] = useState<string>('YB');
  const [isSticky, setIsSticky] = useState(false);

  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualGuest, setManualGuest] = useState({ name: '', title: '', category: GuestCategory.MEMBER_YB });

  // 當組件掛載（切換至此分頁）時，強制將容器捲動至最上方
  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTop = 0;
    }
  }, []);

  // 監聽捲動狀態以切換置頂樣式
  useEffect(() => {
    const handleScroll = (e: any) => {
      setIsSticky(e.target.scrollTop > 10);
    };
    const mainEl = document.querySelector('main');
    mainEl?.addEventListener('scroll', handleScroll);
    return () => mainEl?.removeEventListener('scroll', handleScroll);
  }, []);

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
    ];

    const details = categories.map(cat => {
      const groupGuests = guests.filter(g => getTargetGroup(g) === cat.key);
      const checked = groupGuests.filter(g => g.isCheckedIn).length;
      const total = groupGuests.length;
      return { ...cat, checked, total };
    });

    const totalChecked = guests.filter(g => g.isCheckedIn).length;
    const totalCount = guests.length;
    const totalPercent = totalCount > 0 ? Math.round((totalChecked / totalCount) * 100) : 0;

    return { details, totalChecked, totalCount, totalPercent };
  }, [guests, getTargetGroup]);

  const groupedData = useMemo(() => {
      const search = searchTerm.trim().toLowerCase();
      const filtered = guests.filter(g => g.name.toLowerCase().includes(search) || g.title.toLowerCase().includes(search));
      const groupConfig = [
        { key: 'YB', title: '會友 YB', color: 'text-blue-500', icon: LayoutGrid },
        { key: 'OB', title: '特友 OB', color: 'text-orange-500', icon: Clock },
        { key: 'HQ', title: '總會貴賓', color: 'text-indigo-500', icon: Globe },
        { key: 'VISITING', title: '友會來訪', color: 'text-green-500', icon: Handshake },
        { key: 'VIP', title: '貴賓 VIP', color: 'text-purple-500', icon: Shield },
      ];
      return groupConfig.map(config => {
          const list = filtered.filter(g => getTargetGroup(g) === config.key);
          return {
              ...config,
              list: list.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true })),
              checkedCount: list.filter(g => g.isCheckedIn).length,
              totalCount: list.length
          };
      });
  }, [guests, searchTerm, getTargetGroup]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualGuest.name.trim()) return;
    
    const draft = {
      name: manualGuest.name.trim(),
      title: manualGuest.title.trim(),
      category: manualGuest.category,
      hasSignature: true,
      code: `M-${Date.now().toString().slice(-4)}`
    };

    await addGuestsFromDraft([draft], new Date());
    setManualGuest({ name: '', title: '', category: GuestCategory.MEMBER_YB });
    setShowManualAdd(false);
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* 分類導覽標籤 - 最頂端 Sticky */}
      <div className={`sticky top-0 z-40 px-4 md:px-8 py-2 md:py-3 transition-all duration-300 ${isSticky ? 'ios-blur bg-white/70 shadow-md border-b border-white/20' : 'bg-[#F2F2F7]'}`}>
        <div className="flex bg-white/50 backdrop-blur-md p-1 rounded-[1.2rem] md:rounded-[2.2rem] overflow-x-auto md:overflow-x-visible gap-1 border border-white shadow-sm no-scrollbar md:justify-center">
            {groupedData.map(group => (
                <button 
                  key={group.key} 
                  onClick={() => setActiveTab(group.key)} 
                  className={`px-3 md:px-7 py-2 md:py-3.5 rounded-[1rem] md:rounded-[1.8rem] font-black text-[10px] md:text-sm whitespace-nowrap transition-all flex items-center gap-1.5 md:gap-2 ${activeTab === group.key ? 'bg-white text-slate-900 shadow-sm border border-gray-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${group.key === 'YB' ? 'bg-blue-500' : group.key === 'OB' ? 'bg-orange-500' : group.key === 'HQ' ? 'bg-indigo-500' : group.key === 'VISITING' ? 'bg-green-500' : 'bg-purple-500'}`} />
                  {group.title.split(' ')[0]} 
                  <span className={`text-[8px] md:text-[11px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === group.key ? 'bg-slate-100 text-slate-600' : 'text-slate-300'}`}>{group.totalCount}</span>
                </button>
            ))}
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-5 md:space-y-6 pb-48 w-full">
        {/* 頁面標題 */}
        <div className="flex justify-between items-center mb-1 px-1">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-black">報到管理</h2>
              <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">{settings.eventName}</p>
            </div>
            <button onClick={() => isUnlocked ? logoutAdmin() : setShowLoginModal(true)} className="p-2.5 md:p-3 bg-white rounded-2xl shadow-sm border border-white">
              {isUnlocked ? <Unlock size={18} className="text-[#007AFF]"/> : <Lock size={18} className="text-gray-300"/>}
            </button>
        </div>

        {/* 頂部功能區塊 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 items-stretch">
            <div className="md:col-span-2 bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 shadow-sm border border-white flex flex-col md:flex-row gap-6 md:gap-8 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500/10" />
              <div className="flex-1 flex flex-col justify-between space-y-4 md:space-y-6">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-blue-500" />
                  <span className="text-[9px] md:text-[11px] font-black text-slate-400 tracking-wider uppercase">報到總覽數據分析</span>
                </div>
                <div className="flex items-baseline gap-2 md:gap-4">
                  <span className="text-5xl md:text-8xl font-black text-slate-900 tracking-tighter leading-none">{statsOverview.totalChecked}</span>
                  <span className="text-lg md:text-2xl font-bold text-slate-300">/ {statsOverview.totalCount}</span>
                </div>
                <div className="mt-auto space-y-2">
                  <div className="flex justify-between items-end">
                     <span className="text-[8px] md:text-[9px] font-black text-blue-500 tracking-widest uppercase">Progress</span>
                     <p className="text-[10px] md:text-[11px] font-black text-blue-600">{statsOverview.totalPercent}%</p>
                  </div>
                  <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-50 shadow-inner">
                    <div className="h-full bg-blue-500 transition-all duration-1000 shadow-[0_0_8px_rgba(59,130,246,0.4)]" style={{ width: `${statsOverview.totalPercent}%` }} />
                  </div>
                </div>
              </div>
              <div className="w-full md:w-auto md:min-w-[280px] border-t md:border-t-0 md:border-l border-gray-50 pt-4 md:pt-0 md:pl-8 flex flex-col justify-center gap-3">
                 <h4 className="text-[8px] md:text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1 md:mb-2">Categories</h4>
                 <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-2 gap-y-3 gap-x-4">
                    {statsOverview.details.map(detail => (
                      <div key={detail.key} className="flex flex-col gap-0">
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${detail.color}`} />
                          <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase truncate">{detail.label.replace('貴賓', '')}</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-base md:text-lg font-black text-slate-700">{detail.checked}</span>
                          <span className="text-[9px] font-bold text-slate-200">/ {detail.total}</span>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>

            <div className="md:col-span-1 flex flex-col gap-4">
              <button 
                onClick={() => triggerAction(() => setShowManualAdd(true))} 
                className="bg-white p-5 md:p-8 rounded-[1.8rem] md:rounded-[2.8rem] shadow-sm border border-white flex flex-row md:flex-col items-center justify-center gap-3 font-black text-blue-600 transition-all hover:bg-blue-50/30 active:scale-95 group flex-1"
              >
                <div className="w-10 h-10 md:w-16 md:h-16 bg-blue-50 text-blue-500 rounded-xl md:rounded-[1.8rem] flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shrink-0">
                  <UserPlus className="w-5 h-5 md:w-8 md:h-8" />
                </div>
                <span className="text-sm md:text-lg tracking-tight">手動新增嘉賓名單</span>
              </button>
              <div className="relative group">
                <div className="absolute left-5 md:left-7 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors z-10">
                  <Search className="w-5 h-5 md:w-7 md:h-7"/>
                </div>
                <input 
                  type="text" 
                  placeholder="搜尋姓名或編號..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full pl-14 md:pl-20 pr-6 py-4 md:py-8 bg-white rounded-[1.8rem] md:rounded-[2.8rem] shadow-sm border border-white outline-none focus:ring-4 md:focus:ring-8 focus:ring-blue-500/5 transition-all text-sm md:text-xl font-medium text-slate-900 placeholder-slate-300" 
                />
              </div>
            </div>
        </div>

        {/* 嘉賓名單列表 */}
        <div className="space-y-4">
            {groupedData.filter(g => g.key === activeTab).map(group => (
                <div key={group.key} className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-sm border border-white overflow-hidden">
                    <div className="px-6 md:px-10 py-4 md:py-6 border-b border-gray-50 flex justify-between items-center bg-slate-50/40">
                      <div className="flex items-center gap-2">
                        <group.icon size={16} className={group.color} />
                        <h3 className={`font-black text-sm md:text-lg tracking-tight ${group.color}`}>{group.title} 名錄</h3>
                      </div>
                      <div className="flex items-center gap-2">
                          <span className="text-base md:text-xl font-black text-slate-900">{group.checkedCount}</span>
                          <span className="text-[10px] font-bold text-slate-300">/ {group.totalCount}</span>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {group.list.map((g, idx) => (
                            <div key={g.id} className="px-5 md:px-8 py-4 md:py-7 flex items-center gap-3 md:gap-5 hover:bg-slate-50/50 transition-colors group">
                              <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl border flex flex-col items-center justify-center transition-all shrink-0 ${g.isCheckedIn ? 'bg-blue-50 text-blue-600 border-blue-100 scale-105 shadow-sm' : 'bg-gray-50 text-gray-300 border-gray-100'}`}>
                                <span className="text-[8px] md:text-[10px] font-black opacity-40 leading-none mb-0.5">ID</span>
                                <span className="text-sm md:text-lg font-black leading-none">{g.code || idx + 1}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                  <p className={`font-black text-lg md:text-2xl tracking-tight truncate ${g.isCheckedIn ? 'text-slate-900' : 'text-slate-300'}`}>{g.name}</p>
                                  <p className="text-[10px] md:text-sm text-slate-400 font-bold truncate mt-0.5 md:mt-1">{g.title || '貴賓'}</p>
                              </div>
                              <div className="flex gap-1.5 md:gap-2.5 items-center">
                                  {isAdmin && (
                                    <button onClick={() => updateGuestInfo(g.id, { name: g.name })} className="hidden md:flex w-10 h-10 items-center justify-center bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 transition-all opacity-0 group-hover:opacity-100">
                                      <Edit2 size={16}/>
                                    </button>
                                  )}
                                  <div className="flex gap-1 p-0.5 md:p-1 bg-slate-50 rounded-[1rem] md:rounded-[1.4rem] border border-gray-100">
                                    <button 
                                      onClick={() => triggerAction(() => toggleCheckInRound(g.id, 1))} 
                                      className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl font-black text-xs md:text-sm transition-all active:scale-90 ${g.attendedRounds?.includes(1) ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-300'}`}
                                    >
                                      R1
                                    </button>
                                    <button 
                                      onClick={() => triggerAction(() => toggleCheckInRound(g.id, 2))} 
                                      className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl font-black text-xs md:text-sm transition-all active:scale-90 ${g.attendedRounds?.includes(2) ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-slate-300'}`}
                                    >
                                      R2
                                    </button>
                                  </div>
                              </div>
                            </div>
                        ))}
                        {group.list.length === 0 && (
                          <div className="py-16 text-center">
                            <Users size={32} className="mx-auto text-slate-100 mb-3" />
                            <p className="text-slate-300 font-black italic text-sm">查與嘉賓</p>
                          </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* 手動新增視窗 */}
      {showManualAdd && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-1">
              <h3 className="text-2xl font-black text-slate-900">手動新增嘉賓</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registration</p>
            </div>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-3">嘉賓姓名</label>
                <input type="text" value={manualGuest.name} onChange={e => setManualGuest({...manualGuest, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-[1.2rem] p-4 font-black text-lg outline-none" placeholder="輸入姓名" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-3">職稱 / 頭銜</label>
                <input type="text" value={manualGuest.title} onChange={e => setManualGuest({...manualGuest, title: e.target.value})} className="w-full bg-slate-50 border-none rounded-[1.2rem] p-4 font-black text-lg outline-none" placeholder="例如: 會長" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-3">嘉賓類別</label>
                <select value={manualGuest.category} onChange={e => setManualGuest({...manualGuest, category: e.target.value as GuestCategory})} className="w-full bg-slate-50 border-none rounded-[1.2rem] p-4 font-black text-lg outline-none appearance-none">
                  <option value={GuestCategory.MEMBER_YB}>會友 (YB)</option>
                  <option value={GuestCategory.MEMBER_OB}>特友會 (OB)</option>
                  <option value={GuestCategory.HQ_GUEST}>總會貴賓</option>
                  <option value={GuestCategory.VISITING_CHAPTER}>友會來訪</option>
                  <option value={GuestCategory.GOV_OFFICIAL}>政府貴賓</option>
                  <option value={GuestCategory.OTHER}>其他貴賓</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowManualAdd(false)} className="flex-1 py-4 font-black text-slate-400 text-sm">取消</button>
                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-[1.2rem] shadow-lg text-sm">確定新增</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 授權登入視窗 */}
      {showLoginModal && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[250] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-xs shadow-2xl flex flex-col items-center gap-6 border border-white/20">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
              <Lock size={32} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-2xl font-black text-slate-900">權限解鎖</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Admin Access</p>
            </div>
            <form onSubmit={handleLoginSubmit} className="w-full space-y-5 text-center">
              <p className="text-[10px] font-bold text-[#007AFF]">密碼提示：0000</p>
              <input type="password" placeholder="••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-slate-50 border-none rounded-[1.5rem] py-5 px-4 text-center text-4xl font-black outline-none tracking-widest" autoFocus />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-4 font-black text-slate-300 text-xs">取消</button>
                <button type="submit" className="flex-1 py-4 bg-slate-900 text-white font-black rounded-[1.2rem] shadow-xl text-xs">解鎖權限</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
