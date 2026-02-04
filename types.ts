export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  concept: string;
  misconception?: string;
}

export interface GameData {
  code: string;
  isEngine: boolean;
  title: string;
  description: string;
  questions: Question[];
  theme: 'default' | 'adventure' | 'science' | 'history' | 'economic' | 'combat' | 'spatial' | 'social' | 'racing' | 'puzzle';
}

export type ViewState = 'landing' | 'create' | 'join' | 'play' | 'host';

export interface GameState {
  currentQuestionIndex: number;
  score: number;
  answers: number[]; // Index of selected answer for each question
  isFinished: boolean;
}
