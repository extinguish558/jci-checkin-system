
import React, { useState, useEffect } from 'react';
import { EventProvider, useEvent } from './context/EventContext';
import AdminPanel from './components/AdminPanel';
import McPanel from './components/McPanel';
import LotteryPanel from './components/LotteryPanel';
import FlowPanel from './components/FlowPanel';
import McFlowPanel from './components/McFlowPanel';
import GiftsPanel from './components/GiftsPanel';
import MasterControlPanel from './components/MasterControlPanel';
import { 
  ClipboardList, Mic2, Gift, Award, 
  Clock, FileText, Settings, Maximize, Minimize, LayoutDashboard,
  Lock, Unlock
} from 'lucide-react';

const AppContent: React.FC = () => {
  const { settings, isAdmin, unlockedSections, loginAdmin, logoutAdmin } = useEvent();
  const [activeTab, setActiveTab] = useState<'flow' | 'admin' | 'mc' | 'lottery' | 'mcflow' | 'gifts' | 'master'>('master');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");

  // 判斷當前頁面是否已解鎖
  const isCurrentSectionUnlocked = () => {
    if (isAdmin) return true;
    switch (activeTab) {
      case 'admin': return unlockedSections.registration;
      case 'gifts': return unlockedSections.gifts;
      case 'mcflow': return unlockedSections.mc;
      case 'mc': return unlockedSections.mc;
      case 'lottery': return unlockedSections.lottery;
      default: return false;
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginAdmin(loginPassword)) {
        setShowLoginModal(false);
        setLoginPassword("");
    } else {
        alert("密碼錯誤");
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  const timeString = currentTime.toLocaleTimeString('zh-TW', { 
    hour12: false, hour: '2-digit', minute: '2-digit' 
  });

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F2F2F7] overflow-hidden">
      
      {/* 全域頂部狀態列 */}
      <header className="ios-blur bg-white/70 border-b border-gray-200/50 px-4 md:px-8 py-2 sticky top-0 z-[150] flex justify-between items-center h-12 md:h-16 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden flex-1 mr-4">
          <div className="w-1.5 h-6 bg-[#007AFF] rounded-full hidden md:block" />
          <span className="text-[10px] md:text-sm font-black text-gray-400 uppercase tracking-widest leading-tight truncate">
            {settings.eventName || "活動系統"}
          </span>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* 全局解鎖按鈕 */}
          <button 
            onClick={() => isCurrentSectionUnlocked() ? logoutAdmin() : setShowLoginModal(true)}
            className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-2xl border transition-all active:scale-90 shadow-sm ${isCurrentSectionUnlocked() ? 'bg-blue-50 border-blue-100 text-[#007AFF]' : 'bg-white border-gray-100 text-gray-300'}`}
          >
            {isCurrentSectionUnlocked() ? <Unlock size={20} /> : <Lock size={20} />}
          </button>

          <button 
            onClick={toggleFullscreen}
            className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-white/50 hover:bg-white rounded-2xl border border-gray-100 shadow-sm transition-all active:scale-90 text-[#007AFF]"
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>

          <div className="flex items-center gap-1.5 bg-black/5 px-3 md:px-5 py-1 md:py-2 rounded-full border border-black/5">
            <span className="text-base md:text-2xl font-black text-black tabular-nums leading-none">
              {timeString}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full overflow-y-auto relative custom-scrollbar smooth-scroll pb-24 md:pb-32">
        {activeTab === 'master' && <MasterControlPanel />}
        {activeTab === 'admin' && <AdminPanel />}
        {activeTab === 'gifts' && <GiftsPanel />}
        {activeTab === 'mcflow' && <McFlowPanel />}
        {activeTab === 'mc' && <McPanel />}
        {activeTab === 'lottery' && <LotteryPanel />}
        {activeTab === 'flow' && <FlowPanel />}
      </main>

      {/* Tab Bar */}
      <div className={`fixed bottom-0 left-0 right-0 transition-all duration-500 ease-in-out z-[100] px-3 md:px-12 pb-3 md:pb-6 pt-2`}>
        <div className="max-w-3xl mx-auto pb-safe">
          <nav className="ios-blur bg-black/90 text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[1.5rem] md:rounded-[2.2rem] h-14 md:h-18 flex justify-around items-center px-1 md:px-4 border border-white/10 ring-1 ring-white/5">
            {[
              { id: 'master', icon: LayoutDashboard, label: '戰情總覽' },
              { id: 'admin', icon: ClipboardList, label: '報到管理' },
              { id: 'gifts', icon: Award, label: '禮品頒贈' },
              { id: 'mcflow', icon: FileText, label: '司儀講稿' },
              { id: 'mc', icon: Mic2, label: '貴賓介紹' },
              { id: 'lottery', icon: Gift, label: '抽獎儀表' },
              { id: 'flow', icon: Settings, label: '系統設定' }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center gap-0.5 transition-all flex-1 ${activeTab === tab.id ? 'text-[#007AFF]' : 'text-gray-400'}`}>
                <tab.icon size={activeTab === tab.id ? 18 : 16} className={`md:w-6 md:h-6 transition-transform ${activeTab === tab.id ? 'scale-110' : ''}`} />
                <span className="text-[8px] md:text-[10px] font-black tracking-tighter">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 ios-blur bg-black/40 z-[300] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-xs shadow-2xl flex flex-col items-center gap-6">
            <h3 className="text-2xl font-black text-slate-900">權限驗證</h3>
            <form onSubmit={handleLoginSubmit} className="w-full space-y-4">
              <input type="password" placeholder="••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-[#F2F2F7] border-none rounded-2xl py-5 px-4 text-center text-4xl font-black outline-none" autoFocus />
              <div className="flex gap-3"><button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-4 font-black text-gray-400">取消</button><button type="submit" className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl">解鎖</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Fix: Add default export and wrap AppContent with EventProvider
 * This ensures all components within the app can access the event context.
 */
const App: React.FC = () => {
  return (
    <EventProvider>
      <AppContent />
    </EventProvider>
  );
};

export default App;
