import React, { useState, useEffect } from 'react';
import { GameData } from '../types';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { GameCode } from './ui/game-code';
import { Users, Trophy, Check, Gamepad2, Home, Clock, Zap, Heart, Shield, Map, Star, ArrowRight } from 'lucide-react';

interface GamePlayProps {
  gameData: GameData;
  onExit: () => void;
}

type Phase = "lobby" | "question" | "submitted" | "results" | "complete";

export const GamePlay: React.FC<GamePlayProps> = ({ gameData, onExit }) => {
  // State
  const [phase, setPhase] = useState<Phase>("lobby");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  
  // Engine specific state (visual fluff)
  const [engineHealth, setEngineHealth] = useState(100);
  const [engineEnergy, setEngineEnergy] = useState(0);

  const currentQuestion = gameData.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex >= gameData.questions.length - 1;
  const isEngine = gameData.isEngine;

  // --- Game Logic ---

  // Start Game
  const handleStart = () => {
    setPhase("question");
  };

  // Handle Answer Submission
  const handleAnswer = (index: number) => {
    if (phase !== "question") return;
    
    setSelectedOption(index);
    setPhase("submitted");

    // Calculate score
    const isCorrect = index === currentQuestion.correctIndex;
    if (isCorrect) {
        setScore(s => s + 100 + (streak * 10));
        setStreak(s => s + 1);
        if (isEngine) setEngineEnergy(e => Math.min(e + 25, 100));
    } else {
        setStreak(0);
        if (isEngine) setEngineHealth(h => Math.max(h - 15, 0));
    }

    // Short delay before showing results
    setTimeout(() => {
        setPhase("results");
    }, 1000);
  };

  const handleNextQuestion = () => {
    if (isLastQuestion) {
        setPhase("complete");
    } else {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedOption(null);
        setPhase("question");
    }
  };

  // --- Renders ---

  // 1. Lobby
  if (phase === "lobby") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <p className="text-sm text-paper-500 mb-2 uppercase tracking-wider font-medium">Game Code</p>
            <GameCode code={gameData.code} size="md" />
          </div>

          <Card variant="elevated" className="p-8 mb-6 animate-slide-up text-center">
            <p className="text-xl mb-2 text-paper-700">
              Playing <span className="font-bold text-paper-900">{gameData.title}</span>
            </p>
            <div className={`mb-4 p-4 rounded-xl border-2 ${isEngine ? 'bg-highlight-purple/10 border-highlight-purple/30' : 'bg-highlight-yellow/10 border-highlight-yellow/30'}`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  {isEngine ? <Gamepad2 className="w-5 h-5 text-highlight-purple" /> : <Star className="w-5 h-5 text-highlight-yellow" />}
                  <span className="font-semibold text-paper-900">{isEngine ? "Adventure Mode" : "Quiz Mode"}</span>
                </div>
                <p className="text-xs text-paper-500 line-clamp-2">{gameData.description}</p>
            </div>
            <Button onClick={handleStart} variant="yellow" size="lg" className="w-full">
                Start Game <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  // 2. Complete
  if (phase === "complete") {
     return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8 animate-slide-up">
            <h1 className="font-display text-4xl font-bold text-paper-900 mb-2">
              Game Complete!
            </h1>
            <Badge variant="green">Well done!</Badge>
          </div>

          <Card variant="yellow" className="p-8 mb-6 text-center animate-slide-up stagger-1">
            <p className="text-paper-500 mb-3">Final Score</p>
            <p className="text-6xl font-bold text-paper-900 font-display animate-score-pop">{score}</p>
          </Card>
          
           <div className="flex justify-center">
              <Button onClick={onExit} variant="outline" className="w-full">
                <Home className="w-4 h-4 mr-2" /> Back to Home
              </Button>
            </div>
        </div>
      </main>
    );
  }

  // 3. Question / Submitted / Results
  return (
    <main className="min-h-screen bg-background flex flex-col items-center">
        {/* Top Bar */}
        <div className="w-full bg-white border-b border-paper-200 p-4 sticky top-0 z-10 shadow-sm">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                     <span className="text-sm font-mono text-paper-500">Q{currentQuestionIndex + 1}/{gameData.questions.length}</span>
                     {isEngine && (
                         <div className="hidden sm:flex items-center gap-2">
                             <div className="flex items-center gap-1 text-red-500">
                                 <Heart className="w-4 h-4 fill-current" />
                                 <span className="text-sm font-bold">{engineHealth}%</span>
                             </div>
                             <div className="flex items-center gap-1 text-highlight-purple">
                                 <Zap className="w-4 h-4 fill-current" />
                                 <span className="text-sm font-bold">{engineEnergy}%</span>
                             </div>
                         </div>
                     )}
                </div>
                <div className="flex items-center gap-3">
                     <span className="text-sm font-medium text-paper-600 hidden sm:inline">Score</span>
                     <span className="font-mono font-bold text-xl text-paper-900">{score}</span>
                </div>
            </div>
        </div>

        <div className="w-full max-w-4xl p-4 flex-1 flex flex-col">
            
            {/* GAME ENGINE VISUALIZATION */}
            {isEngine && phase !== "results" && (
                <div className="w-full h-48 sm:h-64 mb-6 rounded-2xl bg-paper-900 overflow-hidden relative border-4 border-paper-300 shadow-inner flex items-center justify-center">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <div className="absolute top-4 left-4 p-2 bg-black/50 rounded-lg text-white text-xs font-mono">
                        LOCATION: SECTOR {currentQuestionIndex + 1}
                    </div>
                    <div className="relative z-10 text-center animate-bounce-subtle">
                         {gameData.theme === "history" && <Map className="w-16 h-16 text-highlight-yellow mx-auto mb-2" />}
                         {gameData.theme === "science" && <Zap className="w-16 h-16 text-highlight-blue mx-auto mb-2" />}
                         {gameData.theme === "combat" && <Shield className="w-16 h-16 text-highlight-pink mx-auto mb-2" />}
                         {!["history", "science", "combat"].includes(gameData.theme) && <Gamepad2 className="w-16 h-16 text-highlight-purple mx-auto mb-2" />}
                         
                         <div className="bg-white/10 backdrop-blur-sm px-4 py-1 rounded-full text-white text-sm font-bold border border-white/20">
                            {phase === "submitted" ? "PROCESSING..." : "AWAITING INPUT"}
                         </div>
                    </div>
                </div>
            )}

            {/* Results View */}
            {phase === "results" && (
                <div className="w-full max-w-md mx-auto animate-scale-in pt-8">
                    <Card variant={selectedOption === currentQuestion.correctIndex ? "green" : "pink"} className="p-6 mb-6 text-center shadow-xl">
                        <div className="flex items-center justify-center gap-2 mb-3">
                            {selectedOption === currentQuestion.correctIndex ? (
                                <Check className="w-8 h-8 text-green-600" />
                            ) : (
                                <span className="text-4xl text-red-600">✗</span>
                            )}
                            <span className={`text-2xl font-bold ${selectedOption === currentQuestion.correctIndex ? "text-green-700" : "text-red-700"}`}>
                                {selectedOption === currentQuestion.correctIndex ? "Correct!" : "Incorrect"}
                            </span>
                        </div>
                        <p className="text-sm text-paper-500 mb-2">The correct answer is:</p>
                        <p className="text-lg font-semibold text-paper-900 mb-4">{currentQuestion.options[currentQuestion.correctIndex]}</p>
                        <p className="text-sm text-paper-600 bg-white/50 p-3 rounded-lg text-left">{currentQuestion.explanation}</p>
                    </Card>
                    
                    <Button onClick={handleNextQuestion} variant="default" size="lg" className="w-full">
                        {isLastQuestion ? "Finish Game" : "Next Question"} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            )}

            {/* Question Interface */}
            {(phase === "question" || phase === "submitted") && (
                <div className="w-full max-w-3xl mx-auto">
                    <Card variant="elevated" className="p-6 md:p-8 mb-6 animate-slide-up relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-4">
                            <Badge variant="blue" className="opacity-90">Concept: {currentQuestion.concept}</Badge>
                            {isEngine && <Badge variant="purple" className="opacity-90">XP: +100</Badge>}
                        </div>
                        
                        <h3 className="text-xl md:text-2xl font-bold text-paper-900 leading-snug relative z-10">
                            {currentQuestion.text}
                        </h3>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-slide-up stagger-1">
                        {currentQuestion.options.map((option, i) => (
                            <button
                                key={i}
                                disabled={phase === "submitted"}
                                onClick={() => handleAnswer(i)}
                                className={`
                                    w-full p-6 rounded-xl border-2 text-left transition-all relative overflow-hidden group
                                    ${phase === "submitted" 
                                        ? i === selectedOption 
                                            ? "bg-paper-100 border-paper-400" 
                                            : "opacity-40 border-paper-200 grayscale"
                                        : "bg-white border-paper-200 hover:border-highlight-purple hover:shadow-paper-md active:scale-[0.98]"
                                    }
                                `}
                            >
                                <div className="flex items-center">
                                    <div className={`
                                        w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold mr-3 transition-colors
                                        ${phase === "submitted" && i === selectedOption ? "bg-paper-800 text-white" : "bg-paper-100 text-paper-600 group-hover:bg-highlight-purple group-hover:text-white"}
                                    `}>
                                        {String.fromCharCode(65 + i)}
                                    </div>
                                    <span className="font-medium text-paper-900 text-lg">{option}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </main>
  );
};