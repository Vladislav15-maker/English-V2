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
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
    } else {
      dispatch({ type: 'SET_ERROR', payload: "Неверный логин или пароль" });
    }
  };
  
  useEffect(() => {
    if (state.error) {
        dispatch({ type: 'SET_ERROR', payload: null });
    }
  }, [login, password, dispatch, state.error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 font-sans">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-2xl shadow-xl">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900">Добро пожаловать</h1>
            <p className="mt-2 text-slate-500">Войдите в свой аккаунт EnglishCourse</p>
        </div>

        {state.isLoading && !state.error && <div className="text-center text-slate-500 py-4">Загрузка данных...</div>}

        {!state.isLoading && (
            <form onSubmit={handleLogin} className="space-y-6">
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