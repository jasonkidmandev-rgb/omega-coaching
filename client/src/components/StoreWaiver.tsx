import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { FileText, Pen, Check, AlertTriangle } from "lucide-react";

interface StoreWaiverProps {
  onComplete: () => void;
}

export function StoreWaiver({ onComplete }: StoreWaiverProps) {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [parentGuardianName, setParentGuardianName] = useState("");
  const [isUnder18, setIsUnder18] = useState(false);
  const [hasReadWaiver, setHasReadWaiver] = useState(false);
  const [hasAgreedSection1, setHasAgreedSection1] = useState(false);
  const [hasAgreedSection2, setHasAgreedSection2] = useState(false);
  const [signatureData, setSignatureData] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Refs for scroll-to functionality
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const parentGuardianRef = useRef<HTMLInputElement>(null);
  const signatureRef = useRef<HTMLDivElement>(null);
  const waiverScrollRef = useRef<HTMLDivElement>(null);
  const readConfirmRef = useRef<HTMLDivElement>(null);
  
  // Pre-fill user info from logged-in user
  useEffect(() => {
    if (user) {
      if (user.name) {
        const nameParts = user.name.split(' ');
        if (nameParts.length >= 2) {
          setFirstName(nameParts[0]);
          setLastName(nameParts.slice(1).join(' '));
        } else if (nameParts.length === 1) {
          setFirstName(nameParts[0]);
        }
      }
      if (user.email) {
        setEmail(user.email);
      }
      if ((user as any).phone) {
        setPhone((user as any).phone);
      }
    }
  }, [user]);

  const signMutation = trpc.waiver.sign.useMutation({
    onSuccess: () => {
      onComplete();
    },
  });

  // Canvas signature handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    // Scale coordinates to account for CSS scaling of the canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let x, y;
    if ('touches' in e) {
      x = (e.touches[0].clientX - rect.left) * scaleX;
      y = (e.touches[0].clientY - rect.top) * scaleY;
    } else {
      x = (e.clientX - rect.left) * scaleX;
      y = (e.clientY - rect.top) * scaleY;
    }
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    // Scale coordinates to account for CSS scaling of the canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let x, y;
    if ('touches' in e) {
      e.preventDefault();
      x = (e.touches[0].clientX - rect.left) * scaleX;
      y = (e.touches[0].clientY - rect.top) * scaleY;
    } else {
      x = (e.clientX - rect.left) * scaleX;
      y = (e.clientY - rect.top) * scaleY;
    }
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setSignatureData("");
  };

  const isFormValid = firstName && lastName && email && phone && hasReadWaiver && hasAgreedSection1 && hasAgreedSection2 && signatureData && (!isUnder18 || parentGuardianName);

  // Calculate progress
  const totalRequirements = isUnder18 ? 9 : 8;
  const completedRequirements = [
    !!firstName,
    !!lastName,
    !!email,
    !!phone,
    hasAgreedSection1,
    hasAgreedSection2,
    hasReadWaiver,
    !!signatureData,
    ...(isUnder18 ? [!!parentGuardianName] : [])
  ].filter(Boolean).length;
  const progressPercentage = (completedRequirements / totalRequirements) * 100;

  // Scroll to missing item
  const scrollToItem = (item: string) => {
    switch (item) {
      case 'firstName':
        firstNameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstNameRef.current?.focus();
        break;
      case 'lastName':
        lastNameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        lastNameRef.current?.focus();
        break;
      case 'email':
        emailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        emailRef.current?.focus();
        break;
      case 'phone':
        phoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        phoneRef.current?.focus();
        break;
      case 'section1':
      case 'section2':
        waiverScrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      case 'readWaiver':
        readConfirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      case 'signature':
        signatureRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      case 'parentGuardian':
        parentGuardianRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        parentGuardianRef.current?.focus();
        break;
    }
  };

  const handleSubmit = () => {
    if (!isFormValid) return;
    signMutation.mutate({
      firstName,
      lastName,
      email,
      phone,
      parentGuardianName: isUnder18 ? parentGuardianName : undefined,
      signatureData,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="text-center border-b border-slate-700 pb-6">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-orange-500/20 rounded-full">
                <FileText className="h-8 w-8 text-orange-500" />
              </div>
            </div>
            <CardTitle className="text-2xl md:text-3xl text-white">
              Omega Longevity Waiver & Agreement
            </CardTitle>
            <CardDescription className="text-slate-400 text-base">
              Please read and sign the following waiver before accessing the Omega Store
            </CardDescription>
            {/* Progress Indicator */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Form Progress</span>
                <span className="text-orange-500 font-medium">{completedRequirements} of {totalRequirements} complete</span>
              </div>
              <Progress value={progressPercentage} className="h-2 bg-slate-700" />
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Waiver Content */}
            <ScrollArea ref={waiverScrollRef} className="h-[500px] rounded-lg border border-slate-700 bg-slate-900/50 p-4">
              <div className="space-y-6 text-slate-300 text-sm leading-relaxed pr-4">
                
                {/* Section 1: Consulting Waiver */}
                <section>
                  <h3 className="text-lg font-semibold text-orange-500 mb-3">Consulting Waiver and Release of Liability</h3>
                  
                  <ul className="list-disc ml-6 space-y-2">
                    <li>Peptides are an exciting therapy, but not necessarily new. They've been used in modern medicine for over two decades. For example, Insulin is a peptide invented in 1921 that is regularly prescribed by medical professionals.</li>
                    <li>Most peptides are not approved for human use by the FDA and are still considered "experimental." This means they can't be sold "for human consumption," they're not regulated so reputable sources are few and far between.</li>
                    <li>There are thousands of incredible studies of nearly all peptides we will discuss. You are welcome to research them in the following ways:
                      <ul className="list-circle ml-6 mt-1 space-y-1">
                        <li>Our new Omega Community via the Omega Longevity Expert A.I. which has multiple books, articles, and hundreds of studies embedded.</li>
                        <li>NIH & PubMed - For example, simply google "Semax Pubmed" for studies and you will see hundreds of results.</li>
                      </ul>
                    </li>
                    <li>With that said, disclaimer is that there is minimal long-term clinical trials in "humans" with the exception of FDA-approved peptides that have brand names.</li>
                    <li>Despite being widely considered safe by many doctors and experts and used regularly with impressive results, you should still proceed with caution. Source your peptides carefully, start slow, and always work with a qualified practitioner.</li>
                    <li>We do recommend consulting with your own Practitioner: MD, NP, PA, DO, ND, etc. In our experience, most doctors are supportive, but not educated or experienced in these modalities.</li>
                    <li>While peptides can be powerful on their own, stacking multiple peptides together can be even more effective and deliver faster results. Just be careful with dosing, frequency, and which peptides you stack.</li>
                    <li>Some peptides are banned in competitive sports under WADA and possibly other organizations. Although the very definition of peptides is amino acids linked by peptide bonds, WADA may consider peptides in superphysiological levels (above normal) as a competitive advantage.</li>
                  </ul>

                  <div className="mt-4 p-3 bg-slate-800 rounded-lg border border-slate-600">
                    <p className="font-medium text-white mb-2">
                      I agree to release Jason Kidman (Here-in referred to as "CONSULTANT") and/or Omega Longevity (Here-in referred to as "CONSULTANT") of any liability regarding peptides or any other health recommendations.
                    </p>
                    <p className="mt-2">I agree that the consultant:</p>
                    <ul className="list-disc ml-6 mt-2 space-y-1">
                      <li>Provides knowledge on best practices regarding peptides, generally or specifically speaking.</li>
                      <li>Provides health consulting based on personal experience, anecdotal experience, research, and information from leading experts in the world, including but not limited to MDs, PhDs, NIH & PubMed studies, and other leading experts and practitioners in the realm that may or may not be credentialed "doctors."</li>
                      <li>Is not a medical doctor or qualified healthcare practitioner (MD, NP, DO, PA, ND, etc.)</li>
                      <li>Provides this information for research purposes only, and that every person should consult with their qualified medical practitioner on any health modality, from vitamins, herbs, lifestyle changes, wellness practices, peptides, and more.</li>
                      <li>May provide, recommend, or sell Peptides from reputable source(s) of "research chemicals not intended for human use. I also agree that the consultant is in no way affiliated with the Peptide brands and may not hold the consultant liable for any issues with them.</li>
                    </ul>
                  </div>
                </section>

                {/* Agreement Checkbox for Section 1 */}
                <div className="flex items-center space-x-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                  <Checkbox
                    id="agreeSection1"
                    checked={hasAgreedSection1}
                    onCheckedChange={(checked) => setHasAgreedSection1(checked === true)}
                    className="border-orange-500 data-[state=checked]:bg-orange-500"
                  />
                  <Label htmlFor="agreeSection1" className="text-white font-medium cursor-pointer">
                    I hereby agree to the Consulting Waiver and Release of Liability above.
                  </Label>
                </div>

                {/* Section 2: Privacy Disclosure */}
                <section>
                  <h3 className="text-lg font-semibold text-orange-500 mb-3">Privacy Disclosure</h3>
                  <p>
                    As a Private-Pay Health Coach Practitioner, who does not bill to insurance or e-claims, we are not required to collect a HIPAA Notice of Privacy Practices (NPP).
                  </p>
                  <p className="mt-2">
                    With that said, "CONSULTANT" does run all health coaching on a HIPAA-compliant platform. For this reason, we do advise that all clients communicate any sensitive information through, and only through, this HIPAA-compliant platform.
                  </p>
                  <p className="mt-2">
                    If the client chooses to text or email any confidential information outside of this platform, the "CONSULTANT" takes no liability for information shared in less-secure methods. It is also acknowledged here that the "CONSULTANT" is not a Medical Doctor and does not file billing claims, and this notice serves as our standard privacy policy.
                  </p>
                </section>

                {/* Section 3: Collaboration Agreement */}
                <section>
                  <h3 className="text-lg font-semibold text-orange-500 mb-3">Collaboration Agreement between "CONSULTANT" and YOU</h3>
                  <p>
                    Welcome to our collaborative journey towards greater health, well-being, and longevity. This agreement is a commitment between you, and "CONSULTANT" to work together in a spirit of partnership and mutual respect. Our goal is to create a supportive and empowering environment that encourages your personal growth and nurtures your health goals.
                  </p>

                  <h4 className="text-md font-semibold text-white mt-4 mb-2">Our Mutual Commitments:</h4>
                  
                  <div className="space-y-3">
                    <p><strong className="text-orange-400">Honesty and Openness:</strong> We pledge to communicate honestly and openly with each other. You will share your health history, dietary habits, and lifestyle, and I will provide evidence-based advice and compassionate guidance.</p>
                    
                    <p><strong className="text-orange-400">Respect and Confidentiality:</strong> All discussions and records will be kept confidential, respecting your privacy. I commit to honoring your personal experiences and beliefs, and I anticipate the same level of respect towards my professional recommendations.</p>
                    
                    <p><strong className="text-orange-400">Active Participation:</strong> You are encouraged to be an active participant in your health journey. This includes being open to trying new strategies, asking questions, and providing feedback.</p>
                    
                    <p><strong className="text-orange-400">Goal Setting:</strong> Together, we will set realistic and achievable goals. These will be revisited and adjusted as necessary to reflect your evolving needs and progress.</p>
                    
                    <p><strong className="text-orange-400">Non-Judgment:</strong> Our space is a judgment-free zone. Any setbacks are viewed as learning opportunities, and we will tackle them with a constructive and empathetic approach.</p>
                    
                    <p><strong className="text-orange-400">Accountability:</strong> We both accept responsibility for the roles we play in this partnership. You are accountable for implementing the agreed-upon strategies, and I am accountable for providing you with the necessary support and resources.</p>
                    
                    <p><strong className="text-orange-400">Evidence-Based Approach:</strong> We are not Medical Doctors. Our body of work is based on years of research, study, anecdotal evidence, Medical journals, and more. We are NOT replacing your Primary Care Physician and we DO recommend speaking to your PCP/GP or other Qualified Healthcare Provider about any changes to your supplements, modalities, lifestyles, and anything else we may suggest or recommend. We do follow Global leading edge Functional Experts as a "Subject Matter Expert," but we in no way are claiming to be a Medical Doctor; albeit we may reference from time to time to other MDs, PHDs, QHPs, and other Subject Matter Experts for best practices or research.</p>
                    
                    <p><strong className="text-orange-400">Celebration of Successes:</strong> Every victory, no matter how small, should be acknowledged and celebrated. We recognize that each step forward is an essential part of the journey.</p>
                    
                    <p><strong className="text-orange-400">Adaptability and Flexibility:</strong> We understand that life is dynamic, and we are prepared to adapt our approach as necessary to meet changing circumstances and challenges.</p>
                    
                    <p><strong className="text-orange-400">Continuous Learning:</strong> We commit to staying informed about the latest research in peptides, longevity practices, and bioregulators to ensure the best possible outcomes.</p>
                    
                    <p><strong className="text-orange-400">Tardiness:</strong> There is a 10-minute grace period on virtual meetings; if you do not show up within that window, it will be considered a no-show, and the session will be forfeited. A quick communication may be approved for a delay depending on our schedules.</p>
                    
                    <p><strong className="text-orange-400">Cancellation:</strong> In order not to lose a session, please make any cancellations 48 hours before our session.</p>
                  </div>
                </section>

                {/* Section 4: Liability */}
                <section>
                  <h3 className="text-lg font-semibold text-orange-500 mb-3">Liability</h3>
                  <p>
                    By enrolling in any program, purchasing any products, or using any content from Omega Longevity, you acknowledge and agree that Omega Longevity provides guidance and suggestions intended for educational purposes only. It is essential to understand that the information and recommendations shared are not a substitute for professional medical advice, diagnosis, or treatment.
                  </p>
                </section>

                {/* Section 5: Responsibility & Caution */}
                <section>
                  <h3 className="text-lg font-semibold text-orange-500 mb-3">Responsibility & Caution</h3>
                  <p>
                    You are encouraged to consult with your healthcare providers or medical professionals before making any changes to your diet, exercise routine, lifestyle, or any other health-related activities, based on the advice or information received from Omega Longevity Coaching, Programs, Services, Supplements, Peptides, or materials.
                  </p>
                </section>

                {/* Section 6: Personal Accountability */}
                <section>
                  <h3 className="text-lg font-semibold text-orange-500 mb-3">Personal Accountability</h3>
                  <p>
                    You understand and agree that you are solely responsible for the decisions you make regarding your health and well-being. Omega Longevity's suggestions and care should be taken at your own risk, and you should always exercise caution and use your best judgment.
                  </p>
                </section>

                {/* Section 7: No Guarantees or Warranties */}
                <section>
                  <h3 className="text-lg font-semibold text-orange-500 mb-3">No Guarantees or Warranties</h3>
                  <p>
                    Omega Longevity makes no representations or warranties, express or implied, regarding the effectiveness or outcomes of any recommendations or advice provided. Your progress and results are influenced by various factors, and individual results may vary.
                  </p>
                  <p className="mt-2">
                    You agree that Omega Longevity, its employees, contractors, and affiliates, will not be held liable for any damages, including but not limited to direct, indirect, incidental, consequential, or punitive damages, arising out of or related to your participation in any programs, use of any products, or reliance on any information provided by Omega Longevity.
                  </p>
                </section>

                {/* Section 8: Indemnification */}
                <section>
                  <h3 className="text-lg font-semibold text-orange-500 mb-3">Indemnification</h3>
                  <p>
                    You agree to indemnify and hold harmless Omega Longevity, its employees, contractors, and affiliates from any claims, damages, liabilities, costs, or expenses (including legal fees) arising out of or related to your use of the information, suggestions, and services provided by Omega Longevity.
                  </p>
                </section>

                {/* Section 9: Acknowledgment and Acceptance */}
                <section>
                  <h3 className="text-lg font-semibold text-orange-500 mb-3">Acknowledgment and Acceptance</h3>
                  <p>
                    By enrolling in any program or using any content, products, or recommendations provided by Omega Longevity, you acknowledge that you have read and understood this liability section and agree to its terms. You understand that Omega Longevity's role is to provide educational information, consulting, coaching, and support, and any actions you take are at your own discretion and risk.
                  </p>
                </section>

                {/* Section 10: Compliance with Professional Advice */}
                <section>
                  <h3 className="text-lg font-semibold text-orange-500 mb-3">Compliance with Professional Advice</h3>
                  <p>
                    You agree that no information or recommendation provided by Omega Longevity will override or replace the advice of your healthcare providers. Always follow their guidance and instructions as they are familiar with your unique medical history and needs.
                  </p>
                </section>

                {/* Section 11: Termination */}
                <section>
                  <h3 className="text-lg font-semibold text-orange-500 mb-3">Termination</h3>
                  <p>
                    Should you wish to terminate our collaboration, I request a notice period of 14 days to properly close our sessions and provide you with the necessary guidance for moving forward independently.
                  </p>
                </section>

                {/* Section 12: Health Coaching Privacy */}
                <section>
                  <h3 className="text-lg font-semibold text-orange-500 mb-3">Health Coaching Privacy</h3>
                  <p>
                    We utilize AI services such as (but not limited to) a subscription to Fathom AI for notes & references in virtual sessions. If for any reason you are not comfortable with an AI Notetaker, you will notify us at any time, but we will, by default, utilize AI whenever possible to enhance our consulting and coaching services and experiences.
                  </p>
                </section>

                {/* Section 13: Agreement */}
                <section>
                  <h3 className="text-lg font-semibold text-orange-500 mb-3">Agreement</h3>
                  <p>
                    By entering this collaboration, we commit to working together in the spirit of these terms, recognizing that our partnership is a shared journey towards a healthier, more mindful life.
                  </p>
                  <p className="mt-3 text-white font-medium">
                    Thank you for your willingness and commitment to better health.
                  </p>
                  <p className="mt-2 italic text-orange-400">
                    — Omega Longevity
                  </p>
                </section>

                {/* Agreement Checkbox for Section 2 */}
                <div className="flex items-center space-x-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                  <Checkbox
                    id="agreeSection2"
                    checked={hasAgreedSection2}
                    onCheckedChange={(checked) => setHasAgreedSection2(checked === true)}
                    className="border-orange-500 data-[state=checked]:bg-orange-500"
                  />
                  <Label htmlFor="agreeSection2" className="text-white font-medium cursor-pointer">
                    I hereby agree to the Collaboration Agreement and all terms above.
                  </Label>
                </div>

              </div>
            </ScrollArea>

            {/* Read Confirmation */}
            <div ref={readConfirmRef} className="flex items-center space-x-3 p-4 bg-slate-700/50 rounded-lg">
              <Checkbox
                id="hasRead"
                checked={hasReadWaiver}
                onCheckedChange={(checked) => setHasReadWaiver(checked === true)}
                className="border-slate-500 data-[state=checked]:bg-orange-500"
              />
              <Label htmlFor="hasRead" className="text-slate-300 cursor-pointer">
                I have read and understand the entire waiver document above
              </Label>
            </div>

            {/* Personal Information */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                <Pen className="h-5 w-5 text-orange-500" />
                Please enter your information
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-slate-300">First Name *</Label>
                  <Input
                    ref={firstNameRef}
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-slate-300">Last Name *</Label>
                  <Input
                    ref={lastNameRef}
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Enter your last name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300">Email *</Label>
                  <Input
                    ref={emailRef}
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Enter your email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-300">Phone *</Label>
                  <PhoneInput
                    id="phone"
                    value={phone}
                    onChange={(value) => setPhone(value)}
                    showCountryCode={true}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              {/* Under 18 Section */}
              <div className="flex items-center space-x-3 p-3 bg-slate-700/50 rounded-lg">
                <Checkbox
                  id="isUnder18"
                  checked={isUnder18}
                  onCheckedChange={(checked) => setIsUnder18(checked === true)}
                  className="border-slate-500 data-[state=checked]:bg-orange-500"
                />
                <Label htmlFor="isUnder18" className="text-slate-300 cursor-pointer">
                  I am under 18 years of age
                </Label>
              </div>

              {isUnder18 && (
                <div className="space-y-2 p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
                  <div className="flex items-center gap-2 text-amber-500 mb-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">Parent/Guardian Required</span>
                  </div>
                  <Label htmlFor="parentGuardian" className="text-slate-300">Parent/Guardian Name *</Label>
                  <Input
                    ref={parentGuardianRef}
                    id="parentGuardian"
                    value={parentGuardianName}
                    onChange={(e) => setParentGuardianName(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Enter parent/guardian name"
                  />
                </div>
              )}
            </div>

            {/* Signature */}
            <div ref={signatureRef} className="space-y-3">
              <Label className="text-slate-300 flex items-center gap-2">
                <Pen className="h-4 w-4" />
                Signature * (Draw your signature below)
              </Label>
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={150}
                  className="w-full border border-slate-600 rounded-lg bg-white cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearSignature}
                  className="absolute top-2 right-2 bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Clear
                </Button>
              </div>
              {signatureData && (
                <p className="text-sm text-green-500 flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  Signature captured
                </p>
              )}
            </div>

            {/* Validation Feedback */}
            {!isFormValid && (
              <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
                <div className="flex items-center gap-2 text-amber-500 mb-3">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Action Required</span>
                </div>
                <p className="text-sm text-slate-300 mb-3">
                  Please review the form above and ensure all required fields are completed, including the agreement checkboxes within the waiver document.
                </p>
                <p className="text-xs text-slate-400 font-medium mb-2">Missing items (click to go to field):</p>
                <ul className="text-sm text-slate-300 space-y-1 ml-4">
                  {!firstName && <li onClick={() => scrollToItem('firstName')} className="cursor-pointer hover:text-orange-400 transition-colors">• First name</li>}
                  {!lastName && <li onClick={() => scrollToItem('lastName')} className="cursor-pointer hover:text-orange-400 transition-colors">• Last name</li>}
                  {!email && <li onClick={() => scrollToItem('email')} className="cursor-pointer hover:text-orange-400 transition-colors">• Email address</li>}
                  {!phone && <li onClick={() => scrollToItem('phone')} className="cursor-pointer hover:text-orange-400 transition-colors">• Phone number</li>}
                  {!hasAgreedSection1 && <li onClick={() => scrollToItem('section1')} className="cursor-pointer hover:text-orange-400 transition-colors">• Consulting Waiver agreement (within waiver document)</li>}
                  {!hasAgreedSection2 && <li onClick={() => scrollToItem('section2')} className="cursor-pointer hover:text-orange-400 transition-colors">• Collaboration Agreement (within waiver document)</li>}
                  {!hasReadWaiver && <li onClick={() => scrollToItem('readWaiver')} className="cursor-pointer hover:text-orange-400 transition-colors">• Waiver read confirmation</li>}
                  {!signatureData && <li onClick={() => scrollToItem('signature')} className="cursor-pointer hover:text-orange-400 transition-colors">• Signature</li>}
                  {isUnder18 && !parentGuardianName && <li onClick={() => scrollToItem('parentGuardian')} className="cursor-pointer hover:text-orange-400 transition-colors">• Parent/guardian name</li>}
                </ul>
              </div>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || signMutation.isPending}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-lg font-semibold disabled:opacity-50"
            >
              {signMutation.isPending ? "Submitting..." : "Sign Waiver & Access Store"}
            </Button>

            {signMutation.isError && (
              <p className="text-red-500 text-center">
                Error signing waiver. Please try again.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
