
import React, { useState, useEffect } from 'react';
import { EventProvider, useEvent } from './context/EventContext';
import AdminPanel from './components/AdminPanel';
import McPanel from './components/McPanel';
import LotteryPanel from './components/LotteryPanel';
import FlowPanel from './components/FlowPanel';
import McFlowPanel from './components/McFlowPanel';
import GiftsPanel from './components/GiftsPanel';
import MasterControlPanel from './components/MasterControlPanel';
import { ClipboardList, Mic2, Gift, ScrollText, ChevronUp, ListChecks, Award, Clock, FileText, Settings } from 'lucide-react';

// 內部組件以便使用 EventContext
const AppContent: React.FC = () => {
  const { settings } = useEvent();
  const [activeTab, setActiveTab] = useState<'flow' | 'admin' | 'mc' | 'lottery' | 'mcflow' | 'gifts' | 'master'>('flow');
  const [isNavHidden, setIsNavHidden] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // 每秒更新一次時間
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = currentTime.toLocaleTimeString('zh-TW', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F2F2F7] overflow-hidden">
      
      {/* 全域頂部狀態列 - 優化標題寬度使其完整顯示 */}
      <header className="ios-blur bg-white/70 border-b border-gray-200/50 px-4 md:px-8 py-2 sticky top-0 z-[150] flex justify-between items-center h-12 md:h-16 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden flex-1 mr-4">
          <div className="w-1.5 h-6 bg-[#007AFF] rounded-full hidden md:block" />
          <span className="text-[10px] md:text-sm font-black text-gray-400 uppercase tracking-widest leading-tight">
            {settings.eventName || "活動系統"}
          </span>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 bg-black/5 px-3 md:px-5 py-1 md:py-2 rounded-full border border-black/5">
            <Clock size={12} className="text-[#007AFF] hidden xs:block" />
            <span className="text-base md:text-2xl font-black text-black tabular-nums leading-none">
              {timeString}
            </span>
          </div>
        </div>
      </header>

      {/* 主內容區塊 */}
      <main className="flex-1 w-full overflow-y-auto relative custom-scrollbar smooth-scroll pb-40 md:pb-56">
        {activeTab === 'flow' && <FlowPanel />}
        {activeTab === 'admin' && <AdminPanel />}
        {activeTab === 'gifts' && <GiftsPanel />}
        {activeTab === 'mcflow' && <McFlowPanel />}
        {activeTab === 'mc' && <McPanel />}
        {activeTab === 'lottery' && <LotteryPanel />}
        {activeTab === 'master' && <MasterControlPanel />}
      </main>

      {/* iOS Style Floating Tab Bar */}
      <div className={`fixed bottom-0 left-0 right-0 transition-all duration-500 ease-in-out z-[100] px-2 md:px-8 pb-4 md:pb-12 pt-2 ${isNavHidden ? 'translate-y-32 opacity-0' : 'translate-y-0 opacity-100'}`}>
        <div className="max-w-4xl mx-auto pb-safe">
          <nav className="ios-blur bg-black/90 text-white shadow-[0_30px_60px_rgba(0,0,0,0.4)] rounded-[2.5rem] md:rounded-[3.5rem] h-20 md:h-28 flex justify-around items-center px-2 md:px-6 border border-white/10 ring-1 ring-white/5">
            <button onClick={() => setActiveTab('flow')} className={`flex flex-col items-center gap-1 md:gap-2 transition-all flex-1 ${activeTab === 'flow' ? 'text-[#007AFF]' : 'text-gray-400'}`}>
              <ScrollText size={activeTab === 'flow' ? 22 : 20} className={`md:w-8 md:h-8 transition-transform ${activeTab === 'flow' ? 'scale-110 drop-shadow-[0_0_12px_rgba(0,122,255,0.6)]' : ''}`} />
              <span className="text-[9px] md:text-[11px] font-black tracking-tighter">流程看板</span>
            </button>
            <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1 md:gap-2 transition-all flex-1 ${activeTab === 'admin' ? 'text-[#007AFF]' : 'text-gray-400'}`}>
              <ClipboardList size={activeTab === 'admin' ? 22 : 20} className={`md:w-8 md:h-8 transition-transform ${activeTab === 'admin' ? 'scale-110 drop-shadow-[0_0_12px_rgba(0,122,255,0.6)]' : ''}`} />
              <span className="text-[9px] md:text-[11px] font-black tracking-tighter">報到管理</span>
            </button>
            <button onClick={() => setActiveTab('gifts')} className={`flex flex-col items-center gap-1 md:gap-2 transition-all flex-1 ${activeTab === 'gifts' ? 'text-[#007AFF]' : 'text-gray-400'}`}>
              <Award size={activeTab === 'gifts' ? 22 : 20} className={`md:w-8 md:h-8 transition-transform ${activeTab === 'gifts' ? 'scale-110 drop-shadow-[0_0_12px_rgba(0,122,255,0.6)]' : ''}`} />
              <span className="text-[9px] md:text-[11px] font-black tracking-tighter">禮品頒贈</span>
            </button>
            <button onClick={() => setActiveTab('mcflow')} className={`flex flex-col items-center gap-1 md:gap-2 transition-all flex-1 ${activeTab === 'mcflow' ? 'text-[#007AFF]' : 'text-gray-400'}`}>
              <FileText size={activeTab === 'mcflow' ? 22 : 20} className={`md:w-8 md:h-8 transition-transform ${activeTab === 'mcflow' ? 'scale-110 drop-shadow-[0_0_12px_rgba(0,122,255,0.6)]' : ''}`} />
              <span className="text-[9px] md:text-[11px] font-black tracking-tighter">司儀講稿</span>
            </button>
            <button onClick={() => setActiveTab('mc')} className={`flex flex-col items-center gap-1 md:gap-2 transition-all flex-1 ${activeTab === 'mc' ? 'text-[#007AFF]' : 'text-gray-400'}`}>
              <Mic2 size={activeTab === 'mc' ? 22 : 20} className={`md:w-8 md:h-8 transition-transform ${activeTab === 'mc' ? 'scale-110 drop-shadow-[0_0_12px_rgba(0,122,255,0.6)]' : ''}`} />
              <span className="text-[9px] md:text-[11px] font-black tracking-tighter">貴賓介紹</span>
            </button>
            <button onClick={() => setActiveTab('lottery')} className={`flex flex-col items-center gap-1 md:gap-2 transition-all flex-1 ${activeTab === 'lottery' ? 'text-[#007AFF]' : 'text-gray-400'}`}>
              <Gift size={activeTab === 'lottery' ? 22 : 20} className={`md:w-8 md:h-8 transition-transform ${activeTab === 'lottery' ? 'scale-110 drop-shadow-[0_0_12px_rgba(0,122,255,0.6)]' : ''}`} />
              <span className="text-[9px] md:text-[11px] font-black tracking-tighter">抽獎儀表</span>
            </button>
            <button onClick={() => setActiveTab('master')} className={`flex flex-col items-center gap-1 md:gap-2 transition-all flex-1 ${activeTab === 'master' ? 'text-[#007AFF]' : 'text-gray-400'}`}>
              <Settings size={activeTab === 'master' ? 22 : 20} className={`md:w-8 md:h-8 transition-transform ${activeTab === 'master' ? 'scale-110 drop-shadow-[0_0_12px_rgba(0,122,255,0.6)]' : ''}`} />
              <span className="text-[9px] md:text-[11px] font-black tracking-tighter">系統設定</span>
            </button>
          </nav>
        </div>
      </div>

      <button 
        onClick={() => setIsNavHidden(!isNavHidden)}
        className={`fixed bottom-12 right-8 w-12 h-12 md:w-16 md:h-16 bg-black/90 text-white rounded-full flex items-center justify-center shadow-3xl transition-all z-[110] border border-white/20 ios-blur ${isNavHidden ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-32 opacity-0 scale-50'}`}
      >
        <ChevronUp size={24} className="md:w-10 md:h-10" />
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
