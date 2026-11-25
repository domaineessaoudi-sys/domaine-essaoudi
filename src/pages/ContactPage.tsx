import React, { useState } from 'react';
import { CheckCircle2, Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  DEFAULT_FACEBOOK_URL,
  DEFAULT_INSTAGRAM_URL,
  getLocalizedField,
  isValidMoroccanPhone,
  sanitizeExternalHttpUrl,
} from '../utils/commerce';
import {
  resolveEmailJsConfig,
  sendContactViaEmailJS,
  sendContactViaFormSubmit,
} from '../utils/emailjs';
import { FarmMap } from '../components/FarmMap';
import { FacebookIcon, InstagramIcon } from '../components/SocialIcons';

export function ContactPage() {
  const { lang, t, siteContent } = useApp();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const phoneDisplay = siteContent?.phone || '+212 654 53 85 95';
  const whatsappDigits = (siteContent?.whatsapp || '+212 654 53 85 95').replace(/\D/g, '');
  const emailDisplay = siteContent?.email || 'domaineessaoudi@gmail.com';
  const addressDisplay = siteContent
    ? getLocalizedField(siteContent, 'address', lang)
    : 'Douar Ouled Ziane, Berrechid, Chaouia, Maroc';
  const hoursDisplay = siteContent
    ? getLocalizedField(siteContent, 'hours', lang)
    : '07:30 – 18:30';
  const instagramUrl = sanitizeExternalHttpUrl(
    siteContent?.socialInstagram,
    DEFAULT_INSTAGRAM_URL
  );
  const facebookUrl = sanitizeExternalHttpUrl(
    siteContent?.socialFacebook,
    DEFAULT_FACEBOOK_URL
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 2) nextErrors.name = 'Required';
    if (!isValidMoroccanPhone(phone)) nextErrors.phone = '+212 6XX XX XX XX';
    if (subject.trim().length < 2) nextErrors.subject = 'Required';
    if (message.trim().length < 5) nextErrors.message = 'Required';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'Could not send message.');
        return;
      }

      const emailjsConfig = resolveEmailJsConfig(siteContent);
      if (data.message) {
        if (emailjsConfig.configured) {
          void sendContactViaEmailJS(data.message, emailjsConfig);
        } else {
          void sendContactViaFormSubmit(data.message, emailjsConfig.recipientEmail);
        }
      }

      setSent(true);
      setName('');
      setPhone('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch {
      setSubmitError('Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-14">
      <div className="max-w-2xl space-y-3">
        <p className="text-xs font-semibold tracking-wide text-[#0E3B22]">{t.home.heroOrigin}</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#0F2418]">
          {t.contact.title}
        </h1>
        <p className="text-base text-[#516358] leading-relaxed">{t.contact.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        {/* Direct Contact Details */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="flex-1 bg-white rounded-2xl border border-[#DCE8DF] p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              <h2 className="font-display text-xl font-semibold text-[#0F2418]">
                {t.contact.directTitle}
              </h2>

            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-[#0E3B22] mt-1 shrink-0" aria-hidden="true" />
                <div>
                  <div className="text-xs text-[#516358]">{t.contact.phoneLabel}</div>
                  <a
                    href={`tel:${phoneDisplay.replace(/\s+/g, '')}`}
                    dir="ltr"
                    className="font-semibold text-[#0F2418] hover:text-[#0E3B22] tabular-nums"
                  >
                    {phoneDisplay}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MessageCircle className="w-4 h-4 text-[#0E3B22] mt-1 shrink-0" aria-hidden="true" />
                <div>
                  <div className="text-xs text-[#516358]">{t.contact.whatsappLabel}</div>
                  <a
                    href={`https://wa.me/${whatsappDigits}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    dir="ltr"
                    className="font-semibold text-[#0E3B22] hover:underline tabular-nums"
                  >
                    {phoneDisplay}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-[#0E3B22] mt-1 shrink-0" aria-hidden="true" />
                <div>
                  <div className="text-xs text-[#516358]">{t.contact.emailLabel}</div>
                  <a
                    href={`mailto:${emailDisplay}`}
                    className="font-semibold text-[#0F2418] hover:text-[#0E3B22]"
                  >
                    {emailDisplay}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#0E3B22] mt-1 shrink-0" aria-hidden="true" />
                <div>
                  <div className="text-xs text-[#516358]">{t.contact.addressLabel}</div>
                  <p className="text-[#0F2418]">{addressDisplay}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-[#0E3B22] mt-1 shrink-0" aria-hidden="true" />
                <div>
                  <div className="text-xs text-[#516358]">{t.contact.hoursLabel}</div>
                  <p className="text-[#0F2418]">{hoursDisplay}</p>
                </div>
              </div>
            </div>
            </div>

            <div className="pt-4 border-t border-[#DCE8DF] flex flex-wrap gap-3">
              <a
                href={`https://wa.me/${whatsappDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0E3B22] hover:bg-[#082716] text-white text-xs font-semibold transition-colors"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                <span>{t.common.orderWhatsapp}</span>
              </a>
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram Domaine Essaoudi"
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-[#DCE8DF] text-xs font-semibold text-[#4A5D52] hover:text-[#0E3B22] hover:border-[#0E3B22]/40 hover:bg-[#EDF4EE] transition-colors"
                >
                  <InstagramIcon className="w-4 h-4 text-[#0E3B22]" />
                  <span>Instagram</span>
                </a>
              )}
              {facebookUrl && (
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook Domaine Essaoudi"
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-[#DCE8DF] text-xs font-semibold text-[#4A5D52] hover:text-[#0E3B22] hover:border-[#0E3B22]/40 hover:bg-[#EDF4EE] transition-colors"
                >
                  <FacebookIcon className="w-4 h-4 text-[#0E3B22]" />
                  <span>Facebook</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border border-[#DCE8DF] p-6 sm:p-8 space-y-5">
            <h2 className="font-display text-xl font-semibold text-[#0F2418]">
              {t.contact.formTitle}
            </h2>

            {sent && (
              <div className="p-4 rounded-xl bg-[#ECFDF5] border border-[#0E3B22]/30 flex items-center gap-3 text-sm text-[#0F2418]">
                <CheckCircle2 className="w-5 h-5 text-[#0E3B22] shrink-0" aria-hidden="true" />
                <span>{t.contact.sentSuccess}</span>
              </div>
            )}

            {submitError && (
              <div className="p-3 rounded-lg bg-[#FEE2E2] text-[#991B1B] text-xs font-medium">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-name" className="block text-xs font-medium text-[#4A5D52] mb-1">
                    {t.contact.nameField} *
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                  />
                  {errors.name && <p className="text-xs text-[#9E2A2B] mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="contact-phone" className="block text-xs font-medium text-[#4A5D52] mb-1">
                    {t.contact.phoneField} *
                  </label>
                  <input
                    id="contact-phone"
                    type="tel"
                    dir="ltr"
                    placeholder="+212 661 00 00 00"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                  />
                  {errors.phone && <p className="text-xs text-[#9E2A2B] mt-1">{errors.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-email" className="block text-xs font-medium text-[#4A5D52] mb-1">
                    {t.contact.emailField}
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                  />
                </div>

                <div>
                  <label htmlFor="contact-subject" className="block text-xs font-medium text-[#4A5D52] mb-1">
                    {t.contact.subjectField} *
                  </label>
                  <input
                    id="contact-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                  />
                  {errors.subject && <p className="text-xs text-[#9E2A2B] mt-1">{errors.subject}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-xs font-medium text-[#4A5D52] mb-1">
                  {t.contact.messageField} *
                </label>
                <textarea
                  id="contact-message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#DCE8DF] bg-[#F7FAF7]"
                />
                {errors.message && <p className="text-xs text-[#9E2A2B] mt-1">{errors.message}</p>}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 rounded-lg bg-[#0E3B22] hover:bg-[#082716] disabled:opacity-60 text-white text-sm font-semibold transition-colors"
              >
                {submitting ? t.common.loading : t.contact.sendMessage}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Google Map */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold text-[#0F2418]">
          {t.contact.mapTitle}
        </h2>
        <FarmMap />
      </section>
    </div>
  );
}
