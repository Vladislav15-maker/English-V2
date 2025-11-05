import React, { createContext, useReducer, useEffect, useContext, Dispatch, useCallback, useRef } from 'react';
import { User, Unit, StudentUnitProgress, OfflineTestResult, OnlineTest, OnlineTestSession, TeacherMessage, OnlineTestResult, StudentAnswer, Round, Word, TestStatus, StudentRoundResult, Chat, ChatMessage, UserRole, Announcement } from '../types';
import { USERS, UNITS, ONLINE_TESTS } from '../constants';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// --- НАЧАЛО БЛОКА, КОТОРЫЙ БЫЛ ПРОПУЩЕН ---

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