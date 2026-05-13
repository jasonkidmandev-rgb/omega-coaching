import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { PhoneInput } from '@/components/ui/phone-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  FileSignature, 
  Shield, 
  Heart, 
  User, 
  Target, 
  Scale, 
  Users,
  AlertTriangle,
  Phone,
  Moon,
  Save
} from 'lucide-react';

// Signature pad component
const SignaturePad: React.FC<{
  value: string;
  onChange: (value: string) => void;
  label: string;
}> = ({ value, onChange, label }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [useTyped, setUseTyped] = useState(false);
  const [typedName, setTypedName] = useState('');

  useEffect(() => {
    if (value && value.startsWith('typed:')) {
      setUseTyped(true);
      setTypedName(value.replace('typed:', ''));
    }
  }, [value]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (useTyped) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || useTyped) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#1a365d';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    onChange('');
    setTypedName('');
  };

  const handleTypedChange = (name: string) => {
    setTypedName(name);
    onChange(`typed:${name}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setUseTyped(!useTyped);
            clearSignature();
          }}
        >
          {useTyped ? 'Draw signature' : 'Type signature'}
        </Button>
      </div>
      
      {useTyped ? (
        <div className="space-y-2">
          <Input
            value={typedName}
            onChange={(e) => handleTypedChange(e.target.value)}
            placeholder="Type your full legal name"
            className="font-signature text-xl italic"
          />
          {typedName && (
            <div className="p-4 bg-gray-50 border rounded-lg">
              <p className="font-signature text-2xl italic text-gray-800">{typedName}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={400}
            height={150}
            className="border-2 border-dashed border-gray-300 rounded-lg bg-white cursor-crosshair w-full"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          <p className="absolute bottom-2 left-2 text-xs text-gray-400">
            Sign above using mouse or touch
          </p>
        </div>
      )}
      
      {(value || typedName) && (
        <Button type="button" variant="outline" size="sm" onClick={clearSignature}>
          Clear signature
        </Button>
      )}
    </div>
  );
};

// ==========================================
// 9-STEP STREAMLINED SECTION DEFINITIONS
// ==========================================
const SECTIONS = [
  { id: 1, key: 'financial', title: 'Financial Agreement', icon: FileSignature, requiresSignature: true },
  { id: 2, key: 'waiver', title: 'Consulting Waiver', icon: Shield, requiresSignature: true },
  { id: 3, key: 'agreements', title: 'Agreements & Privacy', icon: Users, requiresSignature: true, requiresCheckbox: true },
  { id: 4, key: 'demographics', title: 'Your Information', icon: User },
  { id: 5, key: 'healthProfile', title: 'Health Profile', icon: Target },
  { id: 6, key: 'healthMeds', title: 'Health & Medications', icon: Heart },
  { id: 7, key: 'emergency', title: 'Emergency Contact', icon: Phone },
  { id: 8, key: 'lifestyle', title: 'Lifestyle & Readiness', icon: Moon },
  { id: 9, key: 'review', title: 'Review & Submit', icon: Check },
];

interface IntakeFormWizardProps {
  enrollmentId: number;
  userId?: number;
  userName?: string;
  userEmail?: string;
  userDob?: string;
  onComplete: () => void;
}

export const IntakeFormWizard: React.FC<IntakeFormWizardProps> = ({
  enrollmentId,
  userId,
  userName,
  userEmail,
  userDob,
  onComplete,
}) => {
  const [currentSection, setCurrentSection] = useState(1);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [signatures, setSignatures] = useState<Record<string, string>>({});
  const [completedSections, setCompletedSections] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Load existing form data
  const { data: existingForm, isLoading } = trpc.transformation.getIntakeForm.useQuery(
    { enrollmentId },
    { enabled: !!enrollmentId }
  );

  // Save mutation
  const saveMutation = trpc.transformation.saveIntakeForm.useMutation({
    onSuccess: () => {
      setLastSaved(new Date());
      setIsSaving(false);
    },
    onError: (error) => {
      toast.error('Save failed: ' + error.message);
      setIsSaving(false);
    },
  });

  // Submit mutation
  const submitMutation = trpc.transformation.submitIntakeForm.useMutation({
    onSuccess: () => {
      toast.success('Form submitted successfully! Your intake form has been submitted. We\'re excited to begin your transformation journey!');
      onComplete();
    },
    onError: (error) => {
      toast.error('Submission failed: ' + error.message);
    },
  });

  // Pre-populate with user data
  useEffect(() => {
    if (!existingForm && userName) {
      setFormData((prev) => ({
        ...prev,
        fullName: userName,
        email: userEmail,
        dateOfBirth: userDob,
      }));
    }
  }, [userName, userEmail, userDob, existingForm]);

  // Load existing form data — map old section IDs to new ones for backward compatibility
  useEffect(() => {
    if (existingForm) {
      setFormData(existingForm.data || {});
      setSignatures(existingForm.signatures || {});
      // Map old completed sections to new structure
      const oldCompleted = existingForm.completedSections || [];
      // Keep any that are valid in the new 1-9 range
      const validCompleted = oldCompleted.filter((id: number) => id >= 1 && id <= SECTIONS.length);
      setCompletedSections(validCompleted);
      // Start at section 1 for existing forms being migrated, or use saved section if valid
      const savedSection = existingForm.currentSection || 1;
      setCurrentSection(savedSection <= SECTIONS.length ? savedSection : 1);
    }
  }, [existingForm]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (Object.keys(formData).length > 0) {
        handleSave(false);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [formData, signatures, currentSection]);

  const handleSave = useCallback(async (showToast = true) => {
    setIsSaving(true);
    await saveMutation.mutateAsync({
      enrollmentId,
      currentSection,
      completedSections,
      formData,
      signatures,
    });
    if (showToast) {
      toast.success('Progress saved');
    }
  }, [enrollmentId, currentSection, completedSections, formData, signatures]);

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Save on field blur (debounced)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleFieldBlur = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (Object.keys(formData).length > 0) {
        handleSave(false);
      }
    }, 2000);
  }, [formData, handleSave]);

  const updateSignature = (sectionKey: string, value: string) => {
    setSignatures((prev) => ({ ...prev, [sectionKey]: value }));
  };

  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    const section = SECTIONS[currentSection - 1];

    switch (section.key) {
      case 'financial':
        if (!signatures.financial) errors.push('Client Signature is required');
        break;
      case 'waiver':
        if (!signatures.waiver) errors.push('Consulting Waiver Signature is required');
        break;
      case 'agreements':
        if (!formData.privacy_acknowledged) errors.push('Privacy Disclosure acknowledgment is required');
        if (!signatures.collaboration) errors.push('Collaboration Agreement Signature is required');
        if (formData.isMinor) {
          if (!formData.parentGuardianName) errors.push('Parent/Guardian Name is required');
          if (!signatures.parentGuardian) errors.push('Parent/Guardian Signature is required');
        }
        break;
      case 'demographics':
        if (!formData.fullName?.trim()) errors.push('Full Name is required');
        if (!formData.dateOfBirth) errors.push('Date of Birth is required');
        if (!formData.sex) errors.push('Sex is required');
        if (!formData.email?.trim()) errors.push('Email is required');
        if (!formData.phone?.trim()) errors.push('Mobile Phone is required');
        break;
      case 'healthProfile':
        if (!formData.height?.trim()) errors.push('Height is required');
        if (!formData.currentWeight?.trim()) errors.push('Current Weight is required');
        if (!formData.peptideGoals || formData.peptideGoals.length === 0) errors.push('Please select at least one goal');
        if (!formData.primaryGoal?.trim()) errors.push('Primary goal is required');
        if (!formData.safetyScreenFlags || formData.safetyScreenFlags.length === 0) errors.push('Safety Screening is required');
        break;
      case 'healthMeds':
        if (!formData.currentMedications?.trim()) errors.push('Current medications are required (write "None" if not applicable)');
        if (!formData.medicalIssues?.trim()) errors.push('Medical conditions are required (write "None" if not applicable)');
        if (!formData.physicalActivityRoutine?.trim()) errors.push('Physical activity routine is required');
        break;
      case 'emergency':
        if (!formData.emergencyContactName?.trim()) errors.push('Emergency Contact Name is required');
        if (!formData.emergencyContactRelationship?.trim()) errors.push('Relationship is required');
        if (!formData.emergencyContactPhone?.trim()) errors.push('Emergency Contact Phone is required');
        break;
      case 'lifestyle':
        // Sliders have defaults so they're always set, but we validate they exist
        if (!formData.aggressivenessScale) errors.push('Synergistic aggressiveness scale is required');
        if (!formData.financialAggressivenessScale) errors.push('Financial aggressiveness scale is required');
        if (!formData.organizationalCapacityScale) errors.push('Organizational capacity scale is required');
        break;
      default:
        break;
    }
    return errors;
  };

  const canProceed = () => {
    return getValidationErrors().length === 0;
  };

  const handleNext = async () => {
    const errors = getValidationErrors();
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast.error(errors.length === 1 ? errors[0] : `Please complete ${errors.length} required fields`);
      return;
    }
    setValidationErrors([]);

    if (!completedSections.includes(currentSection)) {
      setCompletedSections((prev) => [...prev, currentSection]);
    }

    await handleSave(false);

    if (currentSection < SECTIONS.length) {
      setCurrentSection(currentSection + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSection > 1) {
      setValidationErrors([]);
      setCurrentSection(currentSection - 1);
    }
  };

  const handleSubmit = async () => {
    // Validate all required signatures/checkboxes
    const missing: string[] = [];
    if (!signatures.financial) missing.push('Financial Agreement');
    if (!signatures.waiver) missing.push('Consulting Waiver');
    if (!signatures.collaboration) missing.push('Collaboration Agreement');
    if (!formData.privacy_acknowledged) missing.push('Privacy Disclosure');

    if (missing.length > 0) {
      toast.error(`Missing signatures: ${missing.join(', ')}`);
      return;
    }

    await submitMutation.mutateAsync({
      enrollmentId,
      formData,
      signatures,
    });
  };

  const progress = (completedSections.length / SECTIONS.length) * 100;
  const currentSectionData = SECTIONS[currentSection - 1];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Coaching Intake Form</h2>
            <p className="text-gray-600">Complete your health profile to begin your transformation</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {isSaving ? (
              <span className="flex items-center gap-1">
                <Save className="h-4 w-4 animate-pulse" /> Saving...
              </span>
            ) : lastSaved ? (
              <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
            ) : null}
          </div>
        </div>
        
        <Progress value={progress} className="h-2 mb-4" />
        
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((section, idx) => (
            <button
              key={section.id}
              onClick={() => setCurrentSection(section.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                currentSection === section.id
                  ? 'bg-amber-500 text-white'
                  : completedSections.includes(section.id)
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {completedSections.includes(section.id) && <Check className="h-3 w-3" />}
              <span>{idx + 1}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Current Section */}
      <Card className="mb-6">
        <CardHeader className="border-b bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center gap-3">
            {currentSectionData && React.createElement(currentSectionData.icon, { className: 'h-6 w-6 text-amber-600' })}
            <div>
              <CardTitle className="text-xl">{currentSectionData?.title}</CardTitle>
              <CardDescription>
                Step {currentSection} of {SECTIONS.length}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {renderSection(currentSection, formData, updateField, signatures, updateSignature)}
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h4 className="font-semibold text-red-800">Please complete the following required fields:</h4>
          </div>
          <ul className="list-disc list-inside space-y-1">
            {validationErrors.map((error, idx) => (
              <li key={idx} className="text-sm text-red-700">{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pb-40">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentSection === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <Button variant="ghost" onClick={() => handleSave(true)}>
          <Save className="h-4 w-4 mr-2" />
          Save Progress
        </Button>

        {currentSection === SECTIONS.length ? (
          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            {submitMutation.isPending ? 'Submitting...' : 'Submit Form'}
            <Check className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleNext}>
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
};

// ==========================================
// RENDER SECTION ROUTER
// ==========================================
function renderSection(
  sectionId: number,
  formData: Record<string, any>,
  updateField: (field: string, value: any) => void,
  signatures: Record<string, string>,
  updateSignature: (key: string, value: string) => void
) {
  switch (sectionId) {
    case 1:
      return <FinancialAgreementSection formData={formData} updateField={updateField} signatures={signatures} updateSignature={updateSignature} />;
    case 2:
      return <ConsultingWaiverSection formData={formData} updateField={updateField} signatures={signatures} updateSignature={updateSignature} />;
    case 3:
      return <AgreementsPrivacySection formData={formData} updateField={updateField} signatures={signatures} updateSignature={updateSignature} />;
    case 4:
      return <DemographicsSection formData={formData} updateField={updateField} />;
    case 5:
      return <HealthProfileSection formData={formData} updateField={updateField} />;
    case 6:
      return <HealthMedsSection formData={formData} updateField={updateField} />;
    case 7:
      return <EmergencyContactSection formData={formData} updateField={updateField} />;
    case 8:
      return <LifestyleReadinessSection formData={formData} updateField={updateField} />;
    case 9:
      return <ReviewSection formData={formData} signatures={signatures} updateField={updateField} />;
    default:
      return <div>Section not found</div>;
  }
}

// ==========================================
// STEP 1: Financial Agreement (unchanged)
// ==========================================
const FinancialAgreementSection: React.FC<any> = ({ signatures, updateSignature }) => (
  <div className="space-y-6">
    <div className="prose prose-sm max-w-none">
      <p className="text-gray-700 leading-relaxed">
        Thank you for choosing our services to meet your needs. Please read and sign the agreement below. 
        It lays out billing, scheduling, and cancellation procedures. If you have any questions, please ask for clarification.
      </p>
      
      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 my-4">
        <h4 className="font-semibold text-amber-800">Return & Refund Policy</h4>
        <p className="text-amber-700 text-sm">
          Peptides are amazing molecules already in your body! When peptide supplements or other products are purchased 
          through Omega Longevity, please note that they are perishable and often require refrigeration or sterile conditions. 
          For this reason, they are <strong>non-refundable once shipped</strong>. This policy applies to all supplements and products, not just peptides.
        </p>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg border">
        <h4 className="font-semibold mb-2">AGREEMENT</h4>
        <ul className="text-sm text-gray-700 space-y-2">
          <li>• I authorize automated payment directly to OMEGA LONGEVITY for all services rendered where applicable.</li>
          <li>• Payment can be made via credit/debit card through our secure payment processor.</li>
          <li>• I acknowledge that all appointments and sessions are pre-paid or part of a coaching program.</li>
          <li>• I will give 24 hour notice if I need to reschedule any appointment.</li>
          <li>• Failure to show up to a meeting forfeits that session.</li>
          <li>• In the case of default payment, I am responsible for full payment of the balance, interest accrued, and any collection costs and legal fees.</li>
        </ul>
      </div>
    </div>

    <Separator />

    <SignaturePad
      value={signatures.financial || ''}
      onChange={(value) => updateSignature('financial', value)}
      label="Client Signature *"
    />

    <div className="text-sm text-gray-500">
      Date: {new Date().toLocaleDateString('en-US', { timeZone: 'America/Denver' })}
    </div>
  </div>
);

// ==========================================
// STEP 2: Consulting Waiver (unchanged)
// ==========================================
const ConsultingWaiverSection: React.FC<any> = ({ signatures, updateSignature }) => (
  <div className="space-y-6">
    <div className="prose prose-sm max-w-none">
      <h4 className="font-semibold text-lg">Consulting Waiver and Release of Liability</h4>
      
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 my-4">
        <p className="text-blue-800 text-sm">
          Peptides are an exciting therapy, but not necessarily new. They've been used in modern medicine for over two decades. 
          For example, <strong>Insulin is a peptide invented in 1921</strong> that is regularly prescribed by medical professionals. 
          Additionally, some peptides have been used globally since the 1970's for TBI's (brain injuries) and slowing aging of astronauts.
        </p>
      </div>

      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 my-4">
        <p className="text-amber-800 text-sm">
          <strong>Important:</strong> Most peptides are not approved for human use by the FDA and are still considered 'experimental.' 
          This means they can't be sold 'for human consumption,' they're not regulated, so reputable sources are few and far between.
        </p>
      </div>

      <p className="text-gray-700">
        There are thousands of incredible studies of nearly all peptides we will discuss. You are welcome to research them through:
      </p>
      <ul className="text-sm text-gray-700">
        <li>• The Omega Elite Community, which has protocols based on global leaders, books, articles, and hundreds of studies</li>
        <li>• NIH & PubMed - For example, simply Google 'Semax PubMed' for studies</li>
      </ul>

      <div className="bg-gray-50 p-4 rounded-lg border mt-4">
        <p className="text-sm text-gray-700 font-medium">By signing below, I agree that the consultant:</p>
        <ul className="text-sm text-gray-600 mt-2 space-y-1">
          <li>• Provides knowledge on best practices regarding peptides</li>
          <li>• Provides health consulting based on personal experience, research, and information from leading experts</li>
          <li>• Is NOT a medical doctor or qualified healthcare practitioner</li>
          <li>• Provides this information for research purposes only</li>
          <li>• May provide or recommend Peptides from reputable sources of 'research chemicals not intended for human use'</li>
        </ul>
      </div>

      <p className="text-sm text-gray-600 mt-4 italic">
        We DO recommend consulting with your own Practitioner: MD, NP, PA, DO, ND, etc.
      </p>
    </div>

    <Separator />

    <SignaturePad
      value={signatures.waiver || ''}
      onChange={(value) => updateSignature('waiver', value)}
      label="Client Signature – Consulting Waiver *"
    />

    <div className="text-sm text-gray-500">
      Date: {new Date().toLocaleDateString('en-US', { timeZone: 'America/Denver' })}
    </div>
  </div>
);

// ==========================================
// STEP 3: Agreements & Privacy (merged Privacy + Collaboration)
// ==========================================
const AgreementsPrivacySection: React.FC<any> = ({ formData, updateField, signatures, updateSignature }) => (
  <div className="space-y-6">
    {/* Privacy Disclosure */}
    <div className="prose prose-sm max-w-none">
      <h4 className="font-semibold text-lg">Privacy Disclosure</h4>
      
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <p className="text-green-800 text-sm">
          As a Private-Pay Health Coach Practitioner, who does not bill to insurance or e-claims, 
          we are not required to collect a HIPAA Notice of Privacy Practices (NPP).
        </p>
      </div>

      <p className="text-gray-700 mt-4">
        With that said, 'CONSULTANT' does run all health coaching on a <strong>compliant platform built with proper security policies</strong>. 
        For this reason, we advise that all clients communicate any sensitive information through secure upload links and not via email or text.
      </p>

      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 my-4">
        <p className="text-amber-800 text-sm">
          If the client chooses to text or email any confidential information outside of this platform, 
          the 'CONSULTANT' takes no liability for information shared in less-secure methods.
        </p>
      </div>
    </div>

    <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
      <Checkbox
        id="privacy_acknowledged"
        checked={formData.privacy_acknowledged || false}
        onCheckedChange={(checked) => updateField('privacy_acknowledged', checked)}
      />
      <label htmlFor="privacy_acknowledged" className="text-sm font-medium cursor-pointer">
        I have read and acknowledge the Privacy Disclosure. *
      </label>
    </div>

    <Separator />

    {/* Collaboration Agreement */}
    <div className="prose prose-sm max-w-none">
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-lg border border-amber-200 mb-6">
        <h4 className="font-semibold text-lg text-amber-800 mb-2">
          Collaboration Agreement
        </h4>
        <p className="text-amber-700">
          This agreement is a commitment between you and your consultant to work together in a spirit of 
          partnership and mutual respect. We pledge honesty, openness, confidentiality, active participation, 
          realistic goal setting, non-judgment, accountability, and an evidence-based approach. 
          Every victory, no matter how small, should be celebrated!
        </p>
      </div>

      <div className="bg-red-50 border-l-4 border-red-400 p-4 my-4">
        <h5 className="font-semibold text-red-800">Important Policies:</h5>
        <ul className="text-sm text-red-700 mt-2 space-y-1">
          <li>• <strong>Tardiness:</strong> 10-minute grace period on virtual meetings. No-show = session forfeited.</li>
          <li>• <strong>Cancellation:</strong> Please provide 48 hours notice to avoid losing a session.</li>
          <li>• <strong>Termination:</strong> 14 days notice requested to properly close sessions.</li>
        </ul>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h5 className="font-semibold text-blue-800">AI Services Notice</h5>
        <p className="text-sm text-blue-700">
          We utilize AI services such as Fathom AI for notes & references in virtual sessions. 
          If you are not comfortable with an AI Notetaker, please notify us at any time.
        </p>
      </div>
    </div>

    <Separator />

    <SignaturePad
      value={signatures.collaboration || ''}
      onChange={(value) => updateSignature('collaboration', value)}
      label="Client Signature – Collaboration & Liability *"
    />

    <div className="text-sm text-gray-500">
      Date: {new Date().toLocaleDateString('en-US', { timeZone: 'America/Denver' })}
    </div>

    <Separator />

    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <Checkbox
          id="isMinor"
          checked={formData.isMinor || false}
          onCheckedChange={(checked) => updateField('isMinor', checked)}
        />
        <label htmlFor="isMinor" className="text-sm">
          Client is under 18 years of age
        </label>
      </div>

      {formData.isMinor && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <Label>Parent/Guardian Name *</Label>
            <Input
              value={formData.parentGuardianName || ''}
              onChange={(e) => updateField('parentGuardianName', e.target.value)}
              placeholder="Enter parent or guardian's full name"
            />
          </div>
          <SignaturePad
            value={signatures.parentGuardian || ''}
            onChange={(value) => updateSignature('parentGuardian', value)}
            label="Parent/Guardian Signature *"
          />
        </div>
      )}
    </div>
  </div>
);

// ==========================================
// STEP 4: Your Information (no address)
// ==========================================
const DemographicsSection: React.FC<any> = ({ formData, updateField }) => (
  <div className="space-y-6">
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <Label>Full Name *</Label>
        <Input
          value={formData.fullName || ''}
          onChange={(e) => updateField('fullName', e.target.value)}
          placeholder="Your full legal name"
        />
      </div>
      <div>
        <Label>Date of Birth *</Label>
        <Input
          type="date"
          value={formData.dateOfBirth || ''}
          onChange={(e) => updateField('dateOfBirth', e.target.value)}
        />
      </div>
      <div>
        <Label>Sex *</Label>
        <Select value={formData.sex || ''} onValueChange={(value) => updateField('sex', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="intersex">Intersex</SelectItem>
            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Email *</Label>
        <Input
          type="email"
          value={formData.email || ''}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="your@email.com"
        />
      </div>
      <div className="md:col-span-2">
        <Label>Mobile Phone *</Label>
        <PhoneInput
          value={formData.phone || ''}
          onChange={(value) => updateField('phone', value)}
          showCountryCode={true}
        />
      </div>
    </div>
  </div>
);

// ==========================================
// STEP 5: Health Profile (Body Comp + Goals + Safety)
// ==========================================
const HealthProfileSection: React.FC<any> = ({ formData, updateField }) => {
  const goalOptions = [
    'Fat loss',
    'Muscle gain / strength',
    'Increased energy / reduced fatigue',
    'Improved sleep quality',
    'Cognitive enhancement / focus',
    'Stress resilience / mood',
    'Longevity / anti-aging',
    'Injury recovery / joint support',
    'Gut health',
    'Sexual health / libido',
    'Other',
  ];

  const safetyFlags = [
    'History of heart attack, stroke, or clotting disorder',
    'Hypertension or cardiovascular disease',
    'Diabetes or prediabetes',
    'Kidney or liver disease',
    'Active cancer or history of cancer',
    'Seizure disorder',
    'Autoimmune disease',
    'Eating disorder history',
    'Current or recent suicidal thoughts or self-harm',
    'None of the above',
  ];

  const selectedGoals = formData.peptideGoals || [];
  const selectedFlags = formData.safetyScreenFlags || [];

  const toggleGoal = (goal: string) => {
    const newGoals = selectedGoals.includes(goal)
      ? selectedGoals.filter((g: string) => g !== goal)
      : [...selectedGoals, goal];
    updateField('peptideGoals', newGoals);
  };

  const toggleFlag = (flag: string) => {
    let newFlags;
    if (flag === 'None of the above') {
      newFlags = selectedFlags.includes(flag) ? [] : ['None of the above'];
    } else {
      newFlags = selectedFlags.filter((f: string) => f !== 'None of the above');
      newFlags = newFlags.includes(flag)
        ? newFlags.filter((f: string) => f !== flag)
        : [...newFlags, flag];
    }
    updateField('safetyScreenFlags', newFlags);
  };

  return (
    <div className="space-y-8">
      {/* Body Composition */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Scale className="h-5 w-5 text-amber-600" /> Body Composition
        </h4>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <Label>Height * (e.g., 5'10" or 178 cm)</Label>
            <Input
              value={formData.height || ''}
              onChange={(e) => updateField('height', e.target.value)}
              placeholder="5'10&quot; or 178 cm"
            />
          </div>
          <div>
            <Label>Current Weight *</Label>
            <Input
              value={formData.currentWeight || ''}
              onChange={(e) => updateField('currentWeight', e.target.value)}
              placeholder="185 lbs or 84 kg"
            />
          </div>
          <div>
            <Label>Goal/Target Weight</Label>
            <Input
              value={formData.goalWeight || ''}
              onChange={(e) => updateField('goalWeight', e.target.value)}
              placeholder="175 lbs or 79 kg"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Goals */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-amber-600" /> Goals & Peptide Experience
        </h4>
        <div>
          <Label className="text-base font-medium">
            What are you trying to achieve through Peptides & Longevity Protocols? *
          </Label>
          <p className="text-sm text-gray-500 mb-4">Check all that apply</p>
          <div className="grid md:grid-cols-2 gap-3">
            {goalOptions.map((goal) => (
              <div key={goal} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <Checkbox
                  id={goal}
                  checked={selectedGoals.includes(goal)}
                  onCheckedChange={() => toggleGoal(goal)}
                />
                <label htmlFor={goal} className="text-sm cursor-pointer flex-1">{goal}</label>
              </div>
            ))}
          </div>
        </div>

        {selectedGoals.includes('Other') && (
          <div className="mt-4">
            <Label>Please specify other goals</Label>
            <Input
              value={formData.additionalGoals || ''}
              onChange={(e) => updateField('additionalGoals', e.target.value)}
              placeholder="Describe your other goals..."
            />
          </div>
        )}

        <div className="mt-4">
          <Label>Of those selected, what is your #1 most important goal? *</Label>
          <Input
            value={formData.primaryGoal || ''}
            onChange={(e) => updateField('primaryGoal', e.target.value)}
            placeholder="e.g., Fat loss and increased energy"
          />
        </div>

        <div className="mt-4">
          <Label>What is your #2 most important goal?</Label>
          <Input
            value={formData.secondaryGoal || ''}
            onChange={(e) => updateField('secondaryGoal', e.target.value)}
            placeholder="e.g., Better sleep quality"
          />
        </div>

        <div className="mt-4">
          <Label>Have you utilized Peptides before? If yes, please explain</Label>
          <Textarea
            value={formData.previousPeptideExperience || ''}
            onChange={(e) => updateField('previousPeptideExperience', e.target.value)}
            placeholder="Share your previous experience with peptides, if any..."
            rows={2}
          />
        </div>
      </div>

      <Separator />

      {/* Safety Screening */}
      <div>
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <h4 className="font-semibold text-red-800">Safety Screening</h4>
          <p className="text-red-700 text-sm">
            This information helps us ensure your safety and customize your protocol appropriately.
          </p>
        </div>

        <Label className="text-base font-medium">
          Do you currently have any of the following? *
        </Label>
        <p className="text-sm text-gray-500 mb-4">Check all that apply</p>
        <div className="space-y-3">
          {safetyFlags.map((flag) => (
            <div
              key={flag}
              className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                selectedFlags.includes(flag)
                  ? flag === 'None of the above'
                    ? 'bg-green-50 border-green-300'
                    : 'bg-amber-50 border-amber-300'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <Checkbox
                id={flag}
                checked={selectedFlags.includes(flag)}
                onCheckedChange={() => toggleFlag(flag)}
              />
              <label htmlFor={flag} className="text-sm cursor-pointer flex-1">{flag}</label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// STEP 6: Health & Medications (consolidated)
// ==========================================
const HealthMedsSection: React.FC<any> = ({ formData, updateField }) => (
  <div className="space-y-6">
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
      <p className="text-blue-800 text-sm">
        This information helps us create a safe, personalized protocol. Some peptides are contraindicated 
        with certain medications, particularly antidepressants.
      </p>
    </div>

    <div>
      <Label>List any medications you are currently taking *</Label>
      <p className="text-sm text-gray-500 mb-2">
        Include psychiatric medications (antidepressants, mood stabilizers, etc.) as some peptides may interact with them
      </p>
      <Textarea
        value={formData.currentMedications || ''}
        onChange={(e) => updateField('currentMedications', e.target.value)}
        placeholder="Medication name, dose, frequency, and what it's for...&#10;Include any psychiatric medications as well."
        rows={4}
      />
    </div>

    <div>
      <Label>Medical conditions or diagnoses we should be aware of *</Label>
      <p className="text-sm text-gray-500 mb-2">
        Include any mental health conditions (depression, anxiety, bipolar, etc.)
      </p>
      <Textarea
        value={formData.medicalIssues || ''}
        onChange={(e) => updateField('medicalIssues', e.target.value)}
        placeholder="Any conditions, past surgeries, mental health history, or health concerns..."
        rows={4}
      />
    </div>

    <div>
      <Label>Current supplements you are taking</Label>
      <Textarea
        value={formData.currentSupplements || ''}
        onChange={(e) => updateField('currentSupplements', e.target.value)}
        placeholder="e.g., Vitamin D 5000 IU daily, Fish Oil 2g for heart health..."
        rows={3}
      />
    </div>

    <div>
      <Label>Describe your current physical activity routine *</Label>
      <Textarea
        value={formData.physicalActivityRoutine || ''}
        onChange={(e) => updateField('physicalActivityRoutine', e.target.value)}
        placeholder="e.g., Weight training 3x/week, walking 30 min daily, yoga on weekends..."
        rows={3}
      />
    </div>
  </div>
);

// ==========================================
// STEP 7: Emergency Contact (unchanged)
// ==========================================
const EmergencyContactSection: React.FC<any> = ({ formData, updateField }) => (
  <div className="space-y-6">
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
      <p className="text-blue-800 text-sm">
        Please provide an emergency contact in case we need to reach someone on your behalf.
      </p>
    </div>

    <div className="grid md:grid-cols-2 gap-6">
      <div className="md:col-span-2">
        <Label>Emergency Contact Name *</Label>
        <Input
          value={formData.emergencyContactName || ''}
          onChange={(e) => updateField('emergencyContactName', e.target.value)}
          placeholder="Full name of emergency contact"
        />
      </div>
      <div>
        <Label>Relationship *</Label>
        <Input
          value={formData.emergencyContactRelationship || ''}
          onChange={(e) => updateField('emergencyContactRelationship', e.target.value)}
          placeholder="e.g., Spouse, Parent, Sibling"
        />
      </div>
      <div>
        <Label>Phone Number *</Label>
        <PhoneInput
          value={formData.emergencyContactPhone || ''}
          onChange={(value) => updateField('emergencyContactPhone', value)}
          showCountryCode={true}
        />
      </div>
    </div>
  </div>
);

// ==========================================
// STEP 8: Lifestyle & Readiness (merged)
// ==========================================
const LifestyleReadinessSection: React.FC<any> = ({ formData, updateField }) => (
  <div className="space-y-8">
    {/* Substance Use - consolidated */}
    <div>
      <Label>Describe your alcohol, tobacco, or other substance use, if any</Label>
      <p className="text-sm text-gray-500 mb-2">This information is confidential and helps us create a safe protocol.</p>
      <Textarea
        value={formData.alcoholUse || ''}
        onChange={(e) => updateField('alcoholUse', e.target.value)}
        placeholder="e.g., 2-3 glasses of wine per week, no tobacco, occasional CBD for sleep..."
        rows={3}
      />
    </div>

    <Separator />

    {/* Sleep & Stress */}
    <div>
      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Moon className="h-5 w-5 text-amber-600" /> Sleep & Stress
      </h4>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Label>Average Sleep Duration</Label>
          <Input
            value={formData.sleepDuration || ''}
            onChange={(e) => updateField('sleepDuration', e.target.value)}
            placeholder="e.g., 6-7 hours"
          />
        </div>
        <div>
          <Label>Sleep Quality (1-10)</Label>
          <div className="pt-2">
            <Slider
              value={[formData.sleepQuality || 5]}
              onValueChange={(value) => updateField('sleepQuality', value[0])}
              max={10}
              min={1}
              step={1}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Poor (1)</span>
              <span className="font-medium text-lg">{formData.sleepQuality || 5}</span>
              <span>Excellent (10)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Label>Current Stress Level (1-10)</Label>
        <div className="pt-2">
          <Slider
            value={[formData.stressLevel || 5]}
            onValueChange={(value) => updateField('stressLevel', value[0])}
            max={10}
            min={1}
            step={1}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Low (1)</span>
            <span className="font-medium text-lg">{formData.stressLevel || 5}</span>
            <span>High (10)</span>
          </div>
        </div>
      </div>
    </div>

    <Separator />

    {/* Wearables - single field */}
    <div>
      <Label>What wearable devices or health tracking do you use?</Label>
      <p className="text-sm text-gray-500 mb-2">
        e.g., Oura Ring, Whoop, Garmin, Apple Watch, CGM, or other devices
      </p>
      <Input
        value={formData.wearableDevices || ''}
        onChange={(e) => updateField('wearableDevices', e.target.value)}
        placeholder="e.g., Oura Ring, Apple Watch, CGM"
      />
    </div>

    <Separator />

    {/* Aggressiveness & Capacity */}
    <div>
      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Target className="h-5 w-5 text-amber-600" /> Aggressiveness & Capacity
      </h4>

      <div className="space-y-6">
        <div>
          <Label className="text-base font-medium">
            How aggressive do you want to tackle your goals from a synergistic standpoint? *
          </Label>
          <p className="text-sm text-gray-500 mb-2">
            (1+1=3, 1+1+1=7, and so on) - 1 being most conservative, 5 being most aggressive
          </p>
          <div className="pt-2">
            <Slider
              value={[formData.aggressivenessScale || 3]}
              onValueChange={(value) => updateField('aggressivenessScale', value[0])}
              max={5}
              min={1}
              step={1}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Conservative (1)</span>
              <span className="font-medium text-lg">{formData.aggressivenessScale || 3}</span>
              <span>Aggressive (5)</span>
            </div>
          </div>
        </div>

        <div>
          <Label className="text-base font-medium">
            How aggressive do you want to tackle these goals financially? *
          </Label>
          <p className="text-sm text-gray-500 mb-2">1 being budget-conscious, 5 being "all-in"</p>
          <div className="pt-2">
            <Slider
              value={[formData.financialAggressivenessScale || 3]}
              onValueChange={(value) => updateField('financialAggressivenessScale', value[0])}
              max={5}
              min={1}
              step={1}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Budget-conscious (1)</span>
              <span className="font-medium text-lg">{formData.financialAggressivenessScale || 3}</span>
              <span>All-in (5)</span>
            </div>
          </div>
        </div>

        <div>
          <Label className="text-base font-medium">
            How all-in are you able to go from an organizational standpoint? *
          </Label>
          <p className="text-sm text-gray-500 mb-2">
            More peptides, supplements and modalities = more organization needed.
          </p>
          <div className="pt-2">
            <Slider
              value={[formData.organizationalCapacityScale || 3]}
              onValueChange={(value) => updateField('organizationalCapacityScale', value[0])}
              max={5}
              min={1}
              step={1}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Keep it simple (1)</span>
              <span className="font-medium text-lg">{formData.organizationalCapacityScale || 3}</span>
              <span>Bring it on! (5)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Label>How many hours per week can you realistically commit?</Label>
        <p className="text-sm text-gray-500 mb-2">
          For training, recovery, food prep, and protocol management
        </p>
        <Input
          value={formData.weeklyTimeCommitment || ''}
          onChange={(e) => updateField('weeklyTimeCommitment', e.target.value)}
          placeholder="e.g., 5-7 hours per week"
        />
      </div>
    </div>

    <Separator />

    {/* Notes for Coach */}
    <div>
      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
        <FileSignature className="h-5 w-5 text-amber-600" /> Notes for Your Coach
      </h4>
      <p className="text-sm text-gray-500 mb-3">
        Is there anything else you'd like your coach to know? This could be context about your health history,
        personal circumstances, preferences, concerns, or anything that didn't fit neatly into the questions above.
        This field is completely optional.
      </p>
      <Textarea
        value={formData.additionalContext || ''}
        onChange={(e) => updateField('additionalContext', e.target.value)}
        placeholder="Anything else you'd like to share with your coach before your first session..."
        rows={5}
        className="resize-y"
      />
    </div>
  </div>
);

// ==========================================
// STEP 9: Review & Submit (with referral)
// ==========================================
const ReviewSection: React.FC<any> = ({ formData, signatures, updateField }) => {
  const referralOptions = [
    'Friend/Family referral',
    'Existing client',
    'Healthcare provider referral',
    'Social media (Instagram, Facebook, TikTok)',
    'Podcast',
    'YouTube',
    'Web search',
    'Event / seminar',
    'Other',
  ];

  const signedSections = Object.keys(signatures).filter(key => signatures[key]);
  
  return (
    <div className="space-y-6">
      {/* Referral Source */}
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <h5 className="font-medium text-green-800 mb-3">How did you hear about us?</h5>
        <Select value={formData.referralSource || ''} onValueChange={(value) => updateField('referralSource', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select an option..." />
          </SelectTrigger>
          <SelectContent>
            {referralOptions.map((option) => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {['Friend/Family referral', 'Existing client', 'Healthcare provider referral'].includes(formData.referralSource) && (
          <div className="mt-3">
            <Label>Who referred you?</Label>
            <Input
              value={formData.referralName || ''}
              onChange={(e) => updateField('referralName', e.target.value)}
              placeholder="Name of the person who referred you"
            />
          </div>
        )}

        {formData.referralSource === 'Other' && (
          <div className="mt-3">
            <Label>Please specify</Label>
            <Input
              value={formData.referralOther || ''}
              onChange={(e) => updateField('referralOther', e.target.value)}
              placeholder="How did you hear about us?"
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Review Summary */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
        <h4 className="font-semibold text-lg text-green-800 mb-2">
          You're almost done!
        </h4>
        <p className="text-green-700">
          Please review your information below and click "Submit Form" when you're ready. 
          You can go back to any section to make changes.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h5 className="font-medium text-gray-900">Personal Information</h5>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
            <p><strong>Name:</strong> {formData.fullName || 'Not provided'}</p>
            <p><strong>Email:</strong> {formData.email || 'Not provided'}</p>
            <p><strong>Phone:</strong> {formData.phone || 'Not provided'}</p>
            <p><strong>Date of Birth:</strong> {formData.dateOfBirth || 'Not provided'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h5 className="font-medium text-gray-900">Signatures Completed</h5>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            {[
              { key: 'financial', label: 'Financial Agreement' },
              { key: 'waiver', label: 'Consulting Waiver' },
              { key: 'collaboration', label: 'Collaboration Agreement' },
            ].map((sig) => (
              <div key={sig.key} className="flex items-center gap-2">
                {signatures[sig.key] ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
                <span className={signatures[sig.key] ? 'text-green-700' : 'text-amber-600'}>
                  {sig.label}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              {formData.privacy_acknowledged ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              <span className={formData.privacy_acknowledged ? 'text-green-700' : 'text-amber-600'}>
                Privacy Disclosure
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h5 className="font-medium text-gray-900">Goals Summary</h5>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              {formData.peptideGoals?.length > 0 
                ? formData.peptideGoals.join(', ')
                : 'No goals selected'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h5 className="font-medium text-gray-900">Emergency Contact</h5>
          <div className="bg-gray-50 p-4 rounded-lg text-sm">
            <p><strong>Name:</strong> {formData.emergencyContactName || 'Not provided'}</p>
            <p><strong>Relationship:</strong> {formData.emergencyContactRelationship || 'Not provided'}</p>
            <p><strong>Phone:</strong> {formData.emergencyContactPhone || 'Not provided'}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h5 className="font-medium text-gray-900">Readiness</h5>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Synergistic</p>
              <p className="font-semibold text-lg">{formData.aggressivenessScale || 3}/5</p>
            </div>
            <div>
              <p className="text-gray-500">Financial</p>
              <p className="font-semibold text-lg">{formData.financialAggressivenessScale || 3}/5</p>
            </div>
            <div>
              <p className="text-gray-500">Organizational</p>
              <p className="font-semibold text-lg">{formData.organizationalCapacityScale || 3}/5</p>
            </div>
          </div>
        </div>
      </div>

      {formData.additionalContext && (
        <div className="space-y-4">
          <h5 className="font-medium text-gray-900">Notes for Coach</h5>
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{formData.additionalContext}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntakeFormWizard;
