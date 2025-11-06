import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { USERS } from '@/constants';

const LoginView: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = USERS.find(
      (u) => u.login.toLowerCase() === login.toLowerCase() && u.password === password
    );
    if (user) {
      // @ts-ignore
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
    } else {
      // @ts-ignore
      dispatch({ type: 'SET_ERROR', payload: "Неверный логин или пароль" });
    }
  };
  
  useEffect(() => {
    if (state.error) {
        // @ts-ignore
        dispatch({ type: 'SET_ERROR', payload: null });
    }
  }, [login, password, dispatch, state.error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 font-sans">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-2xl shadow-xl text-center">
        <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
                {/* Иконка, похожая на ваш оригинальный логотип */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white">
                    <path d="M12.378 1.602a.75.75 0 00-.756 0L3.32 6.098a.75.75 0 00-.32.65v10.5a.75.75 0 00.32.65l8.302 4.496a.75.75 0 00.756 0l8.302-4.496a.75.75 0 00.32-.65V6.748a.75.75 0 00-.32-.65L12.378 1.602zM12 7.5a.75.75 0 00-.75.75v7.5a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75z" />
                </svg>
            </div>
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Добро пожаловать</h1>
        <p className="mt-2 text-slate-500">Войдите в свой аккаунт EnglishCourse</p>

        {state.isLoading && !state.error && <div className="text-slate-500 py-4">Загрузка данных...</div>}
        
        {!state.isLoading && (
            <form onSubmit={handleLogin} className="space-y-6 text-left">
                <div>
                    <label htmlFor="login" className="block text-sm font-medium text-slate-700">Логин</label>
                    <input id="login" name="login" type="text" required value={login} onChange={(e) => setLogin(e.target.value)} className="w-full px-4 py-2 mt-1 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700">Пароль</label>
                    <input id="password" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 mt-1 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
                {state.error && <p className="text-sm text-red-600 text-center">{state.error}</p>}
                <div>
                    <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700">Войти</button>
                </div>
            </form>
        )}
      </div>
    </div>
  );
};
export default LoginView;