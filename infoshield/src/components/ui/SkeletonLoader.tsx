import { motion } from 'framer-motion';

interface SkeletonProps { className?: string; }

export function SkeletonLine({ className = '' }: SkeletonProps) {
  return <div className={`rounded-lg bg-white/5 animate-pulse ${className}`} style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />;
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`glass-card space-y-3 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="h-4 w-3/4" />
          <SkeletonLine className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonLine className="h-3 w-full" />
      <SkeletonLine className="h-3 w-5/6" />
      <SkeletonLine className="h-3 w-4/6" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="ml-64 flex-1 p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-white/5" />
        <div className="space-y-2">
          <div className="h-6 w-48 rounded-lg bg-white/5" />
          <div className="h-3 w-64 rounded-lg bg-white/5" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 glass rounded-2xl bg-white/3" />)}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}

export default function SkeletonLoader({ type = 'page' }: { type?: 'page' | 'card' | 'line' }) {
  if (type === 'card') return <SkeletonCard />;
  if (type === 'line') return <SkeletonLine className="h-4 w-full" />;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <PageSkeleton />
    </motion.div>
  );
}
