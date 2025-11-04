import React, { createContext, useReducer, useEffect, useContext, Dispatch } from 'react';
import { User, Unit, StudentUnitProgress, OfflineTestResult, OnlineTest, OnlineTestSession, TeacherMessage, OnlineTestResult, StudentAnswer, Round, Word, TestStatus, StudentRoundResult, Chat, ChatMessage } from '../types';
import { USERS, UNITS, ONLINE_TESTS } from '../constants';

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
}

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
  isTestReminderActive: false,
  chats: [],
  presence: {},
  error: null,
};

type Action =
  | { type: 'LOGIN'; payload: { login: string; password: string } }
  | { type: 'LOGOUT' }
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
  | { type: 'UPDATE_SESSION_FROM_STORAGE'; payload: OnlineTestSession | null }
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
  switch (action.type) {
    case 'LOGIN': {
      const user = state.users.find(u => u.login === action.payload.login && u.password === action.payload.password);
      if (user) {
          const newPresence = { ...state.presence, [user.id]: 'online' as const };
          return { ...state, currentUser: user, error: null, presence: newPresence };
      }
      return { ...state, error: "Неверный логин или пароль" };
    }
    case 'LOGOUT': {
      if(state.currentUser) {
        const newPresence = { ...state.presence, [state.currentUser.id]: Date.now() };
        return { ...initialState, users: state.users, units: state.units, onlineTests: state.onlineTests, currentUser: null, presence: newPresence };
      }
      return { ...state, currentUser: null };
    }
    case 'SET_ERROR':
      return { ...state, error: action.payload };
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
        if (!newProgress[studentId][unitId]) {
            newProgress[studentId][unitId] = { unitId, rounds: {} };
        }
        newProgress[studentId][unitId].grade = grade;
        newProgress[studentId][unitId].comment = comment;
        return { ...state, studentProgress: newProgress };
    }
    case 'DELETE_UNIT_GRADE': {
        const { studentId, unitId } = action.payload;
        if (!state.studentProgress[studentId]?.[unitId]) return state;
        
        const newStudentProgress = {
            ...state.studentProgress,
            [studentId]: {
                ...state.studentProgress[studentId],
                [unitId]: {
                    ...state.studentProgress[studentId][unitId],
                },
            },
        };
        delete newStudentProgress[studentId][unitId].grade;
        delete newStudentProgress[studentId][unitId].comment;

        return { ...state, studentProgress: newStudentProgress };
    }
    case 'SAVE_OFFLINE_TEST': {
        const { studentId, testName, grade, status, comment } = action.payload;
        const newResults = JSON.parse(JSON.stringify(state.offlineTestResults));
        if (!newResults[studentId]) newResults[studentId] = [];
        newResults[studentId].push({ id: `offline-${Date.now()}`, studentId, testName, grade, status, comment, timestamp: Date.now() });
        return { ...state, offlineTestResults: newResults };
    }
    case 'UPDATE_OFFLINE_TEST': {
        const { studentId, id } = action.payload;
        if (!state.offlineTestResults[studentId]) return state;
        return {
            ...state,
            offlineTestResults: {
                ...state.offlineTestResults,
                [studentId]: state.offlineTestResults[studentId].map(r => r.id === id ? action.payload : r),
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
                [studentId]: state.offlineTestResults[studentId].map(result => {
                    if (result.id === resultId) {
                        const { grade, status, comment, ...rest } = result;
                        return rest as OfflineTestResult;
                    }
                    return result;
                })
            }
        };
    }
    case 'CREATE_ONLINE_TEST_SESSION': {
        if (!state.currentUser || state.currentUser.role !== 'TEACHER') return state;
        const test = state.onlineTests.find(t => t.id === action.payload.testId);
        if(!test) return state;

        const newSession: OnlineTestSession = {
            id: `session-${Date.now()}`,
            testId: action.payload.testId,
            teacherId: state.currentUser.id,
            status: 'WAITING',
            students: {},
            invitedStudentIds: action.payload.invitedStudentIds
        };
        return { ...state, activeOnlineTestSession: newSession };
    }
    case 'JOIN_ONLINE_TEST_SESSION': {
        if (!state.activeOnlineTestSession || !state.currentUser) return state;
        const { studentId } = action.payload;
        if (state.activeOnlineTestSession.students[studentId] || !state.activeOnlineTestSession.invitedStudentIds.includes(studentId)) return state;
        
        const newSession = { ...state.activeOnlineTestSession };
        newSession.students[studentId] = { studentId, name: state.currentUser.name, progress: 0, answers: [] };
        return { ...state, activeOnlineTestSession: newSession };
    }
    case 'START_ONLINE_TEST': {
        if (!state.activeOnlineTestSession) return state;
        return { ...state, activeOnlineTestSession: { ...state.activeOnlineTestSession, status: 'IN_PROGRESS', startTime: Date.now() }};
    }
    case 'SUBMIT_ONLINE_TEST_ANSWER': {
        if (!state.activeOnlineTestSession || state.activeOnlineTestSession.status !== 'IN_PROGRESS') return state;
        const { studentId, answers, progress } = action.payload;
        if (!state.activeOnlineTestSession.students[studentId]) return state;

        const newSession = { ...state.activeOnlineTestSession };
        newSession.students[studentId] = { ...newSession.students[studentId], answers, progress };
        return { ...state, activeOnlineTestSession: newSession };
    }
    case 'FINISH_ONLINE_TEST': {
        if (!state.activeOnlineTestSession || state.activeOnlineTestSession.status !== 'IN_PROGRESS' || !state.currentUser) return state;
        const { studentId, timeFinished } = action.payload;
        const studentData = state.activeOnlineTestSession.students[studentId];
        if (!studentData) return state;

        const test = state.onlineTests.find(t => t.id === state.activeOnlineTestSession!.testId);
        if (!test) return state;

        const newSession = { ...state.activeOnlineTestSession };
        newSession.students[studentId].timeFinished = timeFinished;
        
        const correctAnswers = studentData.answers.filter(a => a.correct).length;
        const score = Math.round((correctAnswers / test.words.length) * 100);

        const newResult: OnlineTestResult = {
            id: `online-${Date.now()}`,
            studentId,
            testId: test.id,
            score,
            answers: studentData.answers,
            timeTaken: (timeFinished - state.activeOnlineTestSession.startTime!) / 1000,
            timestamp: Date.now(),
        };

        const newResults = JSON.parse(JSON.stringify(state.onlineTestResults));
        if(!newResults[studentId]) newResults[studentId] = [];
        if(!newResults[studentId].some((r: OnlineTestResult) => r.id === newResult.id)) {
            newResults[studentId].push(newResult);
        }

        return { ...state, activeOnlineTestSession: newSession, onlineTestResults: newResults };
    }
    case 'CLOSE_ONLINE_TEST_SESSION': {
        return { ...state, activeOnlineTestSession: null };
    }
    case 'GRADE_ONLINE_TEST': {
        const { studentId, resultId, grade, status, comment } = action.payload;
        if (!state.onlineTestResults[studentId]) return state;
        
        return {
            ...state,
            onlineTestResults: {
                ...state.onlineTestResults,
                [studentId]: state.onlineTestResults[studentId].map(result => {
                    if (result.id === resultId) {
                        const newResult: OnlineTestResult = { ...result, status, comment };
                        if (grade !== undefined) {
                           newResult.grade = grade;
                        } else {
                           delete (newResult as Partial<OnlineTestResult>).grade;
                        }
                        return newResult;
                    }
                    return result;
                })
            },
        };
    }
    case 'DELETE_ONLINE_TEST_GRADE': {
        const { studentId, resultId } = action.payload;
        if (!state.onlineTestResults[studentId]) return state;
        return {
            ...state,
            onlineTestResults: {
                ...state.onlineTestResults,
                [studentId]: state.onlineTestResults[studentId].map(result => {
                    if (result.id === resultId) {
                        const { grade, status, comment, ...rest } = result;
                        return rest as OnlineTestResult;
                    }
                    return result;
                })
            }
        };
    }
    case 'SEND_TEACHER_MESSAGE':
        const newMessage: TeacherMessage = { id: `msg-${Date.now()}`, message: action.payload, timestamp: Date.now() };
        return { ...state, teacherMessages: [...state.teacherMessages, newMessage] };
    case 'UPDATE_TEACHER_MESSAGE': {
        return {
            ...state,
            teacherMessages: state.teacherMessages.map(msg =>
                msg.id === action.payload.messageId ? { ...msg, message: action.payload.newMessage } : msg
            )
        };
    }
    case 'DELETE_TEACHER_MESSAGE': {
        return {
            ...state,
            teacherMessages: state.teacherMessages.filter(msg => msg.id !== action.payload.messageId)
        };
    }
    case 'TOGGLE_TEST_REMINDER':
        return { ...state, isTestReminderActive: action.payload };
    case 'UPDATE_SESSION_FROM_STORAGE':
        return { ...state, activeOnlineTestSession: action.payload };
    case 'UPDATE_WORD_IMAGE': {
      const { unitId, roundId, wordId, imageUrl } = action.payload;
      const newUnits = state.units.map(unit => {
        if (unit.id === unitId) {
          return {
            ...unit,
            rounds: unit.rounds.map(round => {
              if (round.id === roundId) {
                return {
                  ...round,
                  words: round.words.map(word => {
                    if (word.id === wordId) {
                      return { ...word, image: imageUrl };
                    }
                    return word;
                  })
                };
              }
              return round;
            })
          };
        }
        return unit;
      });
      return { ...state, units: newUnits };
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
        return {
            ...state,
            units: state.units.filter(unit => unit.id !== action.payload.unitId)
        };
    }
    case 'ADD_ROUND': {
        const { unitId, roundName } = action.payload;
        const newUnits = JSON.parse(JSON.stringify(state.units));
        const unit = newUnits.find((u: Unit) => u.id === unitId);
        if (unit) {
            const newRound: Round = {
                id: `${unitId}-round-${Date.now()}`,
                name: roundName,
                words: []
            };
            unit.rounds.push(newRound);
        }
        return { ...state, units: newUnits };
    }
    case 'ADD_WORD_TO_ROUND': {
        const { unitId, roundId, word } = action.payload;
        const newUnits = JSON.parse(JSON.stringify(state.units));
        const unit = newUnits.find((u: Unit) => u.id === unitId);
        if (unit) {
            const round = unit.rounds.find((r: Round) => r.id === roundId);
            if (round) {
                const newWord: Word = {
                    ...word,
                    id: `${word.english.replace(/\s/g, '-')}-${Date.now()}`
                };
                round.words.push(newWord);
            }
        }
        return { ...state, units: newUnits };
    }
    case 'DELETE_ROUND': {
        const { unitId, roundId } = action.payload;
        const newUnits = state.units.map(unit => {
            if (unit.id === unitId) {
                return {
                    ...unit,
                    rounds: unit.rounds.filter(round => round.id !== roundId)
                };
            }
            return unit;
        });
        return { ...state, units: newUnits };
    }
    case 'DELETE_WORD': {
        const { unitId, roundId, wordId } = action.payload;
        const newUnits = state.units.map(unit => {
            if (unit.id === unitId) {
                return {
                    ...unit,
                    rounds: unit.rounds.map(round => {
                        if (round.id === roundId) {
                            return {
                                ...round,
                                words: round.words.filter(word => word.id !== wordId)
                            };
                        }
                        return round;
                    })
                };
            }
            return unit;
        });
        return { ...state, units: newUnits };
    }
    case 'CREATE_MISTAKE_UNIT': {
        const { studentId, testResult } = action.payload;
        let incorrectWords: Word[] = [];
        
        if ('answers' in testResult && testResult.answers) { // OnlineTestResult
            const test = state.onlineTests.find(t => t.id === testResult.testId);
            if (test) {
                incorrectWords = testResult.answers
                    .filter(a => !a.correct)
                    .map(a => test.words.find(w => w.id === a.wordId))
                    .filter((w): w is Word => !!w);
            }
        } else {
            // Placeholder for offline test mistake unit creation
            incorrectWords = [...state.units[0].rounds[0].words.slice(0, 3), ...state.units[1].rounds[1].words.slice(0, 2)];
        }

        if (incorrectWords.length === 0) return state;

        const newUnit: Unit = {
            id: `mistake-unit-${testResult.id}`,
            name: `Работа над ошибками (${'testName' in testResult ? testResult.testName : state.onlineTests.find(t=>t.id === testResult.testId)?.name})`,
            rounds: [{
                id: `mistake-unit-${testResult.id}-round-1`,
                name: 'Раунд 1',
                words: incorrectWords
            }],
            isMistakeUnit: true,
            sourceTestId: testResult.id,
        };
        
        const units = state.units.find(u => u.id === newUnit.id) ? state.units : [...state.units, newUnit];
        const newProgress = JSON.parse(JSON.stringify(state.studentProgress));
        if (!newProgress[studentId]) newProgress[studentId] = {};
        if (!newProgress[studentId][newUnit.id]) {
            newProgress[studentId][newUnit.id] = { unitId: newUnit.id, rounds: {} };
        }

        return { ...state, units, studentProgress: newProgress };
    }
    case 'CREATE_CHAT': {
        if (!state.currentUser) return state;
        const { participantIds, isGroup } = action.payload;
        const allParticipantIds = Array.from(new Set([state.currentUser.id, ...participantIds]));
        
        if (!isGroup) {
            const existingChat = state.chats.find(c => 
                !c.isGroup && 
                c.participants.length === 2 && 
                c.participants.every(p => allParticipantIds.includes(p.userId))
            );
            if (existingChat) return state;
        }

        const participants = allParticipantIds
            .map(id => state.users.find(u => u.id === id))
            .filter((u): u is User => !!u)
            .map(u => ({ userId: u.id, name: u.name }));
        
        const newChat: Chat = {
            id: `chat-${Date.now()}`,
            participants,
            messages: [],
            isGroup,
            lastRead: {}
        };

        return { ...state, chats: [...state.chats, newChat] };
    }
    case 'RENAME_CHAT': {
        const { chatId, newName } = action.payload;
        return {
            ...state,
            chats: state.chats.map(chat =>
                chat.id === chatId && chat.isGroup ? { ...chat, name: newName } : chat
            )
        };
    }
    case 'SEND_MESSAGE': {
        if (!state.currentUser) return state;
        const { chatId, text } = action.payload;

        const newMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            senderId: state.currentUser.id,
            text,
            timestamp: Date.now()
        };

        const newChats = state.chats.map(chat => {
            if (chat.id === chatId) {
                const updatedChat = {
                    ...chat,
                    messages: [...chat.messages, newMessage],
                    lastRead: { ...chat.lastRead, [state.currentUser!.id]: newMessage.timestamp }
                };
                return updatedChat;
            }
            return chat;
        });
        return { ...state, chats: newChats };
    }
    case 'MARK_AS_READ': {
        if (!state.currentUser) return state;
        const { chatId } = action.payload;
        const chat = state.chats.find(c => c.id === chatId);
        if (!chat || chat.messages.length === 0) return state;

        const lastMessageTimestamp = chat.messages[chat.messages.length - 1].timestamp;

        const newChats = state.chats.map(c => {
            if (c.id === chatId) {
                return {
                    ...c,
                    lastRead: { ...c.lastRead, [state.currentUser!.id]: lastMessageTimestamp }
                };
            }
            return c;
        });

        return { ...state, chats: newChats };
    }
    case 'UPDATE_PRESENCE': {
      if(!state.currentUser) return state;
      return {
        ...state,
        presence: {
          ...state.presence,
          [state.currentUser.id]: 'online'
        }
      }
    }
    default:
      return state;
  }
};

const APP_STATE_KEY = 'englishCourseState';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState, (initial) => {
    try {
      const storedState = localStorage.getItem(APP_STATE_KEY);
      if (storedState) {
        const parsed = JSON.parse(storedState);
        
        const initialUnitsById = new Map(initial.units.map(u => [u.id, u]));
        const storedUnits = parsed.units || [];
        const combinedUnits = [...storedUnits];
        
        initial.units.forEach(initialUnit => {
            if (!combinedUnits.some(storedUnit => storedUnit.id === initialUnit.id)) {
                combinedUnits.push(initialUnit);
            } else {
                 const stored = combinedUnits.find(s => s.id === initialUnit.id)!;
                 stored.rounds = initialUnit.rounds;
            }
        });
        
        return {
           ...initial,
           ...parsed,
           units: combinedUnits,
           users: USERS, 
           onlineTests: ONLINE_TESTS,
        };
      }
    } catch (error) {
      console.error("Error parsing state from localStorage", error);
    }
    return initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Error saving state to localStorage", error);
    }
  }, [state]);

  useEffect(() => {
    const poll = setInterval(() => {
        try {
            const storedState = localStorage.getItem(APP_STATE_KEY);
            if (storedState) {
                const parsedState = JSON.parse(storedState);
                if (JSON.stringify(parsedState.activeOnlineTestSession) !== JSON.stringify(state.activeOnlineTestSession)) {
                    dispatch({ type: 'UPDATE_SESSION_FROM_STORAGE', payload: parsedState.activeOnlineTestSession });
                }
            }
        } catch (e) {
            console.error("Polling error", e);
        }
    }, 1000);

    const presenceInterval = setInterval(() => {
      if(state.currentUser) {
        dispatch({ type: 'UPDATE_PRESENCE' });
      }
    }, 30000); // Update presence every 30 seconds

    return () => {
      clearInterval(poll);
      clearInterval(presenceInterval);
      if (state.currentUser) {
          const newPresence = { ...state.presence, [state.currentUser.id]: Date.now() };
          const finalState = { ...state, presence: newPresence };
          localStorage.setItem(APP_STATE_KEY, JSON.stringify(finalState));
      }
    }
  }, [state.activeOnlineTestSession, state.currentUser]);


  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);