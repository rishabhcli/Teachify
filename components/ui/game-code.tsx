import React from "react";

interface GameCodeProps {
  code: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const GameCode: React.FC<GameCodeProps> = ({ code, size = "md", className = "" }) => {
  const sizeClasses = {
    sm: "text-2xl tracking-[0.2em] px-4 py-2",
    md: "text-4xl tracking-[0.3em] px-6 py-3",
    lg: "text-6xl tracking-[0.4em] px-8 py-4",
  };

  return (
    <div className={`font-mono font-bold text-paper-900 bg-paper-100 border-2 border-paper-300 rounded-xl inline-block ${sizeClasses[size]} ${className}`}>
      {code}
    </div>
  );
};
