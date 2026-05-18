export default function Badge({ children, variant = 'default' }) {
  const variants = {
    success: "bg-[#34C759]/10 text-[#34C759]",
    error: "bg-[#FF3B30]/10 text-[#FF3B30]",
    warning: "bg-[#FF9500]/10 text-[#FF9500]",
    info: "bg-[#007AFF]/10 text-[#007AFF]",
    default: "bg-[#E5E5EA] text-text-secondary",
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant]}`}>
      {children}
    </span>
  );
}