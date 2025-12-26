
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useEvent } from '../context/EventContext';
import { FlowFile, GuestCategory, Guest, LotteryPoolConfig } from '../types';
import { FileSpreadsheet, FileText, Presentation, Trash2, Lock, Unlock, ListTodo, Download, Loader2, Upload, X, Activity, CheckCircle2, Mic2, Award, ChevronRight, TrendingUp, RefreshCcw, Database, BellRing, Clock, FileBox, FileCheck2, Trophy, ClipboardList, ChevronDown, UserCheck, Users, RotateCcw, AlertTriangle, Check, ListChecks, Edit3, ChevronUp, Link, Wifi, WifiOff, FileUp, Move, PieChart, Info, FileStack, ShieldAlert, Heart, LockKeyhole, Save, Search, UserMinus, UserPlus, Filter, PlusCircle } from 'lucide-react';
import { exportFinalActivityReport, parseGuestsFromExcel, parseGiftsFromExcel, parseMcFlowFromExcel } from '../services/geminiService';

const FlowPanel: React.FC = () => {
  const { settings, updateSettings, addFlowFile, removeFlowFile, isAdmin, guests, overwriteGuestsFromDraft, addGuestsFromDraft, clearGuestsOnly, clearGiftsOnly, clearMcFlowOnly, resetGlobalEventState, isCloudConnected, updateGuestInfo } = useEvent();
  const [isEditingBoard, setIsEditingBoard] = useState(false);
  const [editBoardName, setEditBoardName] = useState(settings.eventName);
  const [editBoardSchedule, setEditBoardSchedule] = useState(settings.briefSchedule || '');
  const [poolConfig, setPoolConfig] = useState<LotteryPoolConfig>(settings.lotteryPoolConfig || { includedCategories: Object.values(GuestCategory), includedIndividualIds: [] });
  const [individualSearch, setIndividualSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  }, []);

  // Fix: Added missing triggerAction function to handle restricted actions
  const triggerAction = (action: () => void) => {
    if (!isAdmin) return alert("請由右上角解鎖管理員權限");
    action();
  };

  const handleSaveBoard = async () => {
    await updateSettings({ eventName: editBoardName, briefSchedule: editBoardSchedule });
    setIsEditingBoard(false);
  };

  const toggleCategory = (cat: GuestCategory) => {
    setPoolConfig(p => ({ ...p, includedCategories: p.includedCategories.includes(cat) ? p.includedCategories.filter(c => c !== cat) : [...p.includedCategories, cat] }));
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 pb-60 bg-[#F2F2F7] min-h-screen">
      <input type="file" ref={fileInputRef} className="hidden" />

      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white space-y-6 relative">
        <div className="flex justify-between items-center">
           <div className="flex items-center gap-2"><Activity className="text-blue-500" size={20} /><span className="text-gray-400 font-black tracking-widest text-xs uppercase">Event Settings</span></div>
           <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black ${isCloudConnected ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}><Wifi size={10}/> {isCloudConnected ? '雲端同步中' : '斷線'}</div>
        </div>

        {isEditingBoard ? (
          <div className="space-y-6">
             <input type="text" value={editBoardName} onChange={e => setEditBoardName(e.target.value)} className="w-full bg-[#F2F2F7] rounded-2xl py-4 px-6 text-2xl font-black outline-none" />
             <textarea rows={3} value={editBoardSchedule} onChange={e => setEditBoardSchedule(e.target.value)} className="w-full bg-[#F2F2F7] rounded-2xl py-4 px-6 text-sm font-bold outline-none resize-none" />
             <div className="flex gap-3"><button onClick={() => setIsEditingBoard(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl">取消</button><button onClick={handleSaveBoard} className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl">確認儲存</button></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-start"><h1 className="text-4xl font-black text-black leading-tight flex-1">{settings.eventName}</h1>{isAdmin && <button onClick={() => setIsEditingBoard(true)} className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Edit3 size={18}/></button>}</div>
            <div className="bg-[#F2F2F7] rounded-3xl p-6"><p className="text-lg font-light leading-relaxed">{settings.briefSchedule || "尚無活動內容摘要"}</p></div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-blue-100 flex items-center gap-6">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl"><FileStack size={32} /></div>
          <div className="flex-1"><h3 className="text-2xl font-black text-slate-900">成果總報表導出</h3><p className="text-sm font-bold text-slate-400">包含人員、禮品、司儀流程及得獎名冊。</p></div>
          <button onClick={() => exportFinalActivityReport(guests, settings.giftItems || [], settings.mcFlowSteps || [], settings.sponsorships || [], settings.eventName)} className="px-10 py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl flex items-center gap-2"><Download size={20}/> 生成報表</button>
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 border border-white shadow-sm space-y-8">
        <div className="flex items-center gap-3"><div className="w-1.5 h-6 bg-red-500 rounded-full" /><h4 className="text-xl font-black text-slate-800">抽獎池配置</h4></div>
        <div className="space-y-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">包含群組</p>
            <div className="flex flex-wrap gap-2">
              {Object.values(GuestCategory).map(cat => (<button key={cat} onClick={() => triggerAction(() => toggleCategory(cat))} className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${poolConfig.includedCategories.includes(cat) ? 'bg-red-500 text-white border-red-500' : 'bg-slate-50 text-slate-400'}`}>{cat}</button>))}
            </div>
            <button onClick={() => triggerAction(() => updateSettings({ lotteryPoolConfig: poolConfig }))} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl mt-4">更新抽獎範圍</button>
        </div>
      </div>
    </div>
  );
};

export default FlowPanel;
