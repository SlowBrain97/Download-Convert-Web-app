import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Video, Music, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { FileUploader } from "@/components/ui/file-uploader";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ResultCard } from "@/components/ui/result-card";
import { useAppStore } from "@/store/useAppStore";
import { useToast } from "@/hooks/use-toast";
import axiosInstance from "@/lib/apiConfig";
import { WarningProvider } from "@radix-ui/react-dialog";

const formats = {
  video: [
    { value: "mp4", label: "MP4" },
    { value: "avi", label: "AVI" },
    { value: "mov", label: "MOV" },
    { value: "mkv", label: "MKV" },
    { value: "webm", label: "WebM" },
    { value: "wmv", label: "WMV" }
  ],
  audio: [
    { value: "mp3", label: "MP3" },
    { value: "wav", label: "WAV" },
    { value: "flac", label: "FLAC" },
    { value: "aac", label: "AAC" },
    { value: "ogg", label: "OGG" },
    { value: "m4a", label: "M4A" }
  ]
};

const MediaConvert = () => {
  const { 
    conversion,
    setConversionTaskId,
    setConversionFile,
    setInputFormat,
    setOutputFormat,
    setConversionLoading, 
    setConversionProgress, 
    setConversionResult,
    setConversionError,
    resetConversion
  } = useAppStore();

  const { toast } = useToast();
  const [mediaType, setMediaType] = useState<"video" | "audio">("video");

  const handleFileSelect = (file: File) => {
    setConversionFile(file);
    
    // Auto-detect format from file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension) {
      setInputFormat(extension);
      
      // Determine media type
      const videoExtensions = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'wmv'];
      const audioExtensions = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'];
      
      if (videoExtensions.includes(extension)) {
        setMediaType("video");
      } else if (audioExtensions.includes(extension)) {
        setMediaType("audio");
      }
    }
  };

  const handleConvert = async () => {
    if (!conversion.file) {
      setConversionError("Please select a file to convert");
      return;
    }
    
    if (!conversion.outputFormat) {
      setConversionError("Please select an output format");
      return;
    }

    try {
      setConversionLoading(true);
      setConversionError(null);
      setConversionProgress(5);
     
      const formData = new FormData();
      formData.append('file', conversion.file);
      formData.append('outputFormat', conversion.outputFormat);
      formData.append('inputFormat', conversion.inputFormat);

      const response = await axiosInstance.post('/api/media/convert', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setConversionTaskId(response.data.taskId);
      
    } catch (error) {
      setConversionError(error instanceof Error ? error.message : "Conversion failed");
      toast({
        title: "Conversion Failed", 
        description: "Please check your file and try again.",
        variant: "destructive"
      });
    }
  };
  

  const handleReset = () => {
    resetConversion();
    setMediaType("video");
  };

  let availableFormatsVideo = null;
  let availableFormatsAudio = null;
  if (mediaType == "video"){
    availableFormatsVideo = formats["video"];
    availableFormatsAudio = formats["audio"];
  }
  else{
    availableFormatsAudio = formats["audio"];
  }

  useEffect(()=>{
    if (!conversion.taskId) return;
    const eventSource = new EventSource(`${axiosInstance.defaults.baseURL}/api/progress/${conversion.taskId}`);
    eventSource.addEventListener('progress', (event) => {
      const data = JSON.parse(event.data);
      setConversionProgress(data.progress);
    })
    eventSource.addEventListener('complete', (event) => {
      const data = JSON.parse(event.data);
      setConversionProgress(100);
      setConversionResult(data.result);
      toast({
        title: "Conversion Complete!",
        description: "Your file has been converted successfully.",
      });
      eventSource.close();
      
    })
    eventSource.addEventListener('error', (event) => {
      const messageEvent = event as MessageEvent;
      const data = JSON.parse(messageEvent.data);
      setConversionError(data.error);
      eventSource.close();
      toast({
        title: "Conversion Failed", 
        description: "Please check your file and try again.",
        variant: "destructive"
      });
    })

    return ()=> {eventSource.close();
      resetConversion();
    }
  },[conversion.taskId])

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
              className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 shadow-glow flex items-center justify-center"
              whileHover={{ scale: 1.05, rotate: 180 }}
              transition={{ duration: 0.5 }}
            >
              <RotateCcw className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Media Converter
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Convert your videos and audio files between any format instantly
            </p>
          </div>

          {/* Media Type Selection */}
          <Card className="p-8 bg-gradient-glass backdrop-blur-sm border-border/50">
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-foreground">Select Media Type</h2>
              <div className="grid grid-cols-2 gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setMediaType("video")}
                  className={`p-6 rounded-xl border transition-all duration-300 ${
                    mediaType === "video"
                      ? 'border-primary bg-primary/20 shadow-glow' 
                      : 'border-border hover:border-primary/50 bg-card/50'
                  }`}
                >
                  <Video className="w-12 h-12 mx-auto mb-2 text-primary" />
                  <p className="font-medium text-foreground">Video Files</p>
                  <p className="text-sm text-muted-foreground">MP4, AVI, MOV, etc.</p>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setMediaType("audio")}
                  className={`p-6 rounded-xl border transition-all duration-300 ${
                    mediaType === "audio"
                      ? 'border-primary bg-primary/20 shadow-glow' 
                      : 'border-border hover:border-primary/50 bg-card/50'
                  }`}
                >
                  <Music className="w-12 h-12 mx-auto mb-2 text-primary" />
                  <p className="font-medium text-foreground">Audio Files</p>
                  <p className="text-sm text-muted-foreground">MP3, WAV, FLAC, etc.</p>
                </motion.button>
              </div>
            </div>
          </Card>

          {/* File Upload */}
          <Card className="p-8 bg-gradient-glass backdrop-blur-sm border-border/50">
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-foreground">Upload File</h2>
              <FileUploader
                accept={mediaType === "video" ? "video/*" : "audio/*"}
                maxSize={300 * 1024 * 1024} 
                onFileSelect={handleFileSelect}
                onFileRemove={() => setConversionFile(null)}
                selectedFile={conversion.file}
                disabled={conversion.isLoading}
              />
            </div>
          </Card>

          {/* Format Selection */}
          {conversion.file && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-8 bg-gradient-glass backdrop-blur-sm border-border/50">
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-foreground">Select Output Format</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Input Format</label>
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        <p className="text-foreground font-medium">{conversion.inputFormat?.toUpperCase()}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Output Format</label>
                      <Select 
                        value={conversion.outputFormat} 
                        onValueChange={setOutputFormat}
                        disabled={conversion.isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${mediaType} format`} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel className="text-lg font-medium text-foreground">Video</SelectLabel>
                            {availableFormatsVideo.map(f => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>  

                          <div className="my-1 h-px bg-border" /> {/* Divider line */}

                          <SelectGroup>
                            <SelectLabel className="text-lg font-medium text-foreground">Audio</SelectLabel>
                            {availableFormatsAudio.map(f => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {conversion.error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 text-sm text-destructive-foreground bg-destructive/10 border border-destructive rounded-lg"
                    >
                      {conversion.error}
                    </motion.div>
                  )}

                  <div className="flex gap-4">
                    {conversion.result ? <Button
                      variant="link"
                      size="lg"
                    >
                      {conversion.isLoading ? "Converting..." : "Convert File"}
                    </Button> : 
                    <Button
                      onClick={handleConvert}
                      disabled={conversion.isLoading || !conversion.outputFormat}
                      variant="accent"
                      size="lg"
                    >
                      {conversion.isLoading ? "Converting..." : "Convert File"}
                    </Button>}
                    
                    
                    {(conversion.isLoading || conversion.result) && (
                      <Button
                        onClick={handleReset}
                        variant="secondary"
                        size="lg"
                        disabled={conversion.isLoading}
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Progress */}
          {conversion.isLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="p-8 bg-gradient-glass backdrop-blur-sm border-border/50">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-foreground">Converting File...</h3>
                  <ProgressBar value={conversion.progress} />
                </div>
              </Card>
            </motion.div>
          )}

          {/* Results */}
          {conversion.result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ResultCard
                title="Conversion Complete!"
                description="Your file has been converted successfully."
                downloadUrl={conversion.result.downloadUrl}
                downloadName={conversion.result.fileName}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <p><span className="font-medium">Original:</span> {conversion.inputFormat?.toUpperCase()}</p>
                    <p><span className="font-medium">Converted:</span> {conversion.outputFormat?.toUpperCase()}</p>
                  </div>
                  <div className="space-y-2">
                    <p><span className="font-medium">Size:</span> {conversion.result.size}</p>
                    <p><span className="font-medium">Quality:</span> {conversion.result.quality}</p>
                  </div>
                </div>
              </ResultCard>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default MediaConvert;