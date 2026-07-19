import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, User } from 'firebase/auth';
import { auth, googleProvider } from './firebase'; 

import { GroupCallScreen } from './components/GroupCallScreen';
import { LiveStreamScreen } from './components/LiveStreamScreen';
import { PrivateCallScreen } from './components/PrivateCallScreen';

// 1. واجهة اللوحة الرئيسية (هذه هي الصفحة التي ستظهر بعد تسجيل الدخول)
function Dashboard({ onNavigate }: { onNavigate: (tab: any) => void }) {
  return (
    <div className="p-6 flex flex-col items-center justify-center h-full space-y-6">
      <h1 className="text-3xl font-bold text-white mb-6">مرحباً بك في TruCast</h1>
      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        <button onClick={() => onNavigate('group')} className="p-6 bg-blue-600 rounded-2xl text-white font-bold text-lg shadow-lg">مكالمة جماعية</button>
        <button onClick={() => onNavigate('live')} className="p-6 bg-purple-600 rounded-2xl text-white font-bold text-lg shadow-lg">بث مباشر</button>
        <button onClick={() => onNavigate('private')} className="p-6 bg-green-600 rounded-2xl text-white font-bold text-lg shadow-lg">مكالمة خاصة</button>
        <button onClick={() => onNavigate('profile')} className="p-6 bg-slate-700 rounded-2xl text-white font-bold text-lg shadow-lg">حسابي</button>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // الحالة الافتراضية الآن هي 'dashboard'
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'group' | 'live' | 'private' | 'profile'>('dashboard');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-900 text-white">جاري التحميل...</div>;

  if (!user) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-900 text-white p-6">
        <h1 className="text-4xl font-extrabold mb-10">TruCast</h1>
        <button onClick={() => signInWithPopup(auth, googleProvider)} className="bg-white text-black font-bold py-3 px-8 rounded-full">تسجيل الدخول بجوجل</button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-900 text-white overflow-hidden pb-16 relative">
      <div className="flex-1 w-full h-full overflow-y-auto">
        {currentTab === 'dashboard' && <Dashboard onNavigate={setCurrentTab} />}
        {currentTab === 'group' && <GroupCallScreen />}
        {currentTab === 'live' && <LiveStreamScreen />}
        {currentTab === 'private' && <PrivateCallScreen />}
        {currentTab === 'profile' && (
            <div className="flex flex-col items-center justify-center h-full">
                <h2 className="text-xl mb-4">{user.displayName}</h2>
                <button onClick={() => auth.signOut()} className="bg-red-600 px-6 py-2 rounded-lg">تسجيل الخروج</button>
            </div>
        )}
      </div>

      {/* الشريط السفلي موجود دائماً للعودة للرئيسية */}
      <div className="absolute bottom-0 left-0 w-full flex justify-around items-center bg-slate-800 h-16 border-t border-slate-700">
        <button onClick={() => setCurrentTab('dashboard')} className="text-sm font-bold">الرئيسية</button>
        <button onClick={() => setCurrentTab('group')} className="text-sm font-bold">مجموعة</button>
        <button onClick={() => setCurrentTab('live')} className="text-sm font-bold">بث</button>
        <button onClick={() => setCurrentTab('profile')} className="text-sm font-bold">حسابي</button>
      </div>
    </div>
  );
}
