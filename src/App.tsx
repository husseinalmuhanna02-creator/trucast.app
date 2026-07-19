import React, { useState } from 'react';

import { GroupCallScreen } from './components/GroupCallScreen';
import { LiveStreamScreen } from './components/LiveStreamScreen';
import { PrivateCallScreen } from './components/PrivateCallScreen';
// ملاحظة: إذا كان لديك مكون جاهز لتسجيل الدخول، قم باستيراده هنا
// import { LoginScreen } from './components/LoginScreen';

export function UserProfileScreen() {
  return <div className="p-4 text-center">User Profile (قيد التطوير)</div>;
}

export default function App() {
  // 1. إضافة حالة 'login' وجعلها الحالة الافتراضية عند فتح التطبيق
  const [currentScreen, setCurrentScreen] = useState<'login' | 'group' | 'live' | 'private'>('login');

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-900 text-white overflow-hidden">
      
      {/* 2. إخفاء شريط التنقل العلوي إذا كنا في شاشة تسجيل الدخول */}
      {currentScreen !== 'login' && (
        <div className="flex justify-around bg-slate-800 p-3 border-b border-slate-700">
          <button onClick={() => setCurrentScreen('group')} className={`px-3 py-1.5 rounded ${currentScreen === 'group' ? 'bg-blue-600' : 'bg-slate-700'}`}>مجموعة</button>
          <button onClick={() => setCurrentScreen('live')} className={`px-3 py-1.5 rounded ${currentScreen === 'live' ? 'bg-blue-600' : 'bg-slate-700'}`}>بث مباشر</button>
          <button onClick={() => setCurrentScreen('private')} className={`px-3 py-1.5 rounded ${currentScreen === 'private' ? 'bg-blue-600' : 'bg-slate-700'}`}>خاص</button>
        </div>
      )}

      <div className="flex-1 w-full h-full relative overflow-y-auto">
        
        {/* 3. واجهة تسجيل الدخول المؤقتة */}
        {currentScreen === 'login' && (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <h1 className="text-3xl font-bold">مرحباً بك في التطبيق</h1>
            {/* يمكنك لاحقاً استبدال هذا الزر بمكون LoginScreen الفعلي الذي يربط مع Firebase */}
            <button
              onClick={() => setCurrentScreen('group')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105"
            >
              تسجيل الدخول (للتجربة)
            </button>
          </div>
        )}

        {/* باقي الشاشات */}
        {currentScreen === 'group' && <GroupCallScreen />}
        {currentScreen === 'live' && <LiveStreamScreen />}
        {currentScreen === 'private' && <PrivateCallScreen />}
      </div>
    </div>
  );
}
