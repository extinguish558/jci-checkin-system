
import React, { useState, useMemo, useEffect } from 'react';
import { useEvent } from '../context/EventContext';
import { CheckCircle2, Circle, UserCheck, Lock, Unlock, Award, TrendingUp } from 'lucide-react';

const GiftsPanel: React.FC = () => {
  const { settings, toggleGiftPresented, isAdmin, unlockedSections, loginAdmin, logoutAdmin } = useEvent();
  const isUnlocked = isAdmin || unlockedSections.gifts;
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

  const giftItems = settings.giftItems || [];

  const stats = useMemo(() => {
    const total = giftItems.length;
    const completed = giftItems.filter(i => i.isPresented).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [giftItems]);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 pb-32 relative">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-black text-black">禮品頒贈系統</h2>
          <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wider">GIFT PRESENTATION</p>
        </div>
        <button onClick={() => isUnlocked ? logoutAdmin() : setShowLoginModal(true)} className="p-3 bg-white rounded-2xl shadow-sm">
          {isUnlocked ? <Unlock size={20} className="text-[#007AFF]"/> : <Lock size={20} className="text-gray-300"/>}
        </button>
      </div>

      {/* 智慧縮放進度標示儀表板 - 背景改為透明 */}
      <div className={`sticky top-0 z-30 -mx-4 md:-mx-8 px-4 md:px-8 py-2 transition-all duration-300 ${isSticky ? 'ios-blur bg-white/70 shadow-lg border-b border-white/20' : ''}`}>
        <div className={`bg-transparent rounded-[2.5rem] transition-all duration-500 overflow-hidden ${isSticky ? 'p-4 rounded-2xl scale-[0.98]' : 'p-8'}`}>
          <div className={`flex justify-between items-end transition-all ${isSticky ? 'mb-2' : 'mb-6'}`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-orange-500">
                <Award size={isSticky ? 14 : 18} />
                <span className={`font-black uppercase tracking-widest ${isSticky ? 'text-[8px]' : 'text-[10px]'}`}>禮品頒發進度</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`font-black text-slate-900 transition-all ${isSticky ? 'text-2xl' : 'text-5xl'}`}>{stats.completed}</span>
                <span className={`font-bold text-slate-300 transition-all ${isSticky ? 'text-xs' : 'text-xl'}`}>/ {stats.total}</span>
              </div>
            </div>
            <div className="text-right">
              <div className={`font-black text-slate-400 uppercase transition-all ${isSticky ? 'text-[8px]' : 'text-[10px] mb-1'}`}>完成率</div>
              <div className={`font-black text-orange-500 transition-all ${isSticky ? 'text-lg' : 'text-2xl'}`}>{stats.percent}%</div>
            </div>
          </div>
          
          <div className={`w-full bg-black/5 rounded-full overflow-hidden border border-black/5 shadow-inner transition-all ${isSticky ? 'h-1.5' : 'h-3'}`}>
            <div 
              className="h-full bg-orange-500 transition-all duration-1000 shadow-[0_0_12px_rgba(249,115,22,0.4)]" 
              style={{ width: `${stats.percent}%` }} 
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {giftItems.map((item) => (
          <div key={item.id} onClick={() => triggerAction(() => toggleGiftPresented(item.id))} className={`p-6 rounded-[2.5rem] border transition-all cursor-pointer flex flex-col gap-4 ${item.isPresented ? 'bg-gray-100 opacity-60' : 'bg-white border-white shadow-sm hover:scale-[1.01]'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className={item.isPresented ? 'text-green-600' : 'text-orange-400'}>{item.isPresented ? <CheckCircle2 size={24} /> : <Circle size={24} />}</div>
                 <span className="text-xs font-black text-gray-400 uppercase tracking-widest">序號 # {item.sequence}</span>
              </div>
              {item.quantity && <span className="bg-blue-50 text-[#007AFF] text-[10px] font-black px-2 py-1 rounded-lg">數量: {item.quantity}</span>}
            </div>
            <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center">
               <h3 className="text-xl font-black text-black">{item.name}</h3>
               <div className="bg-[#F2F2F7] px-4 py-2 rounded-xl flex items-center gap-2">
                 <UserCheck size={14} className="text-blue-500" />
                 <span className="text-sm font-black text-blue-600">{item.recipient}</span>
               </div>
            </div>
          </div>
        ))}
        {giftItems.length === 0 && <div className="py-24 text-center text-gray-300 font-bold italic">尚無禮品頒贈資料</div>}
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[250] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-8 max-xs w-full shadow-2xl flex flex-col items-center gap-6">
            <h3 className="text-xl font-black text-black">功能授權</h3>
            <form onSubmit={handleLoginSubmit} className="w-full space-y-4 text-center">
              <p className="text-xs font-bold text-[#007AFF]">密碼提示：1111</p>
              <input type="password" placeholder="輸入密碼" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-[#F2F2F7] border-none rounded-2xl py-5 px-4 text-center text-3xl font-black outline-none" autoFocus />
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-4 font-black text-gray-400">取消</button>
                <button type="submit" className="flex-1 py-4 bg-orange-500 text-white font-black rounded-2xl">確認</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GiftsPanel;
