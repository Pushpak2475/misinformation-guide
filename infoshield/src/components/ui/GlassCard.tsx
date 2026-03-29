import { motion } from 'framer-motion';
import { type ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: string;
  delay?: number;
}

export default function GlassCard({ children, className = '', hover = true, glow, delay = 0 }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
      className={`glass-card ${className}`}
      style={glow ? { '--glow-color': glow } as React.CSSProperties : undefined}
    >
      {children}
    </motion.div>
  );
}
