import React from 'react';
import { Link } from 'react-router-dom';

// ─── Feature Card ─────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: '📊',
    title: 'Centralized Dashboard',
    desc: 'Bird's-eye view of all site alerts, notifications and incidents in one real-time pane.',
    gradient: 'from-blue-500/20 to-blue-600/5',
    border: 'border-blue-500/20',
    glow: 'group-hover:shadow-blue-500/20',
  },
  {
    icon: '🔔',
    title: 'Multi-Channel Alerts',
    desc: 'Push notifications via FCM, in-app bell, and sound alerts. Never miss a critical event.',
    gradient: 'from-violet-500/20 to-violet-600/5',
    border: 'border-violet-500/20',
    glow: 'group-hover:shadow-violet-500/20',
  },
  {
    icon: '🔐',
    title: 'SSL Certificate Monitoring',
    desc: 'Daily automated TLS expiry checks across all 39 sites. Alerts at 30 / 14 / 7 / 1 day thresholds.',
    gradient: 'from-emerald-500/20 to-emerald-600/5',
    border: 'border-emerald-500/20',
    glow: 'group-hover:shadow-emerald-500/20',
  },
  {
    icon: '📦',
    title: 'Order Fulfillment Tracking',
    desc: 'End-to-end visibility: payment → export → picking → packing → shipping across all MCM sites.',
    gradient: 'from-amber-500/20 to-amber-600/5',
    border: 'border-amber-500/20',
    glow: 'group-hover:shadow-amber-500/20',
  },
  {
    icon: '🛰',
    title: 'Site Uptime Monitoring',
    desc: 'HTTP ping every 2 hours across all 39 sites with response-time tracking and incident history.',
    gradient: 'from-cyan-500/20 to-cyan-600/5',
    border: 'border-cyan-500/20',
    glow: 'group-hover:shadow-cyan-500/20',
  },
  {
    icon: '⚡',
    title: 'Flexible REST API',
    desc: 'Send events from any monitoring tool or custom script using our simple, authenticated API.',
    gradient: 'from-rose-500/20 to-rose-600/5',
    border: 'border-rose-500/20',
    glow: 'group-hover:shadow-rose-500/20',
  },
];

const STEPS = [
  { num: '01', title: 'Connect Your Sites', desc: 'Add your 39 MCM sites in minutes. Uptime checks start immediately.' },
  { num: '02', title: 'Configure Alert Topics', desc: 'Group alerts by domain (SSL, Orders, Payments) and set severity thresholds.' },
  { num: '03', title: 'Receive Actionable Alerts', desc: 'Get instant push notifications on any device and manage incidents from the dashboard.' },
];

const STATS = [
  { value: '39', label: 'Sites Monitored' },
  { value: '24/7', label: 'Uptime Watching' },
  { value: '< 30s', label: 'Alert Latency' },
  { value: '90 days', label: 'History Retention' },
];

// ─── Landing Page ─────────────────────────────────────────────────────────

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans antialiased overflow-x-hidden">

      {/* ── Ambient background ──────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-violet-600/8 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[100px]" />
      </div>

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <span className="text-white text-sm font-black">M</span>
              </div>
              <span className="text-lg font-bold tracking-tight">MCM Alerts</span>
            </div>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-8 text-sm text-slate-400">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
              <a href="#stats" className="hover:text-white transition-colors">Stats</a>
            </nav>

            {/* CTA */}
            <div className="flex items-center gap-3">
              <Link to="/login" className="hidden sm:block text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5">
                Sign In
              </Link>
              <Link
                to="/signup"
                className="text-sm font-semibold bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-400 hover:to-violet-500 text-white px-4 py-2 rounded-lg transition-all shadow-lg shadow-blue-500/25"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="relative pt-24 pb-20 lg:pt-32 lg:pb-28 text-center px-6">
          <div className="max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-blue-400 text-xs font-medium mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Powered by AWS · DynamoDB · FCM v1
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
              Operational Awareness
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent">
                for MCM Teams
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Unified monitoring for all 39 MCM sites — uptime, SSL certificates, order fulfillment,
              and instant push notifications. All in one dashboard.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-400 hover:to-violet-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-xl shadow-blue-500/30 text-sm"
              >
                Get Started Free
                <span>→</span>
              </Link>
              <a
                href="#features"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-medium px-8 py-3.5 rounded-xl transition-all text-sm"
              >
                Explore Features
              </a>
            </div>
          </div>
        </section>

        {/* ── Stats ─────────────────────────────────────────────────────── */}
        <section id="stats" className="py-12 border-y border-white/5">
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {STATS.map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-3xl md:text-4xl font-black bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                    {s.value}
                  </p>
                  <p className="text-slate-500 text-sm mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────────────── */}
        <section id="features" className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                Everything you need
                <span className="text-slate-500"> in one place</span>
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                Purpose-built for MCM's 39-site retail operation — not a generic monitoring tool.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map(f => (
                <div
                  key={f.title}
                  className={`group relative rounded-2xl border ${f.border} bg-gradient-to-br ${f.gradient} p-6 hover:shadow-xl ${f.glow} transition-all duration-300`}
                >
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ──────────────────────────────────────────────── */}
        <section id="how-it-works" className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                Up and running in minutes
              </h2>
              <p className="text-slate-400 text-lg">Three steps to full observability.</p>
            </div>

            <div className="space-y-6">
              {STEPS.map((step, i) => (
                <div key={step.num} className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-blue-500/20 flex items-center justify-center">
                    <span className="text-blue-400 font-black text-lg">{step.num}</span>
                  </div>
                  <div className="flex-1 pt-2">
                    <h3 className="text-lg font-bold text-white mb-1">{step.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="hidden" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <section className="py-24 px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="inline-block rounded-3xl bg-gradient-to-br from-blue-500/10 via-violet-500/10 to-emerald-500/10 border border-white/10 p-10 shadow-2xl">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to take control?
              </h2>
              <p className="text-slate-400 mb-8 text-base leading-relaxed max-w-md mx-auto">
                Stop discovering issues from customers. Sign up for MCM Alerts and be the first to know.
              </p>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-400 hover:to-violet-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-xl shadow-blue-500/30 text-sm"
              >
                Create Your Account →
              </Link>
              <p className="mt-4 text-slate-600 text-xs">No credit card required. Free to use.</p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <span className="text-white text-xs font-black">M</span>
            </div>
            <span className="text-slate-400 text-sm font-medium">MCM Alerts</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-600">
            <a href="#features" className="hover:text-slate-400 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-slate-400 transition-colors">How it Works</a>
            <Link to="/login" className="hover:text-slate-400 transition-colors">Sign In</Link>
          </div>
          <p className="text-slate-600 text-xs">© {new Date().getFullYear()} MCM Alerts. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};