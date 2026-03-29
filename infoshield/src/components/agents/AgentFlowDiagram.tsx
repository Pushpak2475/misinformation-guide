import { motion } from 'framer-motion';
import { Database, CheckCircle, Brain, Megaphone, ChevronRight } from 'lucide-react';

const steps = [
  { icon: Database,    label: 'Data Collector',  color: '#00d4ff',  desc: 'Scrapes social media & RSS' },
  { icon: CheckCircle, label: 'Verification',     color: '#7c3aed',  desc: 'Cross-checks 14+ sources' },
  { icon: Brain,       label: 'Decision Agent',   color: '#ec4899',  desc: 'AI-powered verdict' },
  { icon: Megaphone,   label: 'Counter-Messaging', color: '#10b981', desc: 'Auto-generates rebuttal' },
];

export default function AgentFlowDiagram() {
  return (
    <div className="flex items-center gap-0 w-full overflow-x-auto no-scrollbar py-2">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center flex-1 min-w-0">
          {/* Step card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.15, duration: 0.4 }}
            className="flex-1 min-w-0"
          >
            <div
              className="relative rounded-xl p-3 text-center mx-1 transition-all duration-300 hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${step.color}15, ${step.color}05)`,
                border: `1px solid ${step.color}30`,
              }}
            >
              {/* Step number */}
              <div
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-dark"
                style={{ background: step.color }}
              >
                {i + 1}
              </div>

              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2"
                style={{ background: `${step.color}20` }}
              >
                <step.icon className="w-4 h-4" style={{ color: step.color }} />
              </div>
              <div className="text-xs font-semibold text-white whitespace-nowrap truncate">{step.label}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">{step.desc}</div>

              {/* Animated pulse */}
              <div
                className="absolute inset-0 rounded-xl animate-ping-slow opacity-10"
                style={{ background: step.color }}
              />
            </div>
          </motion.div>

          {/* Connector arrow */}
          {i < steps.length - 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.15 + 0.2 }}
              className="flex-shrink-0 flex items-center"
            >
              <div className="h-px w-3 bg-gradient-to-r from-slate-700 to-primary/40" />
              <ChevronRight className="w-3 h-3 text-primary/60 -ml-1" />
            </motion.div>
          )}
        </div>
      ))}
    </div>
  );
}
