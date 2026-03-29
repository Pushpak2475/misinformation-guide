// Radial/Arc confidence chart using SVG
interface RadialChartProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}

export default function RadialChart({
  value,
  size = 100,
  strokeWidth = 8,
  color = '#00d4ff',
  label,
  sublabel,
}: RadialChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const arc = 0.75; // 270 degrees
  const strokeDasharray = circumference * arc;
  const strokeDashoffset = strokeDasharray - (value / 100) * strokeDasharray;
  const rotation = 135; // start at bottom-left

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: `rotate(${rotation}deg)` }}>
        {/* Background arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${strokeDasharray} ${circumference}`}
          strokeLinecap="round"
        />
        {/* Value arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${strokeDasharray} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 6px ${color}80)`,
            transition: 'stroke-dashoffset 1s ease',
          }}
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ transform: 'none' }}
      >
        <span className="text-2xl font-bold text-white">{value}%</span>
        {label && <span className="text-xs font-medium mt-0.5" style={{ color }}>{label}</span>}
        {sublabel && <span className="text-[10px] text-slate-500">{sublabel}</span>}
      </div>
    </div>
  );
}
