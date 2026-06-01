import { Play, Sparkles } from 'lucide-react';
import Footer from '../components/Footer';
import landingBackground from '../assets/landing-background.jpg';

export default function Landing({ onLogin, authError }) {
  return (
    <>
      <section className="relative w-full min-h-screen sm:h-screen overflow-hidden bg-[#23120A]">
        <div
          className="landing-bg absolute -inset-8 bg-cover bg-center"
          style={{ backgroundImage: `url(${landingBackground})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#D89F55]/20 via-transparent to-[#23120A]/25" />
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#23120A]/65 to-transparent" />
        <nav className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 sm:px-6 md:px-10 py-3 sm:py-6">
          <div className="flex items-center gap-2 text-[#23120A]">
            <span className="text-base sm:text-lg md:text-2xl font-semibold tracking-tight font-sans">Trainyard</span>
          </div>
          <div>
            <button onClick={onLogin} className="bg-[#23120A] hover:bg-[#3F2420] text-white text-xs sm:text-sm font-medium px-4 sm:px-5 py-2 sm:py-2.5 rounded-full transition-colors cursor-pointer border-0 shadow-sm font-sans">
              Access App
            </button>
          </div>
        </nav>

        {/* Hero copy */}
        <div className="relative z-10 flex flex-col items-center text-center pt-24 sm:pt-28 md:pt-32 px-4 sm:px-6">
          <h1
            className="font-normal leading-[0.95] text-[#23120A] text-xl xs:text-2xl sm:text-4xl md:text-5xl lg:text-[4.75rem] xl:text-[5.25rem] max-w-5xl"
            style={{ letterSpacing: '-0.035em', textShadow: '0 2px 24px rgba(255, 255, 255, 0.32)' }}
          >
            Start Training <span className="text-[#51322D]">Better<br className="hidden sm:block" /> Models</span>
          </h1>
          <p className="mt-4 sm:mt-8 text-white/90 text-xs sm:text-sm md:text-base leading-relaxed max-w-lg px-4 sm:px-2 drop-shadow">
            Access verified, securely encrypted training datasets, or monetize your AI assets with automated, trustless settlement.
          </p>
        </div>

        {/* Bottom-left CTA block */}
        <div className="absolute left-4 right-4 sm:right-auto sm:left-6 md:left-10 bottom-6 sm:bottom-8 md:bottom-10 z-10 max-w-sm">
          <div className="flex items-center gap-2 text-[#D89F55] mb-3 drop-shadow">
            <Sparkles className="w-4 h-4" /><span className="text-sm font-semibold sm:font-medium">Client-Side Encryption<sup className="text-[10px]">v1</sup></span>
          </div>
          <p className="text-white/85 text-xs leading-relaxed mb-6 max-w-xs font-medium sm:font-normal drop-shadow">
            Share and discover protected training datasets with secure access, simple payments, and automatic delivery after purchase.
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <button onClick={onLogin} className="bg-[#23120A] hover:bg-[#3F2420] text-white text-sm font-semibold px-5 sm:px-6 py-2.5 sm:py-3 rounded-full transition-colors shadow-sm cursor-pointer border-0">
              Connect via zkLogin
            </button>
            <button onClick={onLogin} className="text-white text-sm font-semibold sm:font-medium hover:text-[#D89F55] transition-colors bg-transparent border-0 cursor-pointer drop-shadow">
              View Datasets
            </button>
          </div>
          {authError && (
            <p className="mt-4 rounded-md bg-[#23120A]/85 px-3 py-2 text-xs leading-relaxed text-[#D89F55] shadow-sm">
              {authError}
            </p>
          )}
        </div>

        {/* Bottom-right video link */}
        <div className="hidden sm:flex absolute right-6 md:right-10 bottom-8 md:bottom-10 z-10 items-center gap-2 text-white text-sm drop-shadow">
          <button onClick={onLogin} className="flex items-center justify-center w-6 h-6 rounded-full bg-[#23120A] hover:bg-[#3F2420] transition-colors cursor-pointer border-0">
            <Play className="w-3 h-3 fill-[#D89F55] text-[#D89F55] ml-0.5" />
          </button>
          <span className="font-medium">Watch decryption walkthrough</span>
          <span className="text-[#D89F55]">2:15</span>
        </div>
      </section>
      <Footer variant="landing" />
    </>
  );
}
