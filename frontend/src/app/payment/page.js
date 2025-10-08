"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { apiService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function Payment() {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentConfig, setPaymentConfig] = useState(null);
  const router = useRouter();
  const { updateSubscription } = useAuth();

  useEffect(() => {
    loadPaymentData();
    loadMidtransScript();
  }, []);

  const loadPaymentData = async () => {
    try {
      const [plansData, configData] = await Promise.all([
        apiService.getPaymentPlans(),
        apiService.getPaymentConfig(),
      ]);
      setPlans(plansData);
      setPaymentConfig(configData);
    } catch (error) {
      setError("Failed to load payment options");
    }
  };

  const loadMidtransScript = () => {
    if (document.getElementById("midtrans-script")) return;

    const script = document.createElement("script");
    script.id = "midtrans-script";
    script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", "SB-Mid-client-your-client-key"); // Will be replaced with actual key
    document.head.appendChild(script);
  };

  const handlePayment = async () => {
    if (!selectedPlan) {
      setError("Please select a payment plan");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const paymentData = await apiService.createPayment(selectedPlan);

      // Use Midtrans Snap
      if (window.snap && paymentConfig) {
        window.snap.pay(paymentData.snap_token, {
          onSuccess: async (result) => {
            // Payment successful, redirect to dashboard
            await updateSubscription();
            router.push("/dashboard");
          },
          onPending: (result) => {
            setError("Payment is pending. Please complete the payment.");
          },
          onError: (result) => {
            setError("Payment failed. Please try again.");
          },
          onClose: () => {
            setError("Payment was cancelled.");
          },
        });
      } else {
        setError("Payment system not available");
      }
    } catch (error) {
      setError(error.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex justify-center">
      <div className="max-w-screen-xl m-0 sm:m-10 bg-white shadow sm:rounded-lg flex justify-center flex-1">
        <div className="w-full p-6 sm:p-12">
          <div className="text-center mb-8">
            <Image
              src="/clevioLogo.png"
              alt="Clevio Logo"
              width={200}
              height={60}
              className="mx-auto mb-6"
              priority
            />
            <h1 className="text-3xl font-extrabold text-gray-900">
              Choose Your Plan
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Select a subscription plan to activate your account
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded max-w-md mx-auto">
              {error}
            </div>
          )}

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {plans.map((plan) => (
                <div
                  key={plan.code}
                  className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                    selectedPlan === plan.code
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-green-300"
                  }`}
                  onClick={() => setSelectedPlan(plan.code)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold">{plan.name}</h3>
                      <p className="text-gray-600">{plan.duration_days} days</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {formatPrice(plan.price)}
                      </div>
                      {plan.code === "PRO_Y" && (
                        <div className="text-sm text-green-600">Save 17%!</div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <input
                      type="radio"
                      name="plan"
                      value={plan.code}
                      checked={selectedPlan === plan.code}
                      onChange={() => setSelectedPlan(plan.code)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-600">
                      {plan.code === "PRO_M"
                        ? "Monthly subscription"
                        : "Yearly subscription (Best value!)"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={handlePayment}
                disabled={loading || !selectedPlan}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-8 rounded-lg text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : "Continue to Payment"}
              </button>
              <p className="mt-4 text-sm text-gray-600">
                Secure payment powered by Midtrans
              </p>
            </div>

            <div className="mt-8 text-center">
              <h4 className="text-lg font-semibold mb-4">What you get:</h4>
              <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div>✅ Unlimited AI Agents</div>
                <div>✅ WhatsApp Integration</div>
                <div>✅ Document Upload (RAG)</div>
                <div>✅ Advanced Tools</div>
                <div>✅ Priority Support</div>
                <div>✅ Usage Analytics</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
