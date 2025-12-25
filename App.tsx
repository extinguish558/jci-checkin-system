
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
  ClipboardList, Mic2, Gift, ScrollText, ChevronUp, ListChecks, Award, 
  Clock, FileText, Settings, Maximize, Minimize, LayoutDashboard 
} from 'lucide-react';

// 內部組件以便使用 EventContext
const AppContent: React.FC = () => {
  const { settings } = useEvent();
  const [activeTab, setActiveTab] = useState<'flow' | 'admin' | 'mc' | 'lottery' | 'mcflow' | 'gifts' | 'master'>('master');
  const [isNavHidden, setIsNavHidden] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 監聽全螢幕狀態變化
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  // 每秒更新一次時間
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const timeString = currentTime.toLocaleTimeString('zh-TW', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
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
        
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={toggleFullscreen}
            className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-white/50 hover:bg-white rounded-2xl border border-gray-100 shadow-sm transition-all active:scale-90 text-[#007AFF]"
            title={isFullscreen ? "退出全螢幕" : "進入全螢幕"}
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>

          <div className="flex items-center gap-1.5 bg-black/5 px-3 md:px-5 py-1 md:py-2 rounded-full border border-black/5">
            <Clock size={12} className="text-[#007AFF] hidden xs:block" />
            <span className="text-base md:text-2xl font-black text-black tabular-nums leading-none">
              {timeString}
            </span>
          </div>
        </div>
      </header>

      {/* 主內容區塊 - 底部留白隨導航欄縮小而調整 */}
      <main className="flex-1 w-full overflow-y-auto relative custom-scrollbar smooth-scroll pb-24 md:pb-32">
        {activeTab === 'master' && <MasterControlPanel />}
        {activeTab === 'admin' && <AdminPanel />}
        {activeTab === 'gifts' && <GiftsPanel />}
        {activeTab === 'mcflow' && <McFlowPanel />}
        {activeTab === 'mc' && <McPanel />}
        {activeTab === 'lottery' && <LotteryPanel />}
        {activeTab === 'flow' && <FlowPanel />}
      </main>

      {/* iOS Style Floating Tab Bar - 尺寸調整: 高度縮減 40% */}
      <div className={`fixed bottom-0 left-0 right-0 transition-all duration-500 ease-in-out z-[100] px-3 md:px-12 pb-3 md:pb-6 pt-2 ${isNavHidden ? 'translate-y-32 opacity-0' : 'translate-y-0 opacity-100'}`}>
        <div className="max-w-3xl mx-auto pb-safe">
          <nav className="ios-blur bg-black/90 text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[1.5rem] md:rounded-[2.2rem] h-14 md:h-18 flex justify-around items-center px-1 md:px-4 border border-white/10 ring-1 ring-white/5">
            <button onClick={() => setActiveTab('master')} className={`flex flex-col items-center gap-0.5 transition-all flex-1 ${activeTab === 'master' ? 'text-[#007AFF]' : 'text-gray-400'}`}>
              <LayoutDashboard size={activeTab === 'master' ? 18 : 16} className={`md:w-6 md:h-6 transition-transform ${activeTab === 'master' ? 'scale-110 drop-shadow-[0_0_8px_rgba(0,122,255,0.6)]' : ''}`} />
              <span className="text-[8px] md:text-[10px] font-black tracking-tighter">戰情總覽</span>
            </button>
            <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-0.5 transition-all flex-1 ${activeTab === 'admin' ? 'text-[#007AFF]' : 'text-gray-400'}`}>
              <ClipboardList size={activeTab === 'admin' ? 18 : 16} className={`md:w-6 md:h-6 transition-transform ${activeTab === 'admin' ? 'scale-110 drop-shadow-[0_0_8px_rgba(0,122,255,0.6)]' : ''}`} />
              <span className="text-[8px] md:text-[10px] font-black tracking-tighter">報到管理</span>
            </button>
            <button onClick={() => setActiveTab('gifts')} className={`flex flex-col items-center gap-0.5 transition-all flex-1 ${activeTab === 'gifts' ? 'text-[#007AFF]' : 'text-gray-400'}`}>
              <Award size={activeTab === 'gifts' ? 18 : 16} className={`md:w-6 md:h-6 transition-transform ${activeTab === 'gifts' ? 'scale-110 drop-shadow-[0_0_8px_rgba(0,122,255,0.6)]' : ''}`} />
              <span className="text-[8px] md:text-[10px] font-black tracking-tighter">禮品頒贈</span>
            </button>
            <button onClick={() => setActiveTab('mcflow')} className={`flex flex-col items-center gap-0.5 transition-all flex-1 ${activeTab === 'mcflow' ? 'text-[#007AFF]' : 'text-gray-400'}`}>
              <FileText size={activeTab === 'mcflow' ? 18 : 16} className={`md:w-6 md:h-6 transition-transform ${activeTab === 'mcflow' ? 'scale-110 drop-shadow-[0_0_8px_rgba(0,122,255,0.6)]' : ''}`} />
              <span className="text-[8px] md:text-[10px] font-black tracking-tighter">司儀講稿</span>
            </button>
            <button onClick={() => setActiveTab('mc')} className={`flex flex-col items-center gap-0.5 transition-all flex-1 ${activeTab === 'mc' ? 'text-[#007AFF]' : 'text-gray-400'}`}>
              <Mic2 size={activeTab === 'mc' ? 18 : 16} className={`md:w-6 md:h-6 transition-transform ${activeTab === 'mc' ? 'scale-110 drop-shadow-[0_0_8px_rgba(0,122,255,0.6)]' : ''}`} />
              <span className="text-[8px] md:text-[10px] font-black tracking-tighter">貴賓介紹</span>
            </button>
            <button onClick={() => setActiveTab('lottery')} className={`flex flex-col items-center gap-0.5 transition-all flex-1 ${activeTab === 'lottery' ? 'text-[#007AFF]' : 'text-gray-400'}`}>
              <Gift size={activeTab === 'lottery' ? 18 : 16} className={`md:w-6 md:h-6 transition-transform ${activeTab === 'lottery' ? 'scale-110 drop-shadow-[0_0_8px_rgba(0,122,255,0.6)]' : ''}`} />
              <span className="text-[8px] md:text-[10px] font-black tracking-tighter">抽獎儀表</span>
            </button>
            <button onClick={() => setActiveTab('flow')} className={`flex flex-col items-center gap-0.5 transition-all flex-1 ${activeTab === 'flow' ? 'text-[#007AFF]' : 'text-gray-400'}`}>
              <Settings size={activeTab === 'flow' ? 18 : 16} className={`md:w-6 md:h-6 transition-transform ${activeTab === 'flow' ? 'scale-110 drop-shadow-[0_0_8px_rgba(0,122,255,0.6)]' : ''}`} />
              <span className="text-[8px] md:text-[10px] font-black tracking-tighter">系統設定</span>
            </button>
          </nav>
        </div>
      </div>

      <button 
        onClick={() => setIsNavHidden(!isNavHidden)}
        className={`fixed bottom-6 md:bottom-8 right-6 md:right-10 w-10 h-10 md:w-12 md:h-12 bg-black/90 text-white rounded-full flex items-center justify-center shadow-2xl transition-all z-[110] border border-white/20 ios-blur ${isNavHidden ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-32 opacity-0 scale-50'}`}
      >
        <ChevronUp size={20} className="md:w-6 md:h-6" />
      </button>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <EventProvider>
      <AppContent />
    </EventProvider>
  );
};

export default App;
