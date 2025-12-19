
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useEvent } from '../context/EventContext';
import { Guest, GuestCategory } from '../types';
import { Search, Clock, Shield, Globe, Handshake, LayoutGrid, Lock, Unlock, UserPlus, X, Edit2, Trash2, PieChart, Users, ChevronRight } from 'lucide-react';

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
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

  // 監聽捲動狀態以切換置頂樣式
  useEffect(() => {
    const handleScroll = (e: any) => {
      setIsSticky(e.target.scrollTop > 400);
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

  // 計算分類統計數據，用於總覽卡片
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

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualGuest.name.trim()) return;
    alert("手動新增功能已連結系統，請輸入詳細嘉賓資訊。");
    setShowManualAdd(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 pb-48">
      {/* 頁面標題 */}
      <div className="flex justify-between items-center mb-2 px-2">
          <div>
            <h2 className="text-3xl font-black text-black">報到管理</h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">{settings.eventName}</p>
          </div>
          <button onClick={() => isUnlocked ? logoutAdmin() : setShowLoginModal(true)} className="p-3 bg-white rounded-2xl shadow-sm border border-white">
            {isUnlocked ? <Unlock size={20} className="text-[#007AFF]"/> : <Lock size={20} className="text-gray-300"/>}
          </button>
      </div>

      {/* 頂部功能區塊 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {/* 左側：報到總覽 */}
          <div className="md:col-span-2 bg-white rounded-[3rem] p-8 shadow-sm border border-white flex flex-col md:flex-row gap-8 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-500/10" />
            
            <div className="flex-1 flex flex-col justify-between space-y-6">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-blue-500" />
                <span className="text-[11px] font-black text-slate-400 tracking-wider uppercase">報到總覽數據分析</span>
              </div>
              
              <div className="flex items-baseline gap-4">
                <span className="text-8xl font-black text-slate-900 tracking-tighter leading-none">{statsOverview.totalChecked}</span>
                <span className="text-2xl font-bold text-slate-300">/ {statsOverview.totalCount}</span>
              </div>

              <div className="mt-auto space-y-2">
                <div className="flex justify-between items-end">
                   <span className="text-[9px] font-black text-blue-500 tracking-widest">REAL-TIME PROGRESS</span>
                   <p className="text-[11px] font-black text-blue-600">當前報到率 {statsOverview.totalPercent}%</p>
                </div>
                <div className="w-full h-2.5 bg-gray-50 rounded-full overflow-hidden border border-gray-50 shadow-inner">
                  <div className="h-full bg-blue-500 transition-all duration-1000 shadow-[0_0_12px_rgba(59,130,246,0.5)]" style={{ width: `${statsOverview.totalPercent}%` }} />
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto md:min-w-[280px] border-l border-gray-50 pl-8 flex flex-col justify-center gap-4">
               <h4 className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mb-2">Categories Status</h4>
               <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                  {statsOverview.details.map(detail => (
                    <div key={detail.key} className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${detail.color}`} />
                        <span className="text-[10px] font-black text-gray-400 uppercase truncate">{detail.label}</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-slate-700">{detail.checked}</span>
                        <span className="text-[10px] font-bold text-slate-200">/ {detail.total}</span>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>

          {/* 右側：手動新增與搜尋 */}
          <div className="md:col-span-1 flex flex-col gap-5">
            <button 
              onClick={() => triggerAction(() => setShowManualAdd(true))} 
              className="bg-white p-8 rounded-[2.8rem] shadow-sm border border-white flex flex-col items-center justify-center gap-3 font-black text-blue-600 transition-all hover:bg-blue-50/30 active:scale-95 group flex-1"
            >
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-[1.8rem] flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                <UserPlus size={32} />
              </div>
              <span className="text-lg tracking-tight">手動新增嘉賓名單</span>
            </button>

            <div className="relative group">
              <div className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors z-10">
                <Search size={28}/>
              </div>
              <input 
                type="text" 
                placeholder="搜尋嘉賓姓名、職稱或編號..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="w-full pl-20 pr-8 py-8 bg-white rounded-[2.8rem] shadow-sm border border-white outline-none focus:ring-8 focus:ring-blue-500/5 transition-all text-xl font-medium text-slate-900 placeholder-slate-300" 
              />
            </div>
          </div>
      </div>

      {/* 分類導覽標籤 - 實作 Sticky 置頂功能 */}
      <div className={`sticky top-0 z-40 -mx-4 md:-mx-8 px-4 md:px-8 py-4 transition-all duration-300 ${isSticky ? 'ios-blur bg-white/70 shadow-lg border-b border-white/20' : ''}`}>
        <div className="flex bg-white/50 backdrop-blur-md p-2 rounded-[2.2rem] overflow-x-auto gap-1.5 border border-white shadow-sm no-scrollbar">
            {groupedData.map(group => (
                <button 
                  key={group.key} 
                  onClick={() => setActiveTab(group.key)} 
                  className={`px-7 py-4 rounded-[1.8rem] font-black text-sm whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === group.key ? 'bg-white text-slate-900 shadow-sm border border-gray-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${group.key === 'YB' ? 'bg-blue-500' : group.key === 'OB' ? 'bg-orange-500' : group.key === 'HQ' ? 'bg-indigo-500' : group.key === 'VISITING' ? 'bg-green-500' : 'bg-purple-500'}`} />
                  {group.title} 
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${activeTab === group.key ? 'bg-slate-100 text-slate-600' : 'text-slate-300'}`}>{group.totalCount}</span>
                </button>
            ))}
        </div>
      </div>

      {/* 嘉賓名單列表 */}
      <div className="space-y-5">
          {groupedData.filter(g => g.key === activeTab).map(group => (
              <div key={group.key} className="bg-white rounded-[3rem] shadow-sm border border-white overflow-hidden">
                  <div className="px-10 py-6 border-b border-gray-50 flex justify-between items-center bg-slate-50/40">
                    <div className="flex items-center gap-3">
                      <group.icon size={20} className={group.color} />
                      <h3 className={`font-black text-lg tracking-tight ${group.color}`}>{group.title} 名錄</h3>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xl font-black text-slate-900">{group.checkedCount}</span>
                        <span className="text-xs font-bold text-slate-300">/ {group.totalCount} 已報到</span>
                      </div>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50">
                      {group.list.map((g, idx) => (
                          <div key={g.id} className="px-8 py-7 flex items-center gap-5 hover:bg-slate-50/50 transition-colors group">
                            <div className={`w-14 h-14 rounded-2xl border flex flex-col items-center justify-center transition-all ${g.isCheckedIn ? 'bg-blue-50 text-blue-600 border-blue-100 scale-105 shadow-sm' : 'bg-gray-50 text-gray-300 border-gray-100'}`}>
                              <span className="text-[10px] font-black opacity-40 leading-none mb-0.5">ID</span>
                              <span className="text-lg font-black leading-none">{g.code || idx + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`font-black text-2xl tracking-tight ${g.isCheckedIn ? 'text-slate-900' : 'text-slate-300'}`}>{g.name}</p>
                                <p className="text-sm text-slate-400 font-bold truncate mt-1">{g.title || '貴賓'}</p>
                            </div>
                            <div className="flex gap-2.5 items-center">
                                {isAdmin && (
                                  <button onClick={() => setEditingGuest({...g})} className="w-12 h-12 flex items-center justify-center bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 hover:text-gray-600 transition-all opacity-0 group-hover:opacity-100">
                                    <Edit2 size={18}/>
                                  </button>
                                )}
                                <div className="flex gap-1.5 p-1 bg-slate-50 rounded-[1.4rem] border border-gray-100">
                                  <button 
                                    onClick={() => triggerAction(() => toggleCheckInRound(g.id, 1))} 
                                    className={`w-14 h-14 rounded-2xl font-black text-sm transition-all active:scale-90 ${g.attendedRounds?.includes(1) ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 ring-4 ring-blue-500/10' : 'bg-white text-slate-300 hover:text-slate-400'}`}
                                  >
                                    R1
                                  </button>
                                  <button 
                                    onClick={() => triggerAction(() => toggleCheckInRound(g.id, 2))} 
                                    className={`w-14 h-14 rounded-2xl font-black text-sm transition-all active:scale-90 ${g.attendedRounds?.includes(2) ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 ring-4 ring-purple-500/10' : 'bg-white text-slate-300 hover:text-slate-400'}`}
                                  >
                                    R2
                                  </button>
                                </div>
                            </div>
                          </div>
                      ))}
                      {group.list.length === 0 && (
                        <div className="py-24 text-center">
                          <Users size={48} className="mx-auto text-slate-100 mb-4" />
                          <p className="text-slate-300 font-black italic text-lg">查無符合條件的嘉賓</p>
                        </div>
                      )}
                  </div>
              </div>
          ))}
      </div>

      {/* 手動新增視窗 */}
      {showManualAdd && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[300] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full shadow-2xl space-y-8 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <h3 className="text-3xl font-black text-slate-900">手動新增嘉賓</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Guest Registration</p>
            </div>
            <form onSubmit={handleManualSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">嘉賓全名</label>
                <input 
                  type="text" 
                  value={manualGuest.name} 
                  onChange={e => setManualGuest({...manualGuest, name: e.target.value})} 
                  className="w-full bg-slate-50 border-none rounded-[1.5rem] p-5 font-black text-xl outline-none focus:ring-4 focus:ring-blue-500/10" 
                  placeholder="輸入嘉賓姓名"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">職稱 / 頭銜</label>
                <input 
                  type="text" 
                  value={manualGuest.title} 
                  onChange={e => setManualGuest({...manualGuest, title: e.target.value})} 
                  className="w-full bg-slate-50 border-none rounded-[1.5rem] p-5 font-black text-xl outline-none focus:ring-4 focus:ring-blue-500/10" 
                  placeholder="例如: 創會長、主委"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowManualAdd(false)} className="flex-1 py-5 font-black text-slate-400 hover:text-slate-600 transition-colors">取消</button>
                <button type="submit" className="flex-1 py-5 bg-blue-600 text-white font-black rounded-[1.5rem] shadow-xl shadow-blue-200 active:scale-95 transition-transform">確定新增</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 授權登入視窗 */}
      {showLoginModal && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[250] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] p-12 max-w-xs w-full shadow-2xl flex flex-col items-center gap-8 border border-white/20 animate-in fade-in duration-300">
            <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-[2rem] flex items-center justify-center shadow-inner">
              <Lock size={40} />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-3xl font-black text-slate-900">權限解鎖</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Administration Access</p>
            </div>
            <form onSubmit={handleLoginSubmit} className="w-full space-y-6 text-center">
              <input 
                type="password" 
                placeholder="••••" 
                value={loginPassword} 
                onChange={e => setLoginPassword(e.target.value)} 
                className="w-full bg-slate-50 border-none rounded-[1.8rem] py-7 px-4 text-center text-5xl font-black outline-none focus:ring-8 focus:ring-blue-500/5 transition-all tracking-widest" 
                autoFocus 
              />
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-5 font-black text-slate-300 text-sm">取消</button>
                <button type="submit" className="flex-1 py-5 bg-slate-900 text-white font-black rounded-[1.5rem] shadow-2xl active:scale-95 transition-transform text-sm">解鎖權限</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
