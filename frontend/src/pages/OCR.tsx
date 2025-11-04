import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ScanText, Camera, Wand2, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { FileUploader } from "@/components/ui/file-uploader";
import { ResultCard } from "@/components/ui/result-card";
import { useAppStore } from "@/store/useAppStore";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

const aiPrompts = [
  { label: "Summarize", value: "Summarize this text in a concise manner:" },
  { label: "Translate", value: "Translate this text to English:" },
  { label: "Extract Info", value: "Extract key information and contact details from this text:" },
  { label: "Format", value: "Format this text into a clean, readable structure:" },
  { label: "Correct Grammar", value: "Correct any grammar and spelling errors in this text:" }
];

const OCR = () => {
  const { 
    ocr, 
    setOCRImage,
    setExtractedText,
    setAIResult,
    setOCRLoading,
    setOCRError,
    resetOCR
  } = useAppStore();

  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCamera, setIsCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCamera(true);
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCamera(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'captured-image.jpg', { type: 'image/jpeg' });
            setOCRImage(file);
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const handleFileSelect = (file: File) => {
    setOCRImage(file);
  };

  const processOCR = async () => {
    if (!ocr.image) {
      setOCRError("Please select or capture an image");
      return;
    }

    try {
      setOCRLoading(true);
      setOCRError(null);

      // Replace with actual OCR API call
      const formData = new FormData();
      formData.append('image', ocr.image);

      const response = await axios.post('/api/ocr/extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setExtractedText(response.data.text);
      
      toast({
        title: "Text Extracted!",
        description: "OCR processing completed successfully.",
      });
      
    } catch (error) {
      setOCRError(error instanceof Error ? error.message : "OCR processing failed");
      toast({
        title: "OCR Failed",
        description: "Please try with a clearer image.",
        variant: "destructive"
      });
    } finally {
      setOCRLoading(false);
    }
  };

  const processAI = async (prompt: string) => {
    if (!ocr.extractedText.trim()) {
      setOCRError("No extracted text available for AI processing");
      return;
    }

    try {
      setOCRLoading(true);
      setOCRError(null);

      // Replace with actual AI API call
      const response = await axios.post('/api/ai/process', {
        text: ocr.extractedText,
        prompt: prompt
      });

      setAIResult(response.data.result);
      
      toast({
        title: "AI Processing Complete!",
        description: "Your text has been processed with AI.",
      });
      
    } catch (error) {
      setOCRError(error instanceof Error ? error.message : "AI processing failed");
      toast({
        title: "AI Processing Failed",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setOCRLoading(false);
    }
  };

  const handleReset = () => {
    resetOCR();
    stopCamera();
    setCustomPrompt("");
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Text copied to clipboard.",
    });
  };

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-4">
            <motion.div
              className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-r from-red-500 to-orange-600 shadow-glow flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <ScanText className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              OCR & AI Processing
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Extract text from images and enhance it with powerful AI
            </p>
          </div>

          {/* Image Input */}
          <Card className="p-8 bg-gradient-glass backdrop-blur-sm border-border/50">
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-foreground">Select Image Source</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startCamera}
                  disabled={ocr.isLoading}
                  className="p-6 rounded-xl border border-border hover:border-primary/50 bg-card/50 transition-all duration-300"
                >
                  <Camera className="w-12 h-12 mx-auto mb-2 text-primary" />
                  <p className="font-medium text-foreground">Use Camera</p>
                  <p className="text-sm text-muted-foreground">Capture image directly</p>
                </motion.button>
                
                <div className="space-y-4">
                  <div className="text-center p-4 border border-dashed border-border rounded-xl">
                    <p className="font-medium text-foreground mb-2">Upload Image</p>
                    <FileUploader
                      accept="image/*"
                      maxSize={10 * 1024 * 1024} // 10MB
                      onFileSelect={handleFileSelect}
                      onFileRemove={() => setOCRImage(null)}
                      selectedFile={ocr.image}
                      disabled={ocr.isLoading}
                    />
                  </div>
                </div>
              </div>

              {/* Camera View */}
              {isCamera && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <div className="relative rounded-lg overflow-hidden bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-64 object-cover"
                    />
                  </div>
                  <div className="flex gap-4">
            <Button onClick={captureImage} variant="accent" className="flex-1">
              Capture Image
            </Button>
                    <Button onClick={stopCamera} variant="secondary">
                      Cancel
                    </Button>
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                </motion.div>
              )}

              {/* OCR Button */}
              {ocr.image && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {ocr.error && (
                    <div className="p-3 text-sm text-destructive-foreground bg-destructive/10 border border-destructive rounded-lg">
                      {ocr.error}
                    </div>
                  )}
                  
                  <Button
                    onClick={processOCR}
                    disabled={ocr.isLoading}
                    variant="accent"
                    size="lg"
                  >
                    {ocr.isLoading ? "Extracting Text..." : "Extract Text with OCR"}
                  </Button>
                </motion.div>
              )}
            </div>
          </Card>

          {/* Extracted Text */}
          {ocr.extractedText && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-8 bg-gradient-glass backdrop-blur-sm border-border/50">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold text-foreground">Extracted Text</h2>
                    <Button
                      onClick={() => copyToClipboard(ocr.extractedText)}
                      variant="secondary"
                      size="sm"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                  <Textarea
                    value={ocr.extractedText}
                    onChange={(e) => setExtractedText(e.target.value)}
                    className="min-h-[150px] bg-muted/50"
                    placeholder="Extracted text will appear here..."
                  />
                </div>
              </Card>
            </motion.div>
          )}

          {/* AI Processing */}
          {ocr.extractedText && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-8 bg-gradient-glass backdrop-blur-sm border-border/50">
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-foreground">AI Processing</h2>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {aiPrompts.map((prompt) => (
                        <Button
                          key={prompt.label}
                          onClick={() => processAI(prompt.value)}
                          disabled={ocr.isLoading}
                          variant="secondary"
                          className="justify-start"
                        >
                          <Wand2 className="w-4 h-4 mr-2" />
                          {prompt.label}
                        </Button>
                      ))}
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Custom Prompt</label>
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Enter your custom AI prompt..."
                          value={customPrompt}
                          onChange={(e) => setCustomPrompt(e.target.value)}
                          disabled={ocr.isLoading}
                          className="flex-1"
                        />
                        <Button
                          onClick={() => processAI(customPrompt)}
                          disabled={ocr.isLoading || !customPrompt.trim()}
                  variant="accent"
                        >
                          <Wand2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* AI Results */}
          {ocr.aiResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ResultCard
                title="AI Processing Complete!"
                description="Your text has been processed with artificial intelligence."
                result={ocr.aiResult}
                onCopy={() => copyToClipboard(ocr.aiResult)}
              />
            </motion.div>
          )}

          {/* Reset Button */}
          {(ocr.image || ocr.extractedText || ocr.aiResult) && (
            <div className="text-center">
              <Button onClick={handleReset} variant="secondary" size="lg">
                Start Over
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default OCR;