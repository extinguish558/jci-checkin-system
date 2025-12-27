
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useEvent } from '../context/EventContext';
import { 
  QrCode, Download, Search, ExternalLink, MapPin, Info, 
  CheckCircle2, Loader2, UserPlus, Heart, Edit2, Trash2, 
  Edit3, LayoutGrid, Clock, Globe, Handshake, Shield, 
  Coins, Package, UserCheck, X, PlusCircle, RotateCcw,
  PieChart, Users, ChevronRight, BarChart3
} from 'lucide-react';
import { Guest, GuestCategory, Sponsorship } from '../types';
import { generateQrDataUrl, downloadAllQrAsZip } from '../services/qrService';

// 子元件：負責非同步生成並顯示單個 QR Code
const QrCodeImage: React.FC<{ url: string }> = ({ url }) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    generateQrDataUrl(url).then(data => {
      if (isMounted) {
        setDataUrl(data);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [url]);

  if (loading) return <div className="w-full h-full bg-slate-50 animate-pulse flex items-center justify-center"><QrCode className="text-slate-200" size={20}/></div>;
  return <img src={dataUrl} alt="QR Code" className="w-full h-full object-contain" />;
};

const DigitalCheckInPanel: React.FC = () => {
  const { 
    guests, settings, isAdmin, unlockedSections,
    addGuestsFromDraft, updateGuestInfo, deleteGuest, toggleCheckInRound,
    addSponsorship, updateSponsorship, deleteSponsorship 
  } = useEvent();

  const isUnlocked = isAdmin || unlockedSections.registration;

  // 狀態管理
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('YB');
  const [isZipping, setIsZipping] = useState(false);
  
  // 彈窗狀態
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualGuest, setManualGuest] = useState({ name: '', title: '', category: GuestCategory.MEMBER_YB });
  const [showManualSponsorAdd, setShowManualSponsorAdd] = useState(false);
  const [manualSponsorship, setManualSponsorship] = useState({ name: '', title: '', amount: '', itemName: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

  // 修正網址生成邏輯，解決 DNS 錯誤
  const getGuestUrl = (id: string) => {
    try {
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.set('guestId', id);
      return url.toString();
    } catch (e) {
      return `${window.location.origin}${window.location.pathname}?guestId=${id}`;
    }
  };

  const triggerAction = (action: () => void) => {
    if (!isUnlocked) return alert("請由右上角解鎖管理權限");
    action();
  };

  // 統計數據
  const statsOverview = useMemo(() => {
    const totalChecked = guests.filter(g => g.isCheckedIn).length;
    const totalCount = guests.length;
    const percent = totalCount > 0 ? Math.round((totalChecked / totalCount) * 100) : 0;
    return { totalChecked, totalCount, percent };
  }, [guests]);

  // 分組邏輯
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

  const groupedData = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    const filtered = guests.filter(g => 
      g.name.toLowerCase().includes(search) || 
      (g.title || '').toLowerCase().includes(search) ||
      (g.code || '').includes(search)
    );

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
        const list = (settings.sponsorships || []).filter(s => 
          s.name.toLowerCase().includes(search) || (s.title || '').toLowerCase().includes(search)
        );
        return { ...config, list: list.sort((a, b) => b.timestamp.localeCompare(a.timestamp)), count: list.length };
      }
      const list = filtered.filter(g => getTargetGroup(g) === config.key);
      return { ...config, list: list.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true })), count: list.length };
    });
  }, [guests, searchTerm, getTargetGroup, settings.sponsorships]);

  // 行政功能
  const handleDownloadAll = async () => {
    if (guests.length === 0) return alert('目前沒有賓客名單');
    if (!confirm(`確定要下載 ${guests.length} 位賓客的專屬 QR Code 嗎？`)) return;
    setIsZipping(true);
    try {
      await downloadAllQrAsZip(guests, settings.eventName);
    } finally {
      setIsZipping(false);
    }
  };

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
    await addSponsorship({ name: manualSponsorship.name.trim(), title: manualSponsorship.title.trim(), amount: Number(manualSponsorship.amount) || 0, itemName: manualSponsorship.itemName.trim() });
    setManualSponsorship({ name: '', title: '', amount: '', itemName: '' });
    setShowManualSponsorAdd(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuest) return;
    await updateGuestInfo(editingGuest.id, { name: editingGuest.name, title: editingGuest.title, category: editingGuest.category });
    setShowEditModal(false);
    setEditingGuest(null);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 pb-60">
      {/* 頂部戰情板與功能按鈕 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl border border-white/10 relative overflow-hidden flex flex-col md:flex-row gap-8">
             <div className="absolute top-0 right-0 p-8 opacity-10"><BarChart3 size={100} /></div>
             <div className="flex-1 space-y-4 relative z-10">
                <div className="flex items-center gap-2"><PieChart size={16} className="text-blue-500" /><span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">即時報到數據</span></div>
                <div className="flex items-baseline gap-4">
                    <span className="text-5xl md:text-7xl font-black tracking-tighter leading-none">{statsOverview.totalChecked}</span>
                    <span className="text-xl font-bold text-slate-500">/ {statsOverview.totalCount} 已完成</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${statsOverview.percent}%` }} /></div>
             </div>
             <div className="flex flex-wrap gap-3 items-end relative z-10">
                <button onClick={() => triggerAction(() => setShowManualAdd(true))} className="bg-white/10 hover:bg-white/20 px-6 py-4 rounded-2xl font-black flex items-center gap-2 text-sm transition-all active:scale-95"><UserPlus size={18}/> 新增人員</button>
                <button onClick={() => triggerAction(() => setShowManualSponsorAdd(true))} className="bg-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white px-6 py-4 rounded-2xl font-black flex items-center gap-2 text-sm transition-all active:scale-95"><Heart size={18} fill="currentColor"/> 錄入贊助</button>
                <button onClick={handleDownloadAll} disabled={isZipping} className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 px-6 py-4 rounded-2xl font-black flex items-center gap-2 text-sm shadow-xl transition-all active:scale-95">
                  {isZipping ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />} 下載全部 QR
                </button>
             </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white flex flex-col justify-center">
             <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
                <input 
                  type="text" 
                  placeholder="搜尋人員..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-16 pr-6 py-5 bg-slate-50 rounded-[2rem] border-none outline-none focus:ring-4 focus:ring-blue-500/5 font-bold transition-all"
                />
             </div>
          </div>
      </div>

      {/* 分組導覽 */}
      <div className="flex flex-wrap bg-white/50 backdrop-blur-md p-1.5 rounded-[2rem] gap-1 border border-white shadow-sm overflow-x-auto no-scrollbar">
          {groupedData.map(group => (
              <button key={group.key} onClick={() => setActiveTab(group.key)} className={`px-6 py-3 rounded-[1.5rem] font-black text-xs md:text-sm whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === group.key ? 'bg-white text-slate-900 shadow-sm border border-gray-100' : 'text-slate-400 hover:text-slate-600'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${group.color.replace('text-', 'bg-')}`} />
                {group.title.split(' ')[0]} 
                <span className="text-[10px] opacity-40">({group.count})</span>
              </button>
          ))}
      </div>

      {/* 列表內容 */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-white overflow-hidden">
        {groupedData.filter(g => g.key === activeTab).map(group => (
          <div key={group.key} className="divide-y divide-gray-50">
            {group.list.length === 0 ? (
               <div className="p-20 text-center opacity-20 flex flex-col items-center gap-4"><Search size={48}/><p className="font-black">此分類無符合數據</p></div>
            ) : (
              group.key === 'SPONSOR' ? (
                (group.list as Sponsorship[]).map(s => (
                  <div key={s.id} className="px-10 py-6 flex items-center justify-between hover:bg-amber-50/20 transition-all">
                    <div className="flex items-center gap-5 min-w-0 flex-1">
                       <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0 shadow-inner"><Heart size={24} fill="currentColor" /></div>
                       <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-3"><span className="font-black text-2xl text-slate-900 tracking-tighter truncate">{s.name}</span><span className="text-sm font-bold text-slate-400 uppercase">{s.title || '會友'}</span></div>
                          {s.itemName && <div className="text-blue-600 font-black text-xs flex items-center gap-1"><Package size={12}/>{s.itemName}</div>}
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <span className="text-2xl font-black text-amber-600 tabular-nums">NT$ {s.amount.toLocaleString()}</span>
                       <button onClick={() => triggerAction(() => { if(window.confirm('確定刪除此贊助紀錄？')) deleteSponsorship(s.id); })} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))
              ) : (
                (group.list as Guest[]).map((g, idx) => (
                  <div key={g.id} className="px-6 md:px-10 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-6 min-w-0 flex-1">
                      <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center border border-slate-100 overflow-hidden shrink-0 shadow-inner group relative">
                         <QrCodeImage url={getGuestUrl(g.id)} />
                         <div onClick={() => window.open(getGuestUrl(g.id), '_blank')} className="absolute inset-0 bg-blue-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity"><ExternalLink size={20}/></div>
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="flex items-baseline gap-3 mb-1">
                           <span className={`font-black text-2xl tracking-tighter truncate ${g.isCheckedIn ? 'text-slate-900' : 'text-slate-300'}`}>{g.name}</span>
                           <span className="text-sm font-bold text-slate-400 uppercase">({g.title || '貴賓'})</span>
                         </div>
                         <div className="flex flex-wrap gap-2">
                           <span className="px-2 py-0.5 bg-slate-100 text-[10px] font-black text-slate-400 rounded-md">ID: {g.code || idx+1}</span>
                           {g.isCheckedIn && <span className="px-2 py-0.5 bg-green-100 text-[10px] font-black text-green-600 rounded-md flex items-center gap-1"><CheckCircle2 size={10}/> 已完成報到</span>}
                         </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-auto">
                      <div className="flex gap-1.5 mr-2">
                         <button onClick={() => triggerAction(() => { setEditingGuest(g); setShowEditModal(true); })} className="p-2.5 bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors"><Edit2 size={16}/></button>
                         <button onClick={() => triggerAction(() => { if(window.confirm(`確定刪除人員「${g.name}」？`)) deleteGuest(g.id); })} className="p-2.5 bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors"><Trash2 size={16}/></button>
                      </div>
                      <div className="h-8 w-px bg-slate-100 mx-1 hidden md:block" />
                      <div className="flex gap-1.5">
                        {[1, 2].map(r => (
                          <button 
                            key={r} 
                            onClick={() => triggerAction(() => toggleCheckInRound(g.id, r))} 
                            className={`w-12 h-12 rounded-xl font-black text-xs transition-all flex flex-col items-center justify-center ${g.attendedRounds?.includes(r) ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                          >
                            <span className="text-[8px] opacity-60 uppercase">R{r}</span>
                            <span className="uppercase">確認</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        ))}
      </div>

      {/* 彈窗部分保持不變 */}
      {showManualAdd && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl space-y-6">
            <h3 className="text-2xl font-black text-slate-900 text-center uppercase tracking-tighter">新增賓客名單</h3>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <input type="text" value={manualGuest.name} onChange={e => setManualGuest({...manualGuest, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none shadow-inner" placeholder="姓名" required />
              <input type="text" value={manualGuest.title} onChange={e => setManualGuest({...manualGuest, title: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none shadow-inner" placeholder="職稱" />
              <select value={manualGuest.category} onChange={e => setManualGuest({...manualGuest, category: e.target.value as GuestCategory})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none shadow-inner">{Object.values(GuestCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowManualAdd(false)} className="flex-1 py-4 font-black text-slate-400">取消</button><button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl">確認新增</button></div>
            </form>
          </div>
        </div>
      )}

      {showManualSponsorAdd && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl space-y-6">
            <h3 className="text-2xl font-black text-slate-900 text-center uppercase tracking-tighter italic">錄入贊助芳名</h3>
            <form onSubmit={handleSponsorshipSubmit} className="space-y-4">
              <input type="text" value={manualSponsorship.name} onChange={e => setManualSponsorship({...manualSponsorship, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none shadow-inner" placeholder="姓名" required />
              <input type="text" value={manualSponsorship.title} onChange={e => setManualSponsorship({...manualSponsorship, title: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none shadow-inner" placeholder="職稱" />
              <input type="text" value={manualSponsorship.itemName} onChange={e => setManualSponsorship({...manualSponsorship, itemName: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none shadow-inner" placeholder="贊助品項 (例: 電視、紅酒)" />
              <input type="number" value={manualSponsorship.amount} onChange={e => setManualSponsorship({...manualSponsorship, amount: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none shadow-inner" placeholder="贊助金額 (NT$)" />
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowManualSponsorAdd(false)} className="flex-1 py-4 font-black text-slate-400">取消</button><button type="submit" className="flex-1 py-4 bg-amber-500 text-white font-black rounded-2xl">確定錄入</button></div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingGuest && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl space-y-6">
            <h3 className="text-2xl font-black text-slate-900 text-center">編輯賓客資訊</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <input type="text" value={editingGuest.name} onChange={e => setEditingGuest({...editingGuest, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none shadow-inner" required />
              <input type="text" value={editingGuest.title} onChange={e => setEditingGuest({...editingGuest, title: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none shadow-inner" />
              <select value={editingGuest.category} onChange={e => setEditingGuest({...editingGuest, category: e.target.value as GuestCategory})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none shadow-inner">{Object.values(GuestCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => { setShowEditModal(false); setEditingGuest(null); }} className="flex-1 py-4 font-black text-slate-400">取消</button><button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl">更新資料</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DigitalCheckInPanel;
