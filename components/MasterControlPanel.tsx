
import React, { useState, useMemo, useEffect } from 'react';
import { useEvent } from '../context/EventContext';
import { Guest, GuestCategory, McFlowStep, GiftItem } from '../types';
import { 
  Settings, LayoutDashboard, ClipboardList, Award, Mic2, Gift, 
  RotateCcw, Trash2, Save, Wifi, Clock, Activity, Users, 
  ChevronRight, AlertCircle, ShieldAlert, Database, Globe,
  Edit3, Search, X, CheckCircle2, ChevronDown, ListChecks, ArrowUpDown,
  ExternalLink, Check, Zap, BarChart3, ShieldCheck, UserCheck
} from 'lucide-react';

const MasterControlPanel: React.FC = () => {
  const { 
    settings, updateSettings, guests, updateGuestInfo, deleteGuest,
    isAdmin, loginAdmin, logoutAdmin, isCloudConnected,
    resetGlobalEventState, clearGuestsOnly, clearGiftsOnly, clearMcFlowOnly,
    setMcFlowSteps, setGiftItems
  } = useEvent();

  const [editName, setEditName] = useState(settings.eventName);
  const [editSchedule, setEditSchedule] = useState(settings.briefSchedule || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

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

  const filteredGuests = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    if (!s) return guests.slice(0, 40); 
    return guests.filter(g => g.name.toLowerCase().includes(s) || (g.code || '').includes(s) || (g.title || '').toLowerCase().includes(s));
  }, [guests, searchTerm]);

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

      {/* 三欄核心佈局：設定 | 人員 | 運作監控 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-full">
        
        {/* 左側：核心活動配置 (占 3 欄) */}
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

          <div className="bg-white rounded-[2.5rem] p-8 border-2 border-dashed border-red-100 space-y-4">
             <div className="flex items-center gap-2 text-red-500">
                <ShieldCheck size={20} />
                <h3 className="font-black text-sm uppercase tracking-widest">危險操作區</h3>
             </div>
             <button onClick={() => { if(window.confirm('警告：確定要清空所有人員名單與報到資料嗎？')) clearGuestsOnly(); }} className="w-full py-4 px-6 bg-red-50 text-red-600 rounded-2xl font-black text-xs flex items-center justify-between hover:bg-red-500 hover:text-white transition-all group">
                人員名單清空
                <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
             </button>
             <button onClick={() => { if(window.confirm('確定重置今日所有進度紀錄嗎？')) resetGlobalEventState(); }} className="w-full py-4 px-6 bg-slate-50 text-slate-400 rounded-2xl font-black text-xs flex items-center justify-between hover:bg-slate-200 hover:text-slate-600 transition-all group">
                重置今日活動進度
                <RotateCcw size={16} className="group-hover:rotate-[-45deg] transition-all" />
             </button>
          </div>
        </div>

        {/* 中間：名單實況監控與維護 (占 5 欄) */}
        <div className="lg:col-span-5 flex flex-col h-[85vh]">
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-white flex flex-col h-full overflow-hidden">
            <div className="p-6 md:p-8 border-b border-gray-50 bg-slate-50/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                <h3 className="font-black text-xl text-slate-900">人員名單實況牆</h3>
                <span className="text-xs bg-white border border-gray-100 px-3 py-1 rounded-full text-slate-400 font-black tabular-nums">{guests.length} GUESTS</span>
              </div>
              <div className="relative flex-1 max-w-[240px]">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                <input type="text" placeholder="快速搜尋定位..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-black outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-gray-50/50">
              {filteredGuests.map(g => (
                <div key={g.id} className="p-4 md:px-8 md:py-6 flex items-center justify-between hover:bg-slate-50/80 transition-all group">
                  <div className="flex items-center gap-5 min-w-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 shadow-sm border ${g.isCheckedIn ? 'bg-blue-600 text-white border-blue-500' : 'bg-gray-50 text-gray-300 border-gray-100'}`}>
                      {g.code || 'NA'}
                    </div>
                    <div className="truncate space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-lg tracking-tight truncate">{g.name}</span>
                        {g.isCheckedIn && <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />}
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-widest">{g.title || '貴賓'} · {g.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { const n = prompt("修改姓名", g.name); if(n) updateGuestInfo(g.id, {name:n}); }} className="p-2.5 bg-white text-slate-400 hover:text-blue-500 rounded-xl shadow-sm border border-gray-50"><Edit3 size={16}/></button>
                    <button onClick={() => { if(window.confirm(`確定刪除「${g.name}」？`)) deleteGuest(g.id); }} className="p-2.5 bg-white text-slate-400 hover:text-red-500 rounded-xl shadow-sm border border-gray-50"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
              {filteredGuests.length === 0 && (
                <div className="py-20 text-center space-y-4">
                    <Users size={48} className="mx-auto text-slate-100" />
                    <p className="text-slate-300 font-black italic">未搜尋到對應的人員紀錄</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右側：程序與禮品監控 (占 4 欄) */}
        <div className="lg:col-span-4 space-y-6 flex flex-col h-[85vh]">
          
          {/* 司儀講稿即時監視器 */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-white flex flex-col flex-[3] overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-emerald-50/20">
              <h3 className="font-black text-lg text-emerald-900 flex items-center gap-2">
                <Mic2 size={20} className="text-emerald-500" /> 講稿播報監視器
              </h3>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-widest">Live Flow</span>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-3">
              {(settings.mcFlowSteps || []).map((step, idx) => (
                <div key={step.id} className={`p-4 rounded-3xl border transition-all ${step.isCompleted ? 'bg-slate-50 border-transparent opacity-40 grayscale' : 'bg-white border-slate-100 hover:border-emerald-200 shadow-sm'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-white bg-emerald-400 px-1.5 py-0.5 rounded">#{(idx+1).toString().padStart(2, '0')}</span>
                        <span className="text-[10px] font-black text-slate-400 tracking-widest">{step.time || '未定時間'}</span>
                    </div>
                    <button onClick={() => { const t = prompt("標題", step.title); if(t) setMcFlowSteps((settings.mcFlowSteps||[]).map(s=>s.id===step.id?{...s,title:t}:s)); }} className="p-1.5 text-slate-300 hover:text-emerald-500"><Edit3 size={14}/></button>
                  </div>
                  <h4 className="font-black text-base text-slate-900 leading-tight">{step.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 italic border-l-2 border-emerald-100 pl-3 leading-relaxed">
                    {step.script ? step.script : '尚未填寫講稿內容...'}
                  </p>
                </div>
              ))}
              {(settings.mcFlowSteps || []).length === 0 && (
                 <div className="py-12 text-center text-slate-300 font-bold italic text-sm">尚未上傳活動流程講稿</div>
              )}
            </div>
          </div>

          {/* 獎項禮品即時配發 */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-white flex flex-col flex-[2] overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-orange-50/20">
              <h3 className="font-black text-lg text-orange-900 flex items-center gap-2">
                <Award size={20} className="text-orange-500" /> 禮品獎項配發
              </h3>
              <span className="text-[10px] font-black text-orange-600 bg-orange-100 px-3 py-1 rounded-full uppercase tracking-widest">Inventory</span>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-3">
              {(settings.giftItems || []).map((gift) => (
                <div key={gift.id} className={`flex items-center justify-between p-4 rounded-3xl border transition-all ${gift.isPresented ? 'bg-slate-50 border-transparent opacity-50' : 'bg-white border-slate-100 shadow-sm group'}`}>
                  <div className="min-w-0">
                    <h4 className="font-black text-sm text-slate-900 truncate tracking-tight">{gift.name}</h4>
                    <div className="flex items-center gap-1.5 mt-1">
                        <UserCheck size={12} className="text-blue-500" />
                        <p className="text-[10px] font-black text-blue-600 truncate">{gift.recipient}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setGiftItems((settings.giftItems||[]).map(i=>i.id===gift.id?{...i,isPresented:!i.isPresented}:i))} 
                    className={`text-[9px] font-black px-3 py-1.5 rounded-xl shrink-0 transition-all ${gift.isPresented ? 'bg-green-100 text-green-700' : 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'}`}
                  >
                    {gift.isPresented ? '已發送' : '標記發送'}
                  </button>
                </div>
              ))}
              {(settings.giftItems || []).length === 0 && (
                 <div className="py-8 text-center text-slate-300 font-bold italic text-sm">尚未上傳禮品清單</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MasterControlPanel;
