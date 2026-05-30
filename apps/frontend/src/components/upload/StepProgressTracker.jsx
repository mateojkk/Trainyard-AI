import { Loader2, CheckCircle2 } from "lucide-react";

export default function StepProgressTracker({ uploadSteps }) {
  return (
    <div className="bg-[#111111] border border-[#1a1a1a] rounded-lg p-6 space-y-6">
      <div className="text-center space-y-1">
        <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 text-brand-blue animate-spin" />
          Processing Decrypted Pipeline
        </h3>
        <p className="text-xs text-gray-500 leading-normal max-w-xs mx-auto">
          Please do not close this window. Your data is being encrypted and uploaded.
        </p>
      </div>

      <div className="space-y-4 pt-2">
        {uploadSteps.map((s, idx) => (
          <div
            key={s.id}
            className={`p-3.5 border rounded flex items-center justify-between text-xs transition duration-200 ${
              s.status === "done"
                ? "bg-blue-950/20 border-blue-300/25 text-blue-200"
                : s.status === "loading"
                ? "bg-brand-blue/5 border-brand-blue/30 text-gray-200 font-bold"
                : "bg-[#0c0c0c] border-[#1c1c1c] text-gray-500"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px]">{idx + 1}.</span>
              <span>{s.label}</span>
            </div>
            <div>
              {s.status === "done" && <CheckCircle2 className="w-4 h-4 text-blue-300 animate-bounce" />}
              {s.status === "loading" && <Loader2 className="w-4 h-4 text-brand-blue animate-spin" />}
              {s.status === "idle" && <span className="font-mono text-[9px] uppercase tracking-wider text-gray-600">Waiting</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
