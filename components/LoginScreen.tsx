
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { LogoIcon } from './common/Icons';

const LoginScreen: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'LOGIN', payload: { login, password } });
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <LogoIcon className="h-12 w-12 text-indigo-600 mx-auto" />
            <h2 className="text-3xl font-bold text-slate-800">Добро пожаловать</h2>
            <p className="text-slate-500">Войдите в свой аккаунт EnglishCourse</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="login" className="block text-sm font-medium text-slate-700">Логин</label>
              <input
                id="login"
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="mt-1 block w-full px-4 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                placeholder="Vladislav"
                required
              />
            </div>
            <div>
              <label htmlFor="password"  className="block text-sm font-medium text-slate-700">Пароль</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                placeholder="••••••••"
                required
              />
            </div>
            {state.error && <p className="text-red-500 text-sm text-center">{state.error}</p>}
            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-transform transform hover:scale-105"
              >
                Войти
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
