
import React, { useState, useEffect } from 'react';
import { EventProvider } from './context/EventContext';
import AdminPanel from './components/AdminPanel';
import McPanel from './components/McPanel';
import LotteryPanel from './components/LotteryPanel';
import FlowPanel from './components/FlowPanel';
import { ClipboardList, Mic2, Gift, ScrollText, ChevronDown, ChevronUp } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'flow' | 'admin' | 'mc' | 'lottery'>('flow');
  const [isNavHidden, setIsNavHidden] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');

    if (viewParam) {
      if (viewParam === 'mc') {
        setActiveTab('mc');
        setIsNavHidden(true);
      } else if (viewParam === 'lottery') {
        setActiveTab('lottery');
        setIsNavHidden(true);
      } else if (viewParam === 'flow') {
        setActiveTab('flow');
        setIsNavHidden(true);
      } else if (viewParam === 'admin') {
        setActiveTab('admin');
      }
    }
  }, []);

  return (
    <EventProvider>
      {/* 使用 fixed inset-0 鎖定整體高度，避免導覽列被內容推走 */}
      <div className="fixed inset-0 flex flex-col bg-slate-50 font-sans overflow-hidden">
        
        {/* 主要內容區域：獨立捲動 */}
        <main className="flex-1 w-full overflow-y-auto relative custom-scrollbar">
          {activeTab === 'flow' && <FlowPanel />}
          {activeTab === 'admin' && <AdminPanel />}
          {activeTab === 'mc' && <McPanel />}
          {activeTab === 'lottery' && <LotteryPanel />}
        </main>

        {/* 底部導覽列容器 - 具備動態過渡 */}
        <div className={`relative shrink-0 transition-transform duration-500 ease-in-out z-[100] ${isNavHidden ? 'translate-y-full' : 'translate-y-0'}`}>
          
          {/* 抽屜隱藏拉環 - 位於導覽列正中央上方 */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-6 h-6 w-16 md:w-20 bg-white/95 backdrop-blur-md border-t border-l border-r border-slate-200 rounded-t-xl flex items-center justify-center cursor-pointer shadow-[0_-5px_15px_rgba(0,0,0,0.05)] active:bg-slate-50 transition-colors"
               onClick={() => setIsNavHidden(!isNavHidden)}>
            {isNavHidden ? (
              <ChevronUp size={20} className="text-indigo-600 animate-bounce" />
            ) : (
              <ChevronDown size={20} className="text-slate-400 hover:text-indigo-600" />
            )}
          </div>

          <nav className="w-full bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
            <div className="flex justify-around items-center h-16 md:h-20 max-w-5xl mx-auto px-2 md:px-4">
              <button 
                onClick={() => setActiveTab('flow')}
                className={`flex flex-col items-center justify-center w-full h-full transition-all active:scale-90 ${activeTab === 'flow' ? 'text-indigo-600' : 'text-slate-400'}`}
              >
                <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'flow' ? 'bg-indigo-50' : ''}`}>
                  <ScrollText size={activeTab === 'flow' ? 24 : 22} strokeWidth={activeTab === 'flow' ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] md:text-xs mt-1 font-black tracking-tight ${activeTab === 'flow' ? 'opacity-100' : 'opacity-60'}`}>活動流程</span>
              </button>

              <button 
                onClick={() => setActiveTab('admin')}
                className={`flex flex-col items-center justify-center w-full h-full transition-all active:scale-90 ${activeTab === 'admin' ? 'text-blue-600' : 'text-slate-400'}`}
              >
                <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'admin' ? 'bg-blue-50' : ''}`}>
                  <ClipboardList size={activeTab === 'admin' ? 24 : 22} strokeWidth={activeTab === 'admin' ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] md:text-xs mt-1 font-black tracking-tight ${activeTab === 'admin' ? 'opacity-100' : 'opacity-60'}`}>報到管理</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('mc')}
                className={`flex flex-col items-center justify-center w-full h-full transition-all active:scale-90 ${activeTab === 'mc' ? 'text-indigo-600' : 'text-slate-400'}`}
              >
                <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'mc' ? 'bg-indigo-50' : ''}`}>
                  <Mic2 size={activeTab === 'mc' ? 24 : 22} strokeWidth={activeTab === 'mc' ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] md:text-xs mt-1 font-black tracking-tight ${activeTab === 'mc' ? 'opacity-100' : 'opacity-60'}`}>司儀模式</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('lottery')}
                className={`flex flex-col items-center justify-center w-full h-full transition-all active:scale-90 ${activeTab === 'lottery' ? 'text-purple-600' : 'text-slate-400'}`}
              >
                <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'lottery' ? 'bg-purple-50' : ''}`}>
                  <Gift size={activeTab === 'lottery' ? 24 : 22} strokeWidth={activeTab === 'lottery' ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] md:text-xs mt-1 font-black tracking-tight ${activeTab === 'lottery' ? 'opacity-100' : 'opacity-60'}`}>現場抽獎</span>
              </button>
            </div>
            {/* 適配所有行動裝置底部安全區 */}
            <div className="h-[env(safe-area-inset-bottom,0px)] bg-white"></div>
          </nav>
        </div>

        {/* 隱藏狀態下的浮動拉環提示 (位於畫面最底部，僅在隱藏時出現) */}
        {isNavHidden && (
           <div className="fixed bottom-0 left-1/2 -translate-x-1/2 h-6 w-16 md:w-20 bg-indigo-600/10 backdrop-blur-sm border-t border-l border-r border-indigo-200 rounded-t-xl flex items-center justify-center cursor-pointer z-[110] hover:bg-indigo-600/20 transition-all animate-pulse"
                onClick={() => setIsNavHidden(false)}>
             <ChevronUp size={20} className="text-indigo-600" />
           </div>
        )}
      </div>
    </EventProvider>
  );
};

export default App;
