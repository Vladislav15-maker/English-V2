
import React from 'react';
import { useAppContext } from './context/AppContext';
import LoginScreen from './components/LoginScreen';
import StudentView from './components/StudentView';
import TeacherView from './components/TeacherView';
import { UserRole } from './types';
import { LogoIcon } from './components/common/Icons';

const App: React.FC = () => {
  const { state } = useAppContext();
  const { currentUser } = state;

  const renderContent = () => {
    if (!currentUser) {
      return <LoginScreen />;
    }
    if (currentUser.role === UserRole.Student) {
      return <StudentView />;
    }
    if (currentUser.role === UserRole.Teacher) {
      return <TeacherView />;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-3">
                    <LogoIcon className="h-8 w-8 text-indigo-600" />
                    <h1 className="text-2xl font-bold text-slate-800">EnglishCourse</h1>
                </div>
            </div>
        </div>
      </header>
      <main>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
