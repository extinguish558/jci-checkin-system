
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useEvent } from '../context/EventContext';
import { 
  CheckCircle2, Circle, Lock, Unlock, Presentation, FileText, 
  ListTodo, Activity, FileUp, Trash2, Loader2, Info, Clock
} from 'lucide-react';
import { parseMcFlowFromExcel } from '../services/geminiService';

const McFlowPanel: React.FC = () => {
  const { 
    settings, updateSettings, toggleMcFlowStep, clearMcFlowOnly, 
    isAdmin, unlockedSections, loginAdmin, logoutAdmin 
  } = useEvent();
  
  const isUnlocked = isAdmin || unlockedSections.mc;
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [isSticky, setIsSticky] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleClearRequest = async () => {
    if (window.confirm("【全數清空警告】\n確定要刪除雲端上的所有司儀講稿嗎？\n這將重置所有看板（含流程、禮品看板）的進度紀錄，不可復原。")) {
        setUploadProgress("正在清空講稿資料...");
        try {
            await clearMcFlowOnly();
            alert("講稿已全數清空。");
        } catch (e: any) {
            alert("清空動作失敗。");
        } finally {
            setUploadProgress(null);
        }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(`偵測到新 Excel：${file.name}\n確定要上傳並【完全覆蓋】目前的講稿嗎？`)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setUploadProgress("正在解析 Excel 文件...");

    try {
      const steps = await parseMcFlowFromExcel(file);
      const metaFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: 'mcflow_file' as const,
        mimeType: file.type,
        size: file.size,
        uploadTime: new Date().toISOString(),
      };

      setUploadProgress("正在同步至雲端...");
      const filteredFiles = (settings.flowFiles || []).filter(f => f.type !== 'mcflow_file');
      
      await updateSettings({ 
        mcFlowSteps: steps, 
        flowFiles: [...filteredFiles, metaFile] 
      });

      setUploadProgress("講稿同步完成！");
      setTimeout(() => setUploadProgress(null), 2000);
    } catch (error: any) {
      alert("講稿解析或同步失敗: " + error.message);
      setUploadProgress(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const steps = settings.mcFlowSteps || [];

  const stats = useMemo(() => {
    const total = steps.length;
    const completed = steps.filter(s => s.isCompleted).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [steps]);

  // 自動定位功能
  useEffect(() => {
    if (steps.length > 0) {
      const firstUncompleted = steps.find(s => !s.isCompleted);
      const targetId = firstUncompleted ? firstUncompleted.id : steps[steps.length - 1].id;
      setTimeout(() => {
        const el = document.getElementById(`step-${targetId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }
  }, [steps.length]); 

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4 md:space-y-6 pb-32 relative">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls" />
      
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-blue-500 rounded-full" />
          <div>
            <h2 className="text-xl md:text-3xl font-black text-black">司儀講稿管理</h2>
            <p className="text-[9px] md:text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">MC SCRIPT PROGRAM</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {isUnlocked && (
            <>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || !!uploadProgress}
                className="p-2.5 md:p-3.5 bg-white text-blue-600 rounded-xl md:rounded-2xl shadow-sm border border-white hover:bg-blue-50 transition-all active:scale-90 flex items-center gap-2"
              >
                {isUploading ? <Loader2 size={18} className="animate-spin" /> : <FileUp size={18} />}
                <span className="hidden md:block text-xs font-black">更新講稿</span>
              </button>
              <button 
                onClick={handleClearRequest}
                disabled={isUploading || !!uploadProgress}
                className="p-2.5 md:p-3.5 bg-white text-red-500 rounded-xl md:rounded-2xl shadow-sm border border-white hover:bg-red-50 transition-all active:scale-90"
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
          <button onClick={() => isUnlocked ? logoutAdmin() : setShowLoginModal(true)} className="p-2.5 md:p-3.5 bg-white rounded-xl md:rounded-2xl shadow-sm border border-white">
            {isUnlocked ? <Unlock size={18} className="text-[#007AFF]"/> : <Lock size={18} className="text-gray-300"/>}
          </button>
        </div>
      </div>

      {uploadProgress && (
        <div className="bg-blue-600 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-lg">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-xs font-black tracking-widest uppercase">{uploadProgress}</span>
        </div>
      )}

      {/* 進度儀表板 */}
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
            onClick={() => isUnlocked && toggleMcFlowStep(step.id)} 
            className={`rounded-[1.5rem] md:rounded-[2.5rem] border transition-all cursor-pointer overflow-hidden ${step.isCompleted ? 'bg-gray-100 opacity-60' : 'bg-white shadow-sm border-white hover:border-blue-100 active:scale-[0.99]'}`}
          >
             {/* 上半部：A (序號), B (時間), C (狀態) */}
             <div className="p-4 md:p-6 flex items-center gap-4 md:gap-6 border-b border-gray-50 bg-slate-50/30">
               {/* A: 序號 */}
               <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-lg md:text-2xl transition-colors shrink-0 ${step.isCompleted ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white shadow-md'}`}>
                 {step.sequence || '-'}
               </div>
               
               {/* B: 時間計畫 */}
               <div className="flex-1">
                  <div className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <Clock size={10} /> 時間計畫
                  </div>
                  <div className="text-base md:text-xl font-black text-slate-800">{step.time || '--:--'}</div>
               </div>
               
               {/* C: 狀態 */}
               <div className="shrink-0">
                 {step.isCompleted ? <CheckCircle2 size={32} className="text-green-600" /> : <Circle size={32} className="text-gray-200" />}
               </div>
             </div>

             {/* 下半部：D (程序/標題), G (腳本) */}
             <div className="p-4 md:p-6 space-y-4 md:space-y-6">
               {/* D: 程序標題 */}
               <div className="px-1">
                  <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 text-gray-400">
                    <Presentation size={14} className="text-purple-400"/>
                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">簡報項目 / 程序名稱</span>
                  </div>
                  <h3 className={`text-base md:text-2xl font-black tracking-tight leading-tight ${step.isCompleted ? 'text-gray-400 line-through' : 'text-slate-900'}`}>
                    {step.title || '未命名項目'}
                  </h3>
                  {step.slides && <p className="text-[10px] md:text-xs text-blue-500 font-bold mt-1">簡報頁面：{step.slides}</p>}
               </div>

               {/* G: 司儀口播腳本 */}
               {step.script && (
                 <div className="bg-blue-50/50 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-blue-100/30 shadow-inner">
                    <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                      <FileText size={14} className="text-blue-500"/>
                      <span className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">司儀口播腳本</span>
                    </div>
                    <p className="text-xs md:text-lg font-bold text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {step.script}
                    </p>
                 </div>
               )}
             </div>
          </div>
        ))}
        {steps.length === 0 && (
          <div className="py-24 text-center bg-white/40 rounded-[2.5rem] border-2 border-dashed border-gray-200 flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-300">
               <ListTodo size={32} />
            </div>
            <div>
              <p className="text-gray-400 font-black text-lg">目前尚無司儀講稿資料</p>
              <p className="text-gray-300 font-bold text-xs mt-1">請點擊上方按鈕上傳流程 Excel 檔案</p>
            </div>
          </div>
        )}
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
