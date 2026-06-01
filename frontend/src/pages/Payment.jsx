import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { api } from "lib/api";
import { useAuth } from "lib/auth";
import { Check, ShieldCheck, CreditCard, ArrowLeft, CheckCircle, XCircle } from "@phosphor-icons/react";

const PLANS = {
  vikas: {
    name: "Vikas",
    price: "₹499",
    amount: 499,
    per: "/ month",
    desc: "For growing dukaans that need automation and speed.",
    features: [
      "3 users",
      "Unlimited AI chats",
      "Full automations",
      "Daily AI briefings",
      "Priority support",
    ],
    color: "#00A884",
  },
  shakti: {
    name: "Shakti",
    price: "₹1,499",
    amount: 1499,
    per: "/ month",
    desc: "For serious operators managing multiple locations.",
    features: [
      "3 businesses, 10 users",
      "Multi-location",
      "Custom automations",
      "Advanced analytics",
      "API access",
    ],
    color: "#6366F1",
  },
};

export default function Payment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const planKey = searchParams.get("plan");
  const plan = PLANS[planKey];

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // null | "success" | "failed"
  const [paymentDetails, setPaymentDetails] = useState(null);

  useEffect(() => {
    // Load Razorpay checkout script
    if (!document.getElementById("razorpay-script")) {
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => script.setAttribute("data-loaded", "true");
      document.body.appendChild(script);
    }
  }, []);

  if (!plan) {
    return (
      <div className="min-h-screen bg-[#090E17] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-white text-2xl font-bold mb-3">Invalid Plan</h1>
          <p className="text-slate-400 mb-6">The selected plan doesn't exist.</p>
          <Link to="/#pricing" className="text-[#00A884] font-semibold hover:underline">
            ← View all plans
          </Link>
        </div>
      </div>
    );
  }

  const handlePayment = async () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/payment?plan=${planKey}`)}`);
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // Ensure Razorpay script is loaded
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const existingScript = document.getElementById("razorpay-script");
          if (existingScript) {
            if (existingScript.getAttribute("data-loaded")) {
              resolve();
            } else {
              existingScript.onload = () => resolve();
              existingScript.onerror = () => reject(new Error("Script load error"));
            }
          } else {
            reject(new Error("Razorpay script not found"));
          }
          setTimeout(resolve, 5000);
        });
      }

      if (!window.Razorpay) {
        setStatus("failed");
        setLoading(false);
        return;
      }

      // Step 1: Create order on backend
      const { data } = await api.post("/api/payments/create-order", {
        plan: planKey,
      });

      if (!data.order_id || !data.key_id) {
        console.error("Invalid order response:", data);
        setStatus("failed");
        setLoading(false);
        return;
      }

      // Step 2: Open Razorpay checkout
      // NOTE: Do NOT pass amount/currency when order_id is provided - Razorpay reads from order
      const options = {
        key: data.key_id,
        order_id: data.order_id,
        name: "VyaparMind",
        description: data.description || `${plan.name} Plan - Monthly`,
        handler: function (response) {
          // Step 3: Verify payment on backend
          setLoading(true);
          api.post("/api/payments/verify", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            plan: planKey,
          })
            .then((verifyRes) => {
              setStatus("success");
              setPaymentDetails({
                ...verifyRes.data,
                payment_id: response.razorpay_payment_id,
              });
              setLoading(false);
            })
            .catch((err) => {
              console.error("Verify error:", err);
              setStatus("failed");
              setLoading(false);
            });
        },
        prefill: {
          name: data.user_name || user.name || "",
          email: data.user_email || user.email || "",
        },
        notes: {
          plan: planKey,
        },
        theme: {
          color: plan.color,
        },
        modal: {
          confirm_close: true,
          ondismiss: function () {
            setLoading(false);
          },
          escape: true,
        },
        retry: {
          enabled: true,
          max_count: 3,
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        console.error("Payment failed:", response.error);
        setStatus("failed");
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      console.error("Payment error:", err?.response?.data || err.message || err);
      setStatus("failed");
      setLoading(false);
    }
  };

  // Success state
  if (status === "success") {
    return (
      <div className="min-h-screen bg-[#090E17] flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={40} weight="fill" className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful! 🎉</h2>
          <p className="text-slate-600 mb-6">
            Your <span className="font-semibold capitalize">{plan.name}</span> plan is now active.
            Enjoy unlimited AI features!
          </p>
          {paymentDetails && (
            <div className="bg-slate-50 rounded-lg p-4 mb-6 text-left text-sm">
              <div className="flex justify-between mb-2">
                <span className="text-slate-500">Plan</span>
                <span className="font-semibold capitalize">{plan.name}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-500">Amount Paid</span>
                <span className="font-semibold">₹{Math.round(plan.amount * 1.18)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-500">Status</span>
                <span className="font-semibold text-green-600">Active</span>
              </div>
              {paymentDetails.payment_id && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment ID</span>
                  <span className="font-mono text-xs text-slate-600">{paymentDetails.payment_id}</span>
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => { window.location.href = "/app"; }}
            className="w-full bg-[#00A884] text-white font-bold py-3 rounded-lg hover:bg-[#008f6f] transition-colors"
          >
            Go to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  // Failed state
  if (status === "failed") {
    return (
      <div className="min-h-screen bg-[#090E17] flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <XCircle size={40} weight="fill" className="text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Failed</h2>
          <p className="text-slate-600 mb-4">
            Something went wrong with your payment. No amount was charged.
          </p>
          <p className="text-xs text-slate-400 mb-6">
            Please try again. Use UPI, Cards, or Net Banking.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => { setStatus(null); setLoading(false); }}
              className="flex-1 bg-[#00A884] text-white font-bold py-3 rounded-lg hover:bg-[#008f6f] transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate("/app/upgrade")}
              className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-lg hover:bg-slate-200 transition-colors"
            >
              View Plans
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main payment page
  return (
    <div className="min-h-screen bg-[#090E17] flex items-center justify-center px-4 py-12">
      <div className="max-w-4xl w-full grid lg:grid-cols-2 gap-8">
        {/* Left - Plan Details */}
        <div className="flex flex-col justify-center">
          <Link
            to="/#pricing"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors"
          >
            <ArrowLeft size={16} /> Back to plans
          </Link>

          <div className="mb-6">
            <div
              className="inline-block text-xs tracking-[0.2em] font-bold uppercase px-3 py-1 rounded mb-4"
              style={{ background: plan.color + "20", color: plan.color }}
            >
              {plan.name} Plan
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-white font-black text-5xl tracking-tighter font-display">
                {plan.price}
              </span>
              <span className="text-slate-400 text-lg">{plan.per}</span>
            </div>
            <p className="text-slate-400 mt-3 text-lg">{plan.desc}</p>
          </div>

          <div className="space-y-3 mb-8">
            {plan.features.map((f) => (
              <div key={f} className="flex items-center gap-3">
                <Check weight="bold" size={16} style={{ color: plan.color }} />
                <span className="text-slate-300">{f}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 text-slate-500 text-sm">
            <ShieldCheck size={18} />
            <span>Secured by Razorpay · 256-bit SSL encryption</span>
          </div>
        </div>

        {/* Right - Payment Card */}
        <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard size={28} className="text-slate-700" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Complete Your Payment</h2>
            <p className="text-slate-500 text-sm mt-1">
              You'll be redirected to Razorpay's secure payment page
            </p>
          </div>

          {/* Order Summary */}
          <div className="bg-slate-50 rounded-lg p-5 mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Order Summary</h3>
            <div className="flex justify-between mb-2">
              <span className="text-slate-600 text-sm">{plan.name} Plan (Monthly)</span>
              <span className="text-slate-900 font-semibold">{plan.price}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-slate-600 text-sm">GST (18%)</span>
              <span className="text-slate-900 font-semibold">
                ₹{Math.round(plan.amount * 0.18)}
              </span>
            </div>
            <div className="border-t border-slate-200 my-3" />
            <div className="flex justify-between">
              <span className="text-slate-900 font-bold">Total</span>
              <span className="text-slate-900 font-bold text-lg">
                ₹{Math.round(plan.amount * 1.18)}
              </span>
            </div>
          </div>

          {/* Pay Button */}
          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full font-bold py-4 rounded-lg text-white text-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
            style={{ background: plan.color }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Processing...
              </span>
            ) : (
              `Pay ₹${Math.round(plan.amount * 1.18)} Securely`
            )}
          </button>

          {/* Trust badges */}
          <div className="mt-6 flex items-center justify-center gap-4 text-slate-400 text-xs">
            <span>UPI</span>
            <span>•</span>
            <span>Cards</span>
            <span>•</span>
            <span>Net Banking</span>
            <span>•</span>
            <span>Wallets</span>
          </div>

          {!user && (
            <p className="text-center text-sm text-amber-600 mt-4">
              You'll need to log in before completing payment.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
