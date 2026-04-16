interface Props {
  message: string | null;
}

export default function Toast({ message }: Props) {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-[#141c2e] border border-cyan-400/20 rounded-xl px-5 py-3 text-[13px] text-white/80 shadow-xl shadow-black/30 backdrop-blur-lg">
        {message}
      </div>
    </div>
  );
}
