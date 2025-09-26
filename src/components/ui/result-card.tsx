import { motion } from "framer-motion";
import { Download, Share, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ResultCardProps {
  title: string;
  description?: string;
  downloadUrl?: string;
  downloadName?: string;
  result?: any;
  onCopy?: () => void;
  onShare?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const ResultCard = ({
  title,
  description,
  downloadUrl,
  downloadName,
  result,
  onCopy,
  onShare,
  className,
  children
}: ResultCardProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (onCopy) {
      onCopy();
    } else if (result && typeof result === 'string') {
      await navigator.clipboard.writeText(result);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = `${import.meta.env.VITE_BASE_URL}${downloadUrl}`;
      link.setAttribute('download', downloadName || 'download');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-card border rounded-xl p-6 shadow-depth",
        "bg-gradient-glass backdrop-blur-sm",
        className
      )}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        {children && (
          <div className="space-y-3">
            {children}
          </div>
        )}

        {result && typeof result === 'string' && (
          <div className="space-y-3">
            <div className="p-4 bg-muted/50 rounded-lg border">
              <p className="text-sm text-foreground whitespace-pre-wrap">{result}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {downloadUrl && (
            <Button
              onClick={handleDownload}
              variant="default"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          )}

          {(result || onCopy) && (
            <Button
              onClick={handleCopy}
              variant="secondary"
              className="flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </Button>
          )}

          {onShare && (
            <Button
              onClick={onShare}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Share className="w-4 h-4" />
              Share
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};