import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Unit, Round, Word, TestStatus, OnlineTestSessionStudent, StudentRoundResult, StudentUnitProgress, StageType, StageAnswer, StageResult, StudentAnswer, Chat, User, ChatMessage, Announcement, OnlineTest, OnlineTestResult } from '@/types';
import { ChevronLeftIcon, VolumeUpIcon, CheckCircleIcon, XCircleIcon, ClockIcon, BellIcon, ArrowRightIcon, AcademicCapIcon, ChartBarIcon, ChatBubbleLeftRightIcon, PaperAirplaneIcon, EyeIcon, UserGroupIcon, CheckIcon, PencilIcon, InformationCircleIcon, ExclamationTriangleIcon } from '@/components/common/Icons';
import SecureInput from '@/components/common/SecureInput';
import Modal from '@/components/common/Modal';

type Stage = 'learn' | 'write' | 'choice_text' | 'choice_image' | 'results';

const RoundFlow: React.FC<{ unit: Unit; round: Round; onBack: () => void }> = ({ unit, round, onBack }) => {
    const { state, dispatch } = useAppContext();
    const [currentStage, setCurrentStage] = useState<Stage>('learn');
    const [stageResults, setStageResults] = useState<{ [key in StageType]?: StageResult }>({});

    const handleStageComplete = (type: StageType, result: StageResult) => {
        const newResults = { ...stageResults, [type]: result };
        setStageResults(newResults);

        if (type === StageType.Writing) setCurrentStage('choice_text');
        else if (type === StageType.ChoiceText) setCurrentStage('choice_image');
        else if (type === StageType.ChoiceImage) {
            const totalScore = Object.values(newResults).reduce((sum: number, res) => sum + ((res as StageResult)?.score || 0), 0);
            const overallScore = Math.round(totalScore / Object.keys(newResults).length);
            
            dispatch({
                type: 'SUBMIT_ROUND_TEST',
                payload: {
                    studentId: state.currentUser!.id,
                    unitId: unit.id,
                    roundId: round.id,
                    result: {
                        overallScore,
                        stages: newResults
                    }
                }
            });
            setCurrentStage('results');
        }
    };

    const shuffleArray = <T,>(array: T[]): T[] => {
        return [...array].sort(() => Math.random() - 0.5);
    };

    const renderCurrentStage = () => {
        switch (currentStage) {
            case 'learn':
                return <LearnStage round={round} onNext={() => setCurrentStage('write')} />;
            case 'write':
                return <WriteStage round={round} onComplete={(result) => handleStageComplete(StageType.Writing, result)} />;
            case 'choice_text':
                return <ChoiceTextStage round={round} onComplete={(result) => handleStageComplete(StageType.ChoiceText, result)} shuffleFn={shuffleArray} />;
            case 'choice_image':
                return <ChoiceImageStage round={round} onComplete={(result) => handleStageComplete(StageType.ChoiceImage, result)} shuffleFn={shuffleArray} />;
            case 'results':
                return <ResultsStage stageResults={stageResults} onBack={onBack} />;
            default:
                return null;
        }
    };
    
    return (
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col items-center">
            <div className="w-full max-w-2xl">
                 <div className="flex justify-between items-center mb-4">
                    <button onClick={onBack} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium">
                        <ChevronLeftIcon className="w-5 h-5" /> Назад
                    </button>
                    <div className="text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full capitalize">
                        {round.name} - {
                            { learn: 'Изучение', write: 'Правописание', choice_text: 'Выбор слова', choice_image: 'Выбор картинки', results: 'Результаты' }[currentStage]
                        }
                    </div>
                </div>
                {renderCurrentStage()}
            </div>
        </div>
    );
};

const LearnStage: React.FC<{ round: Round; onNext: () => void }> = ({ round, onNext }) => {
    const speak = (text: string) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        speechSynthesis.speak(utterance);
    };
    return (
        <div className="w-full animate-fade-in">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {round.words.map(word => (
                     <div key={word.id} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
                        <div className="w-full h-40 bg-slate-100 flex items-center justify-center">
                            {word.image ? (
                                <img src={word.image} alt={word.english} className="w-full h-full object-contain" />
                            ) : (
                                <span className="text-slate-400">Image Missing</span>
                            )}
                        </div>
                        <div className="p-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold">{word.english}</h3>
                                <p>{word.russian}</p>
                                <p className="text-sm text-slate-500">[{word.transcription}]</p>
                            </div>
                            <button onClick={() => speak(word.english)} className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-slate-800 hover:bg-yellow-500 flex-shrink-0">
                                <VolumeUpIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-8 text-center">
                <button onClick={onNext} className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700">
                    Начать тест
                </button>
            </div>
        </div>
    );
};

const useTestStage = (round: Round) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<StageAnswer[]>([]);
    const [isComplete, setIsComplete] = useState(false);
    const currentWord = round.words[currentIndex];

    const submitAnswer = (answer: Omit<StageAnswer, 'wordId'>) => {
        const newAnswer = { ...answer, wordId: currentWord.id };
        setAnswers(prev => [...prev, newAnswer]);

        if (currentIndex < round.words.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setIsComplete(true);
        }
    };

    return { currentIndex, answers, isComplete, currentWord, submitAnswer };
};

const WriteStage: React.FC<{ round: Round; onComplete: (result: StageResult) => void }> = ({ round, onComplete }) => {
    const { currentIndex, answers, isComplete, currentWord, submitAnswer } = useTestStage(round);
    const [inputValue, setInputValue] = useState('');
    const [feedback, setFeedback] = useState<{ status: 'correct' | 'incorrect', word: string } | null>(null);

    const handleCheck = () => {
        if (feedback) return;
        const studentAnswer = inputValue.trim().toLowerCase();
        const correctAnswer = currentWord.english.toLowerCase();
        const alternatives = currentWord.alternatives?.map((a: string) => a.toLowerCase()) || [];
        const isCorrect = studentAnswer === correctAnswer || alternatives.includes(studentAnswer);

        setFeedback({ status: isCorrect ? 'correct' : 'incorrect', word: currentWord.english });
        
        setTimeout(() => {
            submitAnswer({
                studentAnswer: inputValue.trim(),
                correct: isCorrect,
                question: currentWord.russian,
                correctAnswer: currentWord.english
            });
            setInputValue('');
            setFeedback(null);
        }, 2000);
    };

     useEffect(() => {
        if (isComplete) {
            const correctCount = answers.filter(a => a.correct).length;
            const score = Math.round((correctCount / round.words.length) * 100);
            onComplete({ type: StageType.Writing, answers, score });
        }
    }, [isComplete, onComplete, answers, round.words.length]);

    const feedbackRingClass = feedback ? (feedback.status === 'correct' ? 'ring-2 ring-green-500' : 'ring-2 ring-red-500') : 'focus:ring-indigo-500';

    return (
        <div className="bg-white rounded-xl shadow-2xl p-8 text-center animate-fade-in w-full">
            <p className="text-sm text-slate-500">Вопрос {currentIndex + 1} / {round.words.length}</p>
            {currentWord.image ? (
                <img src={currentWord.image} alt={currentWord.english} className="w-full max-h-56 object-contain rounded-lg my-4" />
            ) : (
                <div className="w-full h-56 bg-slate-100 flex items-center justify-center rounded-lg my-4 text-slate-400">Image Missing</div>
            )}
            <h3 className="text-2xl font-bold mb-4">{currentWord.russian}</h3>
            <SecureInput
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCheck()}
                placeholder="Введите перевод..."
                className={`w-full text-center text-xl ${feedbackRingClass}`}
                autoFocus
                disabled={!!feedback}
            />
            <div className="h-14 mt-2">
                {feedback && (
                    <div className="animate-fade-in">
                        <p className={`font-bold ${feedback.status === 'correct' ? 'text-green-600' : 'text-red-600'}`}>
                            {feedback.status === 'correct' ? 'Правильно!' : 'Неправильно!'}
                            {feedback.status === 'incorrect' && ` Правильно: ${feedback.word}`}
                        </p>
                    </div>
                )}
            </div>
            <button onClick={handleCheck} className="mt-2 w-full px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-slate-400" disabled={!inputValue.trim() || !!feedback}>
                Проверить
            </button>
        </div>
    );
};

const ChoiceStage: React.FC<{
    round: Round;
    onComplete: (result: StageResult) => void;
    stageType: StageType.ChoiceText | StageType.ChoiceImage;
    shuffleFn: <T>(array: T[]) => T[];
}> = ({ round, onComplete, stageType, shuffleFn }) => {
    const { currentIndex, answers, isComplete, currentWord, submitAnswer } = useTestStage(round);
    const [feedback, setFeedback] = useState<{ correct: boolean, selected: string } | null>(null);

    const options = useMemo(() => {
        const distractors = shuffleFn(round.words.filter(w => w.id !== currentWord.id)).slice(0, 3);
        const correctValue = stageType === 'CHOICE_TEXT' ? currentWord.russian : currentWord.image;
        const distractorValues = distractors.map(d => stageType === 'CHOICE_TEXT' ? d.russian : d.image);
        return shuffleFn([correctValue, ...distractorValues]);
    }, [currentWord, round.words, stageType, shuffleFn]);
    
    const handleSelect = (selectedValue: string) => {
        if (feedback) return;
        
        const correctValue = stageType === 'CHOICE_TEXT' ? currentWord.russian : currentWord.image;
        const isCorrect = selectedValue === correctValue;
        
        setFeedback({ correct: isCorrect, selected: selectedValue });

        setTimeout(() => {
            submitAnswer({
                studentAnswer: selectedValue,
                correct: isCorrect,
                question: currentWord.english,
                correctAnswer: correctValue
            });
            setFeedback(null);
        }, 2000);
    };

    useEffect(() => {
        if (isComplete) {
            const correctCount = answers.filter(a => a.correct).length;
            const score = Math.round((correctCount / round.words.length) * 100);
            onComplete({ type: stageType, answers, score });
        }
    }, [isComplete, onComplete, stageType, answers, round.words.length]);

    return (
        <div className="bg-white rounded-xl shadow-2xl p-8 text-center animate-fade-in w-full">
            <p className="text-sm text-slate-500">Вопрос {currentIndex + 1} / {round.words.length}</p>
            <h3 className="text-3xl font-bold my-4">{currentWord.english}</h3>
            {stageType === 'CHOICE_TEXT' && (
                currentWord.image ? 
                <img src={currentWord.image} alt="word hint" className="w-full h-40 object-contain bg-slate-100 rounded-lg mb-4"/>
                : <div className="w-full h-40 bg-slate-100 flex items-center justify-center rounded-lg mb-4 text-slate-400">Image Missing</div>
            )}
            <div className={`grid ${stageType === 'CHOICE_TEXT' ? 'grid-cols-1' : 'grid-cols-2'} gap-4 mt-4`}>
                {options.map((option, idx) => {
                    let buttonClass = "p-4 rounded-lg border-2 transition text-center font-semibold ";
                    if(stageType === 'CHOICE_IMAGE') buttonClass += " h-32 flex items-center justify-center";

                    const correctValue = stageType === 'CHOICE_TEXT' ? currentWord.russian : currentWord.image;

                    if (feedback && option === correctValue) {
                        buttonClass += " bg-green-100 border-green-500";
                    } else if (feedback && option === feedback.selected) {
                        buttonClass += " bg-red-100 border-red-500";
                    } else {
                        buttonClass += " bg-slate-50 border-slate-200 hover:bg-indigo-50 hover:border-indigo-400";
                    }

                    return stageType === 'CHOICE_TEXT' ? (
                        <button key={idx} onClick={() => handleSelect(option)} disabled={!!feedback} className={buttonClass}>
                            {option}
                        </button>
                    ) : (
                        <button key={idx} onClick={() => handleSelect(option)} disabled={!!feedback} className={buttonClass}>
                            {option ? 
                                <img src={option} alt="option" className="max-h-full max-w-full object-contain"/>
                                : <span className="text-slate-400">Image Missing</span>
                            }
                        </button>
                    )
                })}
            </div>
        </div>
    );
};

const ChoiceTextStage: React.FC<{ round: Round; onComplete: (result: StageResult) => void; shuffleFn: <T>(array: T[]) => T[]; }> = (props) => 
    <ChoiceStage {...props} stageType={StageType.ChoiceText} />;

const ChoiceImageStage: React.FC<{ round: Round; onComplete: (result: StageResult) => void; shuffleFn: <T>(array: T[]) => T[]; }> = (props) => 
    <ChoiceStage {...props} stageType={StageType.ChoiceImage} />;

const ResultsStage: React.FC<{ stageResults: { [key in StageType]?: StageResult }; onBack: () => void }> = ({ stageResults, onBack }) => {
    const totalScore = Object.values(stageResults).reduce((sum: number, res) => sum + ((res as StageResult)?.score || 0), 0);
    const overallScore = Math.round(totalScore / Object.keys(stageResults).length);
    
    return (
        <div className="w-full text-center animate-fade-in">
            <h2 className="text-3xl font-bold mb-2">Раунд завершен!</h2>
            <p className="text-5xl font-bold my-4" style={{ color: overallScore > 70 ? '#10B981' : overallScore > 40 ? '#F59E0B' : '#EF4444' }}>
                {overallScore}%
            </p>
            <div className="space-y-2 my-6 text-left max-w-sm mx-auto">
                {Object.entries(stageResults).map(([type, result]) => (
                    <div key={type} className="flex justify-between p-2 bg-slate-100 rounded-md">
                        <span className="font-semibold">
                            {{ [StageType.Writing]: 'Правописание', [StageType.ChoiceText]: 'Выбор слова', [StageType.ChoiceImage]: 'Выбор картинки' }[type as StageType]}
                        </span>
                        <span>{(result as StageResult)?.score}%</span>
                    </div>
                ))}
            </div>
            <button onClick={onBack} className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700">
                Вернуться к юнитам
            </button>
        </div>
    );
};

const OnlineTestSession: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
    const { state, dispatch } = useAppContext();
    const { currentUser, activeOnlineTestSession } = state;
    const test = state.onlineTests.find((t: OnlineTest) => t.id === activeOnlineTestSession?.testId);
    const [timeLeft, setTimeLeft] = useState(test ? test.durationMinutes * 60 : 0);

    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [answers, setAnswers] = useState<StudentAnswer[]>([]);
    const [isFinished, setIsFinished] = useState(false);
    const [showReview, setShowReview] = useState(false);

    const finishTest = useCallback(() => {
        if (!isFinished && currentUser) {
            setIsFinished(true);
            dispatch({ type: 'FINISH_ONLINE_TEST', payload: { studentId: currentUser.id, timeFinished: Date.now() } });
        }
    }, [isFinished, currentUser, dispatch]);
    
    useEffect(() => {
        if (activeOnlineTestSession?.status === 'IN_PROGRESS' && test) {
            const timer = setInterval(() => {
                const elapsed = (Date.now() - activeOnlineTestSession.startTime!) / 1000;
                const remaining = Math.max(0, (test.durationMinutes * 60) - elapsed);
                setTimeLeft(Math.round(remaining));
                if (remaining <= 0) {
                    clearInterval(timer);
                    finishTest();
                }
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [activeOnlineTestSession?.status, activeOnlineTestSession?.startTime, test, finishTest]);

    const handleCheck = useCallback(() => {
        if (!test) return;
        const currentWord = test.words[currentWordIndex];
        const studentAnswer = inputValue.trim().toLowerCase();
        const correctAnswer = currentWord.english.toLowerCase();
        const alternatives = currentWord.alternatives?.map((a: string) => a.toLowerCase()) || [];
        const isCorrect = studentAnswer === correctAnswer || alternatives.includes(studentAnswer);

        const newAnswer: StudentAnswer = { wordId: currentWord.id, studentAnswer: inputValue.trim(), correct: isCorrect };
        const updatedAnswers = [...answers, newAnswer];
        setAnswers(updatedAnswers);

        if (currentUser) {
            dispatch({ type: 'SUBMIT_ONLINE_TEST_ANSWER', payload: { studentId: currentUser.id, answers: updatedAnswers, progress: Math.round(((currentWordIndex + 1) / test.words.length) * 100) } });
        }
        
        setInputValue('');
        if (currentWordIndex < test.words.length - 1) {
            setCurrentWordIndex(prev => prev + 1);
        } else {
            finishTest();
        }
    }, [test, currentWordIndex, inputValue, answers, currentUser, dispatch, finishTest]);

    if (!test || !activeOnlineTestSession) return <p>Загрузка теста...</p>;

    const currentWord = test.words[currentWordIndex];

    if (isFinished) {
        const studentResult = state.onlineTestResults[currentUser!.id]?.find((r: OnlineTestResult) => r.testId === test.id);
        
        return (
            <div className="p-4 sm:p-6 lg:p-8 text-center animate-fade-in">
                <h2 className="text-3xl font-bold mb-4">Тест завершен!</h2>
                <p className="text-slate-500 mb-4">Ожидайте, пока учитель завершит сессию.</p>
                {studentResult && (
                    <div className='flex items-center justify-center gap-4'>
                        <p className="text-5xl font-bold" style={{ color: studentResult.score > 70 ? '#10B981' : studentResult.score > 40 ? '#F59E0B' : '#EF4444' }}>{studentResult.score}%</p>
                        <button onClick={() => setShowReview(true)} className="text-indigo-600 hover:text-indigo-800" title="Посмотреть ответы">
                            <EyeIcon className="w-8 h-8"/>
                        </button>
                    </div>
                )}
                 <Modal isVisible={showReview} onClose={() => setShowReview(false)} title="Ваши ответы">
                     {studentResult && test && (
                        <ul className="space-y-3 max-h-80 overflow-y-auto bg-slate-50 p-4 rounded-lg">
                            {test.words.map((word: Word) => {
                                const answer = studentResult.answers.find((a: StudentAnswer) => a.wordId === word.id);
                                return (
                                    <li key={word.id} className="flex items-center justify-between p-3 bg-white rounded-md shadow-sm">
                                        <div className="flex flex-col text-left">
                                            <span className="font-semibold">{word.english} ({word.russian})</span>
                                            <span className={`text-sm ${answer?.correct ? 'text-slate-500' : 'text-red-500'}`}>Ваш ответ: {answer?.studentAnswer || 'Нет ответа'}</span>
                                        </div>
                                        {answer?.correct ? <CheckCircleIcon className="w-6 h-6 text-green-500" /> : <XCircleIcon className="w-6 h-6 text-red-500" />}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                 </Modal>
                <button onClick={onFinish} className="mt-8 px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition">
                    На главный экран
                </button>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col items-center">
            <div className="w-full max-w-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-800">{test.name}</h2>
                    <div className="flex items-center gap-2 text-lg font-semibold text-red-500 bg-red-100 px-4 py-2 rounded-full">
                        <ClockIcon className="w-6 h-6" />
                        <span>{Math.floor(timeLeft / 60)}:{('0' + timeLeft % 60).slice(-2)}</span>
                    </div>
                </div>
                <div className="relative w-full bg-slate-200 rounded-full h-2.5 mb-4">
                    <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${(currentWordIndex / test.words.length) * 100}%` }}></div>
                </div>

                 <div className="bg-white rounded-xl shadow-2xl p-8 text-center">
                    <p className="text-slate-500 text-lg mb-2">Переведите слово:</p>
                    <h3 className="text-4xl font-bold text-slate-800 mb-4">{currentWord.russian}</h3>
                    <img src={currentWord.image} alt="word illustration" className="w-full h-56 object-contain rounded-lg mb-6 shadow-inner bg-slate-100" />
                    <SecureInput
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleCheck()}
                        placeholder="Введите перевод..."
                        className="w-full text-center text-xl"
                        autoFocus
                    />
                    <button onClick={handleCheck} className="mt-6 w-full px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-transform transform hover:scale-105 disabled:bg-slate-400" disabled={!inputValue.trim()}>
                        Проверить
                    </button>
                </div>
            </div>
        </div>
    );
};

const GradesView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { state } = useAppContext();
    const { currentUser, studentProgress, onlineTestResults, offlineTestResults, units, onlineTests } = state;
    const progress = studentProgress[currentUser!.id] || {};
    const onlineResults = onlineTestResults[currentUser!.id] || [];
    const offlineResults = offlineTestResults[currentUser!.id] || [];

    return (
        <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
            <button onClick={onBack} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium mb-4">
                <ChevronLeftIcon className="w-5 h-5" /> Назад
            </button>
            <h2 className="text-3xl font-bold mb-6">Мои оценки</h2>
            <div className="space-y-8">
                <div>
                    <h3 className="text-xl font-bold mb-3">Оценки за юниты</h3>
                    <div className="bg-white p-4 rounded-lg shadow space-y-2">
                        {units.filter((u: Unit) => !u.isMistakeUnit && progress[u.id] && typeof progress[u.id].grade !== 'undefined').length > 0 ? units.filter((u: Unit) => !u.isMistakeUnit).map(unit => {
                            const unitProgress = progress[unit.id];
                            if (!unitProgress || typeof unitProgress.grade === 'undefined') return null;
                            return (
                                <div key={unit.id} className="p-3 border-b last:border-b-0">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold">{unit.name}</span>
                                        <span className="text-lg font-bold text-indigo-600 bg-indigo-100 rounded-full w-10 h-10 flex items-center justify-center">{unitProgress.grade}</span>
                                    </div>
                                    {unitProgress.comment && <p className="text-sm text-slate-600 mt-2 pl-2 border-l-2 border-slate-200"><b>Комментарий:</b> {unitProgress.comment}</p>}
                                </div>
                            )
                        }) : <p className="text-slate-500">Пока нет оценок за юниты.</p>}
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-bold mb-3">Результаты Онлайн Тестов</h3>
                    <div className="bg-white p-4 rounded-lg shadow">
                        {onlineResults.length > 0 ? (
                            <div className="space-y-2">
                                {onlineResults.map(res => {
                                    const test = onlineTests.find(t => t.id === res.testId);
                                    return (
                                        <div key={res.id} className="border-b last:border-b-0 p-3">
                                            <p className="font-semibold">{test?.name}</p>
                                            <div className="flex justify-between items-center text-sm mt-1">
                                                <span>Результат: <b>{res.score}%</b></span>
                                                <span>Оценка: <b>{res.grade || '-'}</b></span>
                                                <span className={res.status === TestStatus.Passed ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                                    {res.status === TestStatus.Passed ? 'Прошёл' : res.status === TestStatus.Failed ? 'Не прошёл' : ''}
                                                </span>
                                            </div>
                                            {res.comment && <p className="text-sm text-slate-600 mt-2 pl-2 border-l-2 border-slate-200"><b>Комментарий:</b> {res.comment}</p>}
                                        </div>
                                    )
                                })}
                            </div>
                        ) : <p className="text-slate-500">Нет результатов онлайн тестов.</p>}
                    </div>
                </div>

                 <div>
                    <h3 className="text-xl font-bold mb-3">Результаты Оффлайн Тестов</h3>
                    <div className="bg-white p-4 rounded-lg shadow">
                         {offlineResults.length > 0 ? (
                            <div className="space-y-2">
                                {offlineResults.map(res => (
                                    <div key={res.id} className="border-b last:border-b-0 p-3">
                                        <div className="flex justify-between items-center">
                                            <p className="font-semibold">{res.testName}</p>
                                            <span className={res.status === TestStatus.Passed ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                                {res.status === TestStatus.Passed ? 'Прошёл' : 'Не прошёл'}
                                            </span>
                                        </div>
                                        <p className="text-sm">Оценка: <b>{res.grade || '-'}</b></p>
                                        {res.comment && <p className="text-sm text-slate-600 mt-2 pl-2 border-l-2 border-slate-200"><b>Комментарий:</b> {res.comment}</p>}
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-slate-500">Нет результатов оффлайн тестов.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

const ChatInterface: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { state, dispatch } = useAppContext();
    const { currentUser, users, chats, presence } = state;
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [showParticipantsModal, setShowParticipantsModal] = useState(false);
    const [readReceiptsInfo, setReadReceiptsInfo] = useState<ChatMessage | null>(null);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const userChats = useMemo(() =>
        chats.filter(c => c.participants.some(p => p.userId === currentUser?.id))
            .sort((a, b) => {
                const lastMsgA = a.messages[a.messages.length - 1]?.timestamp || 0;
                const lastMsgB = b.messages[b.messages.length - 1]?.timestamp || 0;
                return lastMsgB - lastMsgA;
            }),
        [chats, currentUser]
    );

    const selectedChat = useMemo(() => userChats.find(c => c.id === selectedChatId), [userChats, selectedChatId]);

    useEffect(() => {
        if (selectedChatId) {
            dispatch({ type: 'MARK_AS_READ', payload: { chatId: selectedChatId } });
        }
    }, [selectedChatId, dispatch, selectedChat?.messages.length]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedChat?.messages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() && selectedChatId) {
            dispatch({ type: 'SEND_MESSAGE', payload: { chatId: selectedChatId, text: newMessage } });
            setNewMessage('');
        }
    };

    const getChatName = (chat: Chat) => {
        if (chat.isGroup && chat.name) return chat.name;
        if (chat.isGroup) return chat.participants.filter(p => p.userId !== currentUser?.id).map(p => p.name).join(', ');
        const otherUser = chat.participants.find(p => p.userId !== currentUser?.id);
        return otherUser?.name || 'Unknown User';
    };
    
    const getPresenceStatus = (userId: string) => {
        const status = presence[userId];
        if (status === 'online') return 'online';
        if (typeof status === 'number') {
            const minutesAgo = Math.round((Date.now() - status) / 60000);
            if (minutesAgo < 1) return 'только что';
            if (minutesAgo < 60) return `${minutesAgo}м назад`;
            const hoursAgo = Math.floor(minutesAgo / 60);
            if (hoursAgo < 24) return `${hoursAgo}ч назад`;
            return `давно`;
        }
        return 'оффлайн';
    };

    const getOtherParticipantPresence = (chat: Chat) => {
        if(chat.isGroup) return null;
        const otherUser = chat.participants.find(p => p.userId !== currentUser?.id);
        return otherUser ? getPresenceStatus(otherUser.userId) : null;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 animate-fade-in flex flex-col h-[calc(100vh-128px)]">
            <div className="flex justify-between items-center mb-4">
                <button onClick={onBack} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium">
                    <ChevronLeftIcon className="w-5 h-5" /> Назад
                </button>
                <h2 className="text-2xl font-bold">Чат</h2>
                <div className="w-24"></div>
            </div>
            
            {selectedChat && showParticipantsModal && (
                <Modal isVisible={true} onClose={() => setShowParticipantsModal(false)} title="Участники чата">
                    <ul className="space-y-3">
                        {selectedChat.participants.map(p => (
                            <li key={p.userId} className="flex justify-between items-center">
                                <span>{p.name}</span>
                                <span className="text-sm text-slate-500">{getPresenceStatus(p.userId)}</span>
                            </li>
                        ))}
                    </ul>
                </Modal>
            )}

            {readReceiptsInfo && selectedChat && (
                 <Modal isVisible={true} onClose={() => setReadReceiptsInfo(null)} title="Прочитали сообщение">
                    <ul className="space-y-2">
                        {selectedChat.participants
                            .filter(p => p.userId !== currentUser!.id && (selectedChat.lastRead[p.userId] || 0) >= readReceiptsInfo.timestamp)
                            .map(p => (
                                <li key={p.userId} className="flex justify-between items-center">
                                    <span>{p.name}</span>
                                    <span className="text-sm text-slate-400">{new Date(selectedChat.lastRead[p.userId]).toLocaleString()}</span>
                                </li>
                            ))}
                    </ul>
                </Modal>
            )}

            <div className="flex-grow flex border border-slate-200 rounded-lg shadow-md overflow-hidden">
                <div className="w-1/3 border-r border-slate-200 bg-slate-50 flex flex-col">
                    <div className="p-2 border-b border-slate-200">
                         <h3 className="font-semibold text-lg text-slate-700 px-2">Чаты</h3>
                    </div>
                    <ul className="overflow-y-auto flex-grow">
                        {userChats.map(chat => {
                            const lastMessage = chat.messages[chat.messages.length - 1];
                            const hasUnread = lastMessage && (!chat.lastRead[currentUser!.id] || chat.lastRead[currentUser!.id] < lastMessage.timestamp);
                            const otherParticipantPresence = getOtherParticipantPresence(chat);
                            return (
                            <li key={chat.id}>
                                <button onClick={() => setSelectedChatId(chat.id)} className={`w-full text-left p-3 hover:bg-indigo-100 ${selectedChatId === chat.id ? 'bg-indigo-100' : ''}`}>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            {!chat.isGroup && otherParticipantPresence === 'online' && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
                                            <span className="font-semibold">{getChatName(chat)}</span>
                                        </div>
                                        {hasUnread && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>}
                                    </div>
                                    {lastMessage && <p className="text-sm text-slate-500 truncate">{lastMessage.text}</p>}
                                </button>
                            </li>
                        )})}
                    </ul>
                </div>
                <div className="w-2/3 flex flex-col">
                    {selectedChat ? (
                        <>
                            <div className="p-3 border-b border-slate-200 bg-white flex items-center gap-3">
                                {selectedChat.isGroup ? <UserGroupIcon className="w-8 h-8 text-slate-400" /> : <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">{getChatName(selectedChat).charAt(0)}</div>}
                                <div>
                                    <button onClick={() => selectedChat.isGroup && setShowParticipantsModal(true)} className="font-bold text-left hover:underline disabled:no-underline" disabled={!selectedChat.isGroup}>{getChatName(selectedChat)}</button>
                                    {!selectedChat.isGroup && <p className="text-xs text-slate-500">{getOtherParticipantPresence(selectedChat)}</p>}
                                </div>
                            </div>
                            <div className="flex-grow p-4 overflow-y-auto bg-slate-100">
                                {selectedChat.messages.map(msg => {
                                    const sender = users.find(u => u.id === msg.senderId);
                                    const isCurrentUser = msg.senderId === currentUser?.id;
                                    return (
                                    <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-3`}>
                                        <button 
                                            onClick={() => isCurrentUser && setReadReceiptsInfo(msg)} 
                                            className={`max-w-xs lg:max-w-md p-3 rounded-lg text-left ${isCurrentUser ? 'bg-indigo-500 text-white' : 'bg-white shadow-sm'}`}
                                            disabled={!isCurrentUser}
                                        >
                                            {!isCurrentUser && <p className="text-xs font-bold text-indigo-600 mb-1">{sender?.name}</p>}
                                            <p>{msg.text}</p>
                                            <p className={`text-xs mt-1 ${isCurrentUser ? 'text-indigo-200' : 'text-slate-400'} text-right`}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                {isCurrentUser && selectedChat.participants.some(p => p.userId !== currentUser!.id && (selectedChat.lastRead[p.userId] || 0) >= msg.timestamp) &&
                                                    <CheckIcon className="w-4 h-4 inline-block ml-1 text-blue-300"/>}
                                            </p>
                                        </button>
                                    </div>
                                )})}
                                <div ref={messagesEndRef} />
                            </div>
                            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200">
                                <div className="flex items-center gap-2">
                                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Напишите сообщение..." className="w-full p-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"/>
                                    <button type="submit" className="bg-indigo-600 text-white rounded-lg p-2 hover:bg-indigo-700 disabled:bg-slate-400" disabled={!newMessage.trim()}>
                                        <PaperAirplaneIcon className="w-6 h-6"/>
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="flex-grow flex items-center justify-center text-slate-500 bg-slate-50">
                            <p>Выберите чат, чтобы начать общение</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StudentView: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { currentUser, units, studentProgress, activeOnlineTestSession, teacherMessages, announcements, chats } = state;
    const [view, setView] = useState<'dashboard' | 'round_flow' | 'online_test_lobby' | 'online_test_session' | 'grades' | 'chat'>('dashboard');
    const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
    const [selectedRound, setSelectedRound] = useState<Round | null>(null);
    const [showMessageModal, setShowMessageModal] = useState(false);
    
    const [seenMessages, setSeenMessages] = useState<string[]>([]);

    const progress = studentProgress[currentUser!.id] || {};

    const studentChats = useMemo(() => chats.filter(c => c.participants.some(p => p.userId === currentUser?.id)), [chats, currentUser]);
    const hasUnreadMessages = useMemo(() => {
        return studentChats.some(chat => {
            if (chat.messages.length === 0) return false;
            const lastMessage = chat.messages[chat.messages.length - 1];
            const lastRead = chat.lastRead[currentUser!.id];
            return !lastRead || lastMessage.timestamp > lastRead;
        });
    }, [studentChats, currentUser]);
    
    const hasUnseenTeacherMessages = useMemo(() => {
        if (!teacherMessages || teacherMessages.length === 0) {
            return false;
        }
        return teacherMessages.some(msg => !seenMessages.includes(msg.id));
    }, [teacherMessages, seenMessages]);
    
    const lastActiveAnnouncement = useMemo(() => {
        if (!announcements) return null;
        return [...announcements].filter(a => a.type === 'active').pop();
    }, [announcements]);

    const lastInfoAnnouncement = useMemo(() => {
        if (!announcements) return null;
        return [...announcements].filter(a => a.type === 'info').pop();
    }, [announcements]);
    
    const handleOpenMessages = () => {
        setShowMessageModal(true);
        if (teacherMessages) {
            setSeenMessages(teacherMessages.map(msg => msg.id));
        }
    };
    
    const handleSelectRound = (unit: Unit, round: Round) => {
        setSelectedUnit(unit);
        setSelectedRound(round);
        setView('round_flow');
    };

    const handleBackToDashboard = () => {
        setSelectedUnit(null);
        setSelectedRound(null);
        setView('dashboard');
    };

    const handleJoinLobby = () => {
        dispatch({ type: 'JOIN_ONLINE_TEST_SESSION', payload: { studentId: currentUser!.id } });
        setView('online_test_lobby');
    };
    
    useEffect(() => {
        if (view === 'online_test_lobby' && activeOnlineTestSession?.status === 'IN_PROGRESS') {
            setView('online_test_session');
        }
        if ((view === 'online_test_lobby' || view === 'online_test_session') && !activeOnlineTestSession) {
             setView('dashboard');
        }
    }, [activeOnlineTestSession, view]);

    if (view === 'round_flow' && selectedUnit && selectedRound) {
        return <RoundFlow unit={selectedUnit} round={selectedRound} onBack={handleBackToDashboard} />;
    }

    if (view === 'grades') {
        return <GradesView onBack={handleBackToDashboard} />
    }

    if(view === 'online_test_lobby') {
        return (
            <div className="p-8 text-center">
                <h2 className="text-3xl font-bold mb-4">Комната ожидания</h2>
                <p className="text-slate-500 mb-8">Ожидайте, пока учитель начнет тест. Вы видите себя в списке участников.</p>
                <div className="max-w-md mx-auto">
                    {activeOnlineTestSession && Object.values(activeOnlineTestSession.students).map((student: OnlineTestSessionStudent) => (
                        <div key={student.studentId} className="bg-white p-4 rounded-lg shadow-md flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl">{student.name.charAt(0)}</div>
                            <span className="text-lg font-medium">{student.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if(view === 'online_test_session') {
        return <OnlineTestSession onFinish={handleBackToDashboard} />
    }

    if (view === 'chat') {
        return <ChatInterface onBack={() => setView('dashboard')} />
    }

    const mistakeUnitsForStudent = units.filter(u => u.isMistakeUnit && progress[u.id]);
    const regularUnits = units.filter(u => !u.isMistakeUnit);
    const allUnitsToDisplay = [...mistakeUnitsForStudent, ...regularUnits];

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
                <h1 className="text-3xl font-bold">Добро пожаловать, {currentUser!.name}!</h1>
                <div className="flex items-center gap-4">
                     <button onClick={() => setView('grades')} className="font-medium text-indigo-600 hover:text-indigo-500 flex items-center gap-1">
                        <ChartBarIcon className="w-5 h-5"/> Мои оценки
                     </button>
                      <button onClick={() => setView('chat')} className="font-medium text-indigo-600 hover:text-indigo-500 flex items-center gap-1 relative">
                        <ChatBubbleLeftRightIcon className="w-5 h-5"/> Чат
                        {hasUnreadMessages && <span className="absolute -top-1 -right-2 w-2 h-2 bg-red-500 rounded-full"></span>}
                     </button>
                     <button onClick={() => dispatch({ type: 'LOGOUT' })} className="font-medium text-indigo-600 hover:text-indigo-500">Выйти</button>
                     {teacherMessages && teacherMessages.length > 0 && 
                        <button onClick={handleOpenMessages} className="relative">
                            <BellIcon className="w-6 h-6 text-slate-500 hover:text-indigo-600" />
                            {hasUnseenTeacherMessages && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                            )}
                        </button>
                     }
                </div>
            </div>

            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-6 rounded-2xl shadow-lg mb-8 flex items-center gap-6 text-white">
                <AcademicCapIcon className="w-20 h-20 opacity-80 hidden sm:block" />
                <div>
                    <h2 className="text-2xl font-bold">Время учиться!</h2>
                    <p className="opacity-90 mt-1">Продолжайте в том же духе, и у вас все получится!</p>
                </div>
            </div>

            {hasUnreadMessages && (
                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-lg mb-6 cursor-pointer" onClick={() => setView('chat')}>
                    <p className="font-bold">У вас новое сообщение в чате!</p>
                </div>
            )}

            {activeOnlineTestSession && activeOnlineTestSession.status === 'WAITING' && activeOnlineTestSession.invitedStudentIds.includes(currentUser!.id) && (
                <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg mb-6 flex justify-between items-center animate-pulse">
                    <div>
                        <p className="font-bold">Онлайн тест начался!</p>
                        <p>Учитель пригласил вас в комнату для тестирования.</p>
                    </div>
                    <button onClick={handleJoinLobby} className="bg-green-500 text-white font-bold py-2 px-4 rounded hover:bg-green-600">Присоединиться</button>
                </div>
            )}
            
            {lastActiveAnnouncement && (
                 <div className="bg-red-100 border-l-4 border-red-500 text-red-800 p-4 rounded-lg mb-6">
                    <p className="font-bold flex items-center gap-2"><ExclamationTriangleIcon className="w-5 h-5" /> Напоминание!</p>
                    <p>{lastActiveAnnouncement.message}</p>
                </div>
            )}

            {lastInfoAnnouncement && (
                 <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4 rounded-lg mb-6">
                    <p className="font-bold flex items-center gap-2"><InformationCircleIcon className="w-5 h-5" /> Объявление</p>
                    <p>{lastInfoAnnouncement.message}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {allUnitsToDisplay.map(unit => {
                    const unitProgress = progress[unit.id];
                    const completedRoundsResults = unitProgress ? (Object.values(unitProgress.rounds) as StudentRoundResult[]).filter(r => r.completed) : [];
                    const totalScore = completedRoundsResults.reduce((acc: number, r) => acc + r.overallScore, 0);
                    const completedRoundsCount = completedRoundsResults.length;
                    const unitAverage = completedRoundsCount > 0 ? Math.round(totalScore / completedRoundsCount) : 0;
                    
                    return (
                        <div key={unit.id} className={`bg-white rounded-2xl shadow-lg p-6 flex flex-col ${unit.isMistakeUnit ? 'border-2 border-amber-400' : ''}`}>
                             <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold">{unit.name}</h3>
                                    {!unit.isMistakeUnit &&
                                    <p className="text-slate-500">{unitAverage > 0 ? `Общий прогресс: ${unitAverage}%` : 'Не начато'}</p>
                                    }
                                </div>
                                {typeof unitProgress?.grade !== 'undefined' && (
                                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-lg">
                                        {unitProgress.grade}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3 mt-auto">
                                {unit.rounds.map(round => {
                                    const roundResult = unitProgress?.rounds[round.id];
                                    return (
                                        <div key={round.id}>
                                            <button onClick={() => handleSelectRound(unit, round)} className="w-full text-left p-4 rounded-lg bg-slate-50 hover:bg-indigo-50 transition flex justify-between items-center">
                                                <div>
                                                    <p className="font-semibold">{round.name}</p>
                                                    {roundResult?.completed && <p className="text-sm text-slate-500">Результат: {roundResult.overallScore}%</p>}
                                                </div>
                                                <ArrowRightIcon className="w-5 h-5 text-slate-400" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>

            <Modal isVisible={showMessageModal} onClose={() => setShowMessageModal(false)} title="Сообщения от учителя">
                <div className="space-y-4 max-h-96 overflow-y-auto">
                    {teacherMessages && teacherMessages.length > 0 ? [...teacherMessages].reverse().map(msg => (
                        <div key={msg.id} className="p-3 bg-slate-100 rounded-lg">
                            <p>{msg.message}</p>
                            <p className="text-xs text-slate-500 text-right mt-1">{new Date(msg.timestamp).toLocaleString()}</p>
                        </div>
                    )) : <p>Нет новых сообщений.</p>}
                </div>
            </Modal>
        </div>
    );
};

export default StudentView;