import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download as DownloadIcon, Play, Music, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ResultCard } from "@/components/ui/result-card";
import { useAppStore } from "@/store/useAppStore";
import { useToast } from "@/hooks/use-toast";
import axiosInstance from "@/lib/apiConfig";

const platforms = [
  { value: "youtube", label: "YouTube", icon: Play, color: "from-red-500 to-red-600" },
  { value: "tiktok", label: "TikTok", icon: Music, color: "from-black to-gray-800" },
  { value: "instagram", label: "Instagram", icon: Image, color: "from-pink-500 to-purple-600" },
  { value: "x", label: "X (Twitter)", icon: Play, color: "from-blue-500 to-blue-600" }
];

const Download = () => {
  const { 
    download, 
    setDownloadUrl, 
    setDownloadPlatform, 
    setDownloadLoading, 
    setDownloadProgress, 
    setDownloadResult,
    setDownloadError,
    resetDownload,
    setDownloadTaskId
  } = useAppStore();
  const [fileType,setFileType] = useState<'video'| 'audio'>();
  const { toast } = useToast();
  
  const handleDownload = async (type: 'video' | 'audio') => {
    
    if (!download.url.trim()) {
      setDownloadError("Please enter a valid URL");
      return;
    }
    
    try {
      setFileType(type);
      setDownloadLoading(true);
      setDownloadError(null);
      setDownloadProgress(0);
      
      const response = await axiosInstance.post('/api/download', {
        url: download.url,
        platform: download.platform,
        fileType: type
      });
      console.log(response.data);
      setDownloadTaskId(response.data.taskId);
      toast({
        title: "Processing",
        description: "Your video is being processed.",
      });
      
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Download failed");
      toast({
        title: "Request Failed",
        description: "Maybe server's problem or your url , please try again.",
        variant: "destructive"
      });
      setDownloadLoading(false);
    }
  };

    useEffect(()=>{
      if (!download.taskId) return;
      const eventSource = new EventSource(`${axiosInstance.defaults.baseURL}/api/progress/${download.taskId}`);
      eventSource.addEventListener('progress', (event) => {
        const data = JSON.parse(event.data);
        setDownloadProgress(data.progress);
        if (data.status === 'processing') {
          toast({
            title: "Processing...",
            description: data.message,
          });
        }
      })
      eventSource.addEventListener('complete', (event) => {
        const data = JSON.parse(event.data);
        setDownloadProgress(100);
        setDownloadResult(data.result);
        setDownloadLoading(false);
        toast({
          title: "Download Complete!",
          description: "Your file has been downloaded successfully.",
        });
        eventSource.close();
        
      })
      eventSource.addEventListener('error', (event) => {
        const messageEvent = event as MessageEvent;
        const data = JSON.parse(messageEvent.data);
        setDownloadError(data.error);
        setDownloadLoading(false);
        eventSource.close();
        toast({
          title: "Download Failed", 
          description: "Maybe server's problem or your url , please try again.",
          variant: "destructive"
        });
      })
  
      return ()=> 
        {eventSource.close();
          resetDownload();
        }
    },[download.taskId])


  const handleReset = () => {
    resetDownload();
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
              className="w-20 h-20 mx-auto rounded-2xl bg-gradient-accent shadow-glow flex items-center justify-center"
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <DownloadIcon className="w-10 h-10 text-primary-foreground" />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Video Downloader
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Download videos from your favorite platforms instantly
            </p>
          </div>

          {/* Platform Selection */}
          <Card className="p-8 bg-gradient-glass backdrop-blur-sm border-border/50">
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-foreground">Select Platform</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {platforms.map((platform) => {
                  const Icon = platform.icon;
                  const isSelected = download.platform === platform.value;
                  
                  return (
                    <motion.button
                      key={platform.value}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setDownloadPlatform(platform.value as any)}
                      className={`p-4 rounded-xl border transition-all duration-300 ${
                        isSelected 
                          ? 'border-primary bg-primary/20 shadow-glow' 
                          : 'border-border hover:border-primary/50 bg-card/50'
                      }`}
                    >
                      <div className={`w-12 h-12 mx-auto rounded-lg bg-gradient-to-r ${platform.color} p-2 mb-2`}>
                        <Icon className="w-full h-full text-white" />
                      </div>
                      <p className="text-sm font-medium text-foreground">{platform.label}</p>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* URL Input */}
          <Card className="p-8 bg-gradient-glass backdrop-blur-sm border-border/50">
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-foreground">Video URL</h2>
              <div className="space-y-4">
                <Input
                  placeholder={`Enter ${platforms.find(p => p.value === download.platform)?.label} URL...`}
                  value={download.url}
                  onChange={(e) => setDownloadUrl(e.target.value)}
                  disabled={download.isLoading}
                  className="text-lg py-3"
                />
                
                {download.error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 text-sm text-destructive-foreground bg-destructive/10 border border-destructive rounded-lg"
                  >
                    {download.error}
                  </motion.div>
                )}

                <div className="flex gap-4">
                  <Button
                    onClick={() => handleDownload('video')}
                    disabled={download.isLoading || !download.url.trim()}
                    variant="accent"
                    size="lg"
                  >
                    {download.isLoading ? "Processing..." : "Download Video"}
                  </Button>
                  <Button
                    onClick={() => handleDownload('audio')}
                    disabled={download.isLoading || !download.url.trim()}
                    variant="accent"
                    size="lg"
                  >
                    {download.isLoading ? "Processing..." : "Download Audio"}
                  </Button>
                  {(download.isLoading || download.result) && (
                    <Button
                      onClick={handleReset}
                      variant="secondary"
                      size="lg"
                      disabled={download.isLoading}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Progress */}
          {download.isLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="p-8 bg-gradient-glass backdrop-blur-sm border-border/50">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-foreground">Processing {fileType}...</h3>
                  <ProgressBar value={download?.progress || 0} />
                </div>
              </Card>
            </motion.div>
          )}

          {/* Results */}
          {download.result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ResultCard
                title="Download Complete!"
                description="Your video has been processed and is ready for download."
                downloadUrl={download.result.downloadUrl}
                downloadName={download.result.filename}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <p><span className="font-medium">Title:</span> {download.result.title}</p>
                    <p><span className="font-medium">Duration:</span> {download.result.duration}</p>
                  </div>
                  <div className="space-y-2">
                    <p><span className="font-medium">Quality:</span> {download.result.quality}</p>
                    <p><span className="font-medium">Size:</span> {download.result.fileSize}</p>
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

export default Download;