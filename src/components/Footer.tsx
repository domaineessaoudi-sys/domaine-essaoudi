import React from 'react';
import { Mail, MapPin, MessageCircle, ShieldCheck, Sprout } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  DEFAULT_FACEBOOK_URL,
  DEFAULT_INSTAGRAM_URL,
  getLocalizedField,
  sanitizeExternalHttpUrl,
} from '../utils/commerce';
import { FacebookIcon, InstagramIcon } from './SocialIcons';

export function Footer() {
  const { lang, t, siteContent, navigate } = useApp();

  const phone = siteContent?.phone || '+212 654 53 85 95';
  const email = siteContent?.email || 'domaineessaoudi@gmail.com';
  const whatsapp = (siteContent?.whatsapp || '+212 654 53 85 95').replace(/\D/g, '');
  const address = siteContent
    ? getLocalizedField(siteContent, 'address', lang)
    : 'Douar Ouled Ziane, Berrechid, Chaouia, Maroc';
  const instagramUrl = sanitizeExternalHttpUrl(
    siteContent?.socialInstagram,
    DEFAULT_INSTAGRAM_URL
  );
  const facebookUrl = sanitizeExternalHttpUrl(
    siteContent?.socialFacebook,
    DEFAULT_FACEBOOK_URL
  );

  return (
    <footer className="bg-[#071E11] text-[#EDF5EF] border-t border-[#15452A] mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-5 space-y-4">
          <div className="inline-flex items-center gap-2.5 font-display text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            <span className="w-8 h-8 rounded-lg bg-[#1B6B3A] text-white inline-flex items-center justify-center shrink-0">
              <Sprout className="w-4 h-4" aria-hidden="true" />
            </span>
            <span>{lang === 'ar' ? 'مزرعة السعودي' : 'Domaine Essaoudi'}</span>
          </div>
          <p className="text-sm text-[#B7CEC0] leading-relaxed max-w-sm">
            {t.footer.tagline}
          </p>
          <div className="flex items-start gap-2 text-xs text-[#91B09D]">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[#4BA86B]" aria-hidden="true" />
            <span>{address}</span>
          </div>
        </div>

        <div className="md:col-span-3 space-y-3">
          <h3 className="text-sm font-bold text-white">{t.footer.navigation}</h3>
          <ul className="space-y-2.5 text-sm text-[#B7CEC0]">
            <li>
              <a
                href="/vegetables"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/vegetables');
                }}
                className="hover:text-white transition-colors"
              >
                {t.nav.vegetables}
              </a>
            </li>
            <li>
              <a
                href="/olive-oil"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/olive-oil');
                }}
                className="hover:text-white transition-colors"
              >
                {t.nav.oliveOil}
              </a>
            </li>
            <li>
              <a
                href="/chickens"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/chickens');
                }}
                className="hover:text-white transition-colors"
              >
                {t.nav.poultry}
              </a>
            </li>
            <li>
              <a
                href="/about"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/about');
                }}
                className="hover:text-white transition-colors"
              >
                {t.nav.about}
              </a>
            </li>
            <li>
              <a
                href="/contact"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/contact');
                }}
                className="hover:text-white transition-colors"
              >
                {t.nav.contact}
              </a>
            </li>
          </ul>
        </div>

        <div className="md:col-span-4 space-y-3">
          <h3 className="text-sm font-bold text-white">{t.footer.contact}</h3>
          <div className="space-y-2.5">
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#0F331F] border border-[#1B4D31] hover:border-[#4BA86B]/60 transition-colors"
            >
              <div>
                <div className="text-[11px] text-[#91B09D]">WhatsApp</div>
                <div className="text-sm font-bold text-white tabular-nums" dir="ltr">
                  {phone}
                </div>
              </div>
              <MessageCircle className="w-5 h-5 text-[#4BA86B] shrink-0" aria-hidden="true" />
            </a>

            <a
              href={`mailto:${email}`}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#0F331F] border border-[#1B4D31] hover:border-[#4BA86B]/60 transition-colors"
            >
              <div className="min-w-0">
                <div className="text-[11px] text-[#91B09D]">Email</div>
                <div className="text-xs sm:text-sm font-semibold text-white truncate" dir="ltr">
                  {email}
                </div>
              </div>
              <Mail className="w-5 h-5 text-[#4BA86B] shrink-0" aria-hidden="true" />
            </a>

            {(instagramUrl || facebookUrl) && (
              <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram Domaine Essaoudi"
                    className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#0F331F] border border-[#1B4D31] hover:border-[#4BA86B]/60 transition-colors"
                  >
                    <span className="text-xs font-semibold text-white">Instagram</span>
                    <InstagramIcon className="w-4 h-4 text-[#4BA86B] shrink-0" />
                  </a>
                )}
                {facebookUrl && (
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook Domaine Essaoudi"
                    className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#0F331F] border border-[#1B4D31] hover:border-[#4BA86B]/60 transition-colors"
                  >
                    <span className="text-xs font-semibold text-white">Facebook</span>
                    <FacebookIcon className="w-4 h-4 text-[#4BA86B] shrink-0" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-[#15452A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#91B09D]">
          <span>{t.footer.copyright}</span>
          <a
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              navigate('/admin');
            }}
            className="inline-flex items-center gap-1.5 text-[#B7CEC0] hover:text-white transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t.footer.adminPortal}</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
