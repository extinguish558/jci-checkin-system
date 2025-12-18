
import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useEvent } from '../context/EventContext';
import { exportToExcel, parseCheckInSheet } from '../services/geminiService';
import { ParseMode, FileInput } from '../services/geminiService';
import { Guest, GuestCategory } from '../types';
import { Search, Clock, Shield, Globe, Handshake, LayoutGrid, FileText, Download, Lock, Unlock, UserPlus, Camera, Loader2, X, RefreshCw, Upload } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const { 
      settings, updateSettings, addGuestsFromDraft, overwriteGuestsFromDraft, guests, 
      toggleCheckInRound, isAdmin, loginAdmin, logoutAdmin
  } = useEvent();

  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [activeTab, setActiveTab] = useState<string>('YB');
  const [parseMode, setParseMode] = useState<ParseMode>('ROSTER');
  const [isOverwriteMode, setIsOverwriteMode] = useState(false);

  // 手動新增 Modal 狀態
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualGuest, setManualGuest] = useState({ name: '', title: '', category: GuestCategory.MEMBER_YB });

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

  const triggerFileUpload = (mode: ParseMode, overwrite: boolean = false) => {
      if (!isAdmin) {
          alert("請先登入管理員權限");
          return;
      }
      setParseMode(mode);
      setIsOverwriteMode(overwrite);
      fileInputRef.current?.click();
  }

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
          const drafts = await parseCheckInSheet(fileInputs, parseMode);
          
          if (isOverwriteMode) {
              await overwriteGuestsFromDraft(drafts, new Date());
          } else {
              await addGuestsFromDraft(drafts, new Date());
          }
          
          alert(`成功處理 ${drafts.length} 筆資料`);
      } catch (err: any) {
          alert(err.message);
      } finally {
          setIsProcessing(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleManualAddSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!manualGuest.name.trim()) return;
      setIsProcessing(true);
      try {
          await addGuestsFromDraft([{
              name: manualGuest.name,
              title: manualGuest.title,
              category: manualGuest.category,
              hasSignature: false
          }], new Date());
          setShowManualAdd(false);
          setManualGuest({ name: '', title: '', category: GuestCategory.MEMBER_YB });
      } finally {
          setIsProcessing(false);
      }
  };

  const getTargetGroup = useCallback((g: Guest): string => {
      const title = g.title || '';
      const category = (g.category || '').toString();
      if (category.includes('YB') || category.includes('會友')) return 'YB';
      if (category.includes('OB') || category.includes('特友')) return 'OB';
      if (category.includes('總會') || title.includes('總會')) return 'HQ';
      if (category.includes('友會') || title.includes('會')) return 'VISITING';
      return 'VIP';
  }, []);

  const groupedData = useMemo(() => {
      const search = searchTerm.trim().toLowerCase();
      const filtered = guests.filter(g => 
          g.name.toLowerCase().includes(search) || 
          g.title.toLowerCase().includes(search) || 
          (g.code && g.code.toLowerCase().includes(search))
      );

      const groupConfig = [
        { key: 'YB', title: '會友 YB', color: 'text-blue-500', icon: LayoutGrid },
        { key: 'OB', title: '特友 OB', color: 'text-orange-500', icon: Clock },
        { key: 'HQ', title: '總會貴賓', color: 'text-indigo-500', icon: Globe },
        { key: 'VISITING', title: '友會貴賓', color: 'text-green-500', icon: Handshake },
        { key: 'VIP', title: '貴賓 VIP', color: 'text-purple-500', icon: Shield },
      ];

      return groupConfig.map(config => {
          const list = filtered.filter(g => getTargetGroup(g) === config.key);
          return {
              ...config,
              list: list.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true })),
              checkedCount: list.filter(g => g.isCheckedIn).length,
              totalCount: list.length
          };
      });
  }, [guests, searchTerm, getTargetGroup]);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 pb-32">
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />

      {/* Header */}
      <div className="flex justify-between items-start md:items-center">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl md:text-3xl font-black text-black tracking-tight truncate">報到管理</h2>
            <p className="text-[10px] md:text-xs font-bold text-gray-400 mt-1 truncate">{settings.eventName}</p>
          </div>
          <button onClick={() => isAdmin ? logoutAdmin() : setShowLoginModal(true)} className="p-3 bg-white rounded-2xl shadow-sm ml-4 transition-all hover:bg-gray-50">
            {isAdmin ? <Unlock size={20} className="text-[#007AFF]"/> : <Lock size={20} className="text-gray-300"/>}
          </button>
      </div>

      {/* 管理工具箱 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. 增量匯入 */}
          <button 
            disabled={!isAdmin}
            onClick={() => triggerFileUpload('ROSTER', false)} 
            className={`p-4 rounded-2xl shadow-sm flex flex-col items-center gap-2 transition-all group ${isAdmin ? 'bg-white hover:shadow-md active:scale-95 cursor-pointer' : 'bg-gray-100 opacity-60 cursor-not-allowed'}`}
          >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isAdmin ? 'bg-blue-50 text-blue-500 group-hover:bg-blue-100' : 'bg-gray-200 text-gray-400'}`}><FileText size={20} /></div>
              <span className={`font-black text-[10px] ${isAdmin ? 'text-gray-600' : 'text-gray-400'}`}>增量匯入</span>
          </button>

          {/* 2. 覆蓋匯入 (新增功能) */}
          <button 
            disabled={!isAdmin}
            onClick={() => triggerFileUpload('ROSTER', true)} 
            className={`p-4 rounded-2xl shadow-sm flex flex-col items-center gap-2 transition-all group ${isAdmin ? 'bg-white hover:shadow-md active:scale-95 cursor-pointer border-2 border-red-50' : 'bg-gray-100 opacity-60 cursor-not-allowed'}`}
          >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isAdmin ? 'bg-red-50 text-red-500 group-hover:bg-red-100' : 'bg-gray-200 text-gray-400'}`}><RefreshCw size={20} /></div>
              <span className={`font-black text-[10px] ${isAdmin ? 'text-gray-600' : 'text-gray-400'}`}>覆蓋匯入</span>
          </button>

          {/* 3. 匯出報表 */}
          <button 
            disabled={!isAdmin}
            onClick={() => exportToExcel(guests, settings.eventName)} 
            className={`p-4 rounded-2xl shadow-sm flex flex-col items-center gap-2 transition-all group ${isAdmin ? 'bg-white hover:shadow-md active:scale-95 cursor-pointer' : 'bg-gray-100 opacity-60 cursor-not-allowed'}`}
          >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isAdmin ? 'bg-green-50 text-green-500 group-hover:bg-green-100' : 'bg-gray-200 text-gray-400'}`}><Download size={20} /></div>
              <span className={`font-black text-[10px] ${isAdmin ? 'text-gray-600' : 'text-gray-400'}`}>匯出報表</span>
          </button>

          {/* 4. AI 簽到辨識 */}
          <button onClick={() => triggerFileUpload('CHECK_IN')} className="bg-white p-4 rounded-2xl shadow-sm flex flex-col items-center gap-2 transition-all hover:shadow-md active:scale-95 group">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500 group-hover:bg-purple-100"><Camera size={20} /></div>
              <span className="font-black text-[10px] text-gray-600">AI 簽到辨識</span>
          </button>

          {/* 5. 手動新增 */}
          <button onClick={() => setShowManualAdd(true)} className="bg-white p-4 rounded-2xl shadow-sm flex flex-col items-center gap-2 transition-all hover:shadow-md active:scale-95 group">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 group-hover:bg-indigo-100"><UserPlus size={20} /></div>
              <span className="font-black text-[10px] text-gray-600">手動新增</span>
          </button>

          {/* 6. 全局清空 */}
          <button 
            disabled={!isAdmin}
            onClick={() => confirm('確定要清空「所有」報到名單嗎？此動作不可撤銷。') && updateSettings({ giftItems: [] })} // 這裡應該呼叫清空名單的 logic，目前先留空或呼叫 clearAllData
            className={`p-4 rounded-2xl shadow-sm flex flex-col items-center gap-2 transition-all group ${isAdmin ? 'bg-white hover:shadow-md active:scale-95 cursor-pointer' : 'bg-gray-100 opacity-60 cursor-not-allowed'}`}
          >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isAdmin ? 'bg-gray-50 text-gray-400 group-hover:bg-gray-100' : 'bg-gray-200 text-gray-400'}`}><X size={20} /></div>
              <span className={`font-black text-[10px] ${isAdmin ? 'text-gray-600' : 'text-gray-400'}`}>清空所有</span>
          </button>
      </div>

      {/* Search */}
      <div className="relative">
          <input 
            type="text" 
            placeholder="搜尋姓名、職稱..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-2xl text-base font-medium shadow-sm focus:ring-2 focus:ring-[#007AFF] outline-none" 
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20}/>
      </div>

      {/* 分類與狀態切換 */}
      <div className="flex bg-gray-200/50 p-1 rounded-2xl overflow-x-auto no-scrollbar gap-1 touch-pan-x">
          {groupedData.map(group => (
              <button 
                key={group.key} 
                onClick={() => setActiveTab(group.key)} 
                className={`px-4 py-2.5 rounded-xl font-black text-[11px] whitespace-nowrap transition-all shrink-0 ${activeTab === group.key ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`}
              >
                {group.title} ({group.totalCount})
              </button>
          ))}
      </div>

      <div className="bg-white/80 backdrop-blur p-1.5 rounded-2xl shadow-sm flex gap-1">
          <button onClick={() => updateSettings({ currentCheckInRound: 1 })} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${settings.currentCheckInRound === 1 ? 'bg-[#007AFF] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>R1 梯次</button>
          <button onClick={() => updateSettings({ currentCheckInRound: 2 })} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${settings.currentCheckInRound === 2 ? 'bg-[#5856D6] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>R2 梯次</button>
      </div>

      {/* List Area */}
      <div className="space-y-4">
          {groupedData.filter(g => g.key === activeTab).map(group => (
              <div key={group.key} className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                    <h3 className={`font-black text-xs md:text-sm flex items-center gap-2 ${group.color}`}>{group.title}</h3>
                    <span className="text-[10px] font-black text-gray-400 tracking-tighter">{group.checkedCount} 已到 / {group.totalCount} 總額</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                      {group.list.length === 0 ? (
                        <div className="py-16 text-center text-gray-300 text-sm font-bold italic">查無符合條件之人員</div>
                      ) : (
                        group.list.map((g, idx) => (
                          <div key={g.id} className="px-5 py-5 flex items-center gap-3 md:gap-4 hover:bg-gray-50/50 transition-colors">
                            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-mono text-xs font-black shrink-0 ${g.isCheckedIn ? 'bg-blue-50 border-blue-100 text-[#007AFF]' : 'bg-gray-50 border-gray-100 text-gray-300'}`}>
                              {g.isCheckedIn ? group.list.filter(x => x.isCheckedIn).indexOf(g) + 1 : (g.code || idx + 1)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-black text-black text-lg leading-tight truncate">{g.name}</div>
                              <div className="text-[10px] md:text-[11px] text-gray-400 font-bold truncate mt-0.5">{g.title || '貴賓'}</div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button 
                                onClick={() => toggleCheckInRound(g.id, 1)}
                                className={`w-10 h-10 md:w-12 md:h-12 rounded-xl border flex items-center justify-center transition-all ${g.attendedRounds?.includes(1) ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-lg shadow-blue-200' : 'bg-white border-gray-100 text-gray-300'}`}
                              >
                                <span className="text-[10px] font-black">R1</span>
                              </button>
                              <button 
                                onClick={() => toggleCheckInRound(g.id, 2)}
                                className={`w-10 h-10 md:w-12 md:h-12 rounded-xl border flex items-center justify-center transition-all ${g.attendedRounds?.includes(2) ? 'bg-[#5856D6] border-[#5856D6] text-white shadow-lg shadow-purple-200' : 'bg-white border-gray-100 text-gray-300'}`}
                              >
                                <span className="text-[10px] font-black">R2</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                  </div>
              </div>
          ))}
      </div>

      {/* Manual Add Modal */}
      {showManualAdd && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[300] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-8 max-sm w-full shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-black">手動新增名單</h3>
              <button onClick={() => setShowManualAdd(false)} className="p-2 bg-gray-100 rounded-full text-gray-400"><X size={20}/></button>
            </div>
            <form onSubmit={handleManualAddSubmit} className="space-y-4">
               <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">姓名</label>
                  <input required value={manualGuest.name} onChange={e => setManualGuest({...manualGuest, name: e.target.value})} type="text" className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 font-bold outline-none focus:ring-2 focus:ring-[#007AFF]" />
               </div>
               <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">職稱</label>
                  <input value={manualGuest.title} onChange={e => setManualGuest({...manualGuest, title: e.target.value})} type="text" className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 font-bold outline-none focus:ring-2 focus:ring-[#007AFF]" />
               </div>
               <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">類別</label>
                  <select value={manualGuest.category} onChange={e => setManualGuest({...manualGuest, category: e.target.value as GuestCategory})} className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 font-black outline-none focus:ring-2 focus:ring-[#007AFF]">
                    {Object.values(GuestCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
               </div>
               <button disabled={isProcessing} type="submit" className="w-full bg-[#007AFF] text-white py-4 rounded-xl font-black shadow-lg shadow-blue-100 flex items-center justify-center gap-2">
                 {isProcessing ? <Loader2 className="animate-spin" size={20}/> : <UserPlus size={20}/>}
                 <span>確認新增</span>
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Processing State */}
      {isProcessing && !showManualAdd && (
        <div className="fixed inset-0 ios-blur bg-white/60 z-[400] flex flex-col items-center justify-center gap-4">
           <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-8 border-blue-50 rounded-full"></div>
              <div className="absolute inset-0 border-8 border-[#007AFF] border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-[#007AFF]"><Loader2 size={32} className="animate-pulse" /></div>
           </div>
           <div className="text-center">
             <h4 className="text-xl font-black text-black">AI 正在處理中</h4>
             <p className="text-gray-400 font-bold text-sm mt-1">這可能需要幾秒鐘的時間...</p>
           </div>
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
    </div>
  );
};

export default AdminPanel;
