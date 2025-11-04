import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, File, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  accept?: string;
  maxSize?: number;
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  selectedFile?: File | null;
  disabled?: boolean;
  className?: string;
  multiple?: boolean;
}

export const FileUploader = ({
  accept = "*",
  maxSize = 10 * 1024 * 1024, // 10MB default
  onFileSelect,
  onFileRemove,
  selectedFile,
  disabled = false,
  className,
  multiple = false
}: FileUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFile = (file: File) => {
    if (maxSize && file.size > maxSize) {
      return `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`;
    }
    return null;
  };

  const handleFile = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setError(null);
    onFileSelect(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [disabled, onFileSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleRemoveFile = () => {
    setError(null);
    onFileRemove?.();
  };

  return (
    <div className={cn("space-y-4", className)}>
      <motion.div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300",
          "bg-gradient-glass backdrop-blur-sm shadow-glass",
          isDragging && !disabled ? "border-primary bg-primary/10 scale-[1.02]" : "border-border hover:border-primary/50",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          error ? "border-destructive" : ""
        )}
        whileHover={!disabled ? { scale: 1.01 } : {}}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="flex flex-col items-center space-y-4">
          <motion.div
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center",
              "bg-gradient-accent shadow-glow"
            )}
            animate={{ 
              rotateY: isDragging ? 180 : 0,
              scale: isDragging ? 1.1 : 1 
            }}
            transition={{ duration: 0.3 }}
          >
            <Upload className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              {isDragging ? "Drop your file here" : "Upload a file"}
            </h3>
            <p className="text-sm text-muted-foreground">
              Drag & drop or click to browse
            </p>
            {maxSize && (
              <p className="text-xs text-muted-foreground">
                Max size: {Math.round(maxSize / 1024 / 1024)}MB
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {selectedFile && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 bg-card rounded-lg border shadow-depth"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <File className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleRemoveFile}
            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 text-sm text-destructive-foreground bg-destructive/10 border border-destructive rounded-lg"
        >
          {error}
        </motion.div>
      )}
    </div>
  );
};