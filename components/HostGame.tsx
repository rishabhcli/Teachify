import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Home, Play, StopCircle, Radio, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { GameData } from "../types";
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type, Blob } from "@google/genai";

interface HostGameProps {
  gameData: GameData;
  onExit: () => void;
}

// --- Audio Utils (as per Live API examples) ---

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

  // Refs for audio handling
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  
  // Audio Playback State
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Function Declaration for the AI to control the UI
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
    if (!process.env.API_KEY) {
        alert("API Key missing");
        return;
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // 1. Setup Audio Input
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        inputSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
        processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
        
        // 2. Setup Audio Output
        const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        // 3. Connect to Gemini Live
        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            callbacks: {
                onopen: () => {
                    setLog(p => [...p, "Connected to Gemini Live..."]);
                    setActive(true);
                },
                onmessage: async (message: LiveServerMessage) => {
                    // Handle Audio Output
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

                    // Handle Tool Calls (UI Updates)
                    if (message.toolCall) {
                        for (const fc of message.toolCall.functionCalls) {
                            if (fc.name === 'updateGameState') {
                                const idx = (fc.args as any).questionIndex;
                                setCurrentQuestionIndex(idx);
                                
                                // Send success response back to model
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
                Here is the quiz data: ${JSON.stringify(gameData.questions)}.
                
                Rules:
                1. Start by welcoming the class and explaining the rules briefly.
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

        // 4. Start Streaming Audio Input
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
        alert("Failed to start Live session. Check console.");
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
    // We can't explicitly close the session object easily in the SDK without saving the resolved session, 
    // but disconnecting audio stops the flow. Ideally call session.close() if available.
    setActive(false);
    setIsSpeaking(false);
    window.location.reload(); // Simple cleanup for demo
  };

  const currentQuestion = currentQuestionIndex >= 0 ? gameData.questions[currentQuestionIndex] : null;

  return (
    <main className="min-h-screen bg-paper-50 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-8">
        <Button variant="ghost" onClick={onExit} className="text-paper-600">
            <Home className="w-4 h-4 mr-2" /> Exit
        </Button>
        <div className="flex items-center gap-2">
            {active && (
                <Badge variant="green" className="animate-pulse">
                    <Radio className="w-3 h-3 mr-1" /> Live On Air
                </Badge>
            )}
            <Badge variant="purple">{gameData.title}</Badge>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Controls */}
        <Card variant="elevated" className="p-6 mb-8 text-center">
            {!active ? (
                <div className="space-y-4">
                    <div className="w-16 h-16 bg-highlight-purple/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-8 h-8 text-highlight-purple" />
                    </div>
                    <h2 className="text-2xl font-bold text-paper-900">AI Host Ready</h2>
                    <p className="text-paper-500 max-w-sm mx-auto">
                        Connect to Gemini Live to start the voice-interactive game show. Ensure your microphone is on.
                    </p>
                    <Button onClick={startLiveSession} variant="purple" size="lg" className="w-full sm:w-auto">
                        <Play className="w-5 h-5 mr-2" /> Start Live Session
                    </Button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-all duration-300 ${isSpeaking ? "bg-highlight-green scale-110 shadow-lg" : "bg-paper-200"}`}>
                        {isSpeaking ? <Radio className="w-10 h-10 text-paper-900 animate-pulse" /> : <Mic className="w-10 h-10 text-paper-500" />}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-paper-900 mb-1">
                            {isSpeaking ? "AI is speaking..." : "Listening for answer..."}
                        </h3>
                        <p className="text-sm text-paper-500">Speak clearly into your microphone</p>
                    </div>
                    <Button onClick={stopSession} variant="outline" className="text-red-600 hover:bg-red-50 border-red-200">
                        <StopCircle className="w-4 h-4 mr-2" /> End Session
                    </Button>
                </div>
            )}
        </Card>

        {/* Display Area */}
        {active && (
            <div className="animate-slide-up">
                {currentQuestionIndex === -1 && (
                    <Card variant="default" className="p-8 text-center border-dashed">
                        <p className="text-lg text-paper-500">Lobby Phase</p>
                        <p className="text-sm text-paper-400">The AI Host is introducing the game...</p>
                    </Card>
                )}
                
                {currentQuestion && (
                    <Card variant="yellow" className="p-8 text-center animate-scale-in">
                        <Badge variant="default" className="mb-4">Question {currentQuestionIndex + 1}</Badge>
                        <h2 className="text-2xl font-bold text-paper-900 mb-6 leading-snug">
                            {currentQuestion.text}
                        </h2>
                        <div className="grid gap-3 text-left">
                            {currentQuestion.options.map((opt, i) => (
                                <div key={i} className="p-4 bg-white/50 rounded-xl border-2 border-paper-200/50">
                                    <span className="font-bold mr-2 opacity-50">{String.fromCharCode(65 + i)}.</span>
                                    {opt}
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {currentQuestionIndex === -2 && (
                    <Card variant="green" className="p-8 text-center">
                        <h2 className="text-3xl font-bold text-paper-900 mb-2">Game Over!</h2>
                        <p className="text-paper-600">Great job!</p>
                    </Card>
                )}
            </div>
        )}
      </div>
      
      {/* Logs for debugging */}
      <div className="fixed bottom-0 left-0 w-full p-2 bg-black/5 text-[10px] font-mono text-paper-400 pointer-events-none">
        {log.slice(-3).map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </main>
  );
};
