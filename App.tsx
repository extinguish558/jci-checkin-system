import React, { useState, useEffect } from 'react';
import { EventProvider } from './context/EventContext';
import AdminPanel from './components/AdminPanel';
import McPanel from './components/McPanel';
import LotteryPanel from './components/LotteryPanel';
import { ClipboardList, Mic2, Gift, Lock } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'admin' | 'mc' | 'lottery'>('admin');
  const [isKioskMode, setIsKioskMode] = useState(false);

  useEffect(() => {
    // Parse URL parameters to set initial view and enable Kiosk mode
    // Example: https://your-app.com/?view=lottery
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');

    if (viewParam) {
      if (viewParam === 'mc') {
        setActiveTab('mc');
        setIsKioskMode(true);
      } else if (viewParam === 'lottery') {
        setActiveTab('lottery');
        setIsKioskMode(true);
      } else if (viewParam === 'admin') {
        setActiveTab('admin');
        // Admin usually keeps nav, but can force kiosk if needed
        // setIsKioskMode(true); 
      }
    }
  }, []);

  return (
    <EventProvider>
      <div className="min-h-screen bg-slate-50 relative font-sans">
        
        {/* Main Content Area */}
        <main className={`w-full ${!isKioskMode ? 'pb-20' : ''}`}>
          {activeTab === 'admin' && <AdminPanel />}
          {activeTab === 'mc' && <McPanel />}
          {activeTab === 'lottery' && <LotteryPanel />}
        </main>

        {/* Bottom Navigation Bar - Hidden in Kiosk Mode */}
        {!isKioskMode && (
          <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-5px_10px_rgba(0,0,0,0.05)] pb-safe z-50">
            <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
              <button 
                onClick={() => setActiveTab('admin')}
                className={`flex flex-col items-center justify-center w-full h-full transition-colors ${activeTab === 'admin' ? 'text-blue-600' : 'text-slate-400'}`}
              >
                <ClipboardList size={24} />
                <span className="text-xs mt-1 font-medium">報到管理</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('mc')}
                className={`flex flex-col items-center justify-center w-full h-full transition-colors ${activeTab === 'mc' ? 'text-indigo-600' : 'text-slate-400'}`}
              >
                <Mic2 size={24} />
                <span className="text-xs mt-1 font-medium">司儀模式</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('lottery')}
                className={`flex flex-col items-center justify-center w-full h-full transition-colors ${activeTab === 'lottery' ? 'text-purple-600' : 'text-slate-400'}`}
              >
                <Gift size={24} />
                <span className="text-xs mt-1 font-medium">現場抽獎</span>
              </button>
            </div>
          </nav>
        )}
        
        {/* Kiosk Mode Indicator (Optional, subtle) */}
        {isKioskMode && (
             <div className="fixed bottom-2 right-2 opacity-20 hover:opacity-100 transition-opacity z-40">
                 <a href="/" className="bg-black/50 text-white p-1 rounded-full text-xs flex items-center gap-1 px-2" title="退出單一檢視模式">
                    <Lock size={10} /> View Only
                 </a>
             </div>
        )}
      </div>
    </EventProvider>
  );
};

export default App;