import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, Truck, Mail, Clock, ArrowRight, ShoppingBag } from "lucide-react";

export default function OrderConfirmation() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const orderId = searchParams.get("orderId");
  const paymentMethod = searchParams.get("method") || "paypal";
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Hide confetti animation after 3 seconds
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      {/* Confetti animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#ec4899'][Math.floor(Math.random() * 5)],
                width: '10px',
                height: '10px',
                borderRadius: Math.random() > 0.5 ? '50%' : '0',
              }}
            />
          ))}
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full mb-4">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Order Confirmed!</h1>
          <p className="text-slate-400">
            Thank you for your purchase. Your order has been successfully placed.
          </p>
        </div>

        {/* Order Details Card */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Package className="w-5 h-5 text-orange-500" />
              Order Details
            </CardTitle>
            {orderId && (
              <CardDescription className="text-slate-400">
                Order ID: <span className="font-mono text-orange-400">{orderId}</span>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Payment Method */}
            <div className="flex items-center justify-between py-3 border-b border-slate-700">
              <span className="text-slate-400">Payment Method</span>
              <span className="text-white font-medium capitalize">{paymentMethod}</span>
            </div>

            {/* Payment Status */}
            <div className="flex items-center justify-between py-3 border-b border-slate-700">
              <span className="text-slate-400">Payment Status</span>
              <span className="inline-flex items-center gap-1.5 text-green-400 font-medium">
                <CheckCircle className="w-4 h-4" />
                Confirmed
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Information Card */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Truck className="w-5 h-5 text-blue-500" />
              Shipping Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Estimated Delivery */}
            <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-white">Estimated Delivery: 5-7 Business Days</p>
                <p className="text-sm text-slate-400 mt-1">
                  Orders are shipped on average twice per week. You'll receive a tracking number via email once your order ships.
                </p>
              </div>
            </div>

            {/* Expedited Shipping Notice */}
            <div className="flex items-start gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <Mail className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-white">Need Expedited Shipping?</p>
                <p className="text-sm text-slate-400 mt-1">
                  For urgent shipping needs, please contact us at{" "}
                  <a 
                    href="mailto:omega@omegalongevity.com" 
                    className="text-orange-400 hover:text-orange-300 underline"
                  >
                    omega@omegalongevity.com
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What's Next Card */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <ArrowRight className="w-5 h-5 text-green-500" />
              What's Next?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-slate-300">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center text-sm font-medium">1</span>
                <span>You'll receive an order confirmation email shortly</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center text-sm font-medium">2</span>
                <span>Our team will prepare your order for shipment</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center text-sm font-medium">3</span>
                <span>You'll receive a shipping confirmation with tracking info</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center text-sm font-medium">4</span>
                <span>Your order will arrive within 5-7 business days</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button asChild className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
            <Link to="/order">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Continue Shopping
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700">
            <Link to="/">
              Return to Home
            </Link>
          </Button>
        </div>

        {/* Support Footer */}
        <p className="text-center text-sm text-slate-500 mt-8">
          Questions about your order? Contact us at{" "}
          <a 
            href="mailto:omega@omegalongevity.com" 
            className="text-orange-400 hover:text-orange-300"
          >
            omega@omegalongevity.com
          </a>
        </p>
      </div>

      {/* Confetti CSS */}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
