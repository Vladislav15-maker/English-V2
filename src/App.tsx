import React from 'react';
import { useAppContext } from '@/context/AppContext';
import LoginView from '@/components/LoginView';
import TeacherView from '@/components/TeacherView';
import StudentView from '@/components/StudentView';
import { UserRole } from '@/types';

const App: React.FC = () => {
  const { state } = useAppContext();

  if (state.isLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <div className="w-full max-w-md p-8 text-center">
                <p className="text-slate-500">Загрузка приложения...</p>
            </div>
        </div>
    );
  }

  if (!state.currentUser) {
    return <LoginView />;
  }

  if (state.currentUser.role === UserRole.Teacher) {
    return <TeacherView />;
  }

  if (state.currentUser.role === UserRole.Student) {
    return <StudentView />;
  }

  return <div>Ошибка: Роль пользователя не определена.</div>;
};

export default App;
