import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "yellow" | "purple" | "green" | "blue" | "pink";
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = "default", 
  className = "", 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  
  const variants = {
    default: "border-transparent bg-paper-900 text-white hover:bg-paper-800",
    yellow: "border-transparent bg-highlight-yellow text-paper-900",
    purple: "border-transparent bg-highlight-purple text-white",
    green: "border-transparent bg-highlight-green text-paper-900",
    blue: "border-transparent bg-highlight-blue text-paper-900",
    pink: "border-transparent bg-highlight-pink text-paper-900",
  };

  return (
    <span 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};