import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';

const LoginView: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'LOGIN', payload: { login, password } });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-800">Добро пожаловать</h1>
            <p className="mt-2 text-slate-500">Войдите в свой аккаунт EnglishCourse</p>
        </div>

        {state.isLoading && <p className="text-center text-slate-500">Загрузка данных...</p>}

        {!state.isLoading && (
            <form onSubmit={handleLogin} className="space-y-6">
            <div>
                <label htmlFor="login" className="block text-sm font-medium text-slate-700">
                Логин
                </label>
                <input
                id="login"
                name="login"
                type="text"
                required
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="w-full px-3 py-2 mt-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
            </div>

            <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Пароль
                </label>
                <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 mt-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
            </div>
            
            {state.error && <p className="text-sm text-red-600 text-center">{state.error}</p>}

            <div>
                <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                Войти
                </button>
            </div>
            </form>
        )}
      </div>
    </div>
  );
};

export default LoginView;