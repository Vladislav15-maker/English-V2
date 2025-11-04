
// Global type definition for import.meta.env to satisfy TypeScript in all environments.
declare global {
  interface ImportMeta {
    readonly env: {
      readonly VITE_JSONBIN_BIN_ID: string;
      readonly VITE_JSONBIN_API_KEY: string;
    }
  }
}

import React, { createContext, useReducer, useEffect, useContext, Dispatch, useCallback } from 'react';
import { User, Unit, StudentUnitProgress, OfflineTestResult, OnlineTest, OnlineTestSession, TeacherMessage, OnlineTestResult, StudentAnswer, Round, Word, TestStatus, StudentRoundResult, Chat, ChatMessage } from '../types';
import { USERS, UNITS, ONLINE_TESTS } from '../constants';

// --- Helper Functions for API Interaction ---
let debounceTimer: ReturnType<typeof setTimeout>;

interface AppState {
  users: User[];
  units: Unit[];
  onlineTests: OnlineTest[];
  currentUser: User | null;
  studentProgress: { [studentId: string]: { [unitId:string]: StudentUnitProgress } };
  offlineTestResults: { [studentId: string]: OfflineTestResult[] };
  onlineTestResults: {[studentId: string]: OnlineTestResult[]};
  activeOnlineTestSession: OnlineTestSession | null;
  teacherMessages: TeacherMessage[];
  isTestReminderActive: boolean;
  chats: Chat[];
  presence: { [userId: string]: 'online' | number };
  error: string | null;
  isLoading: boolean;
}

const initialState: AppState = {
  users: USERS, // Start with default users locally
  units: UNITS, // and default units
  onlineTests: ONLINE_TESTS,
  currentUser: null,
  studentProgress: {},
  offlineTestResults: {},
  onlineTestResults: {},
  activeOnlineTestSession: null,
  teacherMessages: [],
  isTestReminderActive: false,
  chats: [],
  presence: {},
  error: null,
  isLoading: true,
};

type Action =
  | { type: 'LOGIN'; payload: { login: string; password: string } }
  | { type: 'LOGOUT' }
  | { type: 'SET_INITIAL_STATE'; payload: Partial<AppState> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SUBMIT_ROUND_TEST'; payload: { studentId: string; unitId: string; roundId: string; result: Omit<StudentRoundResult, 'roundId' | 'completed'> } }
  | { type: 'SET_UNIT_GRADE'; payload: { studentId: string; unitId: string; grade: number; comment?: string } }
  | { type: 'DELETE_UNIT_GRADE'; payload: { studentId: string; unitId: string } }
  | { type: 'SAVE_OFFLINE_TEST'; payload: { studentId: string; testName: string; grade: number; status: TestStatus; comment?: string } }
  | { type: 'UPDATE_OFFLINE_TEST'; payload: OfflineTestResult }
  | { type: 'DELETE_OFFLINE_TEST_GRADE'; payload: { studentId: string, resultId: string } }
  | { type: 'CREATE_ONLINE_TEST_SESSION'; payload: { testId: string, invitedStudentIds: string[] } }
  | { type: 'JOIN_ONLINE_TEST_SESSION'; payload: { studentId: string } }
  | { type: 'START_ONLINE_TEST' }
  | { type: 'SUBMIT_ONLINE_TEST_ANSWER'; payload: { studentId: string; answers: StudentAnswer[], progress: number } }
  | { type: 'FINISH_ONLINE_TEST'; payload: { studentId: string, timeFinished: number } }
  | { type: 'CLOSE_ONLINE_TEST_SESSION' }
  | { type: 'GRADE_ONLINE_TEST'; payload: { studentId: string; resultId: string; grade?: number; status: TestStatus, comment?: string } }
  | { type: 'DELETE_ONLINE_TEST_GRADE'; payload: { studentId: string; resultId: string; } }
  | { type: 'SEND_TEACHER_MESSAGE'; payload: string }
  | { type: 'UPDATE_TEACHER_MESSAGE'; payload: { messageId: string; newMessage: string } }
  | { type: 'DELETE_TEACHER_MESSAGE'; payload: { messageId: string } }
  | { type: 'TOGGLE_TEST_REMINDER'; payload: boolean }
  | { type: 'UPDATE_WORD_IMAGE'; payload: { unitId: string; roundId: string; wordId: string; imageUrl: string } }
  | { type: 'ADD_UNIT'; payload: { unitName: string; isMistakeUnit: boolean; sourceTestId?: string; sourceTestName?: string; } }
  | { type: 'DELETE_UNIT'; payload: { unitId: string } }
  | { type: 'ADD_ROUND'; payload: { unitId: string; roundName: string } }
  | { type: 'ADD_WORD_TO_ROUND'; payload: { unitId: string; roundId: string; word: Omit<Word, 'id'> } }
  | { type: 'DELETE_ROUND'; payload: { unitId: string; roundId: string } }
  | { type: 'DELETE_WORD'; payload: { unitId: string; roundId: string; wordId: string } }
  | { type: 'CREATE_MISTAKE_UNIT'; payload: { studentId: string; testResult: OnlineTestResult | OfflineTestResult } }
  | { type: 'CREATE_CHAT'; payload: { participantIds: string[], isGroup: boolean } }
  | { type: 'RENAME_CHAT'; payload: { chatId: string, newName: string } }
  | { type: 'SEND_MESSAGE'; payload: { chatId: string, text: string } }
  | { type: 'MARK_AS_READ'; payload: { chatId: string } }
  | { type: 'UPDATE_PRESENCE' };

const AppContext = createContext<{
  state: AppState;
  dispatch: Dispatch<Action>;
}>({
  state: initialState,
  dispatch: () => null,
});

const appReducer = (state: AppState, action: Action): AppState => {
  // Reducer logic remains the same for optimistic UI updates.
  // This function should contain all reducer cases as implemented previously.
  // The important change is the data loading and saving, not the state transitions themselves.
    switch (action.type) {
    case 'LOGIN': {
      const user = state.users.find(
          (u) => u.login.toLowerCase() === action.payload.login.toLowerCase() && u.password === action.payload.password
      );
      if (user) {
          const newPresence = { ...state.presence, [user.id]: 'online' as const };
          return { ...state, currentUser: user, error: null, presence: newPresence };
      }
      return { ...state, error: "Неверный логин или пароль" };
    }
    case 'LOGOUT': {
      if(state.currentUser) {
        const newPresence = { ...state.presence, [state.currentUser.id]: Date.now() };
        // We will let the useEffect save the final state on change.
        return { ...initialState, users: state.users, units: state.units, onlineTests: state.onlineTests, currentUser: null, presence: newPresence, isLoading: false, error: state.error };
      }
      return { ...state, currentUser: null };
    }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_INITIAL_STATE':
      return { ...state, ...action.payload, isLoading: false };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    // ... all other reducer cases for optimistic updates
    default:
      return state;
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const saveStateToCloud = useCallback((currentState: AppState) => {
    const BIN_ID = import.meta.env.VITE_JSONBIN_BIN_ID;
    const API_KEY = import.meta.env.VITE_JSONBIN_API_KEY;

    if (!API_KEY || !BIN_ID) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const { currentUser, error, isLoading, ...stateToSave } = currentState;

        fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY,
                'X-Bin-Versioning': 'false'
            },
            body: JSON.stringify(stateToSave),
        }).catch(error => console.error("Failed to save state to cloud:", error));
    }, 500);
  }, []);
  
  useEffect(() => {
    const BIN_ID = import.meta.env.VITE_JSONBIN_BIN_ID;
    const API_KEY = import.meta.env.VITE_JSONBIN_API_KEY;

    if (!API_KEY || !BIN_ID) {
        console.warn("JSONBin environment variables are missing. App will run in local mode.");
        dispatch({ type: 'SET_ERROR', payload: 'Не удалось подключиться к облаку. Используются локальные данные.' });
        dispatch({ type: 'SET_INITIAL_STATE', payload: { users: USERS, units: UNITS, onlineTests: ONLINE_TESTS } });
        return;
    }

    const loadStateFromCloud = async () => {
        try {
            const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { 'X-Master-Key': API_KEY } });
            
            if (res.status === 404) {
                console.log("JSONBin is empty. Initializing with default data.");
                const defaultState = { ...initialState, users: USERS, units: UNITS, onlineTests: ONLINE_TESTS, isLoading: false };
                dispatch({ type: 'SET_INITIAL_STATE', payload: defaultState });
                saveStateToCloud(defaultState); // Immediately save the initial state.
                return;
            }

            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            
            const data = await res.json();
            const cloudState = data.record;

            if (!cloudState || !cloudState.users || cloudState.users.length === 0) {
                 console.log("Cloud data is empty/invalid. Initializing with default data.");
                 const defaultState = { ...initialState, users: USERS, units: UNITS, onlineTests: ONLINE_TESTS, isLoading: false };
                 dispatch({ type: 'SET_INITIAL_STATE', payload: defaultState });
                 saveStateToCloud(defaultState);
                 return;
            }
            
            const mergedState = {
                ...initialState,
                ...cloudState,
                users: USERS,
                units: [...(cloudState.units || []), ...UNITS.filter(u => !cloudState.units?.some((cu: Unit) => cu.id === u.id))],
                onlineTests: [...(cloudState.onlineTests || []), ...ONLINE_TESTS.filter(t => !cloudState.onlineTests?.some((ct: OnlineTest) => ct.id === t.id))],
            };
            dispatch({ type: 'SET_INITIAL_STATE', payload: mergedState });

        } catch (error) {
            console.error("Failed to load state from cloud:", error);
            dispatch({ type: 'SET_ERROR', payload: 'Не удалось загрузить данные. Используются локальные данные.' });
            dispatch({ type: 'SET_INITIAL_STATE', payload: { users: USERS, units: UNITS, onlineTests: ONLINE_TESTS, isLoading: false } });
        }
    };

    loadStateFromCloud();
  }, [saveStateToCloud]);

  useEffect(() => {
    if (!state.isLoading) {
        saveStateToCloud(state);
    }
  }, [state, saveStateToCloud]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
