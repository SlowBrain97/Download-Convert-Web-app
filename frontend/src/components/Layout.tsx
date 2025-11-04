import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Home, Download, RotateCcw, FileText, ScanText } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Download", href: "/download", icon: Download },
  { name: "Media Convert", href: "/convert/media", icon: RotateCcw },
  { name: "Doc Convert", href: "/convert/docs", icon: FileText },
  { name: "OCR & AI", href: "/ocr", icon: ScanText },
];

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-primary">
      <nav className="bg-card/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <motion.div
                  className="w-8 h-8 rounded-lg bg-gradient-accent shadow-glow flex items-center justify-center"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-lg font-bold text-primary-foreground">M</span>
                </motion.div>
                <span className="text-xl font-bold text-foreground">MediaForge</span>
              </Link>
            </div>

            <div className="flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                
                return (
                  <Link key={item.name} to={item.href}>
                    <motion.div
                      className={cn(
                        "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-glow"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      )}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{item.name}</span>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      <main className="relative">
        {children}
      </main>

      <footer className="bg-card/50 border-t border-border/50 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              © 2024 MediaForge. Built with React, Vite & Framer Motion.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};