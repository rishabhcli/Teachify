import React, { useState, useEffect } from "react";
import { Gamepad2, User, X, AlertTriangle, Check, ArrowRight, GraduationCap, WifiOff, Users } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";

interface StudentJoinProps {
  onJoin: (code: string, name: string) => void;
  onBack: () => void;
}

export const StudentJoin: React.FC<StudentJoinProps> = ({ onJoin, onBack }) => {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [gameStatus, setGameStatus] = useState<'not_found' | 'started' | 'found' | 'full' | 'error' | null>(null);

  // Mock checking game status when code is 6 chars
  useEffect(() => {
    if (code.length === 6) {
      // Simulate API check
      const timer = setTimeout(() => {
        // Mock scenarios based on code for demonstration
        if (code === "FULL00") {
            setGameStatus('full');
        } else if (code === "LIVE00") {
            setGameStatus('started');
        } else if (code === "WIFI00") {
            setGameStatus('error');
        } else if (code === "BAD000") {
            setGameStatus('not_found');
        } else {
            // Default success for other codes
            setGameStatus('found');
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setGameStatus(null);
    }
  }, [code]);

  const canJoin = code.length === 6 && name.trim().length > 0 && gameStatus === 'found';

  const handleJoin = async () => {
    if (!canJoin) return;
    setJoining(true);
    setError(null);
    
    // Simulate network delay
    setTimeout(() => {
        // Simulate a specific error if name is "Error" for testing
        if (name.toLowerCase() === "error") {
            setJoining(false);
            setError("Connection timed out. Please check your internet.");
            return;
        }

        setJoining(false);
        onJoin(code, name);
    }, 1000);
  };

  // Render code input boxes
  const codeChars = code.padEnd(6, "").split("");

  return (
    <main className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 border-b-2 border-paper-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
              <div className="w-10 h-10 bg-highlight-yellow rounded-lg border-2 border-paper-900 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-paper-900" />
              </div>
              <span className="font-display text-xl font-bold text-paper-900">Teachify</span>
            </div>
            <button 
              onClick={onBack}
              className="text-paper-600 hover:text-paper-900 transition-colors text-sm font-medium"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </nav>

      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-slide-up">
          <h1 className="font-display text-4xl font-bold text-paper-900 mb-2">
            Join Game
          </h1>
          <p className="text-paper-500">Enter the code from your teacher</p>
        </div>

        <Card variant="elevated" className="p-8 animate-slide-up stagger-1">
          <div className="space-y-6">
            {/* Game Code Input */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-paper-700 mb-4">
                <Gamepad2 className="w-4 h-4 text-highlight-purple" />
                Game Code
              </label>
              
              {/* Visual code boxes */}
              <div className="flex justify-center gap-2 mb-3">
                {codeChars.map((char, i) => (
                  <div
                    key={i}
                    className={`
                      w-10 h-12 sm:w-12 sm:h-14 flex items-center justify-center text-xl sm:text-2xl font-mono font-bold rounded-lg border-2 transition-all duration-150
                      ${char 
                        ? "bg-highlight-yellow/10 border-highlight-yellow text-paper-900" 
                        : "bg-paper-50 border-paper-300 text-paper-400"
                      }
                      ${i % 2 === 0 ? "-rotate-1" : "rotate-1"}
                    `}
                  >
                    {char}
                  </div>
                ))}
              </div>
              
              {/* Hidden actual input */}
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                placeholder="XXXXXX"
                className="w-full text-center text-2xl font-mono tracking-[0.5em] h-0 opacity-0 absolute"
                maxLength={6}
                autoFocus
              />
               {/* Click overlay to focus hidden input if visual boxes are clicked */}
               <div 
                className="absolute inset-0 cursor-text"
                style={{ height: '80px', marginTop: '30px' }} // Approximate positioning over boxes
                onClick={(e) => {
                    const input = e.currentTarget.previousSibling as HTMLInputElement;
                    input?.focus();
                }}
               />
              
              <div className="mt-3 h-6 text-center">
                {gameStatus === 'not_found' && (
                  <div className="flex items-center justify-center gap-2 text-highlight-pink animate-scale-in">
                    <X className="w-4 h-4" />
                    <span className="text-sm font-medium">Invalid game code</span>
                  </div>
                )}
                {gameStatus === 'started' && (
                  <div className="flex items-center justify-center gap-2 text-highlight-orange animate-scale-in">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">Game already in progress</span>
                  </div>
                )}
                {gameStatus === 'full' && (
                  <div className="flex items-center justify-center gap-2 text-highlight-purple animate-scale-in">
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-medium">Lobby is full (Max 30)</span>
                  </div>
                )}
                {gameStatus === 'error' && (
                  <div className="flex items-center justify-center gap-2 text-red-500 animate-scale-in">
                    <WifiOff className="w-4 h-4" />
                    <span className="text-sm font-medium">Network error. Try again.</span>
                  </div>
                )}
                {gameStatus === 'found' && (
                  <div className="flex items-center justify-center gap-2 text-green-600 animate-scale-in">
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">Game found!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-paper-700 mb-3">
                <User className="w-4 h-4 text-highlight-blue" />
                Your Name
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
              />
            </div>

            {/* Error Display */}
            {error && (
              <Card variant="pink" className="p-4 animate-scale-in flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </Card>
            )}

            {/* Join Button */}
            <Button
              onClick={handleJoin}
              disabled={!canJoin || joining}
              variant="green"
              size="lg"
              className="w-full"
            >
              {joining ? (
                  <span className="flex items-center gap-2">
                      Connecting...
                  </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                    Join Game <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </Button>
          </div>
        </Card>

        {/* Help text */}
        <p className="text-center text-paper-400 text-sm mt-6 animate-slide-up stagger-2">
          Ask your teacher for the 6-character game code
        </p>
        </div>
      </div>
    </main>
  );
};
