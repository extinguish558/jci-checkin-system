
import React, { useState, useMemo, useEffect } from 'react';
import { useEvent } from '../context/EventContext';
import { CheckCircle2, Circle, Lock, Unlock, Presentation, FileText, ListTodo, Activity } from 'lucide-react';

const McFlowPanel: React.FC = () => {
  const { settings, toggleMcFlowStep, isAdmin, unlockedSections, loginAdmin, logoutAdmin } = useEvent();
  const isUnlocked = isAdmin || unlockedSections.mc;
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [isSticky, setIsSticky] = useState(false);

  // 監聽主區塊捲動狀態
  useEffect(() => {
    const handleScroll = (e: any) => {
      setIsSticky(e.target.scrollTop > 80);
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

  const steps = settings.mcFlowSteps || [];

  const stats = useMemo(() => {
    const total = steps.length;
    const completed = steps.filter(s => s.isCompleted).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [steps]);

  // 自動定位到當前進度：搜尋第一個未完成的步驟並捲動至視窗中
  useEffect(() => {
    const firstUncompleted = steps.find(s => !s.isCompleted);
    if (firstUncompleted) {
      setTimeout(() => {
        const el = document.getElementById(`step-${firstUncompleted.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, []); // 僅在元件掛載時執行一次

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4 md:space-y-6 pb-32 relative">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl md:text-3xl font-black text-black">司儀流程管理</h2>
          <p className="text-[9px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5 md:mt-1">PROGRAM FLOW</p>
        </div>
        <button onClick={() => isUnlocked ? logoutAdmin() : setShowLoginModal(true)} className="p-2 md:p-3 bg-white rounded-xl md:rounded-2xl shadow-sm">
          {isUnlocked ? <Unlock size={18} className="text-[#007AFF]"/> : <Lock size={18} className="text-gray-300"/>}
        </button>
      </div>

      {/* 智慧縮放流程進度儀表板 - 手機版縮小 Padding */}
      <div className={`sticky top-0 z-30 -mx-4 md:-mx-8 px-4 md:px-8 py-2 transition-all duration-300 ${isSticky ? 'ios-blur bg-white/70 shadow-md border-b border-white/20' : ''}`}>
        <div className={`bg-transparent transition-all duration-500 overflow-hidden ${isSticky ? 'p-3 md:p-4 rounded-xl md:rounded-2xl scale-[0.98]' : 'p-4 md:p-8'}`}>
          <div className={`flex justify-between items-end transition-all ${isSticky ? 'mb-1 md:mb-2' : 'mb-3 md:mb-6'}`}>
            <div className="space-y-0.5 md:space-y-1">
              <div className="flex items-center gap-1.5 text-blue-500">
                <Activity size={isSticky ? 12 : 16} />
                <span className={`font-black uppercase tracking-widest ${isSticky ? 'text-[7px]' : 'text-[9px] md:text-[10px]'}`}>當前活動執行進度</span>
              </div>
              <div className="flex items-baseline gap-1 md:gap-2">
                <span className={`font-black text-slate-900 transition-all ${isSticky ? 'text-xl' : 'text-3xl md:text-5xl'}`}>{stats.completed}</span>
                <span className={`font-bold text-slate-300 transition-all ${isSticky ? 'text-[9px]' : 'text-xs md:text-xl'}`}>/ {stats.total}</span>
              </div>
            </div>
            <div className="text-right">
              <div className={`font-black text-slate-400 uppercase transition-all ${isSticky ? 'text-[7px]' : 'text-[9px] md:text-[10px] mb-0.5 md:mb-1'}`}>完成率</div>
              <div className={`font-black text-blue-600 transition-all ${isSticky ? 'text-base' : 'text-xl md:text-2xl'}`}>{stats.percent}%</div>
            </div>
          </div>
          
          <div className={`w-full bg-black/5 rounded-full overflow-hidden border border-black/5 shadow-inner transition-all ${isSticky ? 'h-1' : 'h-2 md:h-3'}`}>
            <div 
              className="h-full bg-blue-500 transition-all duration-1000 shadow-[0_0_8px_rgba(59,130,246,0.4)]" 
              style={{ width: `${stats.percent}%` }} 
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 md:space-y-6">
        {steps.map((step) => (
          <div 
            key={step.id} 
            id={`step-${step.id}`}
            onClick={() => triggerAction(() => toggleMcFlowStep(step.id))} 
            className={`rounded-[1.5rem] md:rounded-[2.5rem] border transition-all cursor-pointer overflow-hidden ${step.isCompleted ? 'bg-gray-100 opacity-60' : 'bg-white shadow-sm border-white'}`}
          >
             <div className="p-4 md:p-6 flex items-center gap-4 md:gap-6 border-b border-gray-50">
               <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-lg md:text-2xl ${step.isCompleted ? 'bg-gray-200 text-gray-400' : 'bg-blue-50 text-blue-600'}`}>{step.sequence || '-'}</div>
               <div className="flex-1">
                  <div className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">時間</div>
                  <div className="text-base md:text-xl font-black">{step.time || '--:--'}</div>
               </div>
               {step.isCompleted ? <CheckCircle2 size={24} className="text-green-600" /> : <Circle size={24} className="text-gray-200" />}
             </div>
             <div className="p-4 md:p-6 space-y-3 md:space-y-4">
               <div>
                  <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1"><Presentation size={12} className="text-purple-400"/><span className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase">簡報</span></div>
                  <h3 className="text-base md:text-xl font-black">{step.slides || step.title}</h3>
               </div>
               {step.script && (
                 <div>
                    <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1"><FileText size={12} className="text-blue-500"/><span className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase">腳本</span></div>
                    <p className="text-xs md:text-sm font-bold text-gray-600 whitespace-pre-wrap">{step.script}</p>
                 </div>
               )}
             </div>
          </div>
        ))}
        {steps.length === 0 && <div className="py-24 text-center text-gray-300 font-bold italic">尚無司儀流程資料</div>}
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[250] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2rem] p-6 w-full max-w-xs shadow-2xl flex flex-col items-center gap-4 border border-white/20">
            <h3 className="text-lg font-black text-black text-center">功能授權</h3>
            <form onSubmit={handleLoginSubmit} className="w-full space-y-4 text-center">
              <p className="text-[10px] font-bold text-[#007AFF]">密碼提示：2222</p>
              <input type="password" placeholder="••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-[#F2F2F7] border-none rounded-2xl py-4 px-4 text-center text-3xl font-black outline-none" autoFocus />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-3 font-black text-gray-400 text-[10px]">取消</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-black rounded-xl text-[10px]">確認</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default McFlowPanel;
