import { motion } from "framer-motion";
import { FileText, File, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { FileUploader } from "@/components/ui/file-uploader";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ResultCard } from "@/components/ui/result-card";
import { useAppStore } from "@/store/useAppStore";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import axiosInstance from "@/lib/apiConfig";

const documentFormats = [
  { value: "pdf", label: "PDF", icon: File },
  { value: "docx", label: "DOCX", icon: FileText },
  { value: "txt", label: "TXT", icon: FileText },
  { value: "rtf", label: "RTF", icon: FileText },
  { value: "odt", label: "ODT", icon: FileText },
  { value: "html", label: "HTML", icon: FileText },
  { value: "epub", label: "EPUB", icon: File },
  { value: "jpg", label: "JPG", icon: FileImage },
  { value: "png", label: "PNG", icon: FileImage }
];

const DocsConvert = () => {
  const { 
    conversion, 
    setConversionFile,
    setInputFormat,
    setOutputFormat,
    setConversionLoading, 
    setConversionProgress, 
    setConversionResult,
    setConversionError,
    resetConversion,
    setConversionTaskId
  } = useAppStore();

  const { toast } = useToast();

  const handleFileSelect = (file: File) => {
    setConversionFile(file);
    
    // Auto-detect format from file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension) {
      setInputFormat(extension);
    }
  };

  const handleConvert = async () => {
    if (!conversion.file) {
      setConversionError("Please select a document to convert");
      return;
    }
    
    if (!conversion.outputFormat) {
      setConversionError("Please select an output format");
      return;
    }

    try {
      setConversionLoading(true);
      setConversionError(null);

      const formData = new FormData();
      formData.append('file', conversion.file);
      formData.append('outputFormat', conversion.outputFormat);
      formData.append('inputFormat', conversion.inputFormat);

      const response = await axiosInstance.post('/api/docs/convert', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setConversionTaskId(response.data.taskId);
      toast({
        title: "Conversion Started", 
        description: "Your document is being converted. Please wait...",
        variant: "default"
      });
    } catch (error) {
      setConversionError(error instanceof Error ? error.message : "Conversion failed");
      toast({
        title: "Conversion Failed", 
        description: "Please check your document and try again.",
        variant: "destructive"
      });
    } finally {
      setConversionLoading(false);
    }
  };

  const handleReset = () => {
    resetConversion();
  };
  useEffect(()=>{
    if (!conversion.taskId) return;

    const eventSource = new EventSource(`${axiosInstance.defaults.baseURL}/api/progress/${conversion.taskId}`);
    eventSource.addEventListener("progress", (event) => {
      const data = JSON.parse(event.data);
      setConversionProgress(data.progress);
      setConversionLoading(true);
      eventSource.close();
    })
    eventSource.addEventListener("complete", (event) => {
      const data = JSON.parse(event.data);
      setConversionResult(data.result);
      setConversionLoading(false);
      toast({
        title: "Conversion Complete!", 
        description: "Your document has been converted successfully.",
        variant: "default"
      });
      eventSource.close();
    })
    eventSource.addEventListener("error", (event) => {
      const response = event as MessageEvent;
      const data = JSON.parse(response.data);
      setConversionError(data.message);
      eventSource.close();
    })

    return () => {
      eventSource.removeEventListener("progress", (event) => {});
      eventSource.removeEventListener("complete", (event) => {});
      eventSource.removeEventListener("error", (event) => {});
      eventSource.close();
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
              className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-r from-pink-500 to-red-600 shadow-glow flex items-center justify-center"
              whileHover={{ scale: 1.05, rotateY: 180 }}
              transition={{ duration: 0.5 }}
            >
              <FileText className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Document Converter
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transform your documents between any format with ease
            </p>
          </div>

          {/* File Upload */}
          <Card className="p-8 bg-gradient-glass backdrop-blur-sm border-border/50">
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-foreground">Upload Document</h2>
              <FileUploader
                accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.html,.epub,.xlsx,.csv"
                maxSize={50 * 1024 * 1024} // 50MB
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
                  <h2 className="text-2xl font-semibold text-foreground">Select Formats</h2>
                  
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
                          <SelectValue placeholder="Select output format" />
                        </SelectTrigger>
                        <SelectContent>
                          {documentFormats.map((format) => {
                            const Icon = format.icon;
                            return (
                              <SelectItem key={format.value} value={format.value}>
                                <div className="flex items-center gap-2">
                                  <Icon className="w-4 h-4" />
                                  {format.label}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Format Grid */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-foreground">Popular Conversions</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {documentFormats.slice(0, 8).map((format) => {
                        const Icon = format.icon;
                        const isSelected = conversion.outputFormat === format.value;
                        
                        return (
                          <motion.button
                            key={format.value}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setOutputFormat(format.value)}
                            className={`p-3 rounded-lg border transition-all duration-300 ${
                              isSelected 
                                ? 'border-primary bg-primary/20 shadow-glow' 
                                : 'border-border hover:border-primary/50 bg-card/50'
                            }`}
                          >
                            <Icon className="w-8 h-8 mx-auto mb-1 text-primary" />
                            <p className="text-sm font-medium text-foreground">{format.label}</p>
                          </motion.button>
                        );
                      })}
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
                    <Button
                      onClick={handleConvert}
                      disabled={conversion.isLoading || !conversion.outputFormat}
                      variant="accent"
                      size="lg"
                    >
                      {conversion.isLoading ? "Converting..." : "Convert Document"}
                    </Button>
                    
                    {(conversion.isLoading || conversion.result) && (
                      <Button
                        onClick={handleReset}
                        variant="secondary"
                        size="lg"
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
                  <h3 className="text-xl font-semibold text-foreground">Converting Document...</h3>
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
                description="Your document has been converted successfully."
                downloadUrl={conversion.result.downloadUrl}
                downloadName={conversion.result.fileName}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <p><span className="font-medium">Original:</span> {conversion.inputFormat?.toUpperCase()}</p>
                    <p><span className="font-medium">Converted:</span> {conversion.outputFormat?.toUpperCase()}</p>
                  </div>
                  <div className="space-y-2">
                    <p><span className="font-medium">Pages:</span> {conversion.result.pageCount || 'N/A'}</p>
                    <p><span className="font-medium">Size:</span> {conversion.result.fileSize}</p>
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

export default DocsConvert;