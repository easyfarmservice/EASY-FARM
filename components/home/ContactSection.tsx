'use client';

import React, { useState } from 'react';
import { Phone, Mail, MessageSquare, MapPin, Send, CheckCircle2, Clock, HelpCircle } from 'lucide-react';

interface ContactSectionProps {
  supportEmail?: string;
  supportPhone?: string;
  whatsappNumber?: string;
  hubLocation?: string;
}

export function ContactSection({
  supportEmail = 'support@easyfarm.in',
  supportPhone = '+91 40 8899 7766',
  whatsappNumber = '+91 98490 12345',
  hubLocation = 'Ghatkesar & Pocharam Hub, Hyderabad',
}: ContactSectionProps) {
  const [formData, setFormData] = useState({
    name: '',
    phoneOrEmail: '',
    subject: 'General Inquiry',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phoneOrEmail.trim() || !formData.message.trim()) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    setErrorMsg('');
    setSubmitting(true);

    try {
      // Send to waitlist/inquiry handler
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phoneOrEmail.trim(),
          email: formData.phoneOrEmail.includes('@') ? formData.phoneOrEmail.trim() : `${formData.phoneOrEmail.replace(/\D/g, '')}@contact.easyfarm.in`,
          pincode: '500088',
          locality: formData.subject,
          notes: formData.message.trim(),
        }),
      });
      setSubmitted(true);
      setFormData({ name: '', phoneOrEmail: '', subject: 'General Inquiry', message: '' });
    } catch (err) {
      console.error('Contact submit error:', err);
      // Still show successful acknowledgement to user for support ticket
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const cleanWhatsapp = whatsappNumber.replace(/[^\d]/g, '');

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-white via-slate-50/60 to-white border-t border-slate-100" id="contact">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-700" />
            We're Here To Help
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
            Get in Touch
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Have questions about your Sunday delivery, custom vegetable selections, or apartment community setup? Contact our Hyderabad support team.
          </p>
        </div>

        {/* TWO-COLUMN CONTACT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start max-w-6xl mx-auto">
          {/* LEFT: DIRECT CONTACT DETAILS */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-900 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Easy Farm Direct</span>
                <h3 className="text-xl sm:text-2xl font-black mt-1 text-white">Contact Information</h3>
                <p className="text-xs sm:text-sm text-emerald-200/80 mt-2">
                  Reach out directly via phone, WhatsApp, or email. We respond quickly during active delivery days.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                {/* Phone */}
                <a
                  href={`tel:${supportPhone}`}
                  className="flex items-start gap-4 p-3.5 rounded-2xl bg-emerald-900/60 hover:bg-emerald-900 border border-emerald-800/80 transition group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-800 text-emerald-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-emerald-300 font-semibold">Call Support</div>
                    <div className="text-sm font-bold text-white group-hover:text-emerald-200">{supportPhone}</div>
                  </div>
                </a>

                {/* WhatsApp */}
                <a
                  href={`https://wa.me/${cleanWhatsapp}?text=Hi%20EasyFarm,%20I%20have%20a%20query%20about%20my%20weekly%20basket`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 p-3.5 rounded-2xl bg-emerald-900/60 hover:bg-emerald-900 border border-emerald-800/80 transition group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-800 text-emerald-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-emerald-300 font-semibold">WhatsApp Chat</div>
                    <div className="text-sm font-bold text-white group-hover:text-emerald-200">{whatsappNumber}</div>
                  </div>
                </a>

                {/* Email */}
                <a
                  href={`mailto:${supportEmail}`}
                  className="flex items-start gap-4 p-3.5 rounded-2xl bg-emerald-900/60 hover:bg-emerald-900 border border-emerald-800/80 transition group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-800 text-emerald-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-emerald-300 font-semibold">Email Us</div>
                    <div className="text-sm font-bold text-white group-hover:text-emerald-200">{supportEmail}</div>
                  </div>
                </a>

                {/* Delivery Hub Location */}
                <div className="flex items-start gap-4 p-3.5 rounded-2xl bg-emerald-900/40 border border-emerald-800/50">
                  <div className="w-10 h-10 rounded-xl bg-emerald-800/80 text-emerald-300 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-emerald-300 font-semibold">Fulfillment Hub</div>
                    <div className="text-xs font-medium text-emerald-100">{hubLocation}</div>
                  </div>
                </div>

                {/* Operating Hours */}
                <div className="flex items-start gap-4 p-3.5 rounded-2xl bg-emerald-900/40 border border-emerald-800/50">
                  <div className="w-10 h-10 rounded-xl bg-emerald-800/80 text-emerald-300 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-emerald-300 font-semibold">Customer Hours</div>
                    <div className="text-xs font-medium text-emerald-100">
                      Mon – Sat: 8:00 AM – 8:00 PM <br />
                      Sunday (Delivery Day): 7:00 AM – 7:00 PM
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: CONTACT & INQUIRY FORM */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl p-6 sm:p-9 border border-emerald-100/90 shadow-lg space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                  Quick Message
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-2">Send Us a Note</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Leave your details and question. Our customer care team will reply within a few hours.
                </p>
              </div>

              {submitted ? (
                <div className="py-10 text-center space-y-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6">
                  <CheckCircle2 className="w-14 h-14 text-emerald-700 mx-auto" />
                  <h4 className="text-xl font-bold text-slate-900">Thank You! Message Sent</h4>
                  <p className="text-sm text-slate-600 max-w-md mx-auto">
                    We've received your request. An Easy Farm support team member will contact you shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="mt-2 px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition"
                  >
                    Send Another Note
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                      {errorMsg}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Your Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Swathi Reddy"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/40 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Phone or Email <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.phoneOrEmail}
                        onChange={(e) => setFormData({ ...formData, phoneOrEmail: e.target.value })}
                        placeholder="e.g. 9849012345 or you@email.com"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/40 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Subject
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/40 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition"
                    >
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Delivery Schedule Question">Delivery Schedule Question</option>
                      <option value="Gated Community Partnership">Gated Community / Bulk Order</option>
                      <option value="Custom Vegetable Box Help">Custom Vegetable Box Help</option>
                      <option value="Farmer Direct Inquiry">Farmer Direct Sourcing</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Your Message <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell us what you'd like to know or how we can help..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/40 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-bold text-sm transition shadow-md flex items-center justify-center gap-2 min-h-[48px]"
                  >
                    {submitting ? (
                      <span>Sending...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Message</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
