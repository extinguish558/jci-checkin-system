
import React, { useState } from 'react';
import { EventProvider } from './context/EventContext';
import AdminPanel from './components/AdminPanel';
import McPanel from './components/McPanel';
import LotteryPanel from './components/LotteryPanel';
import FlowPanel from './components/FlowPanel';
import McFlowPanel from './components/McFlowPanel';
import GiftsPanel from './components/GiftsPanel';
import { ClipboardList, Mic2, Gift, ScrollText, ChevronUp, ListChecks, Award } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'flow' | 'admin' | 'mc' | 'lottery' | 'mcflow' | 'gifts'>('flow');
  const [isNavHidden, setIsNavHidden] = useState(false);

  return (
    <EventProvider>
      <div className="fixed inset-0 flex flex-col bg-[#F2F2F7] overflow-hidden">
        
        {/* 主內容區塊 - 增加 pb-48 確保不被導覽列遮擋 */}
        <main className="flex-1 w-full overflow-y-auto relative custom-scrollbar smooth-scroll pb-48">
          {activeTab === 'flow' && <FlowPanel />}
          {activeTab === 'admin' && <AdminPanel />}
          {activeTab === 'gifts' && <GiftsPanel />}
          {activeTab === 'mcflow' && <McFlowPanel />}
          {activeTab === 'mc' && <McPanel />}
          {activeTab === 'lottery' && <LotteryPanel />}
        </main>

        {/* iOS Style Floating Tab Bar */}
        <div className={`fixed bottom-0 left-0 right-0 transition-all duration-500 ease-in-out z-[100] px-4 md:px-6 pb-6 md:pb-8 pt-2 ${isNavHidden ? 'translate-y-32 opacity-0' : 'translate-y-0 opacity-100'}`}>
          <div className="max-w-2xl mx-auto pb-safe">
            <nav className="ios-blur bg-black/85 text-white shadow-[0_25px_60px_rgba(0,0,0,0.4)] rounded-[2.5rem] h-20 md:h-22 flex justify-around items-center px-2 md:px-4 border border-white/10 ring-1 ring-white/5">
              <button onClick={() => setActiveTab('flow')} className={`flex flex-col items-center gap-1.5 transition-all flex-1 ${activeTab === 'flow' ? 'text-[#007AFF]' : 'text-gray-400'}`}>
                <ScrollText size={activeTab === 'flow' ? 24 : 22} className={`transition-transform ${activeTab === 'flow' ? 'scale-110 drop-shadow-[0_0_8px_rgba(0,122,255,0.5)]' : ''}`} />
                <span className="text-[10px] font-black tracking-tighter">流程看板</span>
              </button>
              <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1.5 transition-all flex-1 ${activeTab === 'admin' ? 'text-[#007AFF]' : 'text-gray-400'}`}>
                <ClipboardList size={activeTab === 'admin' ? 24 : 22} className={`transition-transform ${activeTab === 'admin' ? 'scale-110 drop-shadow-[0_0_8px_rgba(0,122,255,0.5)]' : ''}`} />
                <span className="text-[10px] font-black tracking-tighter">報到管理</span>
              </button>
              
              <button onClick={() => setActiveTab('gifts')} className={`flex flex-col items-center gap-1.5 transition-all flex-1 ${activeTab === 'gifts' ? 'text-[#007AFF]' : 'text-gray-400'}`}>
                <Award size={activeTab === 'gifts' ? 24 : 22} className={`transition-transform ${activeTab === 'gifts' ? 'scale-110 drop-shadow-[0_0_8px_rgba(0,122,255,0.5)]' : ''}`} />
                <span className="text-[10px] font-black tracking-tighter">禮品頒贈</span>
              </button>

              <button onClick={() => setActiveTab('mcflow')} className={`flex flex-col items-center gap-1.5 transition-all flex-1 ${activeTab === 'mcflow' ? 'text-[#007AFF]' : 'text-gray-400'}`}>
                <ListChecks size={activeTab === 'mcflow' ? 24 : 22} className={`transition-transform ${activeTab === 'mcflow' ? 'scale-110 drop-shadow-[0_0_8px_rgba(0,122,255,0.5)]' : ''}`} />
                <span className="text-[10px] font-black tracking-tighter">司儀流程</span>
              </button>
              <button onClick={() => setActiveTab('mc')} className={`flex flex-col items-center gap-1.5 transition-all flex-1 ${activeTab === 'mc' ? 'text-[#007AFF]' : 'text-gray-400'}`}>
                <Mic2 size={activeTab === 'mc' ? 24 : 22} className={`transition-transform ${activeTab === 'mc' ? 'scale-110 drop-shadow-[0_0_8px_rgba(0,122,255,0.5)]' : ''}`} />
                <span className="text-[10px] font-black tracking-tighter">貴賓介紹</span>
              </button>
              <button onClick={() => setActiveTab('lottery')} className={`flex flex-col items-center gap-1.5 transition-all flex-1 ${activeTab === 'lottery' ? 'text-[#007AFF]' : 'text-gray-400'}`}>
                <Gift size={activeTab === 'lottery' ? 24 : 22} className={`transition-transform ${activeTab === 'lottery' ? 'scale-110 drop-shadow-[0_0_8px_rgba(0,122,255,0.5)]' : ''}`} />
                <span className="text-[10px] font-black tracking-tighter">抽獎儀表</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Restore nav button */}
        <button 
          onClick={() => setIsNavHidden(!isNavHidden)}
          className={`fixed bottom-10 right-6 w-12 h-12 bg-black/90 text-white rounded-full flex items-center justify-center shadow-2xl transition-all z-[110] border border-white/20 ios-blur ${isNavHidden ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-32 opacity-0 scale-50'}`}
        >
          <ChevronUp size={24} />
        </button>
      </div>
    </EventProvider>
  );
};

export default App;
