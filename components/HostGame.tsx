import React, { useState, useEffect, useRef } from "react";
import { Mic, Home, Play, StopCircle, Sparkles, Volume2, Trophy, Loader2, User, Check, Crown } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { GameData } from "../types";
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from "@google/genai";

interface HostGameProps {
  gameData: GameData;
  onExit: () => void;
}

// --- Types for Simulation ---
interface Player {
  id: string;
  name: string;
  color: string;
  score: number;
  status: 'waiting' | 'thinking' | 'answered' | 'correct' | 'wrong';
}

const PLAYER_NAMES = ["Alex", "Jordan", "Taylor", "Casey", "Morgan", "Riley", "Jamie", "Dakota", "Quinn", "Avery", "Sam", "Charlie", "Reese", "Skyler", "Cameron"];
const AVATAR_COLORS = [
    "bg-red-500", "bg-orange-500", "bg-amber-500", 
    "bg-green-500", "bg-emerald-500", "bg-teal-500",
    "bg-cyan-500", "bg-blue-500", "bg-indigo-500", 
    "bg-violet-500", "bg-purple-500", "bg-fuchsia-500", "bg-pink-500", "bg-rose-500"
];

// --- Audio Utils ---

function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function float32To16BitPCM(float32Arr: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Arr.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Arr.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Arr[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export const HostGame: React.FC<HostGameProps> = ({ gameData, onExit }) => {
  const [active, setActive] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [log, setLog] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Simulated Player State
  const [players, setPlayers] = useState<Player[]>([]);
  const [lobbyCode] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());

  // Refs for audio handling
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  
  // Audio Playback State
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // --- Simulation Effects ---

  // 1. Lobby Joining Simulation
  useEffect(() => {
    if (active && currentQuestionIndex === -1) {
        const interval = setInterval(() => {
            if (players.length < 15 && Math.random() > 0.4) {
                const name = PLAYER_NAMES[Math.floor(Math.random() * PLAYER_NAMES.length)];
                // Check if name exists
                if (!players.find(p => p.name === name)) {
                    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
                    const newPlayer: Player = {
                        id: Math.random().toString(),
                        name,
                        color,
                        score: 0,
                        status: 'waiting'
                    };
                    setPlayers(prev => [...prev, newPlayer]);
                }
            }
        }, 2000);
        return () => clearInterval(interval);
    }
  }, [active, currentQuestionIndex, players]);

  // 2. Answering Simulation
  useEffect(() => {
    if (active && currentQuestionIndex >= 0) {
        // Reset statuses when question starts
        setPlayers(prev => prev.map(p => ({ ...p, status: 'thinking' })));

        const interval = setInterval(() => {
            setPlayers(prev => prev.map(p => {
                if (p.status === 'thinking' && Math.random() > 0.85) {
                    return { ...p, status: 'answered' };
                }
                return p;
            }));
        }, 800);
        return () => clearInterval(interval);
    }
  }, [active, currentQuestionIndex]);

  // 3. Scoring Simulation (on question change/end)
  useEffect(() => {
      if (currentQuestionIndex === -2) {
          // Game Over - Finalize scores randomly for simulation
          setPlayers(prev => prev.map(p => ({
              ...p,
              score: Math.floor(Math.random() * 5000) + 1000
          })).sort((a, b) => b.score - a.score));
      }
  }, [currentQuestionIndex]);


  // --- Gemini Setup ---

  const updateGameStateFunc: FunctionDeclaration = {
    name: 'updateGameState',
    description: 'Update the game screen to show the current question or results.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        questionIndex: {
          type: Type.INTEGER,
          description: 'The index of the question to display (0-based). Send -1 for introduction/lobby, and -2 for game over.',
        },
      },
      required: ['questionIndex'],
    },
  };

  const startLiveSession = async () => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Initialize Audio Contexts
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
        
        // Resume context just in case browser suspended it
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        inputSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
        processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
        
        const outputCtx = new AudioContextClass({ sampleRate: 24000 });
        
        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            callbacks: {
                onopen: () => {
                    setLog(p => [...p, "Connected to Gemini Live..."]);
                    setActive(true);
                },
                onmessage: async (message: LiveServerMessage) => {
                    const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audioData) {
                        setIsSpeaking(true);
                        const audioBuffer = await outputCtx.decodeAudioData(base64ToUint8Array(audioData).buffer);
                        
                        const source = outputCtx.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputCtx.destination);
                        
                        const now = outputCtx.currentTime;
                        const startTime = Math.max(now, nextStartTimeRef.current);
                        source.start(startTime);
                        nextStartTimeRef.current = startTime + audioBuffer.duration;
                        
                        source.onended = () => {
                            sourcesRef.current.delete(source);
                            if (sourcesRef.current.size === 0) setIsSpeaking(false);
                        };
                        sourcesRef.current.add(source);
                    }

                    if (message.toolCall) {
                        for (const fc of message.toolCall.functionCalls) {
                            if (fc.name === 'updateGameState') {
                                const idx = (fc.args as any).questionIndex;
                                setCurrentQuestionIndex(idx);
                                
                                sessionPromise.then(session => session.sendToolResponse({
                                    functionResponses: {
                                        name: fc.name,
                                        id: fc.id,
                                        response: { result: "Game state updated successfully" }
                                    }
                                }));
                            }
                        }
                    }
                },
                onclose: () => {
                    setActive(false);
                    setLog(p => [...p, "Session closed."]);
                },
                onerror: (e) => {
                    console.error(e);
                    setActive(false);
                    alert("Live session error: " + (e as any).message);
                }
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                },
                tools: [{ functionDeclarations: [updateGameStateFunc] }],
                systemInstruction: `You are an energetic game show host for a class. 
                You are running a quiz titled "${gameData.title}".
                The game mode is ${gameData.isEngine ? "an immersive adventure" : "a classic quiz"}.
                Here is the quiz data: ${JSON.stringify(gameData.questions)}.
                
                Rules:
                1. Start by welcoming the class and explaining the rules briefly. Mention players can join with code ${lobbyCode}.
                2. Read one question at a time clearly.
                3. Wait for the class (via the teacher's mic) to shout the answer.
                4. Listen to their answer. If they are right, celebrate! If wrong, explain why.
                5. IMPORTANT: When you start a new question, call the tool 'updateGameState' with the question index.
                6. When the game ends, call 'updateGameState' with -2.
                7. Keep it fun, fast-paced, and encouraging!
                `,
            }
        });

        sessionRef.current = sessionPromise;

        processorRef.current.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcm16 = float32To16BitPCM(inputData);
            const base64 = arrayBufferToBase64(pcm16);
            
            sessionPromise.then(session => {
                session.sendRealtimeInput({
                    media: {
                        mimeType: 'audio/pcm;rate=16000',
                        data: base64
                    }
                });
            });
        };

        inputSourceRef.current.connect(processorRef.current);
        processorRef.current.connect(audioContextRef.current.destination);

    } catch (e) {
        console.error("Failed to start session", e);
        alert("Failed to start Live session. Please ensure microphone permissions are granted and try again.");
    }
  };

  const stopSession = () => {
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (inputSourceRef.current) {
        inputSourceRef.current.disconnect();
        inputSourceRef.current = null;
    }
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    setActive(false);
    setIsSpeaking(false);
    // Force a cleanup of state without reload if possible, but reload ensures fresh audio context
    window.location.reload(); 
  };

  const currentQuestion = currentQuestionIndex >= 0 ? gameData.questions[currentQuestionIndex] : null;
  const answeredCount = players.filter(p => p.status === 'answered').length;

  return (
    <main className="min-h-screen bg-[#020617] text-white flex flex-col font-sans selection:bg-purple-500/30">
      
      {/* Dynamic Status Header */}
      {active && (
        <div className={`w-full py-3 text-center font-bold tracking-[0.2em] text-sm md:text-base uppercase transition-colors duration-300 shadow-xl z-50 ${
          isSpeaking 
            ? "bg-blue-600 text-white border-b-4 border-blue-800" 
            : "bg-green-500 text-green-950 border-b-4 border-green-700 animate-pulse"
        }`}>
          <div className="flex items-center justify-center gap-3">
            {isSpeaking ? (
               <>
                 <Volume2 className="w-5 h-5 animate-bounce" />
                 AI Host Speaking
               </>
            ) : (
               <>
                 <Mic className="w-5 h-5" />
                 Listening for Class Answer...
               </>
            )}
          </div>
        </div>
      )}

      {/* Main Stage */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
        
        {/* Ambient Background Effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse delay-700"></div>
        </div>

        {/* Start Screen */}
        {!active && (
            <div className="relative z-10 text-center max-w-2xl mx-auto space-y-8 animate-slide-up">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 shadow-2xl mb-4">
                    <Sparkles className="w-12 h-12 text-white" />
                </div>
                <div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
                        Classroom Projector Mode
                    </h1>
                    <p className="text-xl text-slate-400">
                        Connect your microphone. The AI Host will guide the class verbally.
                    </p>
                </div>
                <div className="p-6 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Host Instructions</h3>
                    <ul className="text-left space-y-3 text-slate-300">
                        <li className="flex items-start gap-3">
                            <span className="p-1 bg-slate-800 rounded text-xs font-mono">1</span>
                            <span>Ensure your device is connected to speakers.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="p-1 bg-slate-800 rounded text-xs font-mono">2</span>
                            <span>Enable microphone access when prompted.</span>
                        </li>
                    </ul>
                </div>
                <Button onClick={startLiveSession} variant="purple" size="lg" className="w-full md:w-auto text-lg px-8 py-6 rounded-xl shadow-purple-500/20 shadow-lg hover:shadow-purple-500/40 transition-all">
                    <Play className="w-6 h-6 mr-3" /> Start Live Show
                </Button>
            </div>
        )}

        {/* Live Game Views */}
        {active && (
            <div className="w-full max-w-7xl mx-auto z-10 relative flex flex-col h-full">
               
               {/* 1. Lobby Phase */}
               {currentQuestionIndex === -1 && (
                 <div className="text-center animate-slide-up flex flex-col items-center">
                    <div className="mb-8">
                        <div className="flex flex-col items-center gap-2 mb-6">
                            <span className="text-slate-400 text-sm uppercase tracking-widest">Join with Code</span>
                            <div className="text-6xl md:text-8xl font-black text-white bg-slate-800/50 px-8 py-4 rounded-3xl border-4 border-slate-700 font-mono tracking-widest">
                                {lobbyCode}
                            </div>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-300 mb-6">
                            Waiting for players...
                        </h2>
                    </div>
                    
                    {/* Simulated Player Grid */}
                    <div className="flex flex-wrap justify-center gap-4 max-w-4xl">
                        {players.map((p) => (
                            <div key={p.id} className="animate-scale-in flex items-center gap-2 bg-slate-800/80 backdrop-blur rounded-full px-4 py-2 border border-slate-700 shadow-lg">
                                <div className={`w-8 h-8 rounded-full ${p.color} flex items-center justify-center text-xs font-bold shadow-inner`}>
                                    <User className="w-4 h-4 text-white/90" />
                                </div>
                                <span className="font-medium text-slate-200">{p.name}</span>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-12 flex items-center justify-center gap-3 text-xl text-slate-500 animate-pulse">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>AI Host is introducing the game...</span>
                    </div>
                 </div>
               )}

               {/* 2. Question Phase */}
               {currentQuestion && (
                 <div className="w-full flex-1 flex flex-col">
                    {/* Upper: Question Content */}
                    <div className="flex-1 animate-scale-in flex flex-col justify-center">
                        <div className="flex justify-between items-end mb-6 border-b border-slate-800 pb-4">
                            <div className="text-slate-400 font-mono">
                                QUESTION <span className="text-white text-2xl font-bold ml-2">{currentQuestionIndex + 1}</span>
                                <span className="text-slate-600 mx-2">/</span>
                                {gameData.questions.length}
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">Answers</div>
                                    <div className="text-2xl font-bold text-white">{answeredCount} <span className="text-slate-600 text-lg">/ {players.length}</span></div>
                                </div>
                                <Badge variant="blue" className="text-sm opacity-80 uppercase tracking-widest">
                                    {currentQuestion.concept}
                                </Badge>
                            </div>
                        </div>

                        <div className="min-h-[140px] flex items-center justify-center mb-8">
                            <h2 className="text-3xl md:text-5xl font-bold text-center leading-tight drop-shadow-lg max-w-5xl">
                                {currentQuestion.text}
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {currentQuestion.options.map((opt, i) => (
                                <div key={i} className="group relative bg-slate-900/50 border-2 border-slate-700 hover:border-purple-500/50 rounded-2xl p-6 transition-all duration-300">
                                    <div className="absolute top-6 left-6 w-8 h-8 rounded-lg bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                        {String.fromCharCode(65 + i)}
                                    </div>
                                    <div className="pl-14 text-xl font-medium text-slate-200 group-hover:text-white">
                                        {opt}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom: Live Player Interactions */}
                    <div className="mt-8 pt-6 border-t border-slate-800/50">
                        <div className="flex items-center justify-between mb-2">
                             <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Live Participation</h4>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {players.map((p) => (
                                <div 
                                    key={p.id} 
                                    className={`
                                        w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500
                                        ${p.status === 'answered' ? `${p.color} scale-110 shadow-lg shadow-white/20` : 'bg-slate-800 opacity-50 scale-100'}
                                    `}
                                >
                                    {p.status === 'answered' ? (
                                        <Check className="w-5 h-5 text-white animate-bounce-subtle" />
                                    ) : (
                                        <User className="w-5 h-5 text-slate-500" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>
               )}

               {/* 3. End Phase (Leaderboard) */}
               {currentQuestionIndex === -2 && (
                 <div className="text-center animate-slide-up">
                    <div className="inline-flex p-6 rounded-full bg-yellow-500/20 mb-6 animate-bounce-slow">
                        <Trophy className="w-20 h-20 text-yellow-500" />
                    </div>
                    <h2 className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tight">
                        Final Leaderboard
                    </h2>
                    
                    <div className="max-w-2xl mx-auto space-y-4">
                        {players.slice(0, 5).map((p, i) => (
                            <div key={p.id} className="flex items-center bg-slate-800/50 border border-slate-700 rounded-xl p-4 animate-scale-in" style={{ animationDelay: `${i * 100}ms` }}>
                                <div className="w-8 font-bold text-slate-400 text-xl">#{i + 1}</div>
                                <div className={`w-10 h-10 rounded-full ${p.color} flex items-center justify-center mr-4 shadow-lg`}>
                                    {i === 0 ? <Crown className="w-6 h-6 text-white" /> : <User className="w-5 h-5 text-white/90" />}
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="font-bold text-xl text-white">{p.name}</div>
                                </div>
                                <div className="font-mono text-2xl font-bold text-yellow-500">
                                    {p.score.toLocaleString()} XP
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-12">
                        <Button onClick={stopSession} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white px-8 py-4 text-lg">
                            <Home className="w-5 h-5 mr-2" /> Return to Home
                        </Button>
                    </div>
                 </div>
               )}

            </div>
        )}
      </div>

      {/* Footer / Controls */}
      <div className="p-4 flex justify-between items-center text-slate-500 text-sm bg-[#0f172a] border-t border-slate-800 z-20">
         <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${active ? "bg-green-500" : "bg-red-500"}`}></div>
                 <span>{active ? "Live Connection Active" : "Disconnected"}</span>
             </div>
             {active && players.length > 0 && (
                 <span className="hidden md:inline text-slate-600">| {players.length} Students Connected</span>
             )}
         </div>
         {active && (
             <Button onClick={stopSession} size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-950/50">
                 <StopCircle className="w-4 h-4 mr-2" /> End Session
             </Button>
         )}
         {!active && (
             <Button onClick={onExit} size="sm" variant="ghost" className="hover:text-white">
                Exit
             </Button>
         )}
      </div>
    </main>
  );
};