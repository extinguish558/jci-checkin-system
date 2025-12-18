
import React, { useState, useRef } from 'react';
import { useEvent } from '../context/EventContext';
import { parseMcFlowFromExcel } from '../services/geminiService';
import { ListChecks, Upload, CheckCircle2, Circle, Loader2, Trash2, Lock, Unlock, Clock, Hash, Presentation, FileText } from 'lucide-react';

const McFlowPanel: React.FC = () => {
  const { settings, toggleMcFlowStep, setMcFlowSteps, isAdmin, loginAdmin, logoutAdmin } = useEvent();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginAdmin(loginPassword)) {
        setShowLoginModal(false);
        setLoginPassword("");
    } else {
        alert("密碼錯誤");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsProcessing(true);
    try {
      const file = files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const steps = await parseMcFlowFromExcel(file);
        await setMcFlowSteps(steps);
        alert(`成功匯入 ${steps.length} 筆流程環節`);
      } else {
        alert("目前僅支援 Excel (.xlsx, .xls) 格式匯入。");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const steps = settings.mcFlowSteps || [];

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6 pb-32 animate-in fade-in duration-500">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept=".xls,.xlsx" />

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          <h2 className="text-3xl font-black text-black tracking-tight flex items-center gap-3">
             司儀流程模式
          </h2>
          <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">MC PROFESSIONAL PROGRAM FLOW</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isProcessing}
              className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl shadow-sm border border-gray-50 hover:shadow-md transition-all active:scale-95 text-blue-600 font-black text-sm"
            >
              {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              <span className="hidden md:inline">上傳流程 Excel</span>
            </button>
          )}
          <button onClick={() => isAdmin ? logoutAdmin() : setShowLoginModal(true)} className="p-3 bg-white rounded-2xl shadow-sm transition-all hover:bg-gray-50 border border-gray-50">
            {isAdmin ? <Unlock size={20} className="text-[#007AFF]"/> : <Lock size={20} className="text-gray-300"/>}
          </button>
        </div>
      </div>

      {/* 流程主區塊 */}
      <div className="space-y-8">
        {steps.length > 0 ? (
          steps.map((step) => (
            <div 
              key={step.id} 
              onClick={() => toggleMcFlowStep(step.id)}
              className={`rounded-[3rem] border transition-all cursor-pointer relative overflow-hidden flex flex-col
                ${step.isCompleted 
                  ? 'bg-gray-100/60 border-transparent grayscale' 
                  : 'bg-white border-white shadow-[0_20px_50px_rgba(0,0,0,0.04)] hover:shadow-2xl active:scale-[0.995]'}
              `}
            >
              {/* Top Section: Seq & Time (並排佈局) */}
              <div className={`p-6 md:p-8 flex items-center gap-6 border-b border-gray-100/50 ${step.isCompleted ? 'bg-gray-200/20' : 'bg-slate-50/30'}`}>
                 {/* 序號方塊 (對應藍色圈選 1) */}
                 <div className={`w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-[1.5rem] flex items-center justify-center font-black text-3xl md:text-4xl shadow-inner border-2 ${step.isCompleted ? 'bg-gray-200 border-gray-300 text-gray-400' : 'bg-white border-blue-50 text-blue-600'}`}>
                   {step.sequence || '-'}
                 </div>

                 {/* 典禮時間 (對應藍色圈選 16:00~16:30) */}
                 <div className="flex-1">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">典禮時間</div>
                    <div className={`text-2xl md:text-4xl font-black tabular-nums tracking-tight ${step.isCompleted ? 'text-gray-400' : 'text-slate-900'}`}>
                      {step.time || '--:--'}
                    </div>
                 </div>

                 {/* 完成狀態勾選 */}
                 <div className={`shrink-0 ${step.isCompleted ? 'text-green-600' : 'text-blue-100'}`}>
                    {step.isCompleted ? <CheckCircle2 size={36} strokeWidth={3} /> : <Circle size={36} strokeWidth={3} />}
                 </div>
              </div>

              {/* Middle Section: Slides Content (對應藍色圈選 63.64th會長...) */}
              <div className="px-6 py-8 md:px-10 border-b border-gray-100/50">
                 <div className="flex items-center gap-2 mb-3">
                    <Presentation size={16} className={step.isCompleted ? 'text-gray-300' : 'text-purple-400'} />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">簡報頁面內容 / 項目項目</span>
                 </div>
                 <h3 className={`text-2xl md:text-3xl font-black leading-snug break-words ${step.isCompleted ? 'text-gray-400 line-through' : 'text-slate-900'}`}>
                    {step.slides || step.title}
                 </h3>
              </div>

              {/* Bottom Section: MC Script (司儀稿內容) */}
              <div className={`p-6 md:p-10 relative ${step.isCompleted ? 'bg-gray-50/50' : 'bg-blue-50/20'}`}>
                 <div className="flex items-center gap-2 mb-4">
                    <FileText size={16} className={step.isCompleted ? 'text-gray-300' : 'text-blue-500'} />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">司儀稿腳本內容</span>
                 </div>
                 <div className={`text-lg md:text-2xl font-bold leading-relaxed whitespace-pre-wrap ${step.isCompleted ? 'text-gray-400' : 'text-slate-700'}`}>
                    {step.script ? (
                      <div className="space-y-6">
                         {step.script.split('\n').map((line, i) => {
                           const isSpeakerA = /^A:/.test(line);
                           const isSpeakerB = /^B:/.test(line);
                           const isTime = /^[0-9][0-9]:[0-9][0-9]/.test(line);
                           
                           return (
                             <div 
                               key={i} 
                               className={`
                                 ${isSpeakerA ? 'text-blue-600 font-black bg-blue-50/50 px-3 py-1 rounded-xl' : ''}
                                 ${isSpeakerB ? 'text-rose-500 font-black bg-rose-50/50 px-3 py-1 rounded-xl' : ''}
                                 ${isTime ? 'text-slate-400 text-base md:text-lg mt-6' : ''}
                               `}
                             >
                               {line}
                             </div>
                           );
                         })}
                      </div>
                    ) : (
                      <span className="text-gray-300 italic text-sm">（此環節暫時沒有司儀稿資料）</span>
                    )}
                 </div>
                 {step.isCompleted && (
                   <div className="absolute bottom-6 right-10 text-[10px] font-black text-gray-300 uppercase italic tracking-widest bg-gray-100 px-3 py-1 rounded-lg">
                     COMPLETED
                   </div>
                 )}
              </div>
            </div>
          ))
        ) : (
          <div className="py-48 flex flex-col items-center justify-center bg-white/50 rounded-[4rem] border-4 border-white border-dashed">
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <ListChecks size={48} className="text-blue-200" />
            </div>
            <p className="text-gray-400 font-black text-2xl">尚未匯入專業司儀流程</p>
            <p className="text-gray-300 text-base mt-4 font-bold max-w-md text-center">
               請準備包含「序、時間、簡報頁面、司儀稿」的 Excel 檔案
            </p>
            {isAdmin && (
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="mt-10 px-10 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-blue-100 hover:scale-105 active:scale-95 transition-all"
               >
                 開始匯入 Excel
               </button>
            )}
          </div>
        )}
      </div>

      {isAdmin && steps.length > 0 && (
        <div className="pt-16 flex justify-center">
           <button 
            onClick={() => confirm('確定要清空所有流程嗎？') && setMcFlowSteps([])}
            className="flex items-center gap-2 text-red-500/40 hover:text-red-500 text-sm font-black transition-all hover:bg-red-50 px-8 py-4 rounded-[1.5rem]"
           >
              <Trash2 size={18} /> 刪除目前流程清單
           </button>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[250] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-8 max-xs w-full shadow-2xl flex flex-col items-center gap-6 border border-white/20">
            <h3 className="text-xl font-black text-black text-center tracking-tight">管理員授權</h3>
            <form onSubmit={handleLoginSubmit} className="w-full space-y-4">
              <input 
                type="password" 
                placeholder="密碼" 
                value={loginPassword} 
                onChange={e => setLoginPassword(e.target.value)}
                className="w-full bg-[#F2F2F7] border-none rounded-2xl py-5 px-4 text-center text-3xl font-black outline-none focus:ring-4 focus:ring-[#007AFF]/20 transition-all"
                autoFocus
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-4 font-black text-gray-400">取消</button>
                <button type="submit" className="flex-1 py-4 bg-[#007AFF] text-white font-black rounded-2xl shadow-xl shadow-blue-200 active:scale-95 transition-all">確認</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="fixed inset-0 ios-blur bg-white/60 z-[400] flex flex-col items-center justify-center gap-8">
           <div className="relative w-32 h-32">
              <div className="absolute inset-0 border-[12px] border-blue-50 rounded-full"></div>
              <div className="absolute inset-0 border-[12px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-blue-600"><Loader2 size={40} className="animate-spin" /></div>
           </div>
           <div className="text-center">
             <h4 className="text-2xl font-black text-black">正在解析流程結構</h4>
             <p className="text-gray-400 font-bold text-sm mt-2 tracking-wide">依照您的 Excel 標題自動匹配中...</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default McFlowPanel;
