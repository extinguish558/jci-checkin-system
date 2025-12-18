
import React, { useState, useRef } from 'react';
import { useEvent } from '../context/EventContext';
import { parseMcFlow, FileInput } from '../services/geminiService';
import { ListChecks, Upload, CheckCircle2, Circle, Loader2, Trash2 } from 'lucide-react';

const McFlowPanel: React.FC = () => {
  const { settings, toggleMcFlowStep, setMcFlowSteps, isAdmin } = useEvent();
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsProcessing(true);
    try {
      const fileInputs: FileInput[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        fileInputs.push({ data: base64, mimeType: file.type });
      }
      const steps = await parseMcFlow(fileInputs);
      await setMcFlowSteps(steps);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const steps = settings.mcFlowSteps || [];

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6 pb-32 animate-in fade-in duration-500">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,image/*" />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-black tracking-tight">司儀流程</h2>
          <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wider">MC PROGRAM FLOW</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isProcessing}
            className="flex items-center gap-2 bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-50 hover:shadow-md transition-all active:scale-95 text-blue-600 font-black text-sm"
          >
            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            <span>匯入流程</span>
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="space-y-4">
        {steps.length > 0 ? (
          steps.map((step) => (
            <div 
              key={step.id} 
              onClick={() => toggleMcFlowStep(step.id)}
              className={`p-6 rounded-[2rem] border transition-all cursor-pointer relative overflow-hidden group
                ${step.isCompleted 
                  ? 'bg-gray-100/50 border-transparent opacity-60 grayscale' 
                  : 'bg-white border-white shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-xl active:scale-[0.99]'}
              `}
            >
              <div className="flex items-start gap-5">
                <div className={`mt-1 shrink-0 ${step.isCompleted ? 'text-green-600' : 'text-blue-500'}`}>
                  {step.isCompleted ? <CheckCircle2 size={24} strokeWidth={3} /> : <Circle size={24} strokeWidth={3} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                    {step.time && (
                      <span className={`text-[11px] font-black px-3 py-1 rounded-full w-fit ${step.isCompleted ? 'bg-gray-200 text-gray-500' : 'bg-blue-50 text-blue-600'}`}>
                        {step.time}
                      </span>
                    )}
                    <h3 className={`text-xl font-black leading-tight truncate ${step.isCompleted ? 'text-gray-400 line-through' : 'text-black'}`}>
                      {step.title}
                    </h3>
                  </div>
                  {step.description && (
                    <p className={`text-sm font-medium leading-relaxed mt-2 ${step.isCompleted ? 'text-gray-300' : 'text-gray-500'}`}>
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Completed Overlay Hint */}
              {step.isCompleted && (
                 <div className="absolute top-4 right-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Done
                 </div>
              )}
            </div>
          ))
        ) : (
          <div className="py-24 flex flex-col items-center justify-center bg-white/50 rounded-[3rem] border border-white border-dashed">
            <ListChecks size={48} className="text-gray-200 mb-4" />
            <p className="text-gray-400 font-bold italic">尚無流程資料</p>
            {isAdmin && <p className="text-gray-300 text-xs mt-2 font-medium">請點擊上方按鈕匯入活動文檔</p>}
          </div>
        )}
      </div>

      {isAdmin && steps.length > 0 && (
        <div className="pt-8 flex justify-center">
           <button 
            onClick={() => confirm('確定要清空所有流程嗎？') && setMcFlowSteps([])}
            className="flex items-center gap-2 text-red-500/50 hover:text-red-500 text-xs font-black transition-colors"
           >
              <Trash2 size={14} /> 清空所有流程
           </button>
        </div>
      )}

      {isProcessing && (
        <div className="fixed inset-0 ios-blur bg-white/60 z-[400] flex flex-col items-center justify-center gap-4">
           <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-8 border-blue-50 rounded-full"></div>
              <div className="absolute inset-0 border-8 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-blue-500"><Loader2 size={32} className="animate-spin" /></div>
           </div>
           <div className="text-center">
             <h4 className="text-xl font-black text-black">正在解析流程</h4>
             <p className="text-gray-400 font-bold text-sm mt-1">AI 正在幫您整理活動環節...</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default McFlowPanel;
