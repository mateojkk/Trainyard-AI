export default function CenteredProgress({ text = "Loading..." }) {
  return (
    <div className="min-h-screen bg-[#161313] flex flex-col items-center justify-center">
      <div className="w-48 h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
        <div className="h-full w-1/2 bg-[#D89F55] rounded-full animate-progress" />
      </div>
      <p className="mt-4 text-sm font-medium font-sans text-gray-400">{text}</p>
    </div>
  );
}
