import React, { createContext, useReducer, useEffect, useContext, Dispatch, useCallback, useRef } from 'react';
import { User, Unit, StudentUnitProgress, OfflineTestResult, OnlineTest, OnlineTestSession, TeacherMessage, OnlineTestResult, StudentAnswer, Round, Word, TestStatus, StudentRoundResult, Chat, ChatMessage, UserRole, Announcement } from '../types';
import { USERS, UNITS, ONLINE_TESTS } from '../constants';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

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
  | { type: 'SEND_ANNOUNCEMENT'; payload: { type: 'active' | 'info', message: string } }
  | { type: 'DELETE_ANNOUNCEMENT'; payload: { announcementId: string } }
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
  | { type: 'RECEIVE_MESSAGE'; payload: { chatId: string, message: ChatMessage } }
  | { type: 'MARK_AS_READ'; payload: { chatId: string } }
  | { type: 'UPDATE_PRESENCE' };

const appReducer = (state: AppState, action: Action): AppState => {
    // Весь reducer остается без изменений
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
            if (state.currentUser) {
                const newPresence = { ...state.presence, [state.currentUser.id]: Date.now() };
                const { currentUser, ...persistedState } = initialState;
                return { ...persistedState, ...state, currentUser: null, presence: newPresence, isLoading: false };
            }
            return { ...state, currentUser: null };
        }
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_INITIAL_STATE':
            return { 
                ...state, 
                ...action.payload, 
                users: USERS, 
                units: UNITS.map(unit => action.payload.units?.find((u: Unit) => u.id === unit.id) || unit),
                onlineTests: ONLINE_TESTS,
                isLoading: false 
            };
        case 'SET_ERROR':
            return { ...state, error: action.payload, isLoading: false };
        
        case 'SUBMIT_ROUND_TEST': {
            const { studentId, unitId, roundId, result } = action.payload;
            const newProgress = JSON.parse(JSON.stringify(state.studentProgress));
            if (!newProgress[studentId]) newProgress[studentId] = {};
            if (!newProgress[studentId][unitId]) newProgress[studentId][unitId] = { unitId, rounds: {} };
            newProgress[studentId][unitId].rounds[roundId] = { ...result, roundId, completed: true };
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
            const studentResults = state.offlineTestResults[studentId];
            if (!studentResults) return state;

            return {
                ...state,
                offlineTestResults: {
                    ...state.offlineTestResults,
                    [studentId]: studentResults.filter(r => r.id !== resultId)
                }
            };
        }

        case 'DELETE_ONLINE_TEST_GRADE': {
            const { studentId, resultId } = action.payload;
            const studentResults = state.onlineTestResults[studentId];
            if (!studentResults) return state;

            return {
                ...state,
                onlineTestResults: {
                    ...state.onlineTestResults,
                    [studentId]: studentResults.filter(r => r.id !== resultId)
                }
            };
        }

        case 'GRADE_ONLINE_TEST': {
            const { studentId, resultId, grade, status, comment } = action.payload;
            const studentResults = state.onlineTestResults[studentId];
            if (!studentResults) return state;
            
            return {
                ...state,
                onlineTestResults: {
                    ...state.onlineTestResults,
                    [studentId]: studentResults.map(r => r.id === resultId ? {...r, grade, status, comment} : r)
                }
            };
        }
        
        case 'CLOSE_ONLINE_TEST_SESSION': {
            if (!state.activeOnlineTestSession) return state;
             const session = state.activeOnlineTestSession;
             const test = state.onlineTests.find(t => t.id === session.testId);
             const newResults = { ...state.onlineTestResults };

            Object.values(session.students).forEach(student => {
                 if (!newResults[student.studentId]) {
                    newResults[student.studentId] = [];
                 }
                 const score = test ? Math.round((student.answers.filter(a => a.correct).length / test.words.length) * 100) : 0;
                 const timeTaken = student.timeFinished && session.startTime ? (student.timeFinished - session.startTime) / 1000 : (test?.durationMinutes || 0) * 60;
                 
                 const existingResult = newResults[student.studentId].find(r => r.id === session.id + student.studentId);
                 if (!existingResult) {
                     newResults[student.studentId].push({
                        id: session.id + student.studentId,
                        studentId: student.studentId,
                        testId: session.testId,
                        score,
                        answers: student.answers,
                        timeTaken,
                        timestamp: Date.now()
                     });
                 }
             });

            return { ...state, activeOnlineTestSession: null, onlineTestResults: newResults };
        }

        case 'SEND_TEACHER_MESSAGE': {
            const newMessage: TeacherMessage = {
                id: `msg-${Date.now()}`,
                message: action.payload,
                timestamp: Date.now(),
            };
            return {
                ...state,
                teacherMessages: [...state.teacherMessages, newMessage],
            };
        }

        case 'UPDATE_TEACHER_MESSAGE': {
            return {
                ...state,
                teacherMessages: state.teacherMessages.map(msg => 
                    msg.id === action.payload.messageId 
                    ? { ...msg, message: action.payload.newMessage, timestamp: Date.now() } 
                    : msg
                )
            };
        }

        case 'DELETE_TEACHER_MESSAGE': {
            return {
                ...state,
                teacherMessages: state.teacherMessages.filter(
                    (msg) => msg.id !== action.payload.messageId
                ),
            };
        }
        
        case 'SEND_ANNOUNCEMENT': {
            const newAnnouncement: Announcement = {
                id: `ann-${Date.now()}`,
                type: action.payload.type,
                message: action.payload.message,
                timestamp: Date.now(),
            };
            return {
                ...state,
                announcements: [...state.announcements, newAnnouncement],
            };
        }

        case 'DELETE_ANNOUNCEMENT': {
            return {
                ...state,
                announcements: state.announcements.filter(
                    (ann) => ann.id !== action.payload.announcementId
                ),
            };
        }
        
        case 'ADD_UNIT': {
            const { unitName, isMistakeUnit, sourceTestId, sourceTestName } = action.payload;
            const newUnit: Unit = {
                id: `unit-${Date.now()}`,
                name: unitName,
                rounds: [],
                isMistakeUnit,
                sourceTestId,
                sourceTestName,
            };
            return { ...state, units: [...state.units, newUnit] };
        }
        
        case 'DELETE_UNIT': {
            return { ...state, units: state.units.filter(u => u.id !== action.payload.unitId) };
        }

        case 'ADD_ROUND': {
            const { unitId, roundName } = action.payload;
            const newRound: Round = { id: `round-${Date.now()}`, name: roundName, words: [] };
            return {
                ...state,
                units: state.units.map(u => u.id === unitId ? { ...u, rounds: [...u.rounds, newRound] } : u)
            };
        }

        case 'DELETE_ROUND': {
            const { unitId, roundId } = action.payload;
            return {
                ...state,
                units: state.units.map(u => u.id === unitId ? { ...u, rounds: u.rounds.filter(r => r.id !== roundId) } : u)
            };
        }

        case 'ADD_WORD_TO_ROUND': {
            const { unitId, roundId, word } = action.payload;
            const newWord: Word = { ...word, id: `word-${Date.now()}` };
            return {
                ...state,
                units: state.units.map(u => u.id === unitId ? {
                    ...u,
                    rounds: u.rounds.map(r => r.id === roundId ? { ...r, words: [...r.words, newWord] } : r)
                } : u)
            };
        }

        case 'DELETE_WORD': {
            const { unitId, roundId, wordId } = action.payload;
            return {
                ...state,
                units: state.units.map(u => u.id === unitId ? {
                    ...u,
                    rounds: u.rounds.map(r => r.id === roundId ? { ...r, words: r.words.filter(w => w.id !== wordId) } : r)
                } : u)
            };
        }
        
        case 'UPDATE_WORD_IMAGE': {
            const { unitId, roundId, wordId, imageUrl } = action.payload;
            const newUnits = state.units.map(u => {
                if (u.id === unitId) {
                    return {
                        ...u,
                        rounds: u.rounds.map(r => {
                            if (r.id === roundId) {
                                return {
                                    ...r,
                                    words: r.words.map(w => w.id === wordId ? { ...w, image: imageUrl } : w)
                                };
                            }
                            return r;
                        })
                    };
                }
                return u;
            });
            return { ...state, units: newUnits };
        }

        case 'CREATE_CHAT': {
            if (!state.currentUser) return state;
            const allParticipantIds = Array.from(new Set([...action.payload.participantIds, state.currentUser.id]));
            if (!action.payload.isGroup) {
                const existingChat = state.chats.find(chat =>
                    !chat.isGroup &&
                    chat.participants.length === allParticipantIds.length &&
                    chat.participants.every(p => allParticipantIds.includes(p.userId))
                );
                if (existingChat) return state;
            }
            const newChat: Chat = {
                id: `chat-${Date.now()}`,
                participants: allParticipantIds.map(userId => {
                    const user = state.users.find(u => u.id === userId);
                    return { userId: userId, name: user?.name || 'Unknown' };
                }),
                messages: [],
                isGroup: action.payload.isGroup,
                lastRead: {},
            };
            return { ...state, chats: [...state.chats, newChat] };
        }

        case 'RENAME_CHAT': {
            return {
                ...state,
                chats: state.chats.map(c => c.id === action.payload.chatId ? { ...c, name: action.payload.newName } : c)
            }
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

        case 'RECEIVE_MESSAGE': {
            const { chatId, message } = action.payload;
            const chatExists = state.chats.find(c => c.id === chatId);
            if (chatExists && chatExists.messages.some(m => m.id === message.id)) {
                return state;
            }
            return {
                ...state,
                chats: state.chats.map(chat => {
                    if (chat.id === chatId) {
                        return { ...chat, messages: [...chat.messages, message] };
                    }
                    return chat;
                })
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
}>({
  state: initialState,
  dispatch: () => null,
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);
    
    const latestState = useRef(state);
    useEffect(() => {
        latestState.current = state;
    }, [state]);

    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const reloadStateFromCloud = useCallback(async () => {
        console.log("Real-time update received from Supabase! Reloading state...");
        try {
            const res = await fetch('/api/data');
            if (!res.ok) {
                const errorText = await res.text();
                if (errorText.startsWith('<!DOCTYPE html')) {
                     throw new Error(`API returned HTML. Check Vercel routing.`);
                }
                throw new Error(`Failed to fetch data: ${errorText}`);
            };
            const data = await res.json();
            
            if (!data.record) {
                throw new Error("Invalid data from API: 'record' field is missing.");
            }

            const cloudState = data.record;
            
            dispatch({ type: 'SET_INITIAL_STATE', payload: { ...cloudState, isLoading: false } });

        } catch (error) {
            console.error("Failed to reload state for real-time update:", error);
        }
    }, []);

    useEffect(() => {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.warn("Supabase keys are not defined. Real-time updates will be disabled.");
            return;
        }

        let client: SupabaseClient | null = null;
        let channel: RealtimeChannel | null = null;
        try {
            client = createClient(supabaseUrl, supabaseKey);
            channel = client.channel('main-channel');

            channel
              .on(
                'broadcast',
                { event: 'state-updated' },
                () => {
                  reloadStateFromCloud();
                }
              )
              .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                  console.log('Successfully subscribed to Supabase channel!');
                }
                if (status === 'CHANNEL_ERROR') {
                  console.error('Supabase channel error:', err);
                }
              });
            
            return () => {
              if (client && channel) {
                client.removeChannel(channel);
              }
            };
        } catch (error) {
            console.error("Failed to initialize Supabase. Real-time will be disabled.", error);
        }
    }, [reloadStateFromCloud]);

    const saveStateToCloud = useCallback(() => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }
        if (!latestState.current.currentUser) return;
        
        debounceTimer.current = setTimeout(() => {
            const stateToSave = { ...latestState.current };
            delete (stateToSave as Partial<AppState>).currentUser;
            delete (stateToSave as Partial<AppState>).error;
            delete (stateToSave as Partial<AppState>).isLoading;
            delete (stateToSave as Partial<AppState>).users;
            delete (stateToSave as Partial<AppState>).units;
            delete (stateToSave as Partial<AppState>).onlineTests;

            fetch('/api/data', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stateToSave),
            })
            .catch(error => {
                console.error("Failed to save state:", error);
                dispatch({ type: 'SET_ERROR', payload: "Ошибка сохранения." });
            });
        }, 1500);
    }, []);

    useEffect(() => {
        const loadStateFromCloud = async () => {
            dispatch({ type: 'SET_LOADING', payload: true });
            try {
                const res = await fetch('/api/data');
                if (!res.ok) {
                    const errorText = await res.text();
                    if (errorText.startsWith('<!DOCTYPE html')) {
                         throw new Error(`API /api/data returned HTML. Check Vercel routing.`);
                    }
                    throw new Error(`Failed to fetch initial data: ${errorText}`);
                }
                const data = await res.json();
                
                if (!data.record) {
                    console.warn("Data from cloud is in unexpected format, initializing with defaults.");
                    dispatch({ type: 'SET_INITIAL_STATE', payload: { isLoading: false } }); 
                    return;
                }

                const cloudState = data.record;
                dispatch({ type: 'SET_INITIAL_STATE', payload: { ...cloudState, isLoading: false } });

            } catch (error) {
                console.error("CRITICAL: Failed to load state from cloud.", error);
                dispatch({ type: 'SET_ERROR', payload: 'Не удалось загрузить данные. Проверьте конфигурацию сервера.' });
                dispatch({ type: 'SET_INITIAL_STATE', payload: { isLoading: false } });
            }
        };

        loadStateFromCloud();
    }, []);

    useEffect(() => {
        if (!state.isLoading && state.currentUser) {
            // Запускаем сохранение при изменении любых данных, которые нужно синхронизировать
            saveStateToCloud();
        }
    }, [state.currentUser, state.isLoading, saveStateToCloud, state.studentProgress, state.offlineTestResults, state.onlineTestResults, state.teacherMessages, state.announcements, state.chats]);


    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);