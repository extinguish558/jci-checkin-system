
import React, { useState, useRef } from 'react';
import { useEvent } from '../context/EventContext';
import { parseGifts, FileInput } from '../services/geminiService';
import { Gift, Upload, CheckCircle2, Circle, Loader2, Trash2, User, ArrowRight } from 'lucide-react';

const GiftsPanel: React.FC = () => {
  const { settings, toggleGiftPresented, setGiftItems, isAdmin } = useEvent();
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
      const items = await parseGifts(fileInputs);
      await setGiftItems(items);
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
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,image/*" />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-black tracking-tight">禮品頒贈</h2>
          <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wider">GIFT PRESENTATION</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isProcessing}
            className="flex items-center gap-2 bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-50 hover:shadow-md transition-all active:scale-95 text-orange-600 font-black text-sm"
          >
            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            <span>匯入清單</span>
          </button>
        )}
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
            {isAdmin && <p className="text-gray-300 text-xs mt-2 font-medium">請點擊上方按鈕匯入禮品清單</p>}
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

      {isProcessing && (
        <div className="fixed inset-0 ios-blur bg-white/60 z-[400] flex flex-col items-center justify-center gap-4">
           <Loader2 size={32} className="animate-spin text-orange-500" />
           <p className="text-black font-black">AI 正在整理禮品頒贈清單...</p>
        </div>
      )}
    </div>
  );
};

export default GiftsPanel;
