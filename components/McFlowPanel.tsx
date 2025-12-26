
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useEvent } from '../context/EventContext';
import { CheckCircle2, Circle, Lock, Unlock, Presentation, FileText, ListTodo, Activity, FileUp, Trash2, Loader2, Info, Clock } from 'lucide-react';
import { parseMcFlowFromExcel } from '../services/geminiService';

const McFlowPanel: React.FC = () => {
  const { settings, updateSettings, toggleMcFlowStep, clearMcFlowOnly, isAdmin, unlockedSections } = useEvent();
  const isUnlocked = isAdmin || unlockedSections.mc;
  const [isSticky, setIsSticky] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = (e: any) => setIsSticky(e.target.scrollTop > 80);
    const mainEl = document.querySelector('main');
    mainEl?.addEventListener('scroll', handleScroll);
    return () => mainEl?.removeEventListener('scroll', handleScroll);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const steps = await parseMcFlowFromExcel(file);
      await updateSettings({ mcFlowSteps: steps });
    } finally { setIsUploading(false); }
  };

  const triggerAction = (action: () => void) => {
    if (!isUnlocked) return alert("請由右上角解鎖權限");
    action();
  };

  const steps = settings.mcFlowSteps || [];
  const stats = useMemo(() => {
    const total = steps.length;
    const completed = steps.filter(s => s.isCompleted).length;
    return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [steps]);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 pb-32 relative">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
      
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-blue-500 rounded-full" />
          <h2 className="text-xl md:text-3xl font-black text-black">司儀講稿管理</h2>
        </div>
        
        {isUnlocked && (
          <div className="flex gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-white text-blue-600 rounded-2xl shadow-sm border border-white"><FileUp size={18} /></button>
            <button onClick={() => triggerAction(clearMcFlowOnly)} className="p-3 bg-white text-red-500 rounded-2xl shadow-sm border border-white"><Trash2 size={18} /></button>
          </div>
        )}
      </div>

      <div className={`sticky top-0 z-30 transition-all duration-300 ${isSticky ? 'ios-blur bg-white/70 shadow-md p-4 rounded-2xl' : ''}`}>
          <div className="flex justify-between items-end mb-3">
              <div className="flex items-baseline gap-2"><span className="text-3xl md:text-5xl font-black text-slate-900">{stats.completed}</span><span className="text-xs md:text-xl font-bold text-slate-300">/ {stats.total}</span></div>
              <div className="text-xl md:text-2xl font-black text-blue-600">{stats.percent}%</div>
          </div>
          <div className="w-full bg-black/5 h-3 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${stats.percent}%` }} /></div>
      </div>

      <div className="space-y-6">
        {steps.map((step) => (
          <div key={step.id} onClick={() => triggerAction(() => toggleMcFlowStep(step.id))} className={`rounded-[2.5rem] border transition-all cursor-pointer overflow-hidden ${step.isCompleted ? 'bg-gray-100 opacity-60' : 'bg-white shadow-sm border-white hover:border-blue-100'}`}>
             <div className="p-6 flex items-center gap-6 border-b border-gray-50 bg-slate-50/30">
               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl transition-colors shrink-0 ${step.isCompleted ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white shadow-md'}`}>{step.sequence || '-'}</div>
               <div className="flex-1"><span className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1"><Clock size={10} /> 時間計畫</span><div className="text-xl font-black text-slate-800">{step.time || '--:--'}</div></div>
               {step.isCompleted ? <CheckCircle2 size={32} className="text-green-600" /> : <Circle size={32} className="text-gray-200" />}
             </div>
             <div className="p-6 space-y-6">
               <div><span className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1 mb-1"><Presentation size={14} className="text-purple-400"/> 程序名稱</span><h3 className={`text-2xl font-black ${step.isCompleted ? 'text-gray-400 line-through' : 'text-slate-900'}`}>{step.title}</h3></div>
               {step.script && (
                 <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100/30 shadow-inner">
                    <span className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-1 mb-2"><FileText size={14}/> 司儀口播腳本</span>
                    <p className="text-lg font-bold text-gray-700 leading-relaxed whitespace-pre-wrap">{step.script}</p>
                 </div>
               )}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default McFlowPanel;
