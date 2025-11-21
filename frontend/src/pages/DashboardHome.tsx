import React from 'react';
import { Layout } from '../components/Layout';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  FileSearch,
  BarChart3,
  SignalHigh,
} from 'lucide-react';

const quickStats = [
  { title: 'Evaluations executed', value: '124', delta: '+12 this week' },
  { title: 'Avg. accuracy', value: '92.3%', delta: '+4.1% vs. last run' },
  { title: 'Cost saved', value: '$3.4K', delta: 'Budget vs. forecast' },
];

const featureCards = [
  {
    icon: FileSearch,
    title: 'Real-time benchmarks',
    description: 'Live metrics across accuracy, faithfulness, reasoning, context utilization.',
  },
  {
    icon: SignalHigh,
    title: 'Side-by-side comparisons',
    description: 'Run identical prompts against multiple LLMs and capture everything.',
  },
  {
    icon: ShieldCheck,
    title: 'Enterprise ready',
    description: 'SOC 2 security, API controls, and configurable access roles.',
  },
];

const steps = [
  {
    number: '1',
    title: 'Select LLMs',
    description: 'Pick top providers, configure prompts once, reuse across experiments.',
  },
  {
    number: '2',
    title: 'Run evaluations',
    description: 'Execute questions simultaneously with automated judge scoring.',
  },
  {
    number: '3',
    title: 'Review insights',
    description: 'Compare metrics, costs, and question-level annotations before deciding.',
  },
];

export const DashboardHome: React.FC = () => {
  return (
    <Layout>
      <section className="rounded-3xl bg-gradient-to-br from-blue-50 to-white p-10 shadow-xl overflow-hidden relative mb-10">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-blue-200 rounded-full blur-3xl" />
          <div className="absolute bottom-4 right-0 w-80 h-80 bg-indigo-200 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-primary-600">
            <Sparkles size={18} />
            Trusted by 500+ Enterprise Teams
          </div>
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-10 mt-8 items-center">
            <div>
              <h1 className="text-5xl font-bold text-gray-900 leading-tight">
                Compare LLMs with <span className="text-primary-600">Confidence</span>
              </h1>
              <p className="text-lg text-gray-600 mt-4 max-w-3xl">
                Make informed decisions about AI models using automated judge metrics, cost tracking, and collaboration-ready dashboards.
              </p>
              <div className="flex flex-wrap gap-4 mt-8">
                <button className="px-6 py-3 bg-primary-600 text-white rounded-2xl font-semibold shadow-lg hover:bg-primary-700">
                  Get started free
                </button>
                <button className="px-6 py-3 bg-white border border-gray-200 rounded-2xl font-semibold hover:border-primary-400">
                  Schedule demo
                </button>
              </div>
              <div className="flex flex-wrap gap-6 text-sm text-gray-500 mt-6">
                <div>No credit card required</div>
                <div>14-day free trial</div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-3xl shadow-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-sm text-gray-500">Model Comparison</p>
                  <h3 className="text-2xl font-semibold text-gray-900">Live</h3>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Live</span>
              </div>
              <div className="grid grid-cols-2 gap-6 text-center">
                <div>
                  <p className="text-xs font-semibold text-gray-500">GPT-4</p>
                  <p className="text-4xl font-bold text-gray-900">94.2%</p>
                  <p className="text-sm text-green-600 mt-1">+2.3%</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500">UX Pilot 3</p>
                  <p className="text-4xl font-bold text-gray-900">91.8%</p>
                  <p className="text-sm text-green-600 mt-1">+1.7%</p>
                </div>
              </div>
              <div className="mt-6">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Performance</span>
                  <span className="font-semibold text-gray-900">Excellent</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
                  <div className="h-full bg-primary-600 rounded-full" style={{ width: '94%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3 mb-10">
        {quickStats.map((stat) => (
          <article key={stat.title} className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-2">
            <p className="text-xs uppercase text-gray-500 tracking-wide">{stat.title}</p>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.delta}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3 mb-10">
        {featureCards.map((feature) => (
          <article
            key={feature.title}
            className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm flex flex-col gap-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center">
              <feature.icon className="text-primary-600" size={24} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">{feature.title}</h3>
            <p className="text-sm text-gray-600">{feature.description}</p>
          </article>
        ))}
      </section>

      <section className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 mb-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-primary-600 font-semibold">How it works</p>
            <h3 className="text-3xl font-bold text-gray-900">Three steps to smarter evaluations</h3>
          </div>
          <button className="px-5 py-2 bg-primary-600 text-white rounded-2xl font-semibold hover:bg-primary-700 flex items-center gap-2">
            View activity
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="grid gap-6 md:grid-cols-3 mt-8">
          {steps.map((step) => (
            <article
              key={step.number}
              className="bg-gray-50 rounded-3xl border border-gray-200 p-6 space-y-3"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary-50 text-primary-600 font-bold flex items-center justify-center text-xl">
                {step.number}
              </div>
              <h4 className="text-xl font-semibold text-gray-900">{step.title}</h4>
              <p className="text-sm text-gray-600">{step.description}</p>
            </article>
          ))}
        </div>
      </section>
    </Layout>
  );
};

