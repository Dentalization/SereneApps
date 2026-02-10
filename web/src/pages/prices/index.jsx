import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Check,
    ChevronDown,
    Sparkles,
    Zap,
    Building2,
    ArrowRight,
    ShieldCheck,
    Clock,
    Globe,
    MessageCircle
} from 'lucide-react';
import Header from '../../components/ui/Header';
import Footer from '../../components/ui/Footer';

// --- Utility: Conditional Classes ---
const cn = (...classes) => classes.filter(Boolean).join(' ');

// --- Utility: Format Rupiah ---
const formatRupiah = (number) => {
    if (typeof number === 'string') return number;
    return new Intl.NumberFormat('id-ID').format(number);
};

// --- Component: Animated Number ---
const AnimatedPrice = ({ value }) => (
    <AnimatePresence mode="wait">
        <motion.span
            key={value}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="block"
        >
            {formatRupiah(value)}
        </motion.span>
    </AnimatePresence>
);

// --- Component: Pricing Card ---
const PricingCard = ({ tier, billingCycle, index }) => {
    const isYearly = billingCycle === 'yearly';
    const price = isYearly ? tier.price.yearly : tier.price.monthly;
    const isCustom = typeof price === 'string';

    // Calculate savings
    const savings = !isCustom
        ? (tier.price.monthly * 12) - (tier.price.yearly * 12)
        : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className={cn(
                "relative flex flex-col p-8 md:p-10 rounded-[2rem] transition-all duration-300 h-full",
                tier.popular
                    ? "bg-slate-900 text-white shadow-2xl shadow-indigo-500/20 scale-100 lg:scale-105 z-10 ring-1 ring-indigo-500/50"
                    : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none hover:shadow-2xl hover:shadow-slate-200/60 hover:-translate-y-1"
            )}
        >
            {tier.popular && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center z-20">
                    <span className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 uppercase tracking-wider">
                        <Sparkles className="w-3 h-3 fill-current" /> Most Popular
                    </span>
                </div>
            )}

            {/* Header */}
            <div className="mb-8">
                <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-2xl transition-transform group-hover:scale-110 duration-300",
                    tier.popular ? "bg-white/10 text-white" : "bg-indigo-50/50 dark:bg-slate-800 text-indigo-600"
                )}>
                    {tier.icon}
                </div>
                <h3 className={cn("text-2xl font-bold mb-2", tier.popular ? "text-white" : "text-slate-900 dark:text-white")}>
                    {tier.name}
                </h3>
                <p className={cn("text-sm leading-relaxed", tier.popular ? "text-slate-300" : "text-slate-500 dark:text-slate-400")}>
                    {tier.description}
                </p>
            </div>

            {/* Price Section */}
            <div className="mb-8">
                <div className="flex items-baseline gap-1">
                    {isCustom ? (
                        <span className={cn("text-4xl font-bold tracking-tight", tier.popular ? "text-white" : "text-slate-900 dark:text-white")}>
                            Contact Us
                        </span>
                    ) : (
                        <>
                            <span className={cn("text-2xl font-semibold mr-1", tier.popular ? "text-slate-300" : "text-slate-400")}>Rp</span>
                            <span className={cn("text-5xl font-bold tracking-tight flex items-center", tier.popular ? "text-white" : "text-slate-900 dark:text-white")}>
                                <AnimatedPrice value={price} />
                            </span>
                            <span className={cn("text-base font-medium ml-2", tier.popular ? "text-slate-400" : "text-slate-500")}>
                                / month
                            </span>
                        </>
                    )}
                </div>
                {!isCustom && (
                    <p className={cn("text-xs font-medium mt-2 flex items-center gap-1 h-5", isYearly ? "opacity-100" : "opacity-0 transition-opacity")}>
                        <span className="text-emerald-500">Save Rp {formatRupiah(savings)} a year</span>
                    </p>
                )}
            </div>

            {/* Action Button */}
            {tier.name === "Enterprise" ? (
                <a
                    href="https://wa.me/6281287928805"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                        "w-full py-4 rounded-2xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 mb-8 relative overflow-hidden",
                        tier.popular
                            ? "bg-white text-indigo-600 hover:bg-indigo-50"
                            : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 shadow-lg shadow-slate-900/20"
                    )}>
                    Contact Sales <MessageCircle className="w-4 h-4" />
                </a>
            ) : (
                <button className={cn(
                    "w-full py-4 rounded-2xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 group/btn mb-8 relative overflow-hidden",
                    tier.popular
                        ? "bg-white text-indigo-600 hover:bg-indigo-50"
                        : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 shadow-lg shadow-slate-900/20"
                )}>
                    <span className="flex items-center gap-2">
                        {tier.cta} <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                    </span>
                </button>
            )}

            {/* Divider */}
            <div className={cn("h-px w-full mb-8", tier.popular ? "bg-white/10" : "bg-slate-100 dark:bg-slate-800")} />

            {/* Features */}
            <div className="flex-grow space-y-4">
                <p className={cn("text-xs font-bold uppercase tracking-wider mb-4", tier.popular ? "text-indigo-200" : "text-slate-400")}>
                    What's included
                </p>
                {tier.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                        <div className={cn(
                            "mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                            tier.popular ? "bg-indigo-500 text-white" : "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400"
                        )}>
                            <Check className="w-3 h-3" strokeWidth={3} />
                        </div>
                        <span className={cn("text-sm font-medium", tier.popular ? "text-slate-200" : "text-slate-600 dark:text-slate-300")}>
                            {feature}
                        </span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

// --- FAQ Component ---
const FAQ = ({ items }) => {
    const [openIndex, setOpenIndex] = useState(0);

    return (
        <div className="w-full max-w-3xl mx-auto space-y-4">
            {items.map((item, index) => (
                <motion.div
                    key={index}
                    initial={false}
                    className={`rounded-2xl overflow-hidden transition-colors duration-300 ${openIndex === index
                            ? 'bg-slate-50 dark:bg-slate-800/50'
                            : 'bg-transparent hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                        }`}
                >
                    <button
                        onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
                        className="flex items-center justify-between w-full p-6 text-left"
                    >
                        <span className={`font-semibold text-lg transition-colors ${openIndex === index ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                            {item.question}
                        </span>
                        <span className={`p-2 rounded-full transition-all duration-300 ${openIndex === index ? 'bg-indigo-100 text-indigo-600 rotate-180' : 'text-slate-400'}`}>
                            <ChevronDown className="w-5 h-5" />
                        </span>
                    </button>
                    <AnimatePresence>
                        {openIndex === index && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                            >
                                <div className="px-6 pb-6 text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {item.answer}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            ))}
        </div>
    );
};

const PricingPage = () => {
    const [billingCycle, setBillingCycle] = useState('monthly');

    // Pricing Data (IDR Prices, English Text)
    const tiers = [
        {
            name: "Starter",
            description: "Perfect for solo dentists starting their AI journey.",
            // UPDATED PRICE: 200k Monthly, 160k Yearly (20% off)
            price: { monthly: 200000, yearly: 160000 },
            icon: <Zap className="w-6 h-6" />,
            cta: "Start Free Trial",
            popular: false,
            features: ["50 AI Scans / month", "Basic Pathology Detection", "Patient PDF Reports", "Email Support", "1 User Seat"]
        },
        {
            name: "Professional",
            description: "Power tools for growing clinics & teams.",
            // UPDATED PRICE: 600k Monthly, 480k Yearly
            price: { monthly: 600000, yearly: 480000 },
            icon: <Sparkles className="w-6 h-6" />,
            cta: "Get Started",
            popular: true,
            features: ["500 AI Scans / month", "Advanced Heatmaps", "White-label Reports", "Priority Support (4h)", "5 User Seats", "PMS Integration"]
        },
        {
            name: "Enterprise",
            description: "Scalable solutions for DSOs & hospitals.",
            price: { monthly: "Custom", yearly: "Custom" },
            icon: <Building2 className="w-6 h-6" />,
            cta: "Contact Sales",
            popular: false,
            features: ["Unlimited Scans", "Custom AI Models", "API Access", "Dedicated Success Manager", "Unlimited Seats", "SSO & Audit Logs"]
        }
    ];

    const faqs = [
        { question: "Do I need a credit card to start?", answer: "No. You can sign up for our 14-day free trial without entering any payment information. We only ask for it when you're ready to upgrade." },
        { question: "Is the AI accuracy guaranteed?", answer: "Our models perform with 94.7% accuracy across common dental pathologies. However, Serene AI is a decision support tool, and final diagnosis must always be performed by a licensed professional." },
        { question: "Can I change plans anytime?", answer: "Absolutely. You can upgrade, downgrade, or cancel your subscription at any time. If you downgrade, the new rate will apply at the start of your next billing cycle." },
        { question: "Is my patient data secure?", answer: "Security is our top priority. We are HIPAA and SOC-2 Type II compliant. All data is encrypted using AES-256 at rest and TLS 1.3 in transit." }
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans selection:bg-indigo-500/30">
            <Header />

            {/* --- Ambient Background Glows --- */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-50/50 dark:bg-indigo-900/10 rounded-full blur-[120px]" />
                <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] bg-purple-50/50 dark:bg-purple-900/10 rounded-full blur-[120px]" />
            </div>

            <main className="relative z-10 pt-32 pb-24">

                {/* --- Hero Section --- */}
                <section className="px-6 mb-24 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="max-w-4xl mx-auto"
                    >
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-8">
                            <Sparkles className="w-3 h-3 text-indigo-500" /> Transparent Pricing
                        </span>

                        <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-white mb-8 tracking-tight leading-[1.1]">
                            Invest in your <br className="hidden md:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                                clinical confidence.
                            </span>
                        </h1>

                        <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
                            Transparent pricing for practices of all sizes. <br />
                            Experience the power of AI diagnostics with zero commitment.
                        </p>

                        {/* Billing Toggle */}
                        <div className="flex items-center justify-center">
                            <div className="bg-slate-100 dark:bg-slate-900 p-1.5 rounded-full inline-flex relative shadow-inner">
                                <div
                                    className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white dark:bg-indigo-600 rounded-full shadow-md transition-all duration-300 ease-spring ${billingCycle === 'yearly' ? 'translate-x-[calc(100%+6px)]' : 'translate-x-0'
                                        }`}
                                />
                                <button
                                    onClick={() => setBillingCycle('monthly')}
                                    className={`relative z-10 px-8 py-2.5 rounded-full text-sm font-bold transition-colors duration-300 ${billingCycle === 'monthly' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                                        }`}
                                >
                                    Monthly
                                </button>
                                <button
                                    onClick={() => setBillingCycle('yearly')}
                                    className={`relative z-10 px-8 py-2.5 rounded-full text-sm font-bold transition-colors duration-300 flex items-center gap-2 ${billingCycle === 'yearly' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                                        }`}
                                >
                                    Yearly
                                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                        -20%
                                    </span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </section>

                {/* --- Pricing Cards --- */}
                <section className="px-6 max-w-7xl mx-auto mb-32">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        {tiers.map((tier, i) => (
                            <PricingCard key={i} index={i} tier={tier} billingCycle={billingCycle} />
                        ))}
                    </div>
                </section>

                {/* --- FAQ Section --- */}
                <section className="px-6 max-w-7xl mx-auto mb-24">
                    <div className="grid lg:grid-cols-12 gap-16">
                        <div className="lg:col-span-4">
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                                Common Questions
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 mb-8">
                                Have something else on your mind? We are here to help.
                            </p>

                            <a
                                href="https://wa.me/6281287928805"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:opacity-90 transition-opacity"
                            >
                                Chat Support <MessageCircle className="w-4 h-4" />
                            </a>
                        </div>
                        <div className="lg:col-span-8">
                            <FAQ items={faqs} />
                        </div>
                    </div>
                </section>

            </main>

            <Footer />
        </div>
    );
};

export default PricingPage;