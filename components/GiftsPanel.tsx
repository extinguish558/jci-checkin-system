
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useEvent } from '../context/EventContext';
import { CheckCircle2, Circle, UserCheck, Lock, Unlock, Award, TrendingUp, ListChecks, ChevronRight, Clock, AlertTriangle, Move, FileUp, Trash2, Loader2 } from 'lucide-react';
import { parseGiftsFromExcel } from '../services/geminiService';

const GiftsPanel: React.FC = () => {
  const { 
    settings, updateSettings, toggleGiftPresented, clearGiftsOnly,
    isAdmin, unlockedSections
  } = useEvent();
  
  const isUnlocked = isAdmin || unlockedSections.gifts;
  const [isSticky, setIsSticky] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = (e: any) => setIsSticky(e.target.scrollTop > 20);
    const mainEl = document.querySelector('main');
    mainEl?.addEventListener('scroll', handleScroll);
    return () => mainEl?.removeEventListener('scroll', handleScroll);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadProgress("正在解析禮品清單...");
    try {
      const items = await parseGiftsFromExcel(file);
      await updateSettings({ giftItems: items });
      setUploadProgress("更新完成！");
      setTimeout(() => setUploadProgress(null), 2000);
    } catch (error: any) {
      alert("解析失敗");
      setUploadProgress(null);
    } finally {
      setIsUploading(false);
    }
  };

  const triggerAction = (action: () => void) => {
    if (!isUnlocked) return alert("請由右上角解鎖權限");
    action();
  };

  const giftItems = settings.giftItems || [];
  const mcSteps = settings.mcFlowSteps || [];

  const stats = useMemo(() => {
    const total = giftItems.length;
    const completed = giftItems.filter(i => i.isPresented).length;
    return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [giftItems]);

  const flowProgress = useMemo(() => {
    const current = mcSteps.find(s => !s.isCompleted) || { title: '活動流程結束', time: '' };
    return { current };
  }, [mcSteps]);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 pb-32 relative">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
      
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-orange-500 rounded-full" />
          <h2 className="text-xl md:text-3xl font-black text-black">禮品頒贈系統</h2>
        </div>
        
        {isUnlocked && (
          <div className="flex gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-white text-orange-600 rounded-2xl shadow-sm border border-white"><FileUp size={18} /></button>
            <button onClick={() => triggerAction(clearGiftsOnly)} className="p-3 bg-white text-red-500 rounded-2xl shadow-sm border border-white"><Trash2 size={18} /></button>
          </div>
        )}
      </div>

      <div className={`sticky top-0 z-40 transition-all duration-300 ${isSticky ? 'ios-blur bg-[#F2F2F7]/90 shadow-lg p-2' : ''}`}>
        <div className="bg-white rounded-[1.8rem] p-6 shadow-sm border border-white mb-3">
          <div className="flex items-center gap-2 text-[#007AFF] mb-2"><ListChecks size={16} strokeWidth={3} /><span className="text-[10px] font-black uppercase tracking-widest">司儀流程</span></div>
          <h3 className="font-black text-lg md:text-3xl leading-tight">{flowProgress.current.title}</h3>
        </div>

        <div className="bg-white rounded-[1.8rem] p-6 shadow-sm border border-white">
          <div className="flex justify-between items-end mb-2">
            <div className="flex items-baseline gap-3"><span className="text-3xl md:text-6xl font-black text-slate-900">{stats.completed}</span><span className="text-xs md:text-2xl font-bold text-slate-300">/ {stats.total}</span></div>
            <div className="text-xl md:text-4xl font-black text-orange-500">{stats.percent}%</div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${stats.percent}%` }} /></div>
        </div>
      </div>

      <div className="space-y-3 pt-6">
        {giftItems.map((item) => (
          <div key={item.id} onClick={() => triggerAction(() => toggleGiftPresented(item.id))} className={`p-6 md:p-8 rounded-[1.5rem] border transition-all cursor-pointer flex flex-col gap-3 ${item.isPresented ? 'bg-gray-100/60 opacity-60' : 'bg-white border-white shadow-sm hover:shadow-md'}`}>
            <div className="flex items-center gap-2">
               <div className={item.isPresented ? 'text-green-600' : 'text-orange-400'}>{item.isPresented ? <CheckCircle2 size={24} strokeWidth={3} /> : <Circle size={24} strokeWidth={2.5} />}</div>
               <span className="text-lg font-black text-slate-400"># {item.sequence}</span>
            </div>
            <div className="flex flex-col md:flex-row gap-3 justify-between md:items-center">
               <h3 className={`text-xl md:text-3xl font-black ${item.isPresented ? 'text-slate-400' : 'text-slate-900'}`}>{item.name}</h3>
               <div className={`px-4 py-2 rounded-xl flex items-center gap-2 bg-[#F2F2F7]`}><UserCheck size={16} className="text-blue-500" /><span className="text-lg font-black text-blue-600">{item.recipient}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GiftsPanel;
