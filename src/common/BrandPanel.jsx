import BrandMark from '../components/BrandMark.jsx'
import Icon from '../components/Icon.jsx'

const highlights = [
  {
    icon: 'sparkles',
    title: 'AI Insights',
    description: 'Get intelligent recommendations powered by AI.',
  },
  {
    icon: 'chart',
    title: 'Sales Analytics',
    description: 'Monitor sales performance in real time.',
  },
  {
    icon: 'users',
    title: 'CRM Management',
    description: 'Manage leads, meetings and follow-ups seamlessly.',
  },
]

function BrandPanel() {
  return (
    <section className="brand-panel relative hidden min-h-[calc(100vh-3rem)] flex-col lg:flex">
      <header className="relative z-10 pt-6">
        <BrandMark />
      </header>

      <div className="brand-content relative z-10 mt-[clamp(8rem,17vh,9.5rem)]">
        <div className="max-w-[51rem]">
          <h1 className="brand-headline m-0 text-[clamp(3.6rem,4.2vw,5rem)] font-black leading-[0.95] tracking-[-0.06em] text-[#07102c]">
            Track Smarter.
            <br />
            Sell Better.
            <br />
            <span className="bg-gradient-to-r from-violet-700 via-purple-600 to-fuchsia-500 bg-clip-text text-transparent">
              Grow Faster.
            </span>
          </h1>
        </div>

        <div className="feature-grid mt-[clamp(6rem,15vh,8.5rem)] grid max-w-[49rem] translate-y-5 grid-cols-3 gap-4">
          {highlights.map((highlight) => (
            <article
              className="feature-card min-h-[13.5rem] rounded-3xl border border-white/20 bg-[#11182d]/95 p-5 text-white shadow-2xl shadow-slate-950/25"
              key={highlight.title}
            >
              <span className="mb-5 grid size-11 place-items-center rounded-xl border border-violet-300/25 bg-violet-500/20 text-violet-200">
                <Icon name={highlight.icon} className="size-6" />
              </span>
              <h2 className="m-0 text-base font-bold">{highlight.title}</h2>
              <p className="mb-0 mt-2 text-sm leading-6 text-slate-300">
                {highlight.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default BrandPanel
