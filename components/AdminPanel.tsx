
import React, { useState, useMemo, useCallback } from 'react';
import { useEvent } from '../context/EventContext';
import { Guest, GuestCategory } from '../types';
import { Search, Clock, Shield, Globe, Handshake, LayoutGrid, Lock, Unlock, UserPlus, X, Edit2, Trash2 } from 'lucide-react';

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

  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualGuest, setManualGuest] = useState({ name: '', title: '', category: GuestCategory.MEMBER_YB });
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

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
      if (category.includes('友會') || title.includes('會') || title.includes('聯誼')) return 'VISITING';
      return 'VIP';
  }, []);

  const groupedData = useMemo(() => {
      const search = searchTerm.trim().toLowerCase();
      const filtered = guests.filter(g => g.name.toLowerCase().includes(search) || g.title.toLowerCase().includes(search));
      const groupConfig = [
        { key: 'YB', title: '會友 YB', color: 'text-blue-500', icon: LayoutGrid },
        { key: 'OB', title: '特友 OB', color: 'text-orange-500', icon: Clock },
        { key: 'HQ', title: '總會貴賓', color: 'text-indigo-500', icon: Globe },
        { key: 'VISITING', title: '友會貴賓', color: 'text-green-500', icon: Handshake },
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

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 pb-32">
      <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-black">報到管理</h2>
            <p className="text-[10px] font-bold text-gray-400">{settings.eventName}</p>
          </div>
          <button onClick={() => isUnlocked ? logoutAdmin() : setShowLoginModal(true)} className="p-3 bg-white rounded-2xl shadow-sm">
            {isUnlocked ? <Unlock size={20} className="text-[#007AFF]"/> : <Lock size={20} className="text-gray-300"/>}
          </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
          <button onClick={() => triggerAction(() => setShowManualAdd(true))} className="bg-white p-4 rounded-2xl shadow-sm flex items-center justify-center gap-2 font-black text-sm text-blue-600"><UserPlus size={18} />手動新增嘉賓名單</button>
      </div>

      <div className="relative">
          <input type="text" placeholder="搜尋姓名、職稱..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl shadow-sm outline-none" />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20}/>
      </div>

      <div className="flex bg-gray-200/50 p-1 rounded-2xl overflow-x-auto gap-1">
          {groupedData.map(group => (
              <button key={group.key} onClick={() => setActiveTab(group.key)} className={`px-4 py-2.5 rounded-xl font-black text-[11px] whitespace-nowrap ${activeTab === group.key ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`}>{group.title} ({group.totalCount})</button>
          ))}
      </div>

      <div className="space-y-4">
          {groupedData.filter(g => g.key === activeTab).map(group => (
              <div key={group.key} className="bg-white rounded-[2rem] shadow-sm border border-white overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
                    <h3 className={`font-black text-xs ${group.color}`}>{group.title}</h3>
                    <span className="text-[10px] font-black text-gray-300">{group.checkedCount} / {group.totalCount}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                      {group.list.map((g, idx) => (
                          <div key={g.id} className="px-5 py-5 flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs font-black ${g.isCheckedIn ? 'bg-blue-50 text-blue-500 border-blue-100' : 'bg-gray-50 text-gray-300 border-gray-50'}`}>{g.code || idx + 1}</div>
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-black">{g.name}</p>
                                <p className="text-[11px] text-gray-400 font-bold">{g.title || '貴賓'}</p>
                            </div>
                            <div className="flex gap-2">
                                {isAdmin && <button onClick={() => setEditingGuest({...g})} className="p-2 text-gray-300"><Edit2 size={16}/></button>}
                                <button onClick={() => triggerAction(() => toggleCheckInRound(g.id, 1))} className={`w-10 h-10 rounded-xl font-black text-[10px] border transition-all ${g.attendedRounds?.includes(1) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-100 text-gray-300'}`}>R1</button>
                                <button onClick={() => triggerAction(() => toggleCheckInRound(g.id, 2))} className={`w-10 h-10 rounded-xl font-black text-[10px] border transition-all ${g.attendedRounds?.includes(2) ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-gray-100 text-gray-300'}`}>R2</button>
                            </div>
                          </div>
                      ))}
                  </div>
              </div>
          ))}
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[250] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-8 max-xs w-full shadow-2xl flex flex-col items-center gap-6">
            <h3 className="text-xl font-black text-black">報到管理授權</h3>
            <form onSubmit={handleLoginSubmit} className="w-full space-y-4 text-center">
              <p className="text-xs text-gray-400">請輸入密碼解鎖權限 (密碼 0000)</p>
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

export default AdminPanel;
