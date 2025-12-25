
import React, { useState, useMemo, useEffect } from 'react';
import { useEvent } from '../context/EventContext';
import { Guest, GuestCategory, McFlowStep, GiftItem, Sponsorship } from '../types';
import { 
  Settings, LayoutDashboard, ClipboardList, Award, Mic2, Gift, 
  RotateCcw, Trash2, Save, Wifi, Clock, Activity, Users, 
  ChevronRight, AlertCircle, ShieldAlert, Database, Globe,
  Edit3, Search, X, CheckCircle2, ChevronDown, ListChecks, ArrowUpDown,
  ExternalLink, Check, Zap, BarChart3, ShieldCheck, UserCheck, Coins, Heart, Package, Loader2, Info
} from 'lucide-react';

const MasterControlPanel: React.FC = () => {
  const { 
    settings, updateSettings, guests, updateGuestInfo, deleteGuest,
    isAdmin, loginAdmin, logoutAdmin, isCloudConnected,
    resetGlobalEventState, clearGuestsOnly, clearGiftsOnly, clearMcFlowOnly,
    setMcFlowSteps, setGiftItems, updateSponsorship, deleteSponsorship
  } = useEvent();

  const [editName, setEditName] = useState(settings.eventName);
  const [editSchedule, setEditSchedule] = useState(settings.briefSchedule || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // 編輯贊助狀態
  const [showEditSponsorshipModal, setShowEditSponsorshipModal] = useState(false);
  const [editingSponsorship, setEditingSponsorship] = useState<Sponsorship | null>(null);

  useEffect(() => {
    setEditName(settings.eventName);
    setEditSchedule(settings.briefSchedule || '');
  }, [settings.eventName, settings.briefSchedule]);

  const handleSaveGeneral = async () => {
    setSaveStatus('saving');
    await updateSettings({ eventName: editName, briefSchedule: editSchedule });
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginAdmin(loginPassword)) {
        setShowLoginModal(false);
        setLoginPassword("");
    } else {
        alert("密碼錯誤");
    }
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

  const filteredGuests = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    if (!s) return guests.slice(0, 40); 
    return guests.filter(g => g.name.toLowerCase().includes(s) || (g.code || '').includes(s) || (g.title || '').toLowerCase().includes(s));
  }, [guests, searchTerm]);

  const totalSponsorshipAmount = useMemo(() => {
    return (settings.sponsorships || []).reduce((acc, curr) => acc + curr.amount, 0);
  }, [settings.sponsorships]);

  const stats = useMemo(() => {
    const totalGuests = guests.length;
    const checkedGuests = guests.filter(g => g.isCheckedIn).length;
    const regPercent = totalGuests > 0 ? Math.round((checkedGuests / totalGuests) * 100) : 0;
    const giftsDone = (settings.giftItems || []).filter(i => i.isPresented).length;
    const giftsPercent = (settings.giftItems || []).length > 0 ? Math.round((giftsDone / (settings.giftItems || []).length) * 100) : 0;
    const stepsDone = (settings.mcFlowSteps || []).filter(s => s.isCompleted).length;
    const stepsPercent = (settings.mcFlowSteps || []).length > 0 ? Math.round((stepsDone / (settings.mcFlowSteps || []).length) * 100) : 0;
    return { totalGuests, checkedGuests, regPercent, giftsDone, giftsTotal: (settings.giftItems || []).length, giftsPercent, stepsDone, stepsTotal: (settings.mcFlowSteps || []).length, stepsPercent };
  }, [guests, settings]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center space-y-8">
        <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center text-gray-300">
          <ShieldAlert size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900">指揮中心已鎖定</h2>
          <p className="text-slate-400 font-bold">此區域僅限系統管理員進行全域控管</p>
        </div>
        <button onClick={() => setShowLoginModal(true)} className="px-12 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all">解鎖權限 (密碼: 8888)</button>
        {showLoginModal && (
          <div className="fixed inset-0 ios-blur bg-black/40 z-[300] flex items-center justify-center p-6">
            <div className="bg-white rounded-[2.5rem] p-10 max-w-xs w-full shadow-2xl flex flex-col items-center gap-6">
              <h3 className="text-xl font-black text-black">管理員授權</h3>
              <form onSubmit={handleLoginSubmit} className="w-full space-y-4">
                <input type="password" placeholder="••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-[#F2F2F7] border-none rounded-2xl py-5 px-4 text-center text-4xl font-black outline-none" autoFocus />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-4 font-black text-gray-400">取消</button>
                  <button type="submit" className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl">確認</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 w-full max-w-[1920px] mx-auto space-y-6 pb-40">
      
      {/* 頂部全寬度戰情列 */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-6 bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-2xl border border-white/10">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20"><Zap size={28} /></div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black">SUPER COMMAND CENTER</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-[10px] font-black border border-green-500/20">
                <Globe size={12} className="animate-pulse" /> LIVE SYNCING
              </div>
              <p className="text-white/40 font-bold uppercase tracking-[0.3em] text-[9px]">Event War Room Dashboard v7.0</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: '報到率', val: stats.regPercent, color: 'text-blue-400', icon: ClipboardList },
              { label: '禮品發放', val: stats.giftsPercent, color: 'text-orange-400', icon: Award },
              { label: '流程進度', val: stats.stepsPercent, color: 'text-emerald-400', icon: Mic2 }
            ].map(i => (
              <div key={i.label} className="bg-white/5 border border-white/5 px-6 py-3 rounded-2xl flex items-center gap-4 min-w-[140px]">
                <i.icon size={20} className={i.color} />
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{i.label}</span>
                    <span className="text-xl font-black tabular-nums">{i.val}%</span>
                </div>
              </div>
            ))}
            <button onClick={logoutAdmin} className="p-4 bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 rounded-2xl transition-all border border-white/5"><X size={24} /></button>
        </div>
      </div>

      {/* 三欄核心佈局 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-full">
        
        {/* 左側：核心活動配置 */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white space-y-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Settings size={80} /></div>
            <h3 className="font-black text-lg text-slate-900 flex items-center gap-2 border-b border-gray-50 pb-4">
              <BarChart3 size={20} className="text-blue-500" /> 指揮官全局配置
            </h3>
            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">活動正式全銜</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">即時公告內容</label>
                <textarea rows={6} value={editSchedule} onChange={(e) => setEditSchedule(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-xs focus:ring-4 focus:ring-blue-500/10 outline-none resize-none leading-relaxed transition-all" />
              </div>
              <button onClick={handleSaveGeneral} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
                <Save size={18} /> {saveStatus === 'saving' ? '數據同步中...' : '儲存全域變更'}
              </button>
            </div>
          </div>

          <div className="bg-slate-50 rounded-[2.5rem] p-8 space-y-6 border border-white">
            <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
              <Clock size={20} className="text-slate-400" /> 時間相位控制
            </h3>
            <div className="space-y-6">
               <div className="space-y-3">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">目前報到輪次相位 (R1 / R2)</p>
                 <div className="grid grid-cols-2 bg-white p-1.5 rounded-2xl gap-2 shadow-inner border border-black/5">
                   {[1, 2].map(r => (
                     <button key={r} onClick={() => updateSettings({ currentCheckInRound: r })} className={`py-3 rounded-xl font-black text-xs transition-all ${settings.currentCheckInRound === r ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>ROUND {r}</button>
                   ))}
                 </div>
               </div>
               <div className="space-y-3">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">目前抽獎階段控制 (1-5)</p>
                 <div className="flex bg-white p-1.5 rounded-2xl gap-1.5 shadow-inner border border-black/5">
                   {[1, 2, 3, 4, 5].map(r => (
                     <button key={r} onClick={() => updateSettings({ lotteryRoundCounter: r })} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${settings.lotteryRoundCounter === r ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{r}</button>
                   ))}
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* 中間：實況牆 (人員名單 & 贊助狀態) */}
        <div className="lg:col-span-5 flex flex-col h-[85vh] gap-6">
          
          {/* 贊助芳名即時監視器 */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-white flex flex-col flex-1 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-amber-50 bg-amber-50/20 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                <h3 className="font-black text-xl text-amber-900">贊助芳名即時牆</h3>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-amber-100 rounded-full text-amber-600 font-black text-xs tabular-nums">
                    <Coins size={12} /> NT$ {totalSponsorshipAmount.toLocaleString()}
                </div>
              </div>
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-amber-50">Live Monitor</span>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-amber-50/50">
              {(settings.sponsorships || []).slice().reverse().map(s => (
                <div key={s.id} className="px-6 md:px-8 py-5 md:py-6 flex items-center justify-between hover:bg-amber-50/20 transition-all group">
                  <div className="flex items-center gap-5 min-w-0 flex-1">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-inner shrink-0"><Heart size={22} fill="currentColor" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <span className="font-black text-slate-900 text-lg md:text-2xl tracking-tighter truncate">{s.name}</span>
                        <span className="text-[10px] md:text-sm font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">({s.title || '會友'})</span>
                        {s.itemName && (
                          <div className="flex items-center gap-1 text-[9px] md:text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100"><Package size={10} /> {s.itemName}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right"><span className="text-xl md:text-3xl font-black text-amber-600 tabular-nums italic tracking-tighter">NT$ {s.amount.toLocaleString()}</span></div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => { setEditingSponsorship(s); setShowEditSponsorshipModal(true); }} className="p-2 bg-slate-50 text-slate-300 hover:text-amber-500 rounded-lg shadow-sm border border-gray-100"><Edit3 size={16}/></button>
                      <button onClick={() => { if(window.confirm('移除此筆贊助？')) deleteSponsorship(s.id); }} className="p-2 bg-slate-50 text-slate-300 hover:text-red-500 rounded-lg shadow-sm border border-gray-100"><Trash2 size={16}/></button>
                    </div>
                  </div>
                </div>
              ))}
              {(settings.sponsorships || []).length === 0 && (
                <div className="py-20 text-center space-y-4"><Heart size={48} className="mx-auto text-amber-50" /><p className="text-amber-200 font-black italic text-xs uppercase tracking-[0.4em]">Waiting for Sponsors</p></div>
              )}
            </div>
          </div>

          {/* 人員名單實況牆 */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-white flex flex-col flex-[1.5] overflow-hidden">
            <div className="p-6 md:p-8 border-b border-gray-50 bg-slate-50/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4"><div className="w-1.5 h-6 bg-blue-500 rounded-full" /><h3 className="font-black text-xl text-slate-900">人員名單實況牆</h3><span className="text-xs bg-white border border-gray-100 px-3 py-1 rounded-full text-slate-400 font-black tabular-nums">{guests.length} GUESTS</span></div>
              <div className="relative flex-1 max-w-[240px]"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" /><input type="text" placeholder="快速搜尋..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-black outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" /></div>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-gray-50/50">
              {filteredGuests.map(g => (
                <div key={g.id} className="px-6 md:px-8 py-5 md:py-6 flex items-center justify-between hover:bg-slate-50/80 transition-all group">
                  <div className="flex items-center gap-5 min-w-0 flex-1">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-black text-[10px] md:text-xs shrink-0 shadow-sm border ${g.isCheckedIn ? 'bg-blue-600 text-white border-blue-500' : 'bg-gray-50 text-gray-300 border-gray-100'}`}>{g.code || 'NA'}</div>
                    <div className="truncate flex-1 min-w-0">
                      <div className="flex items-baseline gap-3"><span className="font-black text-slate-900 text-lg md:text-2xl tracking-tighter truncate">{g.name}</span><span className="text-[10px] md:text-sm font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">({g.title || '貴賓'})</span>{g.isCheckedIn && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { const n = prompt("修改姓名", g.name); if(n) updateGuestInfo(g.id, {name:n}); }} className="p-2 bg-white text-slate-400 hover:text-blue-500 rounded-lg shadow-sm border border-gray-50"><Edit3 size={16}/></button>
                    <button onClick={() => { if(window.confirm(`確定刪除「${g.name}」？`)) deleteGuest(g.id); }} className="p-2 bg-white text-slate-400 hover:text-red-500 rounded-lg shadow-sm border border-gray-50"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右側：程序與禮品監控 */}
        <div className="lg:col-span-4 space-y-6 flex flex-col h-[85vh]">
          {/* 司儀講稿即時監視器 */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-white flex flex-col flex-[3] overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-emerald-50/20"><h3 className="font-black text-lg text-emerald-900 flex items-center gap-2"><Mic2 size={20} className="text-emerald-500" /> 講稿監視器</h3><span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-widest">Live Flow</span></div>
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-3">
              {(settings.mcFlowSteps || []).map((step, idx) => (
                <div key={step.id} className={`p-4 rounded-3xl border transition-all ${step.isCompleted ? 'bg-slate-50 border-transparent opacity-40 grayscale' : 'bg-white border-slate-100 shadow-sm'}`}>
                  <div className="flex justify-between items-start mb-2"><span className="text-[9px] font-black text-white bg-emerald-400 px-1.5 py-0.5 rounded">#{(idx+1)}</span><span className="text-[10px] font-black text-slate-400 tracking-widest">{step.time || '未定時間'}</span></div>
                  <h4 className="font-black text-base text-slate-900 leading-tight">{step.title}</h4>
                </div>
              ))}
            </div>
          </div>

          {/* 獎項禮品即時配發 */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-white flex flex-col flex-[2] overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-orange-50/20"><h3 className="font-black text-lg text-orange-900 flex items-center gap-2"><Award size={20} className="text-orange-500" /> 禮品配發</h3><span className="text-[10px] font-black text-orange-600 bg-orange-100 px-3 py-1 rounded-full uppercase tracking-widest">Inventory</span></div>
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-3">
              {(settings.giftItems || []).map((gift) => (
                <div key={gift.id} className={`flex items-center justify-between p-4 rounded-3xl border transition-all ${gift.isPresented ? 'bg-slate-50 border-transparent opacity-50' : 'bg-white border-slate-100 shadow-sm'}`}>
                  <div className="min-w-0"><h4 className="font-black text-sm text-slate-900 truncate tracking-tight">{gift.name}</h4><p className="text-[10px] font-black text-blue-600 truncate">{gift.recipient}</p></div>
                  <button onClick={() => setGiftItems((settings.giftItems||[]).map(i=>i.id===gift.id?{...i,isPresented:!i.isPresented}:i))} className={`text-[9px] font-black px-3 py-1.5 rounded-xl shrink-0 transition-all ${gift.isPresented ? 'bg-green-100 text-green-700' : 'bg-orange-500 text-white shadow-lg'}`}>{gift.isPresented ? '已發送' : '標記'}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 編輯贊助視窗 */}
      {showEditSponsorshipModal && editingSponsorship && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[320] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl space-y-6">
            <h3 className="text-2xl font-black text-slate-900 text-center italic tracking-tighter">編輯贊助資訊</h3>
            <form onSubmit={handleEditSponsorshipSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">姓名與職稱</label>
                <input type="text" value={editingSponsorship.name} onChange={e => setEditingSponsorship({...editingSponsorship, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none" placeholder="贊助者姓名" required />
                <input type="text" value={editingSponsorship.title} onChange={e => setEditingSponsorship({...editingSponsorship, title: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black text-lg outline-none" placeholder="職稱" />
              </div>
              
              <div className="bg-amber-50/30 p-5 rounded-[1.8rem] border border-amber-100/50 space-y-3">
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
    </div>
  );
};

export default MasterControlPanel;
