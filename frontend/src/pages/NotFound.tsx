import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Card className="p-12 bg-gradient-glass backdrop-blur-sm border-border/50 shadow-depth">
            <motion.div
              className="w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-red-500 to-orange-600 shadow-glow flex items-center justify-center mb-8"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <AlertCircle className="w-12 h-12 text-white" />
            </motion.div>

            <motion.h1 
              className="text-6xl md:text-8xl font-bold text-foreground mb-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              404
            </motion.h1>

            <motion.h2 
              className="text-2xl md:text-3xl font-semibold text-foreground mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Page Not Found
            </motion.h2>

            <motion.p 
              className="text-lg text-muted-foreground mb-8 leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              The page you're looking for doesn't exist or has been moved. 
              Let's get you back to processing your media files.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="space-y-4"
            >
              <Link to="/">
                <Button size="lg" variant="accent" className="w-full sm:w-auto">
                  <Home className="w-5 h-5 mr-2" />
                  Back to Home
                </Button>
              </Link>
              
              <div className="text-sm text-muted-foreground">
                <p>Popular destinations:</p>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  <Link to="/download" className="hover:text-primary transition-colors">Download</Link>
                  <span>•</span>
                  <Link to="/convert/media" className="hover:text-primary transition-colors">Convert</Link>
                  <span>•</span>
                  <Link to="/ocr" className="hover:text-primary transition-colors">OCR</Link>
                </div>
              </div>
            </motion.div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;