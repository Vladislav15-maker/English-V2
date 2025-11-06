import React, { createContext, useReducer, useEffect, useContext, Dispatch, useCallback, useRef } from 'react';
import { User, Unit, StudentUnitProgress, OfflineTestResult, OnlineTest, OnlineTestSession, TeacherMessage, OnlineTestResult, StudentAnswer, Round, Word, TestStatus, StudentRoundResult, Chat, ChatMessage, UserRole, Announcement, OnlineTestSessionStudent } from '@/types';
import { USERS, UNITS, ONLINE_TESTS } from '@/constants';

// Интерфейс состояния
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
  announcements: Announcement[]; 
  chats: Chat[];
  presence: { [userId: string]: 'online' | number };
  error: string | null;
  isLoading: boolean;
}

// Начальное состояние
const initialState: AppState = {
  users: USERS,
  units: UNITS,
  onlineTests: ONLINE_TESTS,
  currentUser: null,
  studentProgress: {},
  offlineTestResults: {},
  onlineTestResults: {},
  activeOnlineTestSession: null,
  teacherMessages: [],
  announcements: [],
  chats: [],
  presence: {},
  error: null,
  isLoading: true,
};

// Типы действий
type Action =
  | { type: 'LOGIN_SUCCESS'; payload: User }
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
  | { type: 'DELETE_TEACHER_MESSAGE'; payload: { messageId: string } }
  | { type: 'SEND_ANNOUNCEMENT'; payload: { type: 'active' | 'info', message: string } }
  | { type: 'DELETE_ANNOUNCEMENT'; payload: { announcementId: string } }
  | { type: 'CREATE_CHAT'; payload: { participantIds: string[], isGroup: boolean, name?: string } }
  | { type: 'SEND_MESSAGE'; payload: { chatId: string, text: string } }
  | { type: 'MARK_AS_READ'; payload: { chatId: string } };

// Полный Reducer
const appReducer = (state: AppState, action: Action): AppState => {
    switch (action.type) {
        case 'LOGIN_SUCCESS':
            return { ...state, currentUser: action.payload, error: null };
        case 'LOGOUT':
            return { ...state, currentUser: null };
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_INITIAL_STATE':
            return { 
                ...initialState,
                ...action.payload,
                currentUser: state.currentUser,
                isLoading: false 
            };
        case 'SET_ERROR':
            return { ...state, error: action.payload, isLoading: false };
        
        case 'SUBMIT_ROUND_TEST': {
            const { studentId, unitId, roundId, result } = action.payload;
            const newProgress = JSON.parse(JSON.stringify(state.studentProgress));
            if (!newProgress[studentId]) newProgress[studentId] = {};
            if (!newProgress[studentId][unitId]) newProgress[studentId][unitId] = { unitId, rounds: {} };
            newProgress[studentId][unitId].rounds[roundId] = { ...result, roundId: roundId, completed: true };
            return { ...state, studentProgress: newProgress };
        }

        case 'SET_UNIT_GRADE': {
            const { studentId, unitId, grade, comment } = action.payload;
            const newProgress = JSON.parse(JSON.stringify(state.studentProgress));
            if (!newProgress[studentId]) newProgress[studentId] = {};
            if (!newProgress[studentId][unitId]) newProgress[studentId][unitId] = { unitId, rounds: {} };
            newProgress[studentId][unitId].grade = grade;
            newProgress[studentId][unitId].comment = comment;
            return { ...state, studentProgress: newProgress };
        }
        
        case 'DELETE_UNIT_GRADE': {
          const { studentId, unitId } = action.payload;
          const studentProgress = state.studentProgress[studentId];
          if (!studentProgress || !studentProgress[unitId]) return state;
          const { grade, comment, ...restOfUnitProgress } = studentProgress[unitId];
          return {
            ...state,
            studentProgress: {
              ...state.studentProgress,
              [studentId]: {
                ...state.studentProgress[studentId],
                [unitId]: restOfUnitProgress as StudentUnitProgress,
              },
            },
          };
        }

        case 'SAVE_OFFLINE_TEST': {
          const newResult: OfflineTestResult = {
            ...action.payload,
            id: `offline-${Date.now()}`,
            timestamp: Date.now(),
          };
          const studentResults = state.offlineTestResults[action.payload.studentId] || [];
          return {
            ...state,
            offlineTestResults: {
              ...state.offlineTestResults,
              [action.payload.studentId]: [...studentResults, newResult],
            },
          };
        }

        case 'UPDATE_OFFLINE_TEST': {
            const { studentId } = action.payload;
            return {
                ...state,
                offlineTestResults: {
                    ...state.offlineTestResults,
                    [studentId]: (state.offlineTestResults[studentId] || []).map(r => r.id === action.payload.id ? action.payload : r)
                }
            };
        }

        case 'DELETE_OFFLINE_TEST_GRADE': {
            const { studentId, resultId } = action.payload;
            if (!state.offlineTestResults[studentId]) return state;
            return {
                ...state,
                offlineTestResults: {
                    ...state.offlineTestResults,
                    [studentId]: state.offlineTestResults[studentId].filter(r => r.id !== resultId)
                }
            };
        }

        case 'CREATE_ONLINE_TEST_SESSION': {
            const studentsForSession = action.payload.invitedStudentIds.reduce((acc, studentId) => {
                const student = state.users.find(u => u.id === studentId);
                if (student) {
                    acc[studentId] = { studentId: student.id, name: student.name, progress: 0, answers: [] };
                }
                return acc;
            }, {} as { [studentId: string]: OnlineTestSessionStudent });
    
            return {
                ...state,
                activeOnlineTestSession: {
                    id: `session-${Date.now()}`,
                    testId: action.payload.testId,
                    status: 'WAITING',
                    students: studentsForSession,
                    invitedStudentIds: action.payload.invitedStudentIds,
                },
            };
        }
        case 'JOIN_ONLINE_TEST_SESSION': {
            if (!state.activeOnlineTestSession || !state.currentUser) return state;
            const studentId = state.currentUser.id;
            const studentName = state.currentUser.name;
            return {
                ...state,
                activeOnlineTestSession: {
                    ...state.activeOnlineTestSession,
                    students: {
                        ...state.activeOnlineTestSession.students,
                        [studentId]: { studentId, name: studentName, progress: 0, answers: [] }
                    }
                }
            };
        }
        case 'START_ONLINE_TEST': {
            if (!state.activeOnlineTestSession) return state;
            return {
                ...state,
                activeOnlineTestSession: {
                    ...state.activeOnlineTestSession,
                    status: 'IN_PROGRESS',
                    startTime: Date.now(),
                }
            };
        }
        case 'SUBMIT_ONLINE_TEST_ANSWER': {
            if (!state.activeOnlineTestSession) return state;
            const { studentId, answers, progress } = action.payload;
            const student = state.activeOnlineTestSession.students[studentId];
            if (!student) return state;
            return {
                ...state,
                activeOnlineTestSession: {
                    ...state.activeOnlineTestSession,
                    students: {
                        ...state.activeOnlineTestSession.students,
                        [studentId]: { ...student, answers, progress }
                    }
                }
            };
        }
        case 'FINISH_ONLINE_TEST': {
             if (!state.activeOnlineTestSession) return state;
             const { studentId, timeFinished } = action.payload;
             const student = state.activeOnlineTestSession.students[studentId];
             if (!student) return state;
             return {
                 ...state,
                 activeOnlineTestSession: {
                     ...state.activeOnlineTestSession,
                     students: {
                         ...state.activeOnlineTestSession.students,
                         [studentId]: { ...student, timeFinished, progress: 100 }
                     }
                 }
             };
        }
        case 'CLOSE_ONLINE_TEST_SESSION': {
            // ... (Ваша полная логика для этого случая)
            return { ...state, activeOnlineTestSession: null };
        }
        case 'GRADE_ONLINE_TEST': {
            const { studentId, resultId, grade, status, comment } = action.payload;
            if (!state.onlineTestResults[studentId]) return state;
            return {
                ...state,
                onlineTestResults: {
                    ...state.onlineTestResults,
                    [studentId]: state.onlineTestResults[studentId].map(r => r.id === resultId ? { ...r, grade, status, comment } : r)
                }
            };
        }
        case 'DELETE_ONLINE_TEST_GRADE': {
            const { studentId, resultId } = action.payload;
            if (!state.onlineTestResults[studentId]) return state;
            return {
                ...state,
                onlineTestResults: {
                    ...state.onlineTestResults,
                    [studentId]: state.onlineTestResults[studentId].filter(r => r.id !== resultId)
                }
            };
        }
        case 'SEND_TEACHER_MESSAGE': {
            const newMessage: TeacherMessage = { id: `msg-${Date.now()}`, message: action.payload, timestamp: Date.now() };
            return { ...state, teacherMessages: [...state.teacherMessages, newMessage] };
        }
        case 'DELETE_TEACHER_MESSAGE': {
            return { ...state, teacherMessages: state.teacherMessages.filter(msg => msg.id !== action.payload.messageId) };
        }
        case 'SEND_ANNOUNCEMENT': {
            const newAnnouncement: Announcement = { id: `ann-${Date.now()}`, type: action.payload.type, message: action.payload.message, timestamp: Date.now() };
            return { ...state, announcements: [...state.announcements, newAnnouncement] };
        }
        case 'DELETE_ANNOUNCEMENT': {
            return { ...state, announcements: state.announcements.filter(ann => ann.id !== action.payload.announcementId) };
        }
        case 'CREATE_CHAT': {
            if (!state.currentUser) return state;
            const allParticipantIds = [...action.payload.participantIds, state.currentUser.id];
            const newChat: Chat = {
                id: `chat-${Date.now()}`,
                participants: allParticipantIds.map(userId => ({
                    userId,
                    name: state.users.find(u => u.id === userId)?.name || 'Unknown'
                })),
                messages: [],
                isGroup: action.payload.isGroup,
                name: action.payload.name
            };
            return { ...state, chats: [...state.chats, newChat] };
        }
        case 'SEND_MESSAGE': {
            if (!state.currentUser) return state;
            const newMessage: ChatMessage = {
                id: `msg-${Date.now()}-${Math.random()}`,
                senderId: state.currentUser.id,
                text: action.payload.text,
                timestamp: Date.now()
            };
            return {
                ...state,
                chats: state.chats.map(chat => chat.id === action.payload.chatId ? {
                    ...chat,
                    messages: [...chat.messages, newMessage],
                    lastRead: { ...chat.lastRead, [state.currentUser!.id]: newMessage.timestamp }
                } : chat)
            };
        }
        case 'MARK_AS_READ': {
            if (!state.currentUser) return state;
            return {
                ...state,
                chats: state.chats.map(chat => chat.id === action.payload.chatId ? {
                    ...chat,
                    lastRead: { ...chat.lastRead, [state.currentUser!.id]: Date.now() }
                } : chat)
            };
        }
        
        default:
            return state;
    }
};

const AppContext = createContext<{
  state: AppState;
  dispatch: Dispatch<Action>;
} | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastUpdateTime = useRef<number | null>(null);

    // Функция для проверки обновлений
    const checkForUpdates = useCallback(async () => {
        try {
            const res = await fetch('/api/data', { cache: 'no-store' }); 
            if (!res.ok) return;

            const lastModified = res.headers.get('Last-Modified');
            const newUpdateTime = lastModified ? new Date(lastModified).getTime() : null;

            if (newUpdateTime && newUpdateTime > (lastUpdateTime.current || 0)) {
                console.log("New data detected, reloading...");
                lastUpdateTime.current = newUpdateTime;
                
                const data = await res.json();
                if (data.record) {
                    dispatch({ type: 'SET_INITIAL_STATE', payload: { ...JSON.parse(data.record), isLoading: false } });
                }
            }
        } catch (error) {
            console.error("Failed to check for updates:", error);
        }
    }, []);

    useEffect(() => {
        const intervalId = setInterval(() => {
            if (state.currentUser) {
                checkForUpdates();
            }
        }, 7000); // 7 секунд

        return () => clearInterval(intervalId);
    }, [checkForUpdates, state.currentUser]);

    // Начальная загрузка данных
    useEffect(() => {
        const loadInitialData = async () => {
            dispatch({ type: 'SET_LOADING', payload: true });
            try {
                const res = await fetch('/api/data');
                if (!res.ok) {
                    if (res.status === 404) {
                        dispatch({ type: 'SET_INITIAL_STATE', payload: { isLoading: false } });
                        return;
                    }
                    throw new Error('Failed to load initial data');
                }
                const data = await res.json();
                if (data.record) {
                    const lastModified = res.headers.get('Last-Modified');
                    lastUpdateTime.current = lastModified ? new Date(lastModified).getTime() : Date.now();
                    dispatch({ type: 'SET_INITIAL_STATE', payload: { ...JSON.parse(data.record), isLoading: false } });
                } else {
                    dispatch({ type: 'SET_INITIAL_STATE', payload: { isLoading: false } });
                }
            } catch (error) {
                console.error("CRITICAL: Failed to load initial state.", error);
                dispatch({ type: 'SET_ERROR', payload: 'Не удалось загрузить данные с сервера.' });
            }
        };
        loadInitialData();
    }, []);
    
    // Сохранение данных
    useEffect(() => {
        if (state.isLoading || !state.currentUser) return;
        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(() => {
            const stateToSave: Partial<AppState> = { ...state };
            delete stateToSave.currentUser;
            delete stateToSave.error;
            delete stateToSave.isLoading;
            delete stateToSave.users;
            delete stateToSave.units;
            delete stateToSave.onlineTests;

            fetch('/api/data', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stateToSave),
            }).catch(error => console.error("Error saving state:", error));
        }, 1500);

    }, [state]);

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};