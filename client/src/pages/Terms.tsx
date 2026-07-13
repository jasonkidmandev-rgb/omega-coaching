import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { goBackTo } from "@/hooks/useGoBack";

export default function Terms() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container max-w-4xl py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => goBackTo("/")}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl">Terms of Service</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-4xl py-12 px-4">
        <div className="prose prose-invert prose-slate max-w-none">
          <p className="text-slate-400 text-sm mb-8">
            Last Updated: January 10, 2026
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">1. Acceptance of Terms</h2>
          <p className="text-slate-300 mb-4">
            By accessing and using the Omega Longevity platform ("Service"), you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to abide by these terms, please do not use this Service.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">2. Description of Service</h2>
          <p className="text-slate-300 mb-4">
            Omega Longevity provides health coaching services, protocol management tools, educational content related to peptides, supplements, and health optimization. Our platform connects clients with health coaches and provides tools for managing personalized health protocols.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">3. Age Requirement</h2>
          <p className="text-slate-300 mb-4">
            You must be at least 18 years of age to use this Service. By using this Service, you represent and warrant that you are at least 18 years old. If you are under 18, you may not use this Service under any circumstances.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">4. Medical Disclaimer</h2>
          <p className="text-slate-300 mb-4">
            <strong className="text-amber-400">IMPORTANT:</strong> The information provided through this Service is for educational and informational purposes only and is not intended as medical advice. The content is not intended to be a substitute for professional medical advice, diagnosis, or treatment.
          </p>
          <p className="text-slate-300 mb-4">
            Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. Never disregard professional medical advice or delay in seeking it because of something you have read or learned through this Service.
          </p>
          <p className="text-slate-300 mb-4">
            The use of any information provided through this Service is solely at your own risk. We do not recommend or endorse any specific tests, physicians, products, procedures, opinions, or other information that may be mentioned through the Service.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">5. User Accounts</h2>
          <p className="text-slate-300 mb-4">
            When you create an account with us, you must provide accurate, complete, and current information. You are responsible for safeguarding the password and for all activities that occur under your account. You agree to notify us immediately of any unauthorized access to your account.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">6. Purchases and Payments</h2>
          <p className="text-slate-300 mb-4">
            If you wish to purchase any product or service made available through the Service, you may be asked to supply certain information relevant to your purchase including your credit card number, expiration date, billing address, and shipping information.
          </p>
          <p className="text-slate-300 mb-4">
            You represent and warrant that: (i) you have the legal right to use any credit card(s) or other payment method(s) in connection with any purchase; and (ii) the information you supply to us is true, correct, and complete.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">7. Refund Policy</h2>
          <p className="text-slate-300 mb-4">
            Refund policies vary by product and service. Coaching packages are generally non-refundable once sessions have begun. Physical products may be returned within 30 days of receipt if unopened and in original condition. Please contact us for specific refund inquiries.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">8. Intellectual Property</h2>
          <p className="text-slate-300 mb-4">
            The Service and its original content, features, and functionality are and will remain the exclusive property of Omega Longevity and its licensors. The Service is protected by copyright, trademark, and other laws. Our trademarks may not be used in connection with any product or service without prior written consent.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">9. Prohibited Uses</h2>
          <p className="text-slate-300 mb-4">
            You agree not to use the Service:
          </p>
          <ul className="list-disc list-inside text-slate-300 mb-4 space-y-2">
            <li>In any way that violates any applicable federal, state, local, or international law or regulation</li>
            <li>To transmit any advertising or promotional material without our prior written consent</li>
            <li>To impersonate or attempt to impersonate the Company, an employee, another user, or any other person</li>
            <li>To engage in any conduct that restricts or inhibits anyone's use or enjoyment of the Service</li>
            <li>To attempt to gain unauthorized access to any portion of the Service</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">10. Limitation of Liability</h2>
          <p className="text-slate-300 mb-4">
            In no event shall Omega Longevity, its directors, employees, partners, agents, suppliers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">11. Indemnification</h2>
          <p className="text-slate-300 mb-4">
            You agree to defend, indemnify, and hold harmless Omega Longevity and its licensees and licensors, and their employees, contractors, agents, officers, and directors, from and against any and all claims, damages, obligations, losses, liabilities, costs, or debt, and expenses arising from your use of and access to the Service.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">12. Changes to Terms</h2>
          <p className="text-slate-300 mb-4">
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">13. Contact Us</h2>
          <p className="text-slate-300 mb-4">
            If you have any questions about these Terms, please contact us at:
          </p>
          <p className="text-slate-300 mb-4">
            <strong className="text-white">Email:</strong> omega@omegalongevity.com
          </p>

          <div className="mt-12 pt-8 border-t border-slate-700">
            <Button
              onClick={() => goBackTo("/")}
              className="bg-gradient-to-r from-amber-400 to-orange-500 text-black hover:from-amber-500 hover:to-orange-600"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
