import React, { useState } from 'react';

// 1. استيراد مسمى (بأقواس) لأن GroupCallScreen يطلبه هكذا
import { GroupCallScreen } from './components/GroupCallScreen';

// 2. استيراد افتراضي (بدون أقواس) لأن LiveStreamScreen و Private يطلبونه هكذا
import LiveStreamScreen from './components/LiveStreamScreen';
import PrivateCallScreen from './components/PrivateCallScreen';

// تصدير الشاشة الوهمية التي يطلبها GroupCallScreen
export function UserProfileScreen() {
  return <div className="p-4 text-center">User Profile (قيد التطوير)</div>;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'group' | 'live' | 'private'>('group');

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-900 text-white overflow-hidden">
      <div className="flex justify-around bg-slate-800 p-3 border-b border-slate-700 text-sm font-semibold z-50">
        <button onClick={() => setCurrentScreen('group')} className={`px-3 py-1.5 rounded ${currentScreen === 'group' ? 'bg-blue-600' : 'bg-slate-700'}`}>مكالمة جماعية</button>
        <button onClick={() => setCurrentScreen('live')} className={`px-3 py-1.5 rounded ${currentScreen === 'live' ? 'bg-blue-600' : 'bg-slate-700'}`}>بث مباشر</button>
        <button onClick={() => setCurrentScreen('private')} className={`px-3 py-1.5 rounded ${currentScreen === 'private' ? 'bg-blue-600' : 'bg-slate-700'}`}>مكالمة خاصة</button>
      </div>

      <div className="flex-1 w-full h-full relative overflow-y-auto">
        {currentScreen === 'group' && <GroupCallScreen />}
        {currentScreen === 'live' && <LiveStreamScreen />}
        {currentScreen === 'private' && <PrivateCallScreen />}
      </div>
    </div>
  );
}
