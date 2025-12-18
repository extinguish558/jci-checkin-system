
import React, { useState, useRef } from 'react';
import { useEvent } from '../context/EventContext';
import { parseGiftsFromExcel } from '../services/geminiService';
import { Gift, Upload, CheckCircle2, Circle, Loader2, Trash2, User, ArrowRight, Lock, Unlock, X } from 'lucide-react';

const GiftsPanel: React.FC = () => {
  const { settings, toggleGiftPresented, setGiftItems, isAdmin, loginAdmin, logoutAdmin } = useEvent();
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
      // 如果是 Excel 格式，使用直接解析
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const items = await parseGiftsFromExcel(file);
        await setGiftItems(items);
        alert(`成功匯入 ${items.length} 筆禮品資料`);
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

  const giftItems = settings.giftItems || [];

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6 pb-32 animate-in fade-in duration-500">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept=".xls,.xlsx" />

      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h2 className="text-2xl font-black text-black tracking-tight">禮品頒贈</h2>
          <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wider">GIFT PRESENTATION</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isProcessing}
              className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl shadow-sm border border-gray-50 hover:shadow-md transition-all active:scale-95 text-orange-600 font-black text-sm"
            >
              {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              <span className="hidden md:inline">匯入清單</span>
            </button>
          )}
          <button onClick={() => isAdmin ? logoutAdmin() : setShowLoginModal(true)} className="p-3 bg-white rounded-2xl shadow-sm transition-all hover:bg-gray-50">
            {isAdmin ? <Unlock size={20} className="text-[#007AFF]"/> : <Lock size={20} className="text-gray-300"/>}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="space-y-4">
        {giftItems.length > 0 ? (
          giftItems.map((item) => (
            <div 
              key={item.id} 
              onClick={() => toggleGiftPresented(item.id)}
              className={`p-6 rounded-[2rem] border transition-all cursor-pointer relative overflow-hidden group
                ${item.isPresented 
                  ? 'bg-gray-100/50 border-transparent opacity-60 grayscale' 
                  : 'bg-white border-white shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-xl active:scale-[0.99]'}
              `}
            >
              <div className="flex items-start gap-5">
                <div className={`mt-1 shrink-0 ${item.isPresented ? 'text-green-600' : 'text-orange-500'}`}>
                  {item.isPresented ? <CheckCircle2 size={24} strokeWidth={3} /> : <Circle size={24} strokeWidth={3} />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-xl font-black leading-tight mb-3 ${item.isPresented ? 'text-gray-400 line-through' : 'text-black'}`}>
                    {item.name}
                  </h3>
                  
                  <div className="flex items-center flex-wrap gap-2 text-sm font-bold">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${item.isPresented ? 'bg-gray-200 text-gray-400' : 'bg-orange-50 text-orange-600'}`}>
                       <User size={14} /> {item.donor}
                    </div>
                    <ArrowRight className={item.isPresented ? 'text-gray-300' : 'text-gray-400'} size={14} />
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${item.isPresented ? 'bg-gray-200 text-gray-400' : 'bg-blue-50 text-blue-600'}`}>
                       <User size={14} /> {item.recipient}
                    </div>
                  </div>
                </div>
              </div>
              
              {item.isPresented && (
                 <div className="absolute top-4 right-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Presented
                 </div>
              )}
            </div>
          ))
        ) : (
          <div className="py-24 flex flex-col items-center justify-center bg-white/50 rounded-[3rem] border border-white border-dashed">
            <Gift size={48} className="text-gray-200 mb-4" />
            <p className="text-gray-400 font-bold italic">尚無禮品頒贈資料</p>
            {isAdmin && <p className="text-gray-300 text-xs mt-2 font-medium">請點擊上方按鈕匯入 Excel 格式清單</p>}
          </div>
        )}
      </div>

      {isAdmin && giftItems.length > 0 && (
        <div className="pt-8 flex justify-center">
           <button 
            onClick={() => confirm('確定要清空禮品清單嗎？') && setGiftItems([])}
            className="flex items-center gap-2 text-red-500/50 hover:text-red-500 text-xs font-black transition-colors"
           >
              <Trash2 size={14} /> 清空禮品清單
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
        <div className="fixed inset-0 ios-blur bg-white/60 z-[400] flex flex-col items-center justify-center gap-4">
           <Loader2 size={32} className="animate-spin text-orange-500" />
           <p className="text-black font-black">正在解析禮品清單...</p>
        </div>
      )}
    </div>
  );
};

export default GiftsPanel;
