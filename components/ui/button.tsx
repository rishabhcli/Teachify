import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "yellow" | "purple" | "ghost" | "green";
  size?: "sm" | "md" | "lg";
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = "default", 
  size = "md", 
  className = "", 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    default: "bg-paper-900 text-white hover:bg-paper-800 focus:ring-paper-900",
    outline: "border-2 border-paper-200 bg-transparent hover:bg-paper-50 text-paper-900 focus:ring-paper-900",
    yellow: "bg-highlight-yellow text-paper-900 hover:bg-yellow-400 border-2 border-paper-900 focus:ring-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all",
    purple: "bg-highlight-purple text-white hover:bg-purple-500 focus:ring-purple-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all",
    green: "bg-highlight-green text-paper-900 hover:bg-green-400 border-2 border-paper-900 focus:ring-green-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all",
    ghost: "bg-transparent hover:bg-paper-100 text-paper-900",
  };

  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-6 text-base",
    lg: "h-14 px-8 text-lg",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};