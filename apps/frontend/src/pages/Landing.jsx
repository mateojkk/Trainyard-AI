import BoomerangVideoBg from '../components/BoomerangVideoBg';
import { Play, Sparkles } from 'lucide-react';

const BG_VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260511_131941_d136af49-e243-493a-be14-6ff3f24e09e6.mp4';

export default function Landing({ onLogin }) {
  return (
    <section className="relative w-full min-h-screen sm:h-screen overflow-hidden">
      <BoomerangVideoBg src={BG_VIDEO} className="absolute inset-0 w-full h-full" />
      <nav className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 sm:px-6 md:px-10 py-4 sm:py-6">
        <div className="flex items-center gap-2 text-[#2d3a2a]">
          <span className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight font-sans">Trainyard</span>
        </div>
        <div>
          <button onClick={onLogin} className="bg-[#1f2a1d] hover:bg-[#2a3827] text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors cursor-pointer border-0 shadow-sm font-sans">
            Access App
          </button>
        </div>
      </nav>

      {/* Hero copy */}
      <div className="relative z-10 flex flex-col items-center text-center pt-24 sm:pt-28 md:pt-32 px-4 sm:px-6">
        <h1
          className="font-normal leading-[0.95] text-[#336443] text-[2rem] sm:text-4xl md:text-5xl lg:text-[4.75rem] xl:text-[5.25rem] max-w-5xl"
          style={{ letterSpacing: '-0.035em' }}
        >
          Secure the pipeline <span className="text-[#85AB8B]">linking<br className="hidden sm:block" /> datasets and AI models</span>
        </h1>
        <p className="mt-6 sm:mt-8 text-[#4b5b47] text-sm sm:text-base md:text-lg leading-relaxed max-w-lg px-2">
          Contribute client-side encrypted datasets, host permanently on Walrus, and settle keys trustlessly via smart contracts.
        </p>
      </div>

      {/* Bottom-left CTA block */}
      <div className="absolute left-4 right-4 sm:right-auto sm:left-6 md:left-10 bottom-6 sm:bottom-8 md:bottom-10 z-10 max-w-sm">
        <div className="flex items-center gap-2 text-[#3d5638] sm:text-white/95 mb-3">
          <Sparkles className="w-4 h-4" /><span className="text-sm font-semibold sm:font-medium">Walrus Decoupled Storage<sup className="text-[10px]">v1</sup></span>
        </div>
        <p className="text-[#3d5638]/90 sm:text-white/85 text-xs leading-relaxed mb-6 max-w-xs font-medium sm:font-normal">
          Datasets are secured in-browser using AES-256-GCM. Decryption keys are verified via Tatum RPC ledger scans and automatically released upon USDC settlement.
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <button onClick={onLogin} className="bg-[#3d5638] sm:bg-white hover:bg-[#2d4228] sm:hover:bg-white/90 text-white sm:text-[#1f2a1d] text-sm font-semibold px-5 sm:px-6 py-2.5 sm:py-3 rounded-full transition-colors shadow-sm cursor-pointer border-0">
            Enter Marketplace
          </button>
          <button onClick={onLogin} className="text-[#3d5638] sm:text-white text-sm font-semibold sm:font-medium hover:opacity-80 transition-opacity bg-transparent border-0 cursor-pointer">
            View Documentation
          </button>
        </div>
      </div>

      {/* Bottom-right video link */}
      <div className="hidden sm:flex absolute right-6 md:right-10 bottom-8 md:bottom-10 z-10 items-center gap-2 text-white/90 text-sm">
        <button onClick={onLogin} className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors cursor-pointer border-0">
          <Play className="w-3 h-3 fill-white text-white ml-0.5" />
        </button>
        <span className="font-medium">Watch decryption walkthrough</span>
        <span className="text-white/60">2:15</span>
      </div>
    </section>
  );
}
