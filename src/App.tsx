import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, User } from 'firebase/auth';
import { auth } from './firebase'; 

import { GroupCallScreen } from './components/GroupCallScreen';
import { LiveStreamScreen } from './components/LiveStreamScreen';
import { PrivateCallScreen } from './components/PrivateCallScreen';

export function UserProfileScreen({ user }: { user: User | null }) {
  if (!user) return null;
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="w-24 h-24 rounded-full mb-4 bg-blue-600 flex items-center justify-center shadow-lg text-white text-3xl font-bold">
        {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
      </div>
      <h2 className="text-xl font-bold mb-2 text-white">حسابي</h2>
      <p className="text-gray-400 mb-8">{user.email}</p>
      <button 
        onClick={() => auth.signOut()} 
        className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full font-bold transition-colors shadow-lg"
      >
        تسجيل الخروج
      </button>
    </div>
  );
}

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

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'group' | 'live' | 'private' | 'profile'>('dashboard');

  // حالات شاشة تسجيل الدخول
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error(error);
      setAuthError('تأكد من صحة البيانات أو من أن كلمة المرور تزيد عن 6 أحرف.');
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-slate-900 text-white font-bold text-xl">جاري التحميل...</div>;
  }

  // واجهة تسجيل الدخول المدمجة (لن تفتح متصفحاً خارجياً)
  if (!user) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-900 text-white p-6">
        <h1 className="text-4xl font-extrabold mb-8 text-blue-500">TruCast</h1>
        
        <form onSubmit={handleEmailAuth} className="w-full max-w-sm bg-slate-800 p-6 rounded-3xl shadow-2xl flex flex-col gap-5 border border-slate-700">
          <h2 className="text-2xl font-bold text-center text-white mb-2">
            {isLoginMode ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </h2>
          
          {authError && <div className="bg-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center border border-red-500/50">{authError}</div>}

          <input 
            type="email" 
            placeholder="البريد الإلكتروني" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            className="p-4 rounded-xl bg-slate-900 text-white border border-slate-600 focus:outline-none focus:border-blue-500 transition-colors" 
            required 
          />
          <input 
            type="password" 
            placeholder="كلمة المرور" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            className="p-4 rounded-xl bg-slate-900 text-white border border-slate-600 focus:outline-none focus:border-blue-500 transition-colors" 
            required 
            minLength={6} 
          />
          
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-transform transform active:scale-95 shadow-lg mt-2">
            {isLoginMode ? 'دخول' : 'إنشاء حساب'}
          </button>
          
          <button 
            type="button" 
            onClick={() => { setIsLoginMode(!isLoginMode); setAuthError(''); }} 
            className="text-sm text-slate-400 hover:text-white mt-2 pb-2"
          >
            {isLoginMode ? 'لا تملك حساباً؟ أنشئ حساب جديد' : 'لديك حساب بالفعل؟ سجل دخولك'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-900 text-white overflow-hidden pb-16 relative">
      <div className="flex-1 w-full h-full relative overflow-y-auto">
        {currentTab === 'dashboard' && <Dashboard onNavigate={setCurrentTab} />}
        {currentTab === 'group' && <GroupCallScreen />}
        {currentTab === 'live' && <LiveStreamScreen />}
        {currentTab === 'private' && <PrivateCallScreen />}
        {currentTab === 'profile' && <UserProfileScreen user={user} />}
      </div>

      <div className="absolute bottom-0 left-0 w-full flex justify-around items-center bg-slate-800 h-16 border-t border-slate-700 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <button onClick={() => setCurrentTab('dashboard')} className={`flex flex-col items-center justify-center w-full h-full transition-colors ${currentTab === 'dashboard' ? 'text-blue-500' : 'text-slate-400'}`}>
           <span className="font-bold text-sm">الرئيسية</span>
        </button>
        <button onClick={() => setCurrentTab('group')} className={`flex flex-col items-center justify-center w-full h-full transition-colors ${currentTab === 'group' ? 'text-blue-500' : 'text-slate-400'}`}>
           <span className="font-bold text-sm">مجموعة</span>
        </button>
        <button onClick={() => setCurrentTab('live')} className={`flex flex-col items-center justify-center w-full h-full transition-colors ${currentTab === 'live' ? 'text-blue-500' : 'text-slate-400'}`}>
           <span className="font-bold text-sm">بث</span>
        </button>
        <button onClick={() => setCurrentTab('profile')} className={`flex flex-col items-center justify-center w-full h-full transition-colors ${currentTab === 'profile' ? 'text-blue-500' : 'text-slate-400'}`}>
           <span className="font-bold text-sm">حسابي</span>
        </button>
      </div>
    </div>
  );
}
