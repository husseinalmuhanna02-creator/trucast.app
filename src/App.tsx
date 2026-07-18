import React, { useState } from 'react';
import { GroupCallScreen } from './components/GroupCallScreen';
import { LiveStreamScreen } from './components/LiveStreamScreen';
import { PrivateCallScreen } from './components/PrivateCallScreen';

// تصدير الشاشة المفقودة
export function UserProfileScreen() {
  return (
    <div className="p-4 bg-slate-800 rounded-lg text-center">
      <h2 className="text-xl font-bold">ملف المستخدم (قيد التطوير)</h2>
    </div>
  );
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'group' | 'live' | 'private'>('group');

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-900 text-white overflow-hidden">
      {/* شريط التنقل العلوي للتجربة */}
      <div className="flex justify-around bg-slate-800 p-3 border-b border-slate-700 text-sm font-semibold z-50">
        <button 
          onClick={() => setCurrentScreen('group')} 
          className={`px-3 py-1.5 rounded ${currentScreen === 'group' ? 'bg-blue-600' : 'bg-slate-700'}`}
        >
          مكالمة جماعية
        </button>
        <button 
          onClick={() => setCurrentScreen('live')} 
          className={`px-3 py-1.5 rounded ${currentScreen === 'live' ? 'bg-blue-600' : 'bg-slate-700'}`}
        >
          بث مباشر
        </button>
        <button 
          onClick={() => setCurrentScreen('private')} 
          className={`px-3 py-1.5 rounded ${currentScreen === 'private' ? 'bg-blue-600' : 'bg-slate-700'}`}
        >
          مكالمة خاصة
        </button>
      </div>

      {/* عرض الشاشة ديناميكياً */}
      <div className="flex-1 w-full h-full relative overflow-y-auto">
        {currentScreen === 'group' && GroupCallScreen && React.createElement(GroupCallScreen)}
        {currentScreen === 'live' && LiveStreamScreen && React.createElement(LiveStreamScreen)}
        {currentScreen === 'private' && PrivateCallScreen && React.createElement(PrivateCallScreen)}
      </div>
    </div>
  );
}
