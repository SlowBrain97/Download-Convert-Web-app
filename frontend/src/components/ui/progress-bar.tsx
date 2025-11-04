import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "accent" | "success";
}

export const ProgressBar = ({
  value,
  max = 100,
  className,
  showPercentage = true,
  size = "md",
  variant = "default"
}: ProgressBarProps) => {

  
  const sizeClasses = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4"
  };

  const variantClasses = {
    default: "bg-gradient-accent",
    accent: "bg-gradient-primary", 
    success: "bg-gradient-to-r from-green-500 to-emerald-500"
  };

  return (
    <div className={cn("space-y-2", className)}>
      {showPercentage && (
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-foreground">Progress</span>
          <span className="text-sm text-muted-foreground">{value}%</span>
        </div>
      )}
      
      <div className={cn(
        "relative overflow-hidden rounded-full bg-secondary shadow-inner",
        sizeClasses[size]
      )}>
        <motion.div
          className={cn(
            "h-full rounded-full shadow-glow transition-all duration-300",
            variantClasses[variant]
          )}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ 
            duration: 0.5,
            ease: "easeInOut"
          }}
        />
        
        <motion.div
          className="absolute inset-0 rounded-full opacity-30"
          style={{
            background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) ${value}%, transparent ${value + 20}%)`
          }}
          animate={{
            x: ["-100%", "100%"]
          }}
          transition={{
            duration: 1.5,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 0.5
          }}
        />
      </div>
    </div>
  );
};