import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, User } from 'firebase/auth';
import { auth, googleProvider } from './firebase'; 

import { GroupCallScreen } from './components/GroupCallScreen';
import { LiveStreamScreen } from './components/LiveStreamScreen';
import { PrivateCallScreen } from './components/PrivateCallScreen';

// 1. إعادة تصدير UserProfileScreen لحل مشكلة الاستيراد في GroupCallScreen
export function UserProfileScreen({ user }: { user: User | null }) {
  if (!user) return null;
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      {user.photoURL && (
        <img src={user.photoURL} alt="Profile" className="w-24 h-24 rounded-full mb-4 border-2 border-blue-500 shadow-lg" />
      )}
      <h2 className="text-2xl font-bold mb-2">{user.displayName || 'مستخدم TruCast'}</h2>
      <p className="text-gray-400 mb-8">{user.email}</p>
      <button 
        onClick={() => auth.signOut()} 
        className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full font-bold transition-colors"
      >
        تسجيل الخروج
      </button>
    </div>
  );
}

// 2. اللوحة الرئيسية (Dashboard) التي تحتوي على جميع الخيارات
function Dashboard({ onNavigate }: { onNavigate: (tab: any) => void }) {
  return (
    <div className="p-6 flex flex-col items-center justify-center h-full space-y-8">
      <h1 className="text-3xl font-extrabold text-white mb-2">مرحباً بك في TruCast</h1>
      <p className="text-slate-400 mb-6 text-center">اختر الخدمة التي تريد البدء بها</p>
      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        <button onClick={() => onNavigate('group')} className="p-6 bg-blue-600 rounded-2xl text-white font-bold text-lg shadow-lg hover:bg-blue-700 transition-colors flex flex-col items-center gap-2">
           مكالمة جماعية
        </button>
        <button onClick={() => onNavigate('live')} className="p-6 bg-purple-600 rounded-2xl text-white font-bold text-lg shadow-lg hover:bg-purple-700 transition-colors flex flex-col items-center gap-2">
           بث مباشر
        </button>
        <button onClick={() => onNavigate('private')} className="p-6 bg-green-600 rounded-2xl text-white font-bold text-lg shadow-lg hover:bg-green-700 transition-colors flex flex-col items-center gap-2">
           مكالمة خاصة
        </button>
        <button onClick={() => onNavigate('profile')} className="p-6 bg-slate-700 rounded-2xl text-white font-bold text-lg shadow-lg hover:bg-slate-600 transition-colors flex flex-col items-center gap-2">
           حسابي
        </button>
      </div>
    </div>
  );
}

// 3. التطبيق الأساسي
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'group' | 'live' | 'private' | 'profile'>('dashboard');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-slate-900 text-white font-bold text-xl">جاري التحميل...</div>;
  }

  // واجهة تسجيل الدخول
  if (!user) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-900 text-white p-6">
        <div className="bg-blue-600 p-4 rounded-full mb-6">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
        </div>
        <h1 className="text-4xl font-extrabold mb-2">TruCast</h1>
        <p className="text-slate-400 mb-10 text-center">منصتك الآمنة للمكالمات والبث المباشر</p>
        <button onClick={() => signInWithPopup(auth, googleProvider)} className="bg-white text-slate-900 font-bold py-3 px-6 rounded-full shadow-lg flex items-center gap-3 hover:bg-slate-100 transition-colors">
          <svg className="w-6 h-6" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
          تسجيل الدخول باستخدام جوجل
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-900 text-white overflow-hidden pb-16 relative">
      
      {/* منطقة عرض الشاشات */}
      <div className="flex-1 w-full h-full relative overflow-y-auto">
        {currentTab === 'dashboard' && <Dashboard onNavigate={setCurrentTab} />}
        {currentTab === 'group' && <GroupCallScreen />}
        {currentTab === 'live' && <LiveStreamScreen />}
        {currentTab === 'private' && <PrivateCallScreen />}
        {currentTab === 'profile' && <UserProfileScreen user={user} />}
      </div>

      {/* الشريط السفلي موجود دائماً للوصول السريع */}
      <div className="absolute bottom-0 left-0 w-full flex justify-around items-center bg-slate-800 h-16 border-t border-slate-700 z-50">
        <button onClick={() => setCurrentTab('dashboard')} className={`flex flex-col items-center justify-center w-full h-full ${currentTab === 'dashboard' ? 'text-blue-500' : 'text-slate-400'}`}>
           <span className="font-bold text-sm">الرئيسية</span>
        </button>
        <button onClick={() => setCurrentTab('group')} className={`flex flex-col items-center justify-center w-full h-full ${currentTab === 'group' ? 'text-blue-500' : 'text-slate-400'}`}>
           <span className="font-bold text-sm">مجموعة</span>
        </button>
        <button onClick={() => setCurrentTab('live')} className={`flex flex-col items-center justify-center w-full h-full ${currentTab === 'live' ? 'text-blue-500' : 'text-slate-400'}`}>
           <span className="font-bold text-sm">بث مباشر</span>
        </button>
        <button onClick={() => setCurrentTab('profile')} className={`flex flex-col items-center justify-center w-full h-full ${currentTab === 'profile' ? 'text-blue-500' : 'text-slate-400'}`}>
           <span className="font-bold text-sm">حسابي</span>
        </button>
      </div>

    </div>
  );
}
