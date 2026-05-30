import React from "react";
import { useNavigate } from "react-router-dom";
import { Check, Crown, Lightning, Rocket, Buildings } from "@phosphor-icons/react";
import { useAuth } from "lib/auth";

const PLANS = [
  {
    id: "shunya",
    name: "Shunya",
    price: "₹0",
    per: "Forever free",
    desc: "You're on this plan. Basic features for solo shops.",
    icon: Lightning,
    features: ["1 business, 1 user", "50 AI interactions / mo", "Text + voice + photo", "Weekly summary"],
    color: "#64748B",
    current: true,
  },
  {
    id: "vikas",
    name: "Vikas",
    price: "₹499",
    per: "/ month",
    desc: "For growing dukaans that need automation and speed.",
    icon: Rocket,
    features: ["3 users", "Unlimited AI chats", "Full automations", "Daily AI briefings", "Priority support"],
    color: "#00A884",
    popular: true,
  },
  {
    id: "shakti",
    name: "Shakti",
    price: "₹1,499",
    per: "/ month",
    desc: "For serious operators managing multiple locations.",
    icon: Crown,
    features: ["3 businesses, 10 users", "Multi-location", "Custom automations", "Advanced analytics", "API access"],
    color: "#6366F1",
  },
  {
    id: "samrajya",
    name: "Samrajya",
    price: "Custom",
    per: "Enterprise",
    desc: "Chains, franchises, NBFCs.",
    icon: Buildings,
    features: ["Unlimited everything", "White-label", "SLA + on-premise", "Custom AI training", "Dedicated account manager"],
    color: "#F59E0B",
  },
];

export default function Upgrade() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentPlan = user?.plan || "shunya";

  const handleSelect = (planId) => {
    if (planId === "shunya") return;
    if (planId === "samrajya") {
      window.location.href = "mailto:sales@vyaparmind.in?subject=Samrajya Enterprise Plan Inquiry";
      return;
    }
    navigate(`/payment?plan=${planId}`);
  };

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-[#00A884] to-[#00C896] rounded-lg flex items-center justify-center">
            <Crown weight="fill" size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Upgrade Your Plan</h1>
            <p className="text-sm text-slate-500">
              Current plan: <span className="font-semibold capitalize text-slate-700">{currentPlan}</span>
            </p>
          </div>
        </div>
        <p className="text-slate-600 mt-2">Unlock powerful features to grow your business faster with AI.</p>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
        {PLANS.map((plan) => {
          const isCurrentPlan = plan.id === currentPlan;
          const Icon = plan.icon;
          return (
            <div
              key={plan.id}
              className={`relative bg-white border-2 rounded-xl p-6 flex flex-col transition-all hover:shadow-lg ${
                plan.popular ? "border-[#00A884] shadow-md" : isCurrentPlan ? "border-slate-300 bg-slate-50" : "border-slate-200"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-6 bg-[#00A884] text-white text-[10px] tracking-[0.15em] font-bold uppercase px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute -top-3 left-6 bg-slate-700 text-white text-[10px] tracking-[0.15em] font-bold uppercase px-3 py-1 rounded-full">
                  Current Plan
                </div>
              )}

              <div className="flex items-center gap-2 mb-3 mt-1">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: plan.color + "15" }}
                >
                  <Icon weight="fill" size={18} style={{ color: plan.color }} />
                </div>
                <span className="font-bold text-slate-700 text-sm uppercase tracking-wide">{plan.name}</span>
              </div>

              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{plan.price}</span>
                <span className="text-slate-500 text-sm">{plan.per}</span>
              </div>
              <p className="text-sm text-slate-600 mb-4">{plan.desc}</p>

              <ul className="space-y-2.5 flex-1 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check weight="bold" size={14} style={{ color: plan.color }} className="mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(plan.id)}
                disabled={isCurrentPlan}
                className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${
                  isCurrentPlan
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : plan.popular
                    ? "bg-[#00A884] text-white hover:bg-[#008f6f] hover:scale-[1.02] active:scale-[0.98]"
                    : "bg-slate-900 text-white hover:bg-slate-700 hover:scale-[1.02] active:scale-[0.98]"
                }`}
              >
                {isCurrentPlan ? "Current Plan" : plan.id === "samrajya" ? "Contact Sales" : `Choose ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* FAQ / Trust */}
      <div className="mt-10 bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="font-bold text-slate-900 mb-4">Frequently Asked Questions</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold text-slate-800 mb-1">Can I switch plans anytime?</p>
            <p className="text-slate-600">Yes, upgrade or downgrade anytime. Changes apply immediately.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-800 mb-1">What payment methods are accepted?</p>
            <p className="text-slate-600">UPI, QR Code, Debit/Credit Cards, Net Banking, and Wallets via Razorpay.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-800 mb-1">Is there a refund policy?</p>
            <p className="text-slate-600">7-day money-back guarantee if you're not satisfied. No questions asked.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-800 mb-1">Is my payment secure?</p>
            <p className="text-slate-600">100% secure. Processed by Razorpay with 256-bit SSL encryption.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
