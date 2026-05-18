export default function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = "rounded-xl font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 select-none";
  
  const variants = {
    primary: "bg-[#007AFF] text-white hover:bg-[#0066CC] shadow-sm",
    secondary: "bg-[#F2F2F7] text-text-primary hover:bg-[#E5E5EA]",
    ghost: "bg-transparent text-[#007AFF] hover:bg-[#007AFF]/10",
    success: "bg-[#34C759] text-white hover:bg-[#2DA84A]",
    destructive: "bg-[#FF3B30] text-white hover:bg-[#E02E25]",
    outline: "border-2 border-[#E5E5EA] text-text-primary hover:border-[#D1D1D6] bg-white",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-6 py-2.5 text-sm",
    lg: "px-8 py-3 text-base font-semibold",
    icon: "w-10 h-10 p-0",
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}