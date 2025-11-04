import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Download, RotateCcw, FileText, ScanText, Zap, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import heroImage from "@/assets/hero-image.jpg";

const features = [
  {
    icon: Download,
    title: "Video Downloader",
    description: "Download videos from YouTube, TikTok, Instagram, and X with ease",
    href: "/download",
    color: "from-blue-500 to-purple-600"
  },
  {
    icon: RotateCcw,
    title: "Media Converter",
    description: "Convert videos and audio files between any format instantly",
    href: "/convert/media", 
    color: "from-purple-500 to-pink-600"
  },
  {
    icon: FileText,
    title: "Document Converter",
    description: "Transform documents between PDF, DOCX, and other formats",
    href: "/convert/docs",
    color: "from-pink-500 to-red-600"
  },
  {
    icon: ScanText,
    title: "OCR & AI Processing",
    description: "Extract text from images and process it with advanced AI",
    href: "/ocr",
    color: "from-red-500 to-orange-600"
  }
];

const benefits = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Process your media in seconds, not minutes"
  },
  {
    icon: Shield,
    title: "Secure & Private", 
    description: "Your files are processed securely and never stored"
  },
  {
    icon: Sparkles,
    title: "AI Powered",
    description: "Advanced AI technology for superior results"
  }
];

const Index = () => {
  return (
    <div className="space-y-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-primary opacity-80" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center space-y-8"
          >
            <motion.h1 
              className="text-5xl md:text-7xl font-bold text-foreground"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              MediaForge
              <motion.span 
                className="block text-transparent bg-gradient-accent bg-clip-text animate-glow"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.8 }}
              >
                Transform Everything
              </motion.span>
            </motion.h1>
            
            <motion.p 
              className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              The ultimate media processing suite. Download videos, convert files, 
              extract text with OCR, and leverage AI - all in one powerful platform.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link to="/download">
                <Button size="lg" variant="accent">
                  Get Started Free
                </Button>
              </Link>
              <Button variant="glass" size="lg">
                Learn More
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-4 mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Powerful Media Tools
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to work with digital media, powered by cutting-edge technology
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Link to={feature.href}>
                  <Card className="p-8 h-full bg-gradient-glass backdrop-blur-sm border-border/50 hover:shadow-depth transition-all duration-300 hover:scale-[1.02] group">
                    <div className="space-y-4">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} p-3 shadow-glow group-hover:animate-glow`}>
                        <Icon className="w-full h-full text-white" />
                      </div>
                      <h3 className="text-2xl font-semibold text-foreground group-hover:text-primary transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gradient-glass py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center space-y-4 mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground">
              Why Choose MediaForge?
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className="text-center space-y-4"
                >
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-accent shadow-glow flex items-center justify-center animate-float">
                    <Icon className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {benefit.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {benefit.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="bg-gradient-glass backdrop-blur-sm rounded-3xl p-12 border border-border/50 shadow-depth"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Transform Your Media?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of users who trust MediaForge for their media processing needs.
          </p>
          <Link to="/download">
            <Button size="lg" variant="accent">
              Start Processing Now
            </Button>
          </Link>
        </motion.div>
      </section>
    </div>
  );
};

export default Index;