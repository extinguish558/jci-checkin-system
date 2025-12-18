
import React, { useRef, useState, useEffect } from 'react';
import { useEvent } from '../context/EventContext';
import { FlowFile } from '../types';
import { FileSpreadsheet, FileText, Presentation, Trash2, Settings, Lock, Unlock, Plus, ListTodo, ShieldCheck, Download, Loader2, Info, Eye, Upload, X } from 'lucide-react';

const FlowPanel: React.FC = () => {
  const { settings, updateSettings, addFlowFile, removeFlowFile, isAdmin, loginAdmin, logoutAdmin } = useEvent();
  const [showLoginModal, setShowLoginModal] = useState(false); 
  const [loginPassword, setLoginPassword] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadType, setUploadType] = useState<'schedule' | 'gifts' | 'slides' | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  // 優化自動高度調整邏輯
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; // 先設回 auto 取得真實內容高度
      const newHeight = Math.max(120, textarea.scrollHeight);
      textarea.style.height = `${newHeight}px`; 
    }
  };

  useEffect(() => {
    // 確保組件渲染後或內容變更時重新計算高度
    const timer = setTimeout(adjustHeight, 100);
    return () => clearTimeout(timer);
  }, [settings.briefSchedule]);

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'schedule': return '活動流程表';
      case 'gifts': return '禮品抽籤清單';
      case 'slides': return '活動投影片';
      default: return '檔案';
    }
  };

  const triggerUpload = (type: 'schedule' | 'gifts' | 'slides') => {
    if (!isAdmin) {
      alert("請先點擊右上角鎖定圖標，進入管理模式後再進行上傳。");
      return;
    }
    setUploadType(type);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadType) return;

    // 檢查檔案大小是否超過限制 (Firestore 限制約 1MB，建議控制在 800KB 內)
    if (file.size > 800 * 1024) {
      alert("檔案大小超過 800KB 限制。請嘗試壓縮檔案或上傳較小的文檔，以確保雲端同步正常。");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const newFile: FlowFile = {
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            type: uploadType,
            mimeType: file.type,
            size: file.size,
            uploadTime: new Date().toISOString(),
            data: base64
          };
          await addFlowFile(newFile);
          alert(`${getTypeLabel(uploadType)} 上傳成功！`);
        } catch (err) {
          alert("儲存檔案失敗，請檢查網路連接。");
        }
      };
      reader.onerror = () => alert("讀取檔案失敗");
      reader.readAsDataURL(file);
    } catch (err) {
      alert("處理檔案時發生錯誤");
    } finally {
      setIsUploading(false);
      setUploadType(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePreview = (file: FlowFile) => {
    if (!file.data) {
      if (file.url) {
        window.open(file.url, '_blank');
      } else {
        alert("目前該檔案無可預覽之數據。");
      }
      return;
    }

    try {
      const byteCharacters = atob(file.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: file.mimeType });
      const blobUrl = window.URL.createObjectURL(blob);
      
      // 在新分頁開啟以進行預覽
      window.open(blobUrl, '_blank');
    } catch (err) {
      alert("預覽失敗，數據格式可能有誤。");
    }
  };

  const handleDownload = (file: FlowFile) => {
    if (!file.data) {
      if (file.url) {
        window.open(file.url, '_blank');
      } else {
        alert("目前該檔案無可下載之數據。");
      }
      return;
    }

    try {
      const byteCharacters = atob(file.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: file.mimeType });
      
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      
      // 清理資源
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (err) {
      alert("檔案下載失敗，數據格式可能有誤。");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500 pb-32 bg-[#F2F2F7] min-h-screen">
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {/* Header Section */}
      <div className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white space-y-8">
        <div className="flex justify-between items-center">
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
               <Settings className="text-blue-500" size={16} />
             </div>
             <span className="text-gray-400 font-black uppercase tracking-tight text-xs">活動配置中心</span>
           </div>
           <button onClick={() => isAdmin ? logoutAdmin() : setShowLoginModal(true)} className="p-3 bg-[#F2F2F7] rounded-2xl transition-all hover:bg-gray-100 shadow-sm">
             {isAdmin ? <Unlock size={20} className="text-[#007AFF]"/> : <Lock size={20} className="text-gray-300"/>}
           </button>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-1">EVENT THEME</label>
          <input 
            type="text" 
            value={settings.eventName} 
            onChange={(e) => updateSettings({ eventName: e.target.value })}
            placeholder="請輸入活動主題名稱..."
            className="w-full bg-transparent border-none text-2xl md:text-3xl font-black text-black focus:ring-0 p-0 placeholder:text-gray-200"
            disabled={!isAdmin}
          />
        </div>

        {/* 精簡流程編輯器 */}
        <div className="bg-[#F2F2F7] rounded-[1.5rem] p-6 space-y-4 shadow-inner relative overflow-hidden group">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <ListTodo size={16} className="text-blue-500" />
                    <h3 className="font-black text-[11px] text-gray-400 uppercase tracking-tight">精簡流程 (首頁重點摘要)</h3>
                </div>
                {!isAdmin && (
                  <div className="flex items-center gap-1 text-gray-300">
                    <Info size={12} />
                    <span className="text-[10px] font-bold">唯讀模式</span>
                  </div>
                )}
            </div>
            
            <div className="relative min-h-[120px] flex items-start justify-start">
              <textarea 
                  ref={textareaRef}
                  value={settings.briefSchedule || ''}
                  onChange={(e) => {
                    updateSettings({ briefSchedule: e.target.value });
                    adjustHeight();
                  }}
                  placeholder="點擊此處輸入活動流程摘要..."
                  className={`w-full bg-white rounded-2xl p-6 border-none text-xl md:text-2xl font-light text-black leading-snug placeholder:text-gray-200 transition-all resize-none overflow-hidden text-left shadow-sm focus:ring-2 focus:ring-blue-500/20 ${!isAdmin ? 'cursor-default' : 'cursor-text'}`}
                  disabled={!isAdmin}
                  style={{ minHeight: '120px' }}
              />
              {!isAdmin && !settings.briefSchedule && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-300 font-bold italic text-sm">
                  目前尚無摘要內容
                </div>
              )}
            </div>
        </div>
      </div>

      {/* 檔案資源區 */}
      <div className="space-y-4 pt-4">
        <h4 className="px-6 text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          檔案資源庫 <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
        </h4>
        
        <div className="grid grid-cols-1 gap-3">
          {(['schedule', 'gifts', 'slides'] as const).map((type) => {
            const file = (settings.flowFiles || []).find(f => f.type === type);
            return (
              <div 
                key={type} 
                className={`bg-white rounded-[1.8rem] p-5 shadow-sm border border-white flex items-center gap-4 transition-all group ${file ? 'active:scale-95 cursor-pointer hover:shadow-md' : isAdmin ? 'cursor-pointer hover:bg-blue-50/30' : 'opacity-80'}`}
                onClick={() => file ? handlePreview(file) : isAdmin ? triggerUpload(type) : null}
              >
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${type === 'schedule' ? 'bg-blue-50 text-blue-500' : type === 'gifts' ? 'bg-orange-50 text-orange-500' : 'bg-purple-50 text-purple-500'}`}>
                    {type === 'schedule' ? <FileText size={24} /> : type === 'gifts' ? <FileSpreadsheet size={24} /> : <Presentation size={24} />}
                 </div>
                 
                 <div className="flex-1 min-w-0">
                    <h3 className="font-black text-black text-base">{getTypeLabel(type)}</h3>
                    <div className="text-[11px] text-gray-400 font-bold truncate mt-0.5">
                      {file ? file.name : isAdmin ? '點擊此處上傳檔案...' : '管理員尚未上傳'}
                    </div>
                 </div>

                 <div className="flex items-center gap-1">
                    {file ? (
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(file);
                          }}
                          className="p-3 bg-gray-50 rounded-xl text-gray-400 shadow-sm transition-all hover:bg-blue-50 hover:text-blue-500"
                          title="預覽"
                        >
                           <Eye size={20} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(file);
                          }}
                          className="p-3 bg-blue-50 rounded-xl text-blue-500 shadow-sm transition-all hover:bg-blue-500 hover:text-white"
                          title="下載"
                        >
                           <Download size={20} />
                        </button>
                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerUpload(type);
                              }} 
                              className="p-3 bg-gray-50 rounded-xl text-gray-400 hover:text-blue-500 transition-all ml-1"
                              title="更新檔案 (覆蓋)"
                            >
                              <Upload size={20} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if(confirm(`確定要從伺服器刪除「${file.name}」嗎？`)) removeFlowFile(file.id);
                              }} 
                              className="p-3 text-gray-200 hover:text-red-500 transition-colors ml-1"
                              title="刪除"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : isAdmin ? (
                      <div className="p-3 bg-gray-50 rounded-xl text-gray-300 group-hover:bg-blue-100 group-hover:text-blue-500 transition-all">
                        {isUploading && uploadType === type ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                      </div>
                    ) : null}
                 </div>
              </div>
            );
          })}
        </div>
        
        <p className="px-8 text-[10px] text-gray-300 font-bold text-center leading-relaxed italic">
          提示：點擊卡片中心可直接預覽，點擊右側按鈕可進行下載或管理。
        </p>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[250] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-xs w-full shadow-2xl flex flex-col items-center gap-6 border border-white/20">
            <h3 className="text-xl font-black text-black text-center tracking-tight">管理員授權</h3>
            <form onSubmit={handleLoginSubmit} className="w-full space-y-4">
              <input 
                type="password" 
                placeholder="密碼" 
                value={loginPassword} 
                onChange={e => setLoginPassword(e.target.value)}
                className="w-full bg-[#F2F2F7] border-none rounded-2xl py-5 px-4 text-center text-3xl font-black focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                autoFocus
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-4 font-black text-gray-400 hover:text-gray-600">取消</button>
                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 active:scale-95 transition-all">確認</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Uploading Overlay */}
      {isUploading && (
        <div className="fixed inset-0 ios-blur bg-white/70 z-[400] flex flex-col items-center justify-center gap-5">
          <div className="relative w-24 h-24">
             <div className="absolute inset-0 border-8 border-blue-50 rounded-full"></div>
             <div className="absolute inset-0 border-8 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
             <div className="absolute inset-0 flex items-center justify-center text-blue-600">
                <Loader2 size={32} className="animate-spin" />
             </div>
          </div>
          <div className="text-center">
            <p className="font-black text-black text-xl">正在同步雲端資料...</p>
            <p className="text-gray-400 font-bold text-xs mt-1">請勿關閉視窗，檔案上傳中</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowPanel;
