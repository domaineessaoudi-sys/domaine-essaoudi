import React from 'react';
import { useApp } from '../context/AppContext';
import { ResilientImage } from '../components/ResilientImage';

const ABOUT_IMG = '/src/assets/images/about_farm_harvest_1795435654389.jpg';
const HERO_IMG = '/src/assets/images/hero_moroccan_farm_1795435653916.jpg';

export function AboutPage() {
  const { t, navigate } = useApp();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-16">
      {/* Intro */}
      <div className="max-w-3xl space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-[#1B6B3A]">{t.home.heroOrigin}</p>
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0F2418]">
          {t.about.title}
        </h1>
        <p className="text-base sm:text-lg text-[#4A5D52] leading-relaxed">{t.about.subtitle}</p>
      </div>

      {/* Landscape Hero Photo */}
      <div className="aspect-[16/9] max-h-[480px] w-full rounded-2xl overflow-hidden border border-[#DCE8DF] bg-[#EDF4EE] shadow-sm">
        <ResilientImage
          src={ABOUT_IMG}
          alt={t.about.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Heritage Story & Circular Farm Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        <div className="lg:col-span-7 space-y-5 flex flex-col justify-center">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0F2418]">
            {t.about.storyTitle}
          </h2>
          <p className="text-base text-[#4A5D52] leading-relaxed">{t.about.storyP1}</p>
          <p className="text-base text-[#4A5D52] leading-relaxed">{t.about.storyP2}</p>
          <div className="pt-2">
            <h3 className="font-display text-xl font-bold text-[#0F2418] mb-2">
              {t.about.methodsTitle}
            </h3>
            <p className="text-sm sm:text-base text-[#4A5D52] leading-relaxed">
              {t.about.methodsBody}
            </p>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="h-full min-h-[280px] rounded-2xl overflow-hidden border border-[#DCE8DF] bg-[#EDF4EE] shadow-sm">
            <ResilientImage
              src={HERO_IMG}
              alt="Chaouia fields"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Values */}
      <section className="bg-[#0A2F1C] text-white rounded-3xl border border-[#1E5438] p-8 sm:p-10 space-y-8 shadow-sm">
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
          {t.about.valuesTitle}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {t.about.values.map((val, i) => (
            <div key={val.title} className="bg-[#113D26] rounded-2xl border border-[#1E5438] p-6 space-y-2.5">
              <div className="font-mono text-xs font-bold text-[#F5B731] tabular-nums">
                0{i + 1}
              </div>
              <h3 className="font-bold text-base text-white">{val.title}</h3>
              <p className="text-sm text-[#B7DEC7] leading-relaxed">{val.desc}</p>
            </div>
          ))}
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => navigate('/contact')}
            className="px-6 py-3 rounded-xl bg-[#F5B731] hover:bg-[#e5a822] text-[#0A2F1C] text-sm font-bold transition-colors"
          >
            {t.home.ctaContactBtn}
          </button>
        </div>
      </section>
    </div>
  );
}
