
import React, { useRef, useState, useMemo } from 'react';
import { useEvent } from '../context/EventContext';
import { FlowFile } from '../types';
import * as XLSX from 'xlsx';
import { ScrollText, FileSpreadsheet, FileText, Presentation, Trash2, Clock, Calendar, Download, Plus, Settings, Lock, Unlock, X, Loader2, UploadCloud, Database, AlertTriangle, Link as LinkIcon, ExternalLink, Info, Eye, Maximize2, ShieldCheck, Key, ListTodo } from 'lucide-react';

const FlowPanel: React.FC = () => {
  const { settings, updateSettings, addFlowFile, removeFlowFile, isAdmin, loginAdmin, logoutAdmin } = useEvent();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentTypeRef = useRef<'schedule' | 'gifts' | 'slides'>('schedule');
  
  // 權限相關狀態
  const [showLoginModal, setShowLoginModal] = useState(false); 
  const [showUploadAuthModal, setShowUploadAuthModal] = useState(false); 
  const [hasUploadPermission, setHasUploadPermission] = useState(false); 
  const [loginPassword, setLoginPassword] = useState("");
  const [workPassword, setWorkPassword] = useState("");
  const [pendingAction, setPendingAction] = useState<'file' | 'link' | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkInput, setLinkInput] = useState({ name: '', url: '' });

  const UPLOAD_WORK_PASSWORD = "0000";

  const MAX_STORAGE_BYTES = 1048576; 
  
  const storageStats = useMemo(() => {
    const files = settings.flowFiles || [];
    const totalBase64Length = files.reduce((acc, f) => acc + (f.data?.length || 0), 0);
    const otherSettingsSize = JSON.stringify({ ...settings, flowFiles: [] }).length;
    const totalUsed = totalBase64Length + otherSettingsSize;
    const usagePercent = Math.min(Math.round((totalUsed / MAX_STORAGE_BYTES) * 100), 100);
    
    return {
        totalUsed,
        usagePercent,
        isNearLimit: usagePercent > 80,
        isFull: usagePercent >= 98
    };
  }, [settings]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginAdmin(loginPassword)) {
        setShowLoginModal(false);
        setLoginPassword("");
        setHasUploadPermission(true);
    } else {
        alert("管理員密碼錯誤 (預設 8888)");
    }
  };

  const handleWorkAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (workPassword === UPLOAD_WORK_PASSWORD) {
        setHasUploadPermission(true);
        setShowUploadAuthModal(false);
        setWorkPassword("");
        
        setTimeout(() => {
            if (pendingAction === 'file') {
                fileInputRef.current?.click();
            } else if (pendingAction === 'link') {
                setShowLinkModal(true);
            }
            setPendingAction(null);
        }, 100);
    } else if (workPassword === "8888") {
        if (loginAdmin("8888")) {
            setHasUploadPermission(true);
            setShowUploadAuthModal(false);
            setWorkPassword("");
        }
    } else {
        alert("工作密碼錯誤 (預設 0000)");
    }
  };

  const triggerUpload = (type: 'schedule' | 'gifts' | 'slides') => {
    currentTypeRef.current = type;
    if (isAdmin || hasUploadPermission) {
        if (storageStats.isFull) return alert("雲端儲存空間已滿，請先刪除不必要的舊檔。");
        if (fileInputRef.current) fileInputRef.current.value = '';
        fileInputRef.current?.click();
    } else {
        setPendingAction('file');
        setShowUploadAuthModal(true);
    }
  };

  const openLinkModal = (type: 'schedule' | 'gifts' | 'slides') => {
    currentTypeRef.current = type;
    if (isAdmin || hasUploadPermission) {
        setLinkInput({ name: '', url: '' });
        setShowLinkModal(true);
    } else {
        setPendingAction('link');
        setShowUploadAuthModal(true);
    }
  };

  const handleAddLink = async () => {
    if (!linkInput.name || !linkInput.url) return alert("請輸入名稱與網址");
    setIsUploading(true);
    setUploadStatus("正在更新雲端連結...");
    try {
        const newLinkFile: FlowFile = {
            id: Math.random().toString(36).substr(2, 9),
            name: linkInput.name,
            type: currentTypeRef.current,
            mimeType: 'text/html',
            size: 0,
            uploadTime: new Date().toISOString(),
            url: linkInput.url
        };
        await addFlowFile(newLinkFile);
        setShowLinkModal(false);
    } catch (e: any) {
        alert("儲存連結失敗: " + e.message);
    } finally {
        setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const estimatedNewSize = file.size * 1.35;
    if (estimatedNewSize > MAX_STORAGE_BYTES * 0.9) {
        alert(`檔案過大 (${(file.size/1024).toFixed(1)} KB)！\n由於雲端文件有 1MB 的體積限制，建議改用「貼上連結」功能。`);
        return;
    }
    setIsUploading(true);
    setUploadStatus("準備上傳...");
    const reader = new FileReader();
    reader.onload = async () => {
        try {
            setUploadStatus("處理中...");
            const base64 = (reader.result as string).split(',')[1];
            const newFlowFile: FlowFile = {
              id: Math.random().toString(36).substr(2, 9),
              name: file.name,
              type: currentTypeRef.current,
              mimeType: file.type,
              size: file.size,
              uploadTime: new Date().toISOString(),
              data: base64
            };
            setUploadStatus("寫入雲端中...");
            await addFlowFile(newFlowFile);
            alert("檔案上傳成功！");
        } catch (err: any) {
            alert("上傳雲端失敗: " + err.message);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    reader.readAsDataURL(file);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '連結';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'schedule': return '流程表';
      case 'gifts': return '禮品清單';
      case 'slides': return '簡報';
      default: return '檔案';
    }
  };

  const handlePreview = (file: FlowFile) => {
    if (file.url) {
      window.open(file.url, '_blank');
      return;
    }
    alert("預覽功能受刻，請點擊下載查看內容。");
  };

  return (
    <div className="p-2 md:p-8 lg:p-12 max-w-[1440px] mx-auto space-y-3 md:space-y-8 pb-24 relative">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

      {isUploading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[200] flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 flex flex-col items-center gap-6 max-w-xs w-full text-center">
                <Loader2 size={64} className="text-indigo-600 animate-spin" />
                <h3 className="text-xl font-black text-slate-800">{uploadStatus}</h3>
            </div>
        </div>
      )}

      {/* 活動基本設定 & 精簡流程看板 */}
      <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-10 shadow-sm border border-slate-100 flex flex-col gap-4 md:gap-8">
        <div className="flex justify-between items-center">
            <h2 className="text-[10px] md:text-sm font-bold text-slate-400 flex items-center gap-1.5 tracking-widest uppercase">
              <Settings size={12} className="md:w-4 md:h-4" /> 基本設定
            </h2>
            <div className="flex gap-1.5">
                {(isAdmin || hasUploadPermission) && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] md:text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 animate-pulse">
                        <ShieldCheck size={10} /> 具備權限
                    </div>
                )}
                <button onClick={() => isAdmin ? logoutAdmin() : setShowLoginModal(true)} className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] md:text-xs font-bold border bg-slate-100 text-slate-500">
                    {isAdmin ? <Unlock size={12} /> : <Lock size={12} />} {isAdmin ? '管理員' : '鎖定'}
                </button>
            </div>
        </div>
        
        <input 
            className="w-full text-lg md:text-4xl font-black p-2 md:p-4 rounded-xl md:rounded-2xl border-2 border-slate-50 bg-slate-50 focus:border-indigo-500 outline-none transition-all"
            value={settings.eventName} 
            onChange={e => updateSettings({ eventName: e.target.value })}
            placeholder="請輸入活動名稱"
            disabled={!isAdmin}
        />

        {/* 精簡流程文字看板 */}
        <div className="bg-indigo-50/30 border-2 border-indigo-100/50 rounded-2xl p-4 md:p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-700 font-black text-xs md:text-sm">
              <ListTodo size={16} /> 精簡流程概覽
            </div>
            {isAdmin && <span className="text-[10px] font-bold text-indigo-400">總幹事模式：直接點擊輸入內容</span>}
          </div>
          
          {isAdmin ? (
            <textarea 
              className="w-full bg-white/60 p-3 md:p-4 rounded-xl border-2 border-transparent focus:border-indigo-300 outline-none font-bold text-sm md:text-lg text-slate-700 placeholder:text-slate-300 min-h-[120px] md:min-h-[160px] resize-none transition-all shadow-inner"
              value={settings.briefSchedule || ''}
              onChange={e => updateSettings({ briefSchedule: e.target.value })}
              placeholder="請在此輸入今日精簡流程，例如：&#10;18:00 報到聯誼&#10;18:30 典禮開始&#10;19:00 主席致詞..."
            />
          ) : (
            <div className="bg-white/40 p-3 md:p-5 rounded-xl text-slate-700 font-bold text-sm md:text-lg leading-relaxed whitespace-pre-wrap min-h-[100px] shadow-sm">
              {settings.briefSchedule || <span className="text-slate-300 italic">尚未發布流程摘要</span>}
            </div>
          )}
          
          <div className="text-[9px] md:text-xs text-slate-400 flex items-center gap-1">
            <Info size={12} /> 提示：此內容會同步給所有進入系統的會友查看。
          </div>
        </div>
      </div>

      {/* 功能卡片 - 按鈕尺寸優化 */}
      <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-8">
        {[
            { id: 'schedule', label: '流程表', icon: ScrollText, color: 'blue' },
            { id: 'gifts', label: '禮品清單', icon: FileSpreadsheet, color: 'emerald' },
            { id: 'slides', label: '簡報檔案', icon: Presentation, color: 'orange' }
        ].map(item => (
            <div key={item.id} className="bg-white p-2.5 md:p-6 rounded-xl md:rounded-[2rem] border-2 border-slate-50 shadow-sm flex flex-col items-center text-center gap-2 md:gap-4 hover:shadow-lg transition-all group">
                <div className={`p-2 md:p-4 bg-${item.color}-50 text-${item.color}-600 rounded-lg md:rounded-2xl group-hover:scale-110 transition-transform`}>
                  <item.icon size={20} className="md:w-8 md:h-8" />
                </div>
                <div className="font-black text-[10px] md:text-xl text-slate-800 leading-tight">{item.label}</div>
                
                <div className="flex flex-col md:flex-row gap-1 w-full mt-auto">
                    <button onClick={() => triggerUpload(item.id as any)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1 md:py-1.5 rounded-md md:rounded-lg text-[8px] md:text-[11px] flex items-center justify-center gap-1 transition-colors flex-1">
                        <UploadCloud size={10} className="md:w-3.5 md:h-3.5" /> <span className="hidden xs:inline">上傳</span>
                    </button>
                    <button onClick={() => openLinkModal(item.id as any)} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold py-1 md:py-1.5 rounded-md md:rounded-lg text-[8px] md:text-[11px] flex items-center justify-center gap-1 transition-colors flex-1">
                        <LinkIcon size={10} className="md:w-3.5 md:h-3.5" /> <span className="hidden xs:inline">連結</span>
                    </button>
                </div>
            </div>
        ))}
      </div>

      {/* 檔案清單 */}
      <div className="bg-white rounded-2xl md:rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 md:p-8 border-b bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4">
            <h3 className="text-sm md:text-xl font-black text-slate-700 flex items-center gap-2"><FileText size={16} className="md:w-5 md:h-5" /> 檔案清單</h3>
            <div className="w-full md:w-80">
                <div className="flex justify-between items-center mb-1 text-[8px] md:text-xs font-black text-slate-400 uppercase tracking-widest">
                    <span>空間 ({storageStats.usagePercent}%)</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 md:h-2.5 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-700 ${storageStats.usagePercent > 80 ? 'bg-orange-500' : 'bg-indigo-500'}`} style={{ width: `${storageStats.usagePercent}%` }}></div>
                </div>
            </div>
        </div>

        <div className="divide-y divide-slate-100">
            {(settings.flowFiles || []).length === 0 ? (
                <div className="p-12 text-center text-slate-300 font-bold text-sm md:text-lg">尚無檔案</div>
            ) : (
                [...(settings.flowFiles || [])].reverse().map(file => (
                    <div key={file.id} className="p-3 md:p-8 flex items-center gap-3 md:gap-6 hover:bg-slate-50 transition-all">
                        <div className="p-1.5 md:p-3 bg-white rounded-lg border shadow-sm shrink-0">
                           {file.type === 'schedule' ? <ScrollText size={14} className="text-blue-500 md:w-6 md:h-6"/> : file.type === 'gifts' ? <FileSpreadsheet size={14} className="text-emerald-500 md:w-6 md:h-6"/> : <Presentation size={14} className="text-orange-500 md:w-6 md:h-6"/>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-black text-slate-800 text-xs md:text-xl truncate">{file.name}</div>
                            <div className="flex items-center gap-2 text-[8px] md:text-sm text-slate-400 font-bold">
                                <span className="bg-slate-100 px-1 py-0.5 rounded uppercase">{getTypeLabel(file.type)}</span>
                                <span className="hidden sm:inline">{formatSize(file.size)}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 md:gap-3">
                            <button onClick={() => handlePreview(file)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-1 group transition-all">
                                <Eye size={16} className="md:w-5 md:h-5" />
                                <span className="hidden md:inline font-black">預覽</span>
                            </button>
                            {isAdmin && (
                                <button onClick={() => removeFlowFile(file.id)} className="p-2 text-red-300 hover:text-red-500 rounded-lg">
                                    <Trash2 size={16} className="md:w-5 md:h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>

      {/* Link Modal... */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-10 max-w-md w-full shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-lg md:text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
                <LinkIcon className="text-indigo-600" size={20}/> 更新外部連結
            </h3>
            <div className="space-y-4">
              <input 
                placeholder="名稱" 
                className="w-full p-3 bg-slate-50 rounded-xl outline-none border-2 border-transparent focus:border-indigo-500 font-bold text-sm"
                value={linkInput.name}
                onChange={e => setLinkInput({ ...linkInput, name: e.target.value })}
              />
              <input 
                placeholder="網址 (https://...)" 
                className="w-full p-3 bg-slate-50 rounded-xl outline-none border-2 border-transparent focus:border-indigo-500 font-bold text-sm"
                value={linkInput.url}
                onChange={e => setLinkInput({ ...linkInput, url: e.target.value })}
              />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowLinkModal(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-black text-slate-500 text-sm">取消</button>
                <button onClick={handleAddLink} className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-black text-sm">儲存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUploadAuthModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[180] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl">
            <form onSubmit={handleWorkAuthSubmit} className="space-y-6 text-center">
              <h3 className="text-xl font-black text-slate-800">工作人員權限</h3>
              <p className="text-slate-400 text-sm font-bold">輸入密碼啟動上傳功能 (0000)</p>
              <input type="password" placeholder="密碼" className="w-full p-4 bg-slate-50 rounded-2xl text-center text-3xl font-mono outline-none border-2 border-indigo-500 shadow-inner" value={workPassword} onChange={e => setWorkPassword(e.target.value)} autoFocus />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowUploadAuthModal(false)} className="flex-1 bg-slate-100 text-slate-500 font-black py-4 rounded-2xl text-xl">取消</button>
                <button type="submit" className="flex-[2] bg-indigo-600 text-white font-black py-4 rounded-2xl text-xl">驗證</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[190] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl">
            <form onSubmit={handleAdminLogin} className="space-y-6 text-center">
              <h3 className="text-xl font-black text-slate-800">管理員登入</h3>
              <input type="password" placeholder="管理密碼" className="w-full p-4 bg-slate-100 rounded-2xl text-center text-3xl font-mono outline-none border-2 border-indigo-500 shadow-inner" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} autoFocus />
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowLoginModal(false); setLoginPassword(""); }} className="flex-1 bg-slate-100 text-slate-500 font-black py-4 rounded-2xl text-lg">取消</button>
                <button type="submit" className="flex-[2] bg-indigo-600 text-white font-black py-4 rounded-2xl text-lg shadow-lg">解鎖</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowPanel;
