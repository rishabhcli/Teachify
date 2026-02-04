import React, { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { CreateGame } from './components/CreateGame';
import { GamePlay } from './components/GamePlay';
import { HostGame } from './components/HostGame';
import { StudentJoin } from './components/StudentJoin';
import { GameData, ViewState } from './types';

// Mock game data for students joining via code
const MOCK_JOIN_GAME: GameData = {
  code: "TEST01",
  isEngine: true,
  title: "The Industrial Revolution",
  description: "Explore the technological and social changes of the 18th and 19th centuries.",
  theme: "history",
  questions: [
    {
      id: "q1",
      text: "Which invention is often cited as the catalyst for the Industrial Revolution in the textile industry?",
      options: ["The Steam Engine", "The Spinning Jenny", "The Printing Press", "The Cotton Gin"],
      correctIndex: 1,
      explanation: "The Spinning Jenny, invented by James Hargreaves in 1764, allowed a worker to spin multiple spools of yarn at once, dramatically increasing productivity.",
      concept: "Technological Innovation",
      misconception: "The Steam Engine, while crucial, came slightly later in widespread adoption for textiles."
    },
    {
      id: "q2",
      text: "What was a primary social consequence of urbanization during this period?",
      options: ["Increased rural population", "Better living conditions for all", "Rise of the factory system and overcrowding", "Decrease in child labor"],
      correctIndex: 2,
      explanation: "People flocked to cities for factory jobs, leading to rapid, unplanned urbanization, overcrowding, and poor sanitary conditions.",
      concept: "Social Impact",
      misconception: "Many believe life immediately improved, but early industrial cities were often hazardous."
    },
    {
      id: "q3",
      text: "Which economic system gained prominence as a result of industrialization?",
      options: ["Feudalism", "Capitalism", "Mercantilism", "Agrarianism"],
      correctIndex: 1,
      explanation: "Industrialization required significant capital investment in machinery and factories, fueling the growth of industrial capitalism.",
      concept: "Economic Systems"
    }
  ]
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('landing');
  const [gameData, setGameData] = useState<GameData | null>(null);

  const handleGameGenerated = (data: GameData) => {
    setGameData(data);
    setView('host');
  };

  const handleStudentJoin = (code: string, name: string) => {
    // In a real app, we would fetch the game data based on the code here.
    // For this demo, we use a mock game if one wasn't just created.
    if (!gameData) {
        setGameData({
            ...MOCK_JOIN_GAME,
            code: code // Use the code they entered
        });
    }
    setView('play');
  };

  return (
    <>
      {view === 'landing' && (
        <LandingPage 
            onStartCreate={() => setView('create')} 
            onJoinGame={() => setView('join')}
        />
      )}
      
      {view === 'create' && (
        <CreateGame 
          onGameGenerated={handleGameGenerated} 
          onBack={() => setView('landing')} 
        />
      )}
      
      {view === 'host' && gameData && (
        <HostGame 
          gameData={gameData} 
          onExit={() => setView('landing')} 
        />
      )}

      {view === 'join' && (
        <StudentJoin 
            onJoin={handleStudentJoin}
            onBack={() => setView('landing')}
        />
      )}
      
      {view === 'play' && gameData && (
        <GamePlay 
          gameData={gameData} 
          onExit={() => setView('landing')} 
        />
      )}
    </>
  );
};

export default App;
