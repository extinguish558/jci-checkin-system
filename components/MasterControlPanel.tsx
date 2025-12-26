
import React, { useState, useMemo, useEffect } from 'react';
import { useEvent } from '../context/EventContext';
import { Guest, GuestCategory, McFlowStep, GiftItem, Sponsorship } from '../types';
import { 
  Settings, LayoutDashboard, ClipboardList, Award, Mic2, Gift, 
  RotateCcw, Trash2, Save, Wifi, Clock, Activity, Users, 
  ChevronRight, AlertCircle, ShieldAlert, Database, Globe,
  Edit3, Search, X, CheckCircle2, ChevronDown, ListChecks, ArrowUpDown,
  ExternalLink, Check, Zap, BarChart3, ShieldCheck, UserCheck, Coins, Heart, Package, Loader2, Info, Lock, Trophy, UserMinus
} from 'lucide-react';

const MasterControlPanel: React.FC = () => {
  const { 
    settings, updateSettings, guests, updateGuestInfo, deleteGuest,
    isAdmin, loginAdmin, logoutAdmin, isCloudConnected,
    resetGlobalEventState, clearGuestsOnly, clearGiftsOnly, clearMcFlowOnly,
    setMcFlowSteps, setGiftItems, updateSponsorship, deleteSponsorship
  } = useEvent();

  const [searchTerm, setSearchTerm] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");

  // 編輯贊助狀態
  const [showEditSponsorshipModal, setShowEditSponsorshipModal] = useState(false);
  const [editingSponsorship, setEditingSponsorship] = useState<Sponsorship | null>(null);

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

  // 手動撤銷中獎資格 (返回抽獎池)
  const handleRevokeWinner = async (guest: Guest) => {
    if (!window.confirm(`確定要撤銷「${guest.name}」的中獎資格嗎？\n該員將會返回抽獎池中。`)) return;
    try {
        await updateGuestInfo(guest.id, {
            isWinner: false,
            wonRounds: [],
            winRound: undefined,
            wonTimes: {}
        });
    } catch (e: any) {
        alert("操作失敗: " + e.message);
    }
  };

  const filteredGuests = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    if (!s) return guests.slice(0, 40); 
    return guests.filter(g => g.name.toLowerCase().includes(s) || (g.code || '').includes(s) || (g.title || '').toLowerCase().includes(s));
  }, [guests, searchTerm]);

  const totalSponsorshipAmount = useMemo(() => {
    return (settings.sponsorships || []).reduce((acc, curr) => acc + curr.amount, 0);
  }, [settings.sponsorships]);

  // 工具函式：計算報到數據概覽
  const getTargetGroup = (g: Guest): string => {
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
  };

  const registrationStats = useMemo(() => {
    const categories = [{ key: 'YB', label: '會友 YB', color: 'bg-blue-500' }, { key: 'OB', label: '特友 OB', color: 'bg-orange-500' }, { key: 'HQ', label: '總會貴賓', color: 'bg-indigo-500' }, { key: 'VISITING', label: '友會貴賓', color: 'bg-green-500' }, { key: 'VIP', label: '貴賓 VIP', color: 'bg-purple-500' }];
    const details = categories.map(cat => {
      const groupGuests = guests.filter(g => getTargetGroup(g) === cat.key);
      return { ...cat, checked: groupGuests.filter(g => g.isCheckedIn).length, total: groupGuests.length };
    });
    const totalChecked = guests.filter(g => g.isCheckedIn).length;
    return { details, totalChecked, totalCount: guests.length, totalPercent: guests.length > 0 ? Math.round((totalChecked / guests.length) * 100) : 0 };
  }, [guests]);

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

  return (
    <div className="p-4 md:p-6 w-full max-w-[1920px] mx-auto space-y-6 pb-40">
      
      {/* 頂部全寬度戰情列 - 高度縮減優化 */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-slate-900 text-white p-3 md:p-4 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-white/10">
        <div className="flex items-center gap-4">
          <div className="p-2.5 md:p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
            {/* Fix: Removed invalid responsive prop 'md:size' and used Tailwind for responsive sizing */}
            <LayoutDashboard className="w-[22px] h-[22px] md:w-[26px] md:h-[26px]" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black italic tracking-tighter">戰情總覽 CENTER</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-400 rounded-full text-[8px] md:text-[9px] font-black border border-green-500/20">
                <Globe size={10} className="animate-pulse" /> LIVE
              </div>
              <p className="text-white/30 font-bold uppercase tracking-[0.2em] text-[8px]">Event War Room Dashboard v7.5</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-2.5">
            {[
              { label: '報到率', val: stats.regPercent, color: 'text-blue-400', icon: ClipboardList },
              { label: '禮品發放', val: stats.giftsPercent, color: 'text-orange-400', icon: Award },
              { label: '流程進度', val: stats.stepsPercent, color: 'text-emerald-400', icon: Mic2 }
            ].map(i => (
              <div key={i.label} className="bg-white/5 border border-white/5 px-4 py-1.5 md:py-2 rounded-[1.2rem] flex items-center gap-3 min-w-[120px]">
                <i.icon size={16} className={i.color} />
                <div className="flex flex-col">
                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">{i.label}</span>
                    <span className="text-lg font-black tabular-nums leading-none">{i.val}%</span>
                </div>
              </div>
            ))}
            <button onClick={() => isAdmin ? logoutAdmin() : setShowLoginModal(true)} className={`p-2.5 md:p-3 rounded-2xl transition-all border border-white/5 ${isAdmin ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/60'}`}>
              {isAdmin ? <X size={20} /> : <Lock size={20} />}
            </button>
        </div>
      </div>

      {/* 三欄核心佈局 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-full">
        
        {/* 左側：核心活動看板資訊 */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white space-y-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Settings size={80} /></div>
            <h3 className="font-black text-lg text-slate-900 flex items-center gap-2 border-b border-gray-50 pb-4">
              <BarChart3 size={20} className="text-blue-500" /> 全域看板配置
            </h3>
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">活動正式全銜</label>
                <div className="bg-slate-50 rounded-2xl p-5 min-h-[60px] flex items-center border border-slate-100/50">
                  <p className="font-black text-base text-slate-800 leading-tight">{settings.eventName || "尚未設定活動名稱"}</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">即時公告內容</label>
                <div className="bg-slate-50 rounded-2xl p-5 min-h-[150px] border border-slate-100/50">
                  <p className="text-sm font-bold text-slate-600 leading-relaxed whitespace-pre-wrap">{settings.briefSchedule || "目前尚無即時公告事項。"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 時間相位控制 */}
          <div className="bg-slate-50 rounded-[2.5rem] p-8 space-y-6 border border-white shadow-sm">
            <h3 className="font-black text-lg text-slate-900 flex items-center gap-2"><Clock size={20} className="text-slate-400" /> 時間相位控制</h3>
            <div className="space-y-6">
               <div className="space-y-3">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">報到輪次 (R1 / R2)</p>
                 <div className="grid grid-cols-2 bg-white p-1.5 rounded-2xl gap-2 shadow-inner border border-black/5">
                   {[1, 2].map(r => (<button key={r} onClick={() => isAdmin && updateSettings({ currentCheckInRound: r })} className={`py-3 rounded-xl font-black text-xs transition-all ${settings.currentCheckInRound === r ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>ROUND {r}</button>))}
                 </div>
               </div>
               <div className="space-y-3">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">抽獎階段 (1-5)</p>
                 <div className="flex bg-white p-1.5 rounded-2xl gap-1.5 shadow-inner border border-black/5">
                   {[1, 2, 3, 4, 5].map(r => (<button key={r} onClick={() => isAdmin && updateSettings({ lotteryRoundCounter: r })} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${settings.lotteryRoundCounter === r ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{r}</button>))}
                 </div>
               </div>
            </div>
          </div>

          {/* 贊助芳名即時牆 */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-white flex flex-col overflow-hidden">
            <div className="p-8 border-b border-amber-50 bg-amber-50/20 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                <h3 className="font-black text-xl text-amber-900">贊助芳名牆</h3>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-amber-100 rounded-full text-amber-600 font-black text-xs tabular-nums"><Coins size={12} /> NT$ {totalSponsorshipAmount.toLocaleString()}</div>
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto no-scrollbar divide-y divide-amber-50/50">
              {(settings.sponsorships || []).slice().reverse().map(s => (
                <div key={s.id} className="px-6 py-4 flex items-center justify-between hover:bg-amber-50/20 transition-all group">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 shadow-inner shrink-0"><Heart size={16} fill="currentColor" /></div>
                    <div className="flex-1 min-w-0"><span className="font-black text-slate-900 text-sm md:text-base tracking-tighter block truncate">{s.name}</span>{s.itemName && <span className="text-[8px] font-black text-blue-600 truncate block">{s.itemName}</span>}</div>
                  </div>
                  <span className="text-sm font-black text-amber-600 tabular-nums italic shrink-0">NT${s.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 中間：報到數據與實況牆 */}
        <div className="lg:col-span-5 flex flex-col h-[85vh] gap-6">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white flex flex-col md:flex-row gap-6 md:gap-8 relative overflow-hidden shrink-0">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500/10" />
            <div className="flex-1 flex flex-col justify-between space-y-4">
              <div className="flex items-center gap-2"><Clock size={16} className="text-blue-500"/><span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">報到總覽數據</span></div>
              <div className="flex items-baseline gap-2"><span className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-none">{registrationStats.totalChecked}</span><span className="text-lg font-bold text-slate-300">/ {registrationStats.totalCount}</span></div>
              <div className="mt-auto space-y-2">
                <div className="flex justify-between items-end"><span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Progress</span><p className="text-[10px] font-black text-blue-600">{registrationStats.totalPercent}%</p></div>
                <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-50 shadow-inner"><div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${registrationStats.totalPercent}%` }} /></div>
              </div>
            </div>
            <div className="w-full md:w-auto md:min-w-[200px] border-t md:border-t-0 md:border-l border-gray-50 pt-4 md:pt-0 md:pl-8 grid grid-cols-2 gap-y-3 gap-x-4">
              {registrationStats.details.map(detail => (
                <div key={detail.key} className="flex flex-col">
                  <div className="flex items-center gap-1"><div className={`w-1.5 h-1.5 rounded-full ${detail.color}`} /><span className="text-[9px] font-black text-gray-400 uppercase">{detail.label.replace('貴賓', '')}</span></div>
                  <div className="flex items-baseline gap-1"><span className="text-base font-black text-slate-700">{detail.checked}</span><span className="text-[9px] font-bold text-slate-200">/ {detail.total}</span></div>
                </div>
              ))}
            </div>
          </div>

          {/* 人員名單實況牆 - 優化中獎狀態顯示 */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-white flex flex-col flex-1 overflow-hidden min-h-0">
            <div className="p-8 border-b border-gray-50 bg-slate-50/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4"><div className="w-1.5 h-6 bg-blue-500 rounded-full" /><h3 className="font-black text-xl text-slate-900">報到與中獎實況</h3></div>
              <div className="relative flex-1 max-w-[240px]"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" /><input type="text" placeholder="快速搜尋..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-black outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" /></div>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-gray-50/50">
              {filteredGuests.map(g => (
                <div key={g.id} className="px-8 py-6 flex items-center justify-between hover:bg-slate-50/80 transition-all group">
                  <div className="flex items-center gap-5 min-w-0 flex-1">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-black text-[10px] md:text-xs shrink-0 shadow-sm border ${g.isCheckedIn ? 'bg-blue-600 text-white border-blue-500' : 'bg-gray-50 text-gray-300 border-gray-100'}`}>{g.code || 'NA'}</div>
                    <div className="truncate flex-1 min-w-0">
                      <div className="flex items-baseline gap-3">
                        <span className={`font-black text-lg md:text-2xl tracking-tighter truncate ${g.isCheckedIn ? 'text-slate-900' : 'text-slate-300'}`}>{g.name}</span>
                        <span className="text-[10px] md:text-sm font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">({g.title || '貴賓'})</span>
                        {g.isCheckedIn && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                      {/* 中獎狀態與撤銷功能 - 需求優化區 */}
                      {g.isWinner && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-500/20 shadow-sm animate-in zoom-in-90 duration-500">
                           <Trophy size={14} className="shrink-0" />
                           <span className="text-[10px] font-black italic tabular-nums">R{(g.wonRounds || []).join(',')} 獲獎者</span>
                           {isAdmin && (
                             <button 
                                onClick={() => handleRevokeWinner(g)} 
                                className="ml-1 p-1 hover:bg-amber-500 hover:text-white rounded-md transition-colors"
                                title="撤銷獲獎資格，返回抽獎池"
                             >
                                <RotateCcw size={12} strokeWidth={3} />
                             </button>
                           )}
                        </div>
                      )}
                      
                      {isAdmin && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { const n = prompt("修改姓名", g.name); if(n) updateGuestInfo(g.id, {name:n}); }} className="p-2 bg-white text-slate-400 hover:text-blue-500 rounded-lg shadow-sm border border-gray-50"><Edit3 size={16}/></button>
                          <button onClick={() => { if(window.confirm(`確定刪除「${g.name}」？`)) deleteGuest(g.id); }} className="p-2 bg-white text-slate-400 hover:text-red-500 rounded-lg shadow-sm border border-gray-50"><Trash2 size={16}/></button>
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右側：程序與禮品監控 */}
        <div className="lg:col-span-4 space-y-6 flex flex-col h-[85vh]">
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-white flex flex-col flex-[3] overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-emerald-50/20"><h3 className="font-black text-lg text-emerald-900 flex items-center gap-2"><Mic2 size={20} className="text-emerald-500" /> 流程監視器</h3><span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-widest">Live Flow</span></div>
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-3">
              {(settings.mcFlowSteps || []).map((step, idx) => (
                <div key={step.id} className={`p-4 rounded-3xl border transition-all ${step.isCompleted ? 'bg-slate-50 border-transparent opacity-40 grayscale' : 'bg-white border-slate-100 shadow-sm'}`}>
                  <div className="flex justify-between items-start mb-2"><span className="text-[9px] font-black text-white bg-emerald-400 px-1.5 py-0.5 rounded">#{(idx+1)}</span><span className="text-[10px] font-black text-slate-400 tracking-widest">{step.time || '未定時間'}</span></div>
                  <h4 className="font-black text-base text-slate-900 leading-tight">{step.title}</h4>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-white flex flex-col flex-[2] overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-orange-50/20"><h3 className="font-black text-lg text-orange-900 flex items-center gap-2"><Award size={20} className="text-orange-500" /> 禮品進度</h3><span className="text-[10px] font-black text-orange-600 bg-orange-100 px-3 py-1 rounded-full uppercase tracking-widest">Inventory</span></div>
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-3">
              {(settings.giftItems || []).map((gift) => (
                <div key={gift.id} className={`flex items-center justify-between p-4 rounded-3xl border transition-all ${gift.isPresented ? 'bg-slate-50 border-transparent opacity-50' : 'bg-white border-slate-100 shadow-sm'}`}>
                  <div className="min-w-0"><h4 className="font-black text-sm text-slate-900 truncate tracking-tight">{gift.name}</h4><p className="text-[10px] font-black text-blue-600 truncate">{gift.recipient}</p></div>
                  {isAdmin && (
                    <button onClick={() => setGiftItems((settings.giftItems||[]).map(i=>i.id===gift.id?{...i,isPresented:!i.isPresented}:i))} className={`text-[9px] font-black px-3 py-1.5 rounded-xl shrink-0 transition-all ${gift.isPresented ? 'bg-green-100 text-green-700' : 'bg-orange-500 text-white shadow-lg'}`}>{gift.isPresented ? '已發送' : '標記'}</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[300] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-xs w-full shadow-2xl flex flex-col items-center gap-6">
            <h3 className="text-xl font-black text-black">管理員授權</h3>
            <form onSubmit={handleLoginSubmit} className="w-full space-y-4">
              <input type="password" placeholder="••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-[#F2F2F7] border-none rounded-2xl py-5 px-4 text-center text-4xl font-black outline-none" autoFocus />
              <div className="flex gap-3"><button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-4 font-black text-gray-400">取消</button><button type="submit" className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl">確認</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterControlPanel;
