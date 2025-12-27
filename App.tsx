
import React, { useState, useEffect, useMemo } from 'react';
import { EventProvider, useEvent } from './context/EventContext';
import AdminPanel from './components/AdminPanel';
import McPanel from './components/McPanel';
import LotteryPanel from './components/LotteryPanel';
import FlowPanel from './components/FlowPanel';
import McFlowPanel from './components/McFlowPanel';
import GiftsPanel from './components/GiftsPanel';
import MasterControlPanel from './components/MasterControlPanel';
import DigitalCheckInPanel from './components/DigitalCheckInPanel';
import { 
  ClipboardList, Mic2, Gift, Award, 
  Clock, FileText, Settings, Maximize, Minimize, LayoutDashboard,
  Lock, Unlock, MapPin, CheckCircle, AlertTriangle, Snowflake, Sparkles, Loader2, QrCode
} from 'lucide-react';

const GuestCheckInView: React.FC<{ guestId: string }> = ({ guestId }) => {
  const { guests, checkInById, settings } = useEvent();
  const [status, setStatus] = useState<'idle' | 'locating' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const guest = useMemo(() => guests.find(g => g.id === guestId), [guests, guestId]);

  const handleCheckIn = async () => {
    setStatus('locating');
    
    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMessage('您的設備不支援定位功能。');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        // 在這裡可以加入距離判斷邏輯
        // const { latitude, longitude } = position.coords;
        // console.log("當前位置:", latitude, longitude);
        
        try {
          await checkInById(guestId);
          setStatus('success');
        } catch (e: any) {
          setStatus('error');
          setErrorMessage(e.message || '報到失敗，請洽詢工作人員。');
        }
      },
      (error) => {
        setStatus('error');
        setErrorMessage('無法取得定位。請確保您已開啟定位權限。');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (!guest) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8 text-center">
        <div className="space-y-4">
          <AlertTriangle size={64} className="text-amber-500 mx-auto" />
          <h2 className="text-2xl font-black text-white">找不到您的資料</h2>
          <p className="text-slate-400">請確認連結是否正確或洽詢現場服務台。</p>
        </div>
      </div>
    );
  }

  if (guest.isCheckedIn && status !== 'success') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-12 text-center relative overflow-hidden">
        <Snowflake className="absolute top-20 left-10 text-blue-500/20 animate-pulse" size={100} />
        <div className="z-10 space-y-8">
           <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(34,197,94,0.4)]">
             <CheckCircle size={48} className="text-white" />
           </div>
           <div>
             <h2 className="text-4xl font-black text-white italic tracking-tighter">{guest.name} 您好</h2>
             <p className="text-green-500 font-black mt-2 uppercase tracking-[0.2em]">您已完成報到</p>
           </div>
           <p className="text-slate-400 font-bold">歡迎蒞臨 {settings.eventName}！<br/>請進入會場就座，稍後將有精彩活動與抽獎。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 relative overflow-hidden">
       <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 to-transparent"></div>
       <Sparkles className="absolute top-10 right-10 text-amber-500/20 animate-bounce" size={40} />
       
       <div className="z-10 w-full max-w-sm space-y-12 text-center">
          <div className="space-y-2">
            <h1 className="text-white font-black text-3xl italic tracking-tighter opacity-40 uppercase">{settings.eventName}</h1>
            <div className="h-1 w-20 bg-blue-600 mx-auto rounded-full"></div>
          </div>

          <div className="space-y-4">
            <p className="text-slate-500 font-black tracking-[0.5em] uppercase text-xs">VIRTUAL INVITATION</p>
            <h2 className="text-5xl font-black text-white italic tracking-tighter">{guest.name}</h2>
            <p className="text-blue-500 font-bold text-xl uppercase tracking-widest">{guest.title || '榮譽貴賓'}</p>
          </div>

          {status === 'success' ? (
             <div className="bg-green-500/10 border border-green-500/20 p-8 rounded-[2.5rem] space-y-4 animate-in zoom-in duration-500">
               <CheckCircle size={48} className="text-green-500 mx-auto" />
               <h3 className="text-2xl font-black text-white">報到成功！</h3>
               <p className="text-slate-400 text-sm">歡迎您的光臨，請盡情享受今晚的盛會。</p>
             </div>
          ) : (
            <div className="space-y-6">
               <button 
                 disabled={status === 'locating'}
                 onClick={handleCheckIn}
                 className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white p-6 rounded-[2rem] shadow-[0_20px_40px_rgba(37,99,235,0.3)] flex items-center justify-center gap-4 transition-all active:scale-95"
               >
                 {status === 'locating' ? <Loader2 className="animate-spin" size={28} /> : <MapPin size={28} />}
                 <span className="text-xl font-black uppercase tracking-widest">{status === 'locating' ? '驗證位置中...' : '確認報到'}</span>
               </button>
               
               {status === 'error' && (
                 <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400 text-sm font-bold">
                   <AlertTriangle size={20} />
                   {errorMessage}
                 </div>
               )}
               
               <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">需授權 GPS 定位以驗證在場狀態</p>
            </div>
          )}
       </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { settings, isAdmin, unlockedSections, loginAdmin, logoutAdmin } = useEvent();
  const [activeTab, setActiveTab] = useState<'flow' | 'admin' | 'mc' | 'lottery' | 'mcflow' | 'gifts' | 'master' | 'digital'>('master');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");

  // 偵測是否為賓客自主報到模式
  const guestId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('guestId');
  }, []);

  const isCurrentSectionUnlocked = () => {
    if (isAdmin) return true;
    switch (activeTab) {
      case 'admin': return unlockedSections.registration;
      case 'gifts': return unlockedSections.gifts;
      case 'mcflow': return unlockedSections.mc;
      case 'mc': return unlockedSections.mc;
      case 'lottery': return unlockedSections.lottery;
      case 'digital': return isAdmin; // 數位報到僅管理員可見
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

  // 如果是賓客報到模式，渲染賓客專屬介面
  if (guestId) {
    return <GuestCheckInView guestId={guestId} />;
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F2F2F7] overflow-hidden">
      <header className="ios-blur bg-white/70 border-b border-gray-200/50 px-4 md:px-8 py-2 sticky top-0 z-[150] flex justify-between items-center h-12 md:h-16 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden flex-1 mr-4">
          <div className="w-1.5 h-6 bg-[#007AFF] rounded-full hidden md:block" />
          <span className="text-[10px] md:text-sm font-black text-gray-400 uppercase tracking-widest leading-tight truncate">
            {settings.eventName || "活動系統"}
          </span>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
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
        {activeTab === 'digital' && <DigitalCheckInPanel />}
      </main>

      <div className={`fixed bottom-0 left-0 right-0 transition-all duration-500 ease-in-out z-[100] px-3 md:px-12 pb-3 md:pb-6 pt-2`}>
        <div className="max-w-4xl mx-auto pb-safe">
          <nav className="ios-blur bg-black/90 text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[1.5rem] md:rounded-[2.2rem] h-14 md:h-18 flex justify-around items-center px-1 md:px-4 border border-white/10 ring-1 ring-white/5">
            {[
              { id: 'master', icon: LayoutDashboard, label: '戰情' },
              { id: 'admin', icon: ClipboardList, label: '報到' },
              { id: 'gifts', icon: Award, label: '禮品' },
              { id: 'mcflow', icon: FileText, label: '講稿' },
              { id: 'mc', icon: Mic2, label: '貴賓' },
              { id: 'lottery', icon: Gift, label: '抽獎' },
              { id: 'digital', icon: QrCode, label: '測試' },
              { id: 'flow', icon: Settings, label: '設定' }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center gap-0.5 transition-all flex-1 ${activeTab === tab.id ? 'text-[#007AFF]' : 'text-gray-400'}`}>
                <tab.icon size={activeTab === tab.id ? 18 : 16} className={`md:w-6 md:h-6 transition-transform ${activeTab === tab.id ? 'scale-110' : ''}`} />
                <span className="text-[8px] md:text-[9px] font-black tracking-tighter">{tab.label}</span>
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

const App: React.FC = () => {
  return (
    <EventProvider>
      <AppContent />
    </EventProvider>
  );
};

export default App;
