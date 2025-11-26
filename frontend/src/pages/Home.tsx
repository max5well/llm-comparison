import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  ShieldCheck,
  Code2,
  Users,
  PlugZap,
  Clock3,
  Star,
} from 'lucide-react';
import { Layout } from '../components/Layout';

const featureCards = [
  {
    title: 'Real-Time Benchmarks',
    description: 'Monitor accuracy, latency, and cost side-by-side across every model.',
    icon: BarChart3,
  },
  {
    title: 'Side-by-Side Testing',
    description: 'Run identical prompts on curated model stacks to detect differences quickly.',
    icon: Code2,
  },
  {
    title: 'Enterprise Security',
    description: 'SOC 2 Type II compliance, encryption at rest, and access controls.',
    icon: ShieldCheck,
  },
  {
    title: 'Team Collaboration',
    description: 'Share reports, annotations, and decisions with stakeholders in one view.',
    icon: Users,
  },
  {
    title: 'API Integration',
    description: 'Stream evaluation data into your existing workflows with our REST API.',
    icon: PlugZap,
  },
  {
    title: 'Historical Analysis',
    description: 'Track performance trends to inform upgrades and stop regressions.',
    icon: Clock3,
  },
];

const steps = [
  {
    number: '1',
    title: 'Select Models',
    description: 'Pick from GPT-4, Gemini, Claude 3, and other leading providers.',
  },
  {
    number: '2',
    title: 'Run Comparisons',
    description: 'Execute prompts once and compare every response automatically.',
  },
  {
    number: '3',
    title: 'Analyze & Decide',
    description: 'Review metrics, cost, and judge scores before shipping the right model.',
  },
];

const testimonials = [
  {
    quote:
      'LLM Compare saved us weeks of evaluation time. The side-by-side testing feature helped us identify the perfect model for customer support.',
    author: 'Michael Chen',
    title: 'Head of AI, TechCorp',
  },
  {
    quote:
      'Real-time benchmarks and cost analysis helped us reduce spending by 40% while improving output quality.',
    author: 'Sarah Johnson',
    title: 'CTO, DataFlow Inc',
  },
  {
    quote:
      'SOC 2 compliance and private runs gave us the confidence to evaluate sensitive data at scale.',
    author: 'David Martinez',
    title: 'VP Engineering, SecureAI',
  },
];

export const Home: React.FC = () => {
  return (
    <Layout>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <nav className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
              <i className="fa-solid fa-layer-group text-white text-xl" aria-hidden="true"></i>
            </div>
            <span className="text-2xl font-bold text-gray-900">LLM Compare</span>
          </div>
          <ul className="hidden lg:flex items-center gap-10 text-gray-700">
            {['Features', 'How It Works', 'Testimonials', 'Pricing'].map((label) => (
              <li key={label}>
                <a href={`#${label.toLowerCase().replace(/\s+/g, '-')}`} className="font-medium hover:text-primary-600">
                  {label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-lg font-semibold text-gray-700 hover:text-primary-600">
              Sign In
            </Link>
            <Link
              to="/signup"
              className="px-6 py-3 text-lg font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-4 focus:ring-primary-200"
            >
              Start Free Trial
            </Link>
          </div>
        </nav>
      </header>

      <main className="bg-gray-50">
        <section id="hero-section" className="py-20">
          <div className="max-w-7xl mx-auto px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-3 px-5 py-2 bg-primary-100 text-primary-600 rounded-full text-base font-semibold">
                  <i className="fa-solid fa-sparkles" aria-hidden="true"></i>
                  Trusted by 500+ Enterprise Teams
                </div>
                <h1 className="text-5xl font-bold text-gray-900 leading-tight">
                  Compare LLMs with <span className="text-primary-600">Confidence</span>
                </h1>
                <p className="text-2xl text-gray-600 leading-relaxed">
                  Make informed decisions about AI models with comprehensive comparisons, real-time performance metrics, and enterprise-grade security.
                </p>
                <div className="flex flex-wrap gap-5">
                  <button className="px-10 py-5 text-xl font-bold bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-lg transition-all">
                    Get Started Free <i className="fa-solid fa-arrow-right ml-3"></i>
                  </button>
                  <button className="px-10 py-5 text-xl font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:border-primary-600 hover:text-primary-600 transition-all">
                    Schedule Demo
                  </button>
                </div>
                <div className="flex flex-wrap gap-8 text-lg text-gray-600">
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-check-circle text-primary-600"></i>
                    No credit card required
                  </div>
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-check-circle text-primary-600"></i>
                    14-day free trial
                  </div>
                </div>
              </div>
              <div>
                <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl p-8">
                  <div className="flex items-center justify-between pb-6 border-b border-gray-200">
                    <span className="text-xl font-semibold text-gray-900">Model Comparison</span>
                    <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-base font-semibold">Live</span>
                  </div>
                  <div className="grid grid-cols-2 gap-6 mt-8">
                    <div className="space-y-2">
                      <div className="text-sm text-gray-500 font-medium">GPT-4</div>
                      <div className="text-4xl font-bold text-gray-900">94.2%</div>
                      <div className="text-sm text-green-600 flex items-center gap-1">
                        <i className="fa-solid fa-arrow-up"></i> +2.3%
                  </div>
                </div>
                    <div className="space-y-2">
                      <div className="text-sm text-gray-500 font-medium">UX Pilot 3</div>
                      <div className="text-4xl font-bold text-gray-900">91.8%</div>
                      <div className="text-sm text-green-600 flex items-center gap-1">
                        <i className="fa-solid fa-arrow-up"></i> +1.7%
                  </div>
                </div>
                  </div>
                  <div className="mt-6">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Performance</span>
                      <span className="font-semibold text-gray-900">Excellent</span>
                  </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mt-2">
                      <div className="h-full bg-primary-600 rounded-full" style={{ width: '94%' }} />
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Powerful Features for Enterprise Teams</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Everything you need to evaluate, compare, and deploy the right LLM for your organization.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-10">
              {featureCards.map((feature) => (
                <article
                  key={feature.title}
                  className="bg-gray-50 rounded-2xl p-10 hover:shadow-xl transition-shadow border border-gray-200"
                >
                  <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mb-6">
                    <feature.icon className="text-primary-600" size={28} />
                </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-lg text-gray-600 leading-relaxed">{feature.description}</p>
                </article>
              ))}
                </div>
                </div>
        </section>

        <section id="how-it-works" className="py-24 bg-gradient-to-br from-gray-50 to-primary-50">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">How It Works</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Get started with LLM Compare in three simple steps.
              </p>
                </div>
            <div className="grid md:grid-cols-3 gap-12">
              {steps.map((step) => (
                <article
                  key={step.title}
                  className="bg-white rounded-3xl p-10 shadow-lg border-2 border-gray-200 hover:border-primary-600 transition-all"
                >
                  <div className="w-20 h-20 bg-primary-600 text-white rounded-2xl flex items-center justify-center text-3xl font-bold mb-6">
                    {step.number}
                </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">{step.title}</h3>
                  <p className="text-lg text-gray-600 leading-relaxed">{step.description}</p>
                </article>
              ))}
                </div>
                </div>
        </section>

        <section id="testimonials" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Trusted by Leading Teams</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                See how organizations are making smarter AI decisions with LLM Compare.
              </p>
                </div>
            <div className="grid md:grid-cols-3 gap-10">
              {testimonials.map((testimonial) => (
                <article key={testimonial.author} className="bg-gray-50 rounded-2xl p-10 border-2 border-gray-200 hover:border-primary-600 transition-all">
                  <div className="flex items-center gap-2 mb-6 text-primary-600">
                    <Star size={20} />
                    <Star size={20} />
                    <Star size={20} />
                    <Star size={20} />
                    <Star size={20} />
                </div>
                  <p className="text-xl text-gray-700 leading-relaxed mb-8">"{testimonial.quote}"</p>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-600">{testimonial.title}</p>
              </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="cta-section" className="py-24 bg-gradient-to-br from-primary-600 to-primary-800 text-white">
          <div className="max-w-5xl mx-auto px-8 text-center space-y-6">
            <h2 className="text-5xl font-bold">Ready to Find Your Perfect LLM?</h2>
            <p className="text-2xl leading-relaxed">
              Join 500+ enterprise teams making data-driven AI decisions with LLM Compare.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <Link
                to="/signup"
                className="px-12 py-5 text-xl font-bold bg-white text-primary-600 rounded-lg hover:bg-gray-100 transition shadow-xl"
              >
                Start Free Trial <ArrowRight className="inline ml-2" size={14} />
              </Link>
              <button className="px-12 py-5 text-xl font-bold text-white border-2 border-white rounded-lg hover:bg-white hover:text-primary-600">
                Talk to Sales
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-10 text-primary-100 text-lg">
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-check-circle"></i>
                No credit card required
              </div>
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-check-circle"></i>
                14-day free trial
              </div>
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-check-circle"></i>
                Cancel anytime
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
};
