import { Sparkles, MapPin, Users, MessageSquare, Handshake, CheckCircle2, ChevronRight, Activity, Compass } from 'lucide-react'
import salesGuyImg from '../assets/sales-guy-checking-routes.png'
import chennaiMapBg from '../assets/chennai-map-bg.png'
import handshakePartnersImg from '../assets/handshake-partners.png'
import bikeIcon from '../assets/bike-icon.png'

function BrandPanel() {
  return (
    <section className="relative flex flex-col justify-between h-full p-5 lg:p-6 bg-gradient-to-br from-blue-600 via-sky-800 to-indigo-950 rounded-[1.5rem] border border-blue-500/30 shadow-inner overflow-hidden isolate order-1 lg:order-2">
      {/* Real Chennai Map screenshot image placed to cover the entire background container */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.16] z-0 select-none mix-blend-overlay bg-cover bg-center bg-no-repeat filter invert brightness-110 contrast-125" 
        style={{ backgroundImage: `url(${chennaiMapBg})` }}
      />

      {/* CSS Animations style tag */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes travelRoad {
          0% { offset-distance: 0%; opacity: 0; }
          2% { opacity: 1; }
          95% { opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
        }
        @keyframes rotateWheel {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes bodyBounce {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-0.8px) rotate(0.5deg); }
        }
        .bike-travel {
          offset-path: path("M 40,85 C 100,105 140,120 180,115 C 230,110 280,85 320,75 C 370,65 410,45 460,25");
          offset-rotate: auto;
          animation: travelRoad 7s infinite linear;
        }
        .wheel-spin {
          animation: rotateWheel 0.3s infinite linear;
        }
        .bike-bounce {
          animation: bodyBounce 0.15s infinite ease-in-out;
        }

        /* ── Handshake Animation Keyframes ── */
        @keyframes walkMan {
          0%, 10% { transform: translateX(0px) scale(1.18); }
          25%, 75% { transform: translateX(42px) scale(1.18); }
          90%, 100% { transform: translateX(0px) scale(1.18); }
        }
        @keyframes walkWoman {
          0%, 10% { transform: translateX(0px) scale(1.18); }
          25%, 75% { transform: translateX(-42px) scale(1.18); }
          90%, 100% { transform: translateX(0px) scale(1.18); }
        }
        @keyframes rotateManArm {
          0%, 25% { transform: rotate(0deg); }
          32% { transform: rotate(-62deg); }
          35%, 38%, 41%, 44%, 47%, 50%, 53%, 56%, 59%, 62%, 65% { transform: rotate(-58deg); }
          36.5%, 39.5%, 42.5%, 45.5%, 48.5%, 51.5%, 54.5%, 57.5%, 60.5%, 63.5% { transform: rotate(-65deg); }
          70% { transform: rotate(-62deg); }
          78%, 100% { transform: rotate(0deg); }
        }
        @keyframes rotateWomanArm {
          0%, 25% { transform: rotate(0deg); }
          32% { transform: rotate(62deg); }
          35%, 38%, 41%, 44%, 47%, 50%, 53%, 56%, 59%, 62%, 65% { transform: rotate(58deg); }
          36.5%, 39.5%, 42.5%, 45.5%, 48.5%, 51.5%, 54.5%, 57.5%, 60.5%, 63.5% { transform: rotate(65deg); }
          70% { transform: rotate(62deg); }
          78%, 100% { transform: rotate(0deg); }
        }
        @keyframes swingLegLeft {
          0% { transform: rotate(0deg); }
          5% { transform: rotate(15deg); }
          10% { transform: rotate(-15deg); }
          15% { transform: rotate(15deg); }
          20% { transform: rotate(-10deg); }
          25%, 75% { transform: rotate(0deg); }
          80% { transform: rotate(-15deg); }
          85% { transform: rotate(15deg); }
          90%, 100% { transform: rotate(0deg); }
        }
        @keyframes swingLegRight {
          0% { transform: rotate(0deg); }
          5% { transform: rotate(-15deg); }
          10% { transform: rotate(15deg); }
          15% { transform: rotate(-15deg); }
          20% { transform: rotate(10deg); }
          25%, 75% { transform: rotate(0deg); }
          80% { transform: rotate(15deg); }
          85% { transform: rotate(-15deg); }
          90%, 100% { transform: rotate(0deg); }
        }
        @keyframes handGlow {
          0%, 29% { transform: translate(200px, 111px) scale(0); opacity: 0; }
          32% { transform: translate(200px, 111px) scale(1.6); opacity: 1; }
          38%, 100% { transform: translate(200px, 111px) scale(0); opacity: 0; }
        }
      `}} />

      {/* Top Headline & Subtitle */}
      <div className="space-y-2 max-w-xl relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sky-200 font-bold text-[11px] shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-sky-300 animate-pulse" />
          <span>Twite Connect</span>
        </div>

        <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight">
          “Connect Better. <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-300 bg-clip-text text-transparent">Move Forward.”</span>
        </h1>
      </div>

      {/* Visual Presentation Area: Animated Journey Arc & Handshake Illustration */}
      <div className="relative my-2.5 space-y-4 flex-1 flex flex-col justify-between max-h-[430px]">
        {/* Animated Curved Journey Arc (Taller h-[160px] for high visibility and labels) */}
        <div className="relative w-full h-[160px] z-10">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 500 160" fill="none">
            <defs>
              <linearGradient id="lightBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fef08a" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
              </linearGradient>
              <filter id="roadShadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.22" />
              </filter>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Curved Road Tracks (Premium Drop-Shadowed Asphalt Road style) */}
            <path 
              d="M 40,85 C 100,105 140,120 180,115 C 230,110 280,85 320,75 C 370,65 410,45 460,25" 
              stroke="#0f172a" 
              strokeWidth="12" 
              strokeLinecap="round" 
              fill="none" 
              filter="url(#roadShadow)"
            />
            <path 
              d="M 40,85 C 100,105 140,120 180,115 C 230,110 280,85 320,75 C 370,65 410,45 460,25" 
              stroke="#1e293b" 
              strokeWidth="8" 
              strokeLinecap="round" 
              fill="none" 
            />
            <path 
              d="M 40,85 C 100,105 140,120 180,115 C 230,110 280,85 320,75 C 370,65 410,45 460,25" 
              stroke="#ffffff" 
              strokeWidth="1.8" 
              strokeDasharray="5,5" 
              strokeLinecap="round" 
              fill="none" 
            />

            {/* PIN 1: Connect */}
            <g transform="translate(40, 85)">
              <circle cx="0" cy="0" r="14" fill="#2563eb" opacity="0.3" className="animate-ping" />
              <circle cx="0" cy="0" r="5" fill="#2563eb" />
              <path d="M 0,0 C -5,-7 -8,-15 0,-20 C 8,-15 5,-7 0,0" fill="#2563eb" stroke="#ffffff" strokeWidth="1.2" />
              <circle cx="0" cy="-14" r="2" fill="#ffffff" />
              <text x="0" y="24" fontSize="9px" fontWeight="900" fill="#93c5fd" textAnchor="middle" fontFamily="sans-serif">CONNECT</text>
              <text x="0" y="35" fontSize="7.5px" fontWeight="700" fill="#cbd5e1" textAnchor="middle" fontFamily="sans-serif">Find Leads</text>
            </g>

            {/* PIN 2: Track */}
            <g transform="translate(180, 115)">
              <circle cx="0" cy="0" r="14" fill="#ea580c" opacity="0.3" className="animate-ping" />
              <circle cx="0" cy="0" r="5" fill="#ea580c" />
              <path d="M 0,0 C -5,-7 -8,-15 0,-20 C 8,-15 5,-7 0,0" fill="#ea580c" stroke="#ffffff" strokeWidth="1.2" />
              <circle cx="0" cy="-14" r="2" fill="#ffffff" />
              <text x="0" y="24" fontSize="9px" fontWeight="900" fill="#fdba74" textAnchor="middle" fontFamily="sans-serif">TRACK</text>
              <text x="0" y="35" fontSize="7.5px" fontWeight="700" fill="#cbd5e1" textAnchor="middle" fontFamily="sans-serif">Track Activities</text>
            </g>

            {/* PIN 3: Perform */}
            <g transform="translate(320, 75)">
              <circle cx="0" cy="0" r="14" fill="#10b981" opacity="0.3" className="animate-ping" />
              <circle cx="0" cy="0" r="5" fill="#10b981" />
              <path d="M 0,0 C -5,-7 -8,-15 0,-20 C 8,-15 5,-7 0,0" fill="#10b981" stroke="#ffffff" strokeWidth="1.2" />
              <circle cx="0" cy="-14" r="2" fill="#ffffff" />
              <text x="0" y="24" fontSize="9px" fontWeight="900" fill="#6ee7b7" textAnchor="middle" fontFamily="sans-serif">PERFORM</text>
              <text x="0" y="35" fontSize="7.5px" fontWeight="700" fill="#cbd5e1" textAnchor="middle" fontFamily="sans-serif">Close Deals</text>
            </g>

            {/* PIN 4: Success Bevel Platform & Flag */}
            <g transform="translate(460, 25)">
              {/* 3D Platform Disc */}
              <path d="M -16,0 V 4 A 16,5 0 0 0 16,4 V 0 Z" fill="#0f172a" />
              <ellipse cx="0" cy="0" rx="16" ry="5.5" fill="#1e293b" />
              <ellipse cx="0" cy="0" rx="13" ry="4" fill="#334155" />
              
              {/* Flagpole */}
              <line x1="0" y1="0" x2="0" y2="-28" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="0" cy="-29" r="1.8" fill="#f59e0b" />
              
              {/* Green Flag */}
              <path d="M 0,-28 L 18,-23 L 0,-18 Z" fill="#10b981" />
              <path d="M 0,-28 L 18,-23 L 0,-18 Z M 0,-23 L 10,-20 L 0,-18" fill="#047857" opacity="0.3" />

              {/* Labels */}
              <text x="0" y="24" fontSize="9px" fontWeight="900" fill="#4ade80" textAnchor="middle" fontFamily="sans-serif">SUCCESS</text>
              <text x="0" y="35" fontSize="7.5px" fontWeight="700" fill="#cbd5e1" textAnchor="middle" fontFamily="sans-serif">Achieve More</text>
            </g>

            {/* Animated Motorcycle Element (Using static 3D PNG asset as requested) */}
            <g className="bike-travel">
              <g className="bike-bounce" transform="translate(0, -1.5)">
                {/* Speed Blur Motion Trails */}
                <path d="M -50,-20 L -80,-20 M -45,-10 L -70,-10 M -55,-30 L -75,-30" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" opacity="0.65" />
                <path d="M -45,-20 L -70,-20" stroke="#60a5fa" strokeWidth="6" strokeLinecap="round" opacity="0.4" filter="url(#glow)" />

                {/* Blue Sport Motorcycle Rider PNG Image */}
                <image 
                  href={bikeIcon} 
                  x="-55" 
                  y="-55" 
                  width="95" 
                  height="58" 
                  style={{ filter: 'drop-shadow(0px 4px 12px rgba(14, 165, 233, 0.6))' }}
                />

                {/* Subtle Wheel Rotation overlay (Spinning spoke details) */}
                <g className="wheel-spin" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
                  <circle cx="-42" cy="-4" r="10" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1" fill="none" />
                  <line x1="-42" y1="-12" x2="-42" y2="4" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="1.2" />
                  <line x1="-50" y1="-4" x2="-34" y2="-4" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="1.2" />
                </g>
                <g className="wheel-spin" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
                  <circle cx="39" cy="-4" r="10" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1" fill="none" />
                  <line x1="39" y1="-12" x2="39" y2="4" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="1.2" />
                  <line x1="31" y1="-4" x2="47" y2="-4" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="1.2" />
                </g>
              </g>
            </g>
          </svg>
        </div>

        {/* Animated Handshake Storyboard Viewport */}
        <div className="hidden lg:flex flex-col items-center justify-center py-1.5 relative z-10 w-full flex-1">
          <div className="relative w-full max-w-[390px] mx-auto select-none overflow-visible">
            {/* Decorative background glow rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <div className="w-24 h-24 rounded-full bg-blue-400/20 blur-xl animate-pulse" />
              <div className="w-24 h-24 rounded-full bg-emerald-400/20 blur-xl animate-pulse" style={{ animationDelay: '1.5s' }} />
            </div>

            {/* SVG Handshake animation */}
            <svg className="w-full h-[180px] overflow-visible" viewBox="0 0 400 180" fill="none">
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Interactive Floor Shadow */}
              <ellipse cx="200" cy="168" rx="140" ry="5.5" fill="rgba(15, 23, 42, 0.08)" />

              {/* Handshake Contact Sparkle/Glow */}
              <g style={{ animation: 'handGlow 5s infinite ease-in-out' }}>
                <circle cx="0" cy="0" r="12" fill="#ea580c" opacity="0.4" filter="url(#glow)" />
                <path d="M 0,-15 L 3,-4 L 14,-4 L 6,2 L 9,13 L 0,6 L -9,13 L -6,2 L -14,-4 L -3,-4 Z" fill="#fdba74" transform="scale(0.6) translate(0, -2)" />
              </g>

              {/* MAN CHARACTER GROUP */}
              <g style={{ transformOrigin: '110px 168px', animation: 'walkMan 5s infinite ease-in-out' }}>
                {/* Role text label */}
                <text x="110" y="47" fontSize="7px" fontWeight="900" fill="#93c5fd" textAnchor="middle" letterSpacing="0.4px" fontFamily="sans-serif">EXECUTIVE</text>

                {/* Body & Clothes */}
                <path d="M 97,85 L 123,85 L 126,128 L 94,128 Z" fill="#1e293b" />
                <path d="M 108,85 L 112,85 L 110,97 Z" fill="#ffffff" />
                <path d="M 109.5,90 L 110.5,90 L 111,102 L 110,105 L 109,102 Z" fill="#ea580c" />
                
                {/* Head */}
                <circle cx="110" cy="65" r="8.5" fill="#e0a98c" />
                <path d="M 101.5,63 C 101.5,54 118.5,54 118.5,63 C 114,59 106,59 101.5,63 Z" fill="#2d1e18" />

                {/* Left Arm (holding briefcase) */}
                <path d="M 97,85 C 91,95 91,105 94,115" stroke="#1e293b" strokeWidth="5.5" strokeLinecap="round" fill="none" />
                <g>
                  <path d="M 88,112 H 100 V 126 H 88 Z" fill="#0f172a" />
                  <path d="M 91,112 V 109 H 97 V 112" stroke="#334155" strokeWidth="1.5" fill="none" />
                </g>

                {/* Legs (swinging) */}
                <g style={{ transformOrigin: '100.5px 128px', animation: 'swingLegLeft 5s infinite ease-in-out' }}>
                  <rect x="97" y="128" width="7" height="38" fill="#0f172a" rx="1" />
                  <path d="M 93,166 H 104 L 102,170 H 93 Z" fill="#090d16" />
                </g>
                <g style={{ transformOrigin: '119.5px 128px', animation: 'swingLegRight 5s infinite ease-in-out' }}>
                  <rect x="116" y="128" width="7" height="38" fill="#0f172a" rx="1" />
                  <path d="M 116,166 H 127 L 125,170 H 116 Z" fill="#090d16" />
                </g>

                {/* Right Arm (Animated) */}
                <g id="man-arm" style={{ transformOrigin: '110px 85px', animation: 'rotateManArm 5s infinite ease-in-out' }}>
                  <line x1="110" y1="85" x2="110" y2="117" stroke="#1e293b" strokeWidth="6.5" strokeLinecap="round" />
                  <circle cx="110" cy="120" r="4.5" fill="#e0a98c" />
                </g>
              </g>

              {/* WOMAN CHARACTER GROUP */}
              <g style={{ transformOrigin: '290px 168px', animation: 'walkWoman 5s infinite ease-in-out' }}>
                {/* Role text label */}
                <text x="290" y="47" fontSize="7px" fontWeight="900" fill="#6ee7b7" textAnchor="middle" letterSpacing="0.4px" fontFamily="sans-serif">CLIENT</text>

                {/* Body & Clothes */}
                <path d="M 277,85 L 303,85 L 306,123 L 274,123 Z" fill="#78350f" />
                <path d="M 288,85 L 292,85 L 290,95 Z" fill="#fef3c7" />
                <path d="M 276,123 L 304,123 L 307,150 L 273,150 Z" fill="#1f2937" />

                {/* Head */}
                <circle cx="290" cy="65" r="8" fill="#ecc6b3" />
                <path d="M 280,63 C 280,53 300,53 300,63 L 302,73 C 302,77 298,77 296,73 Z" fill="#111827" />

                {/* Left Arm (at side) */}
                <path d="M 303,85 C 307,95 307,105 304,115" stroke="#78350f" strokeWidth="5.5" strokeLinecap="round" fill="none" />

                {/* Client Folder / Clipboard (emerald green) */}
                <g transform="translate(299, 102) rotate(4)">
                  <rect x="0" y="0" width="11" height="15" rx="1.5" fill="#10b981" />
                  <rect x="2.5" y="-1.5" width="6" height="2" fill="#047857" rx="0.5" />
                  <line x1="2.5" y1="4" x2="8.5" y2="4" stroke="#ffffff" strokeWidth="1" />
                  <line x1="2.5" y1="7" x2="8.5" y2="7" stroke="#ffffff" strokeWidth="1" />
                  <line x1="2.5" y1="10" x2="6.5" y2="10" stroke="#ffffff" strokeWidth="1" />
                </g>

                {/* Legs (swinging) */}
                <g style={{ transformOrigin: '282px 150px', animation: 'swingLegLeft 5s infinite ease-in-out' }}>
                  <rect x="279" y="150" width="6" height="18" fill="#ecc6b3" rx="1" />
                  <path d="M 275,168 H 285 L 283,170 H 275 Z" fill="#111827" />
                </g>
                <g style={{ transformOrigin: '298px 150px', animation: 'swingLegRight 5s infinite ease-in-out' }}>
                  <rect x="295" y="150" width="6" height="18" fill="#ecc6b3" rx="1" />
                  <path d="M 295,168 H 305 L 303,170 H 295 Z" fill="#111827" />
                </g>

                {/* Right Arm (Animated) */}
                <g id="woman-arm" style={{ transformOrigin: '290px 85px', animation: 'rotateWomanArm 5s infinite ease-in-out' }}>
                  <line x1="290" y1="85" x2="290" y2="117" stroke="#78350f" strokeWidth="6" strokeLinecap="round" />
                  <circle cx="290" cy="120" r="4.5" fill="#ecc6b3" />
                </g>
              </g>
            </svg>
          </div>

          <div className="text-center mt-1">
            <span className="text-[10px] font-black text-white/95 tracking-wider uppercase block">Sales Agreement & Success</span>
            <span className="text-[8px] font-bold text-sky-200/80 z-10 block">Verified partnerships across Twite Connect</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default BrandPanel
