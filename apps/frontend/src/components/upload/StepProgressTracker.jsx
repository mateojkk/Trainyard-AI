import { Loader2, CheckCircle2 } from "lucide-react";

export default function StepProgressTracker({ uploadSteps }) {
  return (
    <div className="bg-[#242424] border border-[#3a322f] rounded-lg p-6 space-y-6">
      <div className="text-center space-y-1">
        <h3 className="text-sm font-bold text-[#fff7ed] uppercase tracking-wider flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 text-brand-blue animate-spin" />
          Processing Decrypted Pipeline
        </h3>
        <p className="text-xs text-[#f3e4cf] leading-normal max-w-xs mx-auto">
          Please do not close this window. Your data is being encrypted and uploaded.
        </p>
      </div>

      <div className="space-y-4 pt-2">
        {uploadSteps.map((s, idx) => (
          <div
            key={s.id}
            className={`p-3.5 border rounded flex items-center justify-between text-xs transition duration-200 ${
              s.status === "done"
                ? "bg-[#2f2f2f] border-[#e7c88f]/25 text-[#fff7ed]"
                : s.status === "loading"
                ? "bg-brand-blue/10 border-brand-blue/30 text-[#fff7ed] font-bold"
                : "bg-[#1f1f1f] border-[#3a322f] text-[#f3e4cf]"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px]">{idx + 1}.</span>
              <span>{s.label}</span>
            </div>
            <div>
              {s.status === "done" && <CheckCircle2 className="w-4 h-4 text-[#f0c57a] animate-bounce" />}
              {s.status === "loading" && <Loader2 className="w-4 h-4 text-brand-blue animate-spin" />}
              {s.status === "idle" && <span className="font-mono text-[9px] uppercase tracking-wider text-[#d1d5db]">Waiting</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
