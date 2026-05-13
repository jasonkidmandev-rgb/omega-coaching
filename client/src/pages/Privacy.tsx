import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";
import { useLocation } from "wouter";

export default function Privacy() {
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
              onClick={() => setLocation("/")}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl">Privacy Policy</span>
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

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">1. Introduction</h2>
          <p className="text-slate-300 mb-4">
            Omega Longevity ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
          </p>
          <p className="text-slate-300 mb-4">
            Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site or use our services.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">2. Information We Collect</h2>
          
          <h3 className="text-xl font-semibold text-white mt-6 mb-3">Personal Information</h3>
          <p className="text-slate-300 mb-4">
            We may collect personal information that you voluntarily provide to us when you:
          </p>
          <ul className="list-disc list-inside text-slate-300 mb-4 space-y-2">
            <li>Register for an account</li>
            <li>Sign up for coaching services</li>
            <li>Make a purchase</li>
            <li>Sign waivers or consent forms</li>
            <li>Contact us with inquiries</li>
            <li>Subscribe to our newsletter</li>
          </ul>
          <p className="text-slate-300 mb-4">
            This information may include: name, email address, phone number, billing address, payment information, and health-related information you choose to share with us.
          </p>

          <h3 className="text-xl font-semibold text-white mt-6 mb-3">Automatically Collected Information</h3>
          <p className="text-slate-300 mb-4">
            When you access our website, we may automatically collect certain information, including:
          </p>
          <ul className="list-disc list-inside text-slate-300 mb-4 space-y-2">
            <li>Device information (browser type, operating system)</li>
            <li>IP address</li>
            <li>Pages visited and time spent on pages</li>
            <li>Referring website addresses</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">3. How We Use Your Information</h2>
          <p className="text-slate-300 mb-4">
            We use the information we collect to:
          </p>
          <ul className="list-disc list-inside text-slate-300 mb-4 space-y-2">
            <li>Provide, operate, and maintain our services</li>
            <li>Process your transactions and manage your orders</li>
            <li>Create and manage your account</li>
            <li>Send you administrative information, updates, and security alerts</li>
            <li>Respond to your comments, questions, and requests</li>
            <li>Provide personalized health coaching and protocol recommendations</li>
            <li>Send marketing and promotional communications (with your consent)</li>
            <li>Analyze usage patterns to improve our services</li>
            <li>Protect against fraudulent or illegal activity</li>
          </ul>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">4. Disclosure of Your Information</h2>
          <p className="text-slate-300 mb-4">
            We may share your information in the following situations:
          </p>
          <ul className="list-disc list-inside text-slate-300 mb-4 space-y-2">
            <li><strong className="text-white">Service Providers:</strong> We may share your information with third-party vendors who perform services on our behalf (payment processing, email delivery, analytics)</li>
            <li><strong className="text-white">Business Transfers:</strong> In connection with any merger, sale of company assets, or acquisition</li>
            <li><strong className="text-white">Legal Requirements:</strong> If required by law or in response to valid requests by public authorities</li>
            <li><strong className="text-white">Protection of Rights:</strong> To protect our rights, privacy, safety, or property</li>
          </ul>
          <p className="text-slate-300 mb-4">
            We do not sell your personal information to third parties.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">5. Cookies and Tracking Technologies</h2>
          <p className="text-slate-300 mb-4">
            We use cookies and similar tracking technologies to track activity on our website and store certain information. Cookies are files with a small amount of data that may include an anonymous unique identifier.
          </p>
          <p className="text-slate-300 mb-4">
            You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">6. Data Security</h2>
          <p className="text-slate-300 mb-4">
            We implement appropriate technical and organizational security measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">7. Data Retention</h2>
          <p className="text-slate-300 mb-4">
            We will retain your personal information only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use your information to the extent necessary to comply with our legal obligations, resolve disputes, and enforce our policies.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">8. Your Privacy Rights</h2>
          <p className="text-slate-300 mb-4">
            Depending on your location, you may have certain rights regarding your personal information:
          </p>
          <ul className="list-disc list-inside text-slate-300 mb-4 space-y-2">
            <li><strong className="text-white">Access:</strong> Request access to your personal information</li>
            <li><strong className="text-white">Correction:</strong> Request correction of inaccurate information</li>
            <li><strong className="text-white">Deletion:</strong> Request deletion of your personal information</li>
            <li><strong className="text-white">Portability:</strong> Request a copy of your data in a portable format</li>
            <li><strong className="text-white">Opt-out:</strong> Opt out of marketing communications</li>
          </ul>
          <p className="text-slate-300 mb-4">
            To exercise these rights, please contact us using the information provided below.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">9. Children's Privacy</h2>
          <p className="text-slate-300 mb-4">
            Our Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18. If you are a parent or guardian and you are aware that your child has provided us with personal information, please contact us so that we can take necessary action.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">10. Third-Party Links</h2>
          <p className="text-slate-300 mb-4">
            Our website may contain links to third-party websites that are not operated by us. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services. We encourage you to review the privacy policy of every site you visit.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">11. Changes to This Privacy Policy</h2>
          <p className="text-slate-300 mb-4">
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">12. Contact Us</h2>
          <p className="text-slate-300 mb-4">
            If you have any questions about this Privacy Policy or our data practices, please contact us at:
          </p>
          <p className="text-slate-300 mb-4">
            <strong className="text-white">Email:</strong> omega@omegalongevity.com
          </p>

          <div className="mt-12 pt-8 border-t border-slate-700">
            <Button
              onClick={() => setLocation("/")}
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
