import React from "react";
import { 
  Sparkles, 
  Zap, 
  Target, 
  Users, 
  Trophy,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Gamepad2,
  BarChart3,
  FileText,
  GraduationCap,
  Play,
  Star,
  Quote
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

interface LandingPageProps {
  onStartCreate: () => void;
  onJoinGame: () => void;
}

const features = [
  {
    icon: FileText,
    title: "Any Content Works",
    description: "Upload PDFs, PowerPoints, Word docs, or paste text. Our AI extracts key concepts automatically.",
    color: "blue"
  },
  {
    icon: Target,
    title: "Learning-First Design",
    description: "Questions test understanding, not just recall. Identify and address common misconceptions.",
    color: "yellow"
  },
  {
    icon: Zap,
    title: "Instant Games",
    description: "From upload to gameplay in under 60 seconds. No more spending hours writing quiz questions.",
    color: "purple"
  },
  {
    icon: Gamepad2,
    title: "AI-Designed Mechanics",
    description: "Each game gets unique mechanics matched to your content. No two games are the same.",
    color: "green"
  },
  {
    icon: Users,
    title: "Real-Time Multiplayer",
    description: "Students join with a simple code. Live leaderboards and instant feedback keep them engaged.",
    color: "pink"
  },
  {
    icon: BarChart3,
    title: "Actionable Insights",
    description: "See exactly where students struggle. Use data to guide your next lesson.",
    color: "blue"
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({ onStartCreate, onJoinGame }) => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 border-b-2 border-paper-200 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
              <div className="w-10 h-10 bg-highlight-yellow rounded-lg border-2 border-paper-900 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-paper-900" />
              </div>
              <span className="font-display text-xl font-bold text-paper-900">Teachify</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Button variant="ghost" className="text-paper-600 hover:text-paper-900 font-medium" onClick={onJoinGame}>
                Join Game
              </Button>
              <Button variant="yellow" size="sm" className="hidden sm:flex" onClick={onStartCreate}>
                Create Game
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <div className="text-center lg:text-left">
              <Badge variant="purple" className="mb-6">
                <Sparkles className="w-3 h-3 mr-1" /> AI-Powered Learning Games
              </Badge>
              <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-paper-900 leading-tight mb-6">
                Transform Lessons Into{" "}
                <span className="text-highlight-purple">Epic Games</span>
              </h1>
              <p className="text-lg md:text-xl text-paper-500 mb-8 max-w-xl mx-auto lg:mx-0">
                Upload your teaching materials. Our AI creates interactive classroom games 
                that test understanding, not just memorization.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button variant="yellow" size="lg" className="w-full sm:w-auto" onClick={onStartCreate}>
                  Create Your First Game
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={onJoinGame}>
                  <Play className="w-5 h-5 mr-2" />
                  Join as Student
                </Button>
              </div>
              <div className="flex items-center gap-6 justify-center lg:justify-start mt-8 text-sm text-paper-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-highlight-green" />
                  <span>Free to use</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-highlight-green" />
                  <span>No signup required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-highlight-green" />
                  <span>Takes 60 seconds</span>
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative">
              <Card variant="yellow" className="p-6 transform rotate-2">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b-2 border-paper-200">
                    <div className="w-10 h-10 bg-highlight-purple/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-highlight-purple" />
                    </div>
                    <div>
                      <p className="font-medium text-paper-900">Upload Complete</p>
                      <p className="text-sm text-paper-500">biology_chapter3.pdf</p>
                    </div>
                    <Badge variant="green" className="ml-auto">Ready</Badge>
                  </div>
                  <div className="p-4 bg-paper-50 rounded-xl border-2 border-paper-200">
                    <p className="text-sm font-medium text-paper-700 mb-2">Learning Objective</p>
                    <p className="text-paper-600">&ldquo;Students should understand photosynthesis and energy transfer&rdquo;</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-paper-500">
                    <div className="w-2 h-2 bg-highlight-green rounded-full animate-pulse" />
                    <span>AI designing game mechanics...</span>
                  </div>
                </div>
              </Card>
              
              {/* Floating elements */}
              <Card variant="green" className="absolute -bottom-6 -left-6 p-4 transform -rotate-6 hidden md:block backdrop-blur-md bg-white/60">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-paper-900">24 players joined</span>
                </div>
              </Card>
              
              <Card variant="blue" className="absolute -top-4 -right-4 p-3 transform rotate-6 hidden md:block backdrop-blur-md bg-white/60">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-highlight-yellow fill-highlight-yellow" />
                  <span className="font-bold text-paper-900">4.9</span>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>
      
      {/* Shortened remaining sections for brevity of the React implementation, but keeping structure */}
      <section className="py-12 bg-paper-100">
         <div className="max-w-6xl mx-auto px-4 text-center">
            <h2 className="font-display text-2xl font-bold text-paper-700">Trusted by over 50,000 educators worldwide</h2>
         </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-paper-200 bg-paper-100 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
           <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-paper-900" />
                <span className="font-display font-bold text-paper-900">Teachify</span>
            </div>
            <p className="text-sm text-paper-400">
              © 2025 Teachify. Built for educators everywhere.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};