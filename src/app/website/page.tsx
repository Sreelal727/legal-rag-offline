"use client";

import { useState } from "react";

export default function WebsitePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const plans = [
    {
      name: "Solo Practitioner",
      subtitle: "For independent advocates",
      price: billingCycle === "monthly" ? 49 : 39,
      color: "from-blue-600 to-blue-700",
      badge: "",
      features: [
        "1 Advocate login",
        "Manage up to 50 active cases",
        "AI legal assistant — ask anything",
        "Draft notices & petitions with AI",
        "Upload & search documents instantly",
        "Track hearing dates & deadlines",
        "Generate invoices with GST",
        "Case law research (Indian Kanoon)",
        "Export to DOCX & PDF",
        "WhatsApp client updates",
      ],
    },
    {
      name: "Chamber",
      subtitle: "For small & mid-size firms",
      price: billingCycle === "monthly" ? 99 : 79,
      color: "from-amber-500 to-orange-600",
      badge: "Most Popular",
      features: [
        "Up to 5 Advocate logins",
        "Unlimited active cases",
        "Everything in Solo, plus:",
        "Role-based access (Senior / Junior / Clerk)",
        "Notice approval workflow",
        "Shared document library",
        "Format library — reuse court formats",
        "Diary & schedule management",
        "Limitation period tracker",
        "Client communication log",
        "Priority email support",
      ],
    },
    {
      name: "Legal House",
      subtitle: "For established law firms",
      price: billingCycle === "monthly" ? 129 : 99,
      color: "from-emerald-600 to-teal-700",
      badge: "Best Value",
      features: [
        "Unlimited Advocate logins",
        "Unlimited cases & documents",
        "Everything in Chamber, plus:",
        "Multi-branch office support",
        "Advanced billing & time tracking",
        "Bulk document processing",
        "Custom format templates",
        "eCourts / DCMS integration",
        "Audit trail & compliance reports",
        "Dedicated account manager",
        "Phone & WhatsApp support",
      ],
    },
  ];

  const features = [
    {
      icon: "🤖",
      title: "Your AI Legal Assistant",
      description:
        "Ask it anything — case status, next hearing, client details, or even \"draft a cheque bounce notice for Rajesh Kumar.\" It knows your practice inside out.",
    },
    {
      icon: "📄",
      title: "Draft Documents in Seconds",
      description:
        "Select a format, tell the AI what you need, and get a court-ready notice, petition, or affidavit. Export as Word or PDF with one click.",
    },
    {
      icon: "🔍",
      title: "Find Any Document Instantly",
      description:
        "No more digging through files. Upload your documents once — the AI reads, understands, and lets you search them by meaning, not just keywords.",
    },
    {
      icon: "📅",
      title: "Never Miss a Hearing Date",
      description:
        "All your upcoming hearings, diary entries, and limitation deadlines in one place. Get reminders before things slip through the cracks.",
    },
    {
      icon: "⚖️",
      title: "Case Law at Your Fingertips",
      description:
        "Integrated with Indian Kanoon. Ask about any section, act, or legal principle — get relevant Supreme Court and High Court judgments right in the chat.",
    },
    {
      icon: "💰",
      title: "Billing Made Simple",
      description:
        "Create GST invoices, track time entries, and send payment reminders to clients via WhatsApp. No more chasing payments manually.",
    },
    {
      icon: "📱",
      title: "Update Clients via WhatsApp",
      description:
        "One click to send hearing updates, document requests, or invoice reminders directly to your client's WhatsApp. Professional messages, zero effort.",
    },
    {
      icon: "🏛️",
      title: "Format Library",
      description:
        "Upload your tried-and-tested court formats. The AI learns the structure and drafts new documents following the exact same style your court expects.",
    },
  ];

  const testimonials = [
    {
      name: "Adv. Priya Sharma",
      location: "District Court, Delhi",
      quote:
        "I used to spend 2 hours every evening updating case files. Now I just ask the AI and everything is at my fingertips. My juniors love it too.",
    },
    {
      name: "Adv. Karthik Rajan",
      location: "High Court, Madras",
      quote:
        "The document drafting alone is worth it. I uploaded my notice formats and now the AI drafts them perfectly every time. Saved me lakhs in time.",
    },
    {
      name: "Adv. Meera Patel",
      location: "Family Court, Ahmedabad",
      quote:
        "My clients are impressed when I send them WhatsApp updates right after hearings. They think I have a whole team, but it's just me and this tool.",
    },
  ];

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", fontSize: "16px" }}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
                <span className="text-white font-bold text-sm">⚖</span>
              </div>
              <span className="text-xl font-bold text-gray-900">LegalDesk AI</span>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
              <a href="#testimonials" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Testimonials</a>
              <a href="#faq" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">FAQ</a>
              <a
                href="/login"
                className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Sign In
              </a>
              <a
                href="#pricing"
                className="inline-flex items-center px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
              >
                Start Free Trial
              </a>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-100 space-y-3">
              <a href="#features" className="block text-sm text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#pricing" className="block text-sm text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <a href="#testimonials" className="block text-sm text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>Testimonials</a>
              <a href="/login" className="block text-sm font-medium text-gray-900 py-2">Sign In</a>
              <a href="#pricing" className="block text-center px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600">Start Free Trial</a>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/60" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] rounded-full bg-blue-100/40 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-indigo-100/30 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Trusted by 500+ advocates across India
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-tight tracking-tight">
              Run your
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> entire practice </span>
              with AI
            </h1>

            <p className="mt-6 text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
              Cases, clients, documents, hearings, billing, drafting — all in one place.
              Your AI assistant that actually understands law.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#pricing"
                className="inline-flex items-center px-8 py-4 rounded-full text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                Start 14-Day Free Trial
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <a
                href="#features"
                className="inline-flex items-center px-8 py-4 rounded-full text-lg font-medium text-gray-700 bg-white border border-gray-200 hover:border-gray-300 transition-all shadow-sm hover:shadow"
              >
                See How It Works
              </a>
            </div>

            <p className="mt-5 text-sm text-gray-500">No credit card required &middot; Cancel anytime &middot; Full access for 14 days</p>
          </div>

          {/* Hero visual — floating cards */}
          <div className="mt-20 max-w-5xl mx-auto relative">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-4 text-sm text-gray-400">LegalDesk AI — Dashboard</span>
              </div>
              <div className="p-8 bg-gradient-to-br from-gray-50 to-white">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Active Cases", value: "47", color: "bg-blue-500" },
                    { label: "Upcoming Hearings", value: "12", color: "bg-amber-500" },
                    { label: "Pending Invoices", value: "₹3.2L", color: "bg-emerald-500" },
                    { label: "Documents", value: "234", color: "bg-purple-500" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                      <div className={`w-8 h-1.5 rounded-full ${stat.color} mb-3`} />
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm">🤖</div>
                    <span className="text-sm font-medium text-gray-700">AI Assistant</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                    <p className="mb-2"><span className="font-medium text-gray-800">You:</span> What&apos;s the next hearing for Sharma vs State?</p>
                    <p><span className="font-medium text-blue-600">AI:</span> The next hearing for <strong>OS/142/2024 — Sharma vs State of Karnataka</strong> is on <strong>22 Mar 2026</strong> before Hon&apos;ble Justice Reddy at the District Court, Bangalore. Would you like me to send an update to the client?</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="py-12 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500 mb-8">Used by advocates practicing in</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 text-gray-400">
            {["Supreme Court", "High Courts", "District Courts", "Family Courts", "Consumer Forums", "Tribunals"].map((court) => (
              <span key={court} className="text-sm font-medium tracking-wide uppercase">{court}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            You studied law to fight for justice.<br />
            <span className="text-gray-400">Not to drown in paperwork.</span>
          </h2>
          <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Between tracking hearing dates, drafting notices, managing client calls, and chasing payments —
            the actual practice of law gets buried. We built LegalDesk AI so you can focus on what matters: your cases.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Everything your practice needs. Nothing it doesn&apos;t.
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Built by people who understand how Indian law firms actually work.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
              >
                <span className="text-3xl mb-4 block">{feature.icon}</span>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Up and running in 10 minutes
            </h2>
            <p className="mt-4 text-lg text-gray-600">No training needed. No IT team required.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "1",
                title: "Sign up & add your cases",
                description: "Enter your clients and cases — or just tell the AI and it creates them for you. \"Add client Rajesh Kumar, phone 98765...\" and done.",
              },
              {
                step: "2",
                title: "Upload your documents",
                description: "Upload your existing notices, petitions, judgments. The AI reads and understands every page so you can search by meaning, not file names.",
              },
              {
                step: "3",
                title: "Start asking, start drafting",
                description: "Ask \"When is the next hearing for the Sharma case?\" or \"Draft a Section 138 notice.\" The AI handles it all, using your own formats.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-5 shadow-lg">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Simple pricing. No hidden fees.
            </h2>
            <p className="mt-4 text-lg text-gray-600">Start free for 14 days. Upgrade when you&apos;re ready.</p>

            {/* Billing toggle */}
            <div className="mt-8 inline-flex items-center bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  billingCycle === "monthly"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  billingCycle === "yearly"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Yearly <span className="text-emerald-600 font-semibold ml-1">Save 20%</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`relative bg-white rounded-2xl border ${
                  i === 1 ? "border-amber-200 shadow-xl scale-105" : "border-gray-200 shadow-md"
                } overflow-hidden transition-all hover:shadow-lg`}
              >
                {plan.badge && (
                  <div className="absolute top-0 right-0">
                    <div className={`bg-gradient-to-r ${plan.color} text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl`}>
                      {plan.badge}
                    </div>
                  </div>
                )}

                <div className={`bg-gradient-to-r ${plan.color} px-6 py-6`}>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="text-white/80 text-sm mt-1">{plan.subtitle}</p>
                </div>

                <div className="px-6 py-6">
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-extrabold text-gray-900">${plan.price}</span>
                    <span className="text-gray-500 text-sm">/ month</span>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, fi) => (
                      <li key={fi} className="flex items-start gap-2.5 text-sm">
                        {feature.startsWith("Everything") ? (
                          <>
                            <span className="text-blue-500 mt-0.5 text-xs">★</span>
                            <span className="text-blue-700 font-medium">{feature}</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-gray-700">{feature}</span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>

                  <a
                    href="/login"
                    className={`block w-full text-center py-3 rounded-xl text-sm font-semibold transition-all ${
                      i === 1
                        ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-md"
                        : "bg-gray-900 text-white hover:bg-gray-800"
                    }`}
                  >
                    Start Free Trial
                  </a>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center mt-8 text-sm text-gray-500">
            All prices in USD. GST applicable for Indian billing. Volume discounts available for 10+ advocates.
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Advocates love it. Their clients notice.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="bg-gray-50 rounded-2xl p-6 border border-gray-100"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, si) => (
                    <svg key={si} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed mb-4 italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-12">
            Common questions
          </h2>

          <div className="space-y-4">
            {[
              {
                q: "Is my client data safe and confidential?",
                a: "Absolutely. All data is encrypted and stored securely. We follow strict confidentiality standards. Your data is yours — we never share, sell, or access it for any purpose other than running your practice.",
              },
              {
                q: "Do I need any technical knowledge to use this?",
                a: "Not at all. If you can use WhatsApp, you can use LegalDesk AI. Just type what you need in plain English or Hindi — the AI understands. No training required.",
              },
              {
                q: "Can I access it from my phone?",
                a: "Yes! LegalDesk AI works on any device with a browser — your laptop, tablet, or phone. No app download needed. Access your practice from court, from home, or anywhere.",
              },
              {
                q: "What if I have documents in regional languages?",
                a: "Our AI can process documents in multiple Indian languages. Upload your Hindi, Tamil, Telugu, Kannada, or other regional language documents — the system handles them.",
              },
              {
                q: "Can I try before I pay?",
                a: "Yes! Every plan comes with a 14-day free trial with full access. No credit card required to start. Use it, see the difference, then decide.",
              },
              {
                q: "What courts and jurisdictions does it support?",
                a: "LegalDesk AI supports all Indian courts — Supreme Court, High Courts, District Courts, Family Courts, Consumer Forums, Tribunals, and more. The format library and case law research cover all jurisdictions.",
              },
              {
                q: "Can my clerk or junior also use it?",
                a: "Yes! The Chamber and Legal House plans support multiple logins with role-based access. Your senior advocates, juniors, and clerks each get appropriate access levels.",
              },
            ].map((item, i) => (
              <details key={i} className="group bg-white rounded-xl border border-gray-200 overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors">
                  {item.q}
                  <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Your practice deserves better than spreadsheets and sticky notes.
          </h2>
          <p className="mt-4 text-lg text-blue-100 max-w-2xl mx-auto">
            Join 500+ advocates who&apos;ve already made the switch. Start your free trial today — no credit card, no commitments.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#pricing"
              className="inline-flex items-center px-8 py-4 rounded-full text-lg font-semibold text-blue-700 bg-white hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl"
            >
              Start Free Trial
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-8 py-4 rounded-full text-lg font-medium text-white border-2 border-white/30 hover:bg-white/10 transition-all"
            >
              Talk to us on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">⚖</span>
                </div>
                <span className="text-lg font-bold text-white">LegalDesk AI</span>
              </div>
              <p className="text-sm leading-relaxed max-w-md">
                AI-powered practice management built for Indian advocates.
                Manage cases, draft documents, track hearings, and bill clients — all from one place.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li>support@legaldeskai.com</li>
                <li>+91 98765 43210</li>
                <li><a href="https://wa.me/919876543210" className="hover:text-white transition-colors">WhatsApp Support</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs">&copy; {new Date().getFullYear()} LegalDesk AI. All rights reserved.</p>
            <div className="flex items-center gap-6 text-xs">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Refund Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
