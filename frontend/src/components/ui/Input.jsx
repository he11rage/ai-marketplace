export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-text-secondary mb-1.5">{label}</label>}
      <input
        className={`w-full px-4 py-2.5 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-sm 
        focus:bg-white focus:border-[#007AFF] outline-none transition
        ${error ? 'border-[#FF3B30] bg-[#FFF2F0]' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-[#FF3B30] mt-1">{error}</p>}
    </div>
  );
}