import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "yellow" | "green" | "blue" | "pink" | "elevated";
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  variant = "default", 
  className = "", 
  ...props 
}) => {
  const baseStyles = "rounded-2xl border-2 transition-all";
  
  const variants = {
    default: "bg-white border-paper-200",
    elevated: "bg-white border-paper-200 shadow-xl",
    yellow: "bg-highlight-yellow/10 border-highlight-yellow",
    green: "bg-highlight-green/10 border-highlight-green",
    blue: "bg-highlight-blue/10 border-highlight-blue",
    pink: "bg-highlight-pink/10 border-highlight-pink",
  };

  return (
    <div 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};