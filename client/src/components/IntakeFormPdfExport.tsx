import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface IntakeFormPdfExportProps {
  enrollmentId: number;
  variant?: "button" | "icon";
  className?: string;
}

export function IntakeFormPdfExport({ enrollmentId, variant = "button", className }: IntakeFormPdfExportProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { data: pdfData, refetch } = trpc.transformation.exportIntakeFormPdf.useQuery(
    { enrollmentId },
    { enabled: false }
  );
  
  const generatePdf = async () => {
    setIsGenerating(true);
    try {
      const result = await refetch();
      if (!result.data) {
        toast.error("Failed to load intake form data");
        return;
      }
      
      const data = result.data;
      
      // Generate HTML content for PDF
      const htmlContent = generateHtmlContent(data);
      
      // Create a new window and print to PDF
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error("Please allow popups to download the PDF");
        return;
      }
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.print();
      };
      
      toast.success("PDF generated - use your browser's print dialog to save");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  };
  
  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={generatePdf}
        disabled={isGenerating}
        className={className}
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </Button>
    );
  }
  
  return (
    <Button
      variant="outline"
      onClick={generatePdf}
      disabled={isGenerating}
      className={className}
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </>
      )}
    </Button>
  );
}

function generateHtmlContent(data: any): string {
  const { enrollment, formData, signatures, submittedAt } = data;
  
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  const formatValue = (value: any) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'N/A';
    return String(value);
  };
  
  const renderSignature = (sectionKey: string) => {
    const sig = signatures[sectionKey];
    if (!sig) return '';
    
    if (sig.type === 'typed') {
      return `<div class="signature typed">${sig.data.replace('typed:', '')}</div>
              <div class="signature-date">Signed: ${formatDate(sig.signedAt)}</div>`;
    } else if (sig.data.startsWith('data:image')) {
      return `<div class="signature drawn"><img src="${sig.data}" alt="Signature" /></div>
              <div class="signature-date">Signed: ${formatDate(sig.signedAt)}</div>`;
    }
    return '';
  };
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Intake Form - ${formData.fullName || 'Client'}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #d97706;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #d97706;
      margin: 0;
      font-size: 28px;
    }
    .header .subtitle {
      color: #666;
      margin-top: 5px;
    }
    .meta-info {
      background: #f9fafb;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 30px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .meta-info div {
      font-size: 14px;
    }
    .meta-info strong {
      color: #374151;
    }
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .section-title {
      background: #d97706;
      color: white;
      padding: 10px 15px;
      font-size: 16px;
      font-weight: 600;
      border-radius: 6px 6px 0 0;
      margin: 0;
    }
    .section-content {
      border: 1px solid #e5e7eb;
      border-top: none;
      padding: 20px;
      border-radius: 0 0 6px 6px;
    }
    .field {
      margin-bottom: 12px;
    }
    .field-label {
      font-weight: 600;
      color: #374151;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .field-value {
      color: #1f2937;
      margin-top: 2px;
    }
    .field-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    .signature {
      margin-top: 10px;
      padding: 15px;
      border: 1px dashed #d1d5db;
      border-radius: 6px;
      background: #fafafa;
    }
    .signature.typed {
      font-family: 'Brush Script MT', cursive;
      font-size: 24px;
      color: #1e40af;
    }
    .signature.drawn img {
      max-width: 300px;
      max-height: 100px;
    }
    .signature-date {
      font-size: 12px;
      color: #6b7280;
      margin-top: 5px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    @page {
      margin: 0.5in;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Omega Longevity</h1>
    <div class="subtitle">Client Intake Form</div>
  </div>
  
  <div class="meta-info">
    <div><strong>Client Name:</strong> ${formatValue(formData.fullName)}</div>
    <div><strong>Email:</strong> ${formatValue(formData.email)}</div>
    <div><strong>Program Tier:</strong> ${formatValue(enrollment.tier)}</div>
    <div><strong>Submitted:</strong> ${formatDate(submittedAt)}</div>
  </div>
  
  <div class="section">
    <h2 class="section-title">Personal Information</h2>
    <div class="section-content">
      <div class="field-grid">
        <div class="field">
          <div class="field-label">Full Name</div>
          <div class="field-value">${formatValue(formData.fullName)}</div>
        </div>
        <div class="field">
          <div class="field-label">Date of Birth</div>
          <div class="field-value">${formatValue(formData.dateOfBirth)}</div>
        </div>
        <div class="field">
          <div class="field-label">Sex</div>
          <div class="field-value">${formatValue(formData.sex)}</div>
        </div>
        <div class="field">
          <div class="field-label">Phone</div>
          <div class="field-value">${formatValue(formData.phone)}</div>
        </div>
      </div>
      <div class="field">
        <div class="field-label">Address</div>
        <div class="field-value">
          ${formatValue(formData.address?.street)}<br>
          ${formatValue(formData.address?.city)}, ${formatValue(formData.address?.state)} ${formatValue(formData.address?.zip)}<br>
          ${formatValue(formData.address?.country)}
        </div>
      </div>
    </div>
  </div>
  
  <div class="section">
    <h2 class="section-title">Physical Measurements</h2>
    <div class="section-content">
      <div class="field-grid">
        <div class="field">
          <div class="field-label">Height</div>
          <div class="field-value">${formatValue(formData.height)}</div>
        </div>
        <div class="field">
          <div class="field-label">Current Weight</div>
          <div class="field-value">${formatValue(formData.currentWeight)}</div>
        </div>
        <div class="field">
          <div class="field-label">Goal Weight</div>
          <div class="field-value">${formatValue(formData.goalWeight)}</div>
        </div>
        <div class="field">
          <div class="field-label">Body Fat %</div>
          <div class="field-value">${formatValue(formData.bodyFatPercentage)}</div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="section">
    <h2 class="section-title">Goals & Experience</h2>
    <div class="section-content">
      <div class="field">
        <div class="field-label">Peptide Goals</div>
        <div class="field-value">${formatValue(formData.peptideGoals)}</div>
      </div>
      <div class="field-grid">
        <div class="field">
          <div class="field-label">Primary Goal</div>
          <div class="field-value">${formatValue(formData.primaryGoal)}</div>
        </div>
        <div class="field">
          <div class="field-label">Secondary Goal</div>
          <div class="field-value">${formatValue(formData.secondaryGoal)}</div>
        </div>
      </div>
      <div class="field">
        <div class="field-label">Additional Goals</div>
        <div class="field-value">${formatValue(formData.additionalGoals)}</div>
      </div>
      <div class="field">
        <div class="field-label">Previous Peptide Experience</div>
        <div class="field-value">${formatValue(formData.previousPeptideExperience)}</div>
      </div>
    </div>
  </div>
  
  <div class="section">
    <h2 class="section-title">Health Information</h2>
    <div class="section-content">
      <div class="field">
        <div class="field-label">Medical Issues</div>
        <div class="field-value">${formatValue(formData.medicalIssues)}</div>
      </div>
      <div class="field">
        <div class="field-label">Current Medications</div>
        <div class="field-value">${formatValue(formData.currentMedications)}</div>
      </div>
      <div class="field">
        <div class="field-label">Current Supplements</div>
        <div class="field-value">${formatValue(formData.currentSupplements)}</div>
      </div>
      <div class="field">
        <div class="field-label">Food Intolerances</div>
        <div class="field-value">${formatValue(formData.foodIntolerances)}</div>
      </div>
      <div class="field">
        <div class="field-label">Digestive Issues</div>
        <div class="field-value">${formatValue(formData.digestiveIssues)}</div>
      </div>
      <div class="field">
        <div class="field-label">Physical Activity Routine</div>
        <div class="field-value">${formatValue(formData.physicalActivityRoutine)}</div>
      </div>
      <div class="field">
        <div class="field-label">Physical Limitations</div>
        <div class="field-value">${formatValue(formData.physicalLimitations)}</div>
      </div>
      <div class="field">
        <div class="field-label">Hormonal Status</div>
        <div class="field-value">${formatValue(formData.hormonalStatus)}</div>
      </div>
    </div>
  </div>
  
  <div class="section">
    <h2 class="section-title">Lifestyle</h2>
    <div class="section-content">
      <div class="field-grid">
        <div class="field">
          <div class="field-label">Alcohol Use</div>
          <div class="field-value">${formatValue(formData.alcoholUse)}</div>
        </div>
        <div class="field">
          <div class="field-label">Nicotine Use</div>
          <div class="field-value">${formatValue(formData.nicotineUse)}</div>
        </div>
        <div class="field">
          <div class="field-label">Cannabis Use</div>
          <div class="field-value">${formatValue(formData.cannabisUse)}</div>
        </div>
        <div class="field">
          <div class="field-label">Sleep Duration</div>
          <div class="field-value">${formatValue(formData.sleepDuration)}</div>
        </div>
        <div class="field">
          <div class="field-label">Sleep Quality</div>
          <div class="field-value">${formatValue(formData.sleepQuality)}</div>
        </div>
        <div class="field">
          <div class="field-label">Stress Level</div>
          <div class="field-value">${formatValue(formData.stressLevel)}</div>
        </div>
      </div>
      <div class="field">
        <div class="field-label">Main Stressors</div>
        <div class="field-value">${formatValue(formData.mainStressors)}</div>
      </div>
      <div class="field">
        <div class="field-label">Wearable Devices</div>
        <div class="field-value">${formatValue(formData.wearableDevices)}</div>
      </div>
    </div>
  </div>
  
  <div class="section">
    <h2 class="section-title">Emergency Contact</h2>
    <div class="section-content">
      <div class="field-grid">
        <div class="field">
          <div class="field-label">Name</div>
          <div class="field-value">${formatValue(formData.emergencyContactName || formData.emergencyContact?.name)}</div>
        </div>
        <div class="field">
          <div class="field-label">Relationship</div>
          <div class="field-value">${formatValue(formData.emergencyContactRelationship || formData.emergencyContact?.relationship)}</div>
        </div>
        <div class="field">
          <div class="field-label">Phone</div>
          <div class="field-value">${formatValue(formData.emergencyContactPhone || formData.emergencyContact?.phone)}</div>
        </div>
      </div>
    </div>
  </div>
  
  ${formData.additionalContext ? `
  <div class="section">
    <h2 class="section-title">Notes for Coach</h2>
    <div class="section-content">
      <div class="field">
        <div class="field-value" style="white-space: pre-wrap;">${formatValue(formData.additionalContext)}</div>
      </div>
    </div>
  </div>
  ` : ''}
  
  <div class="section">
    <h2 class="section-title">Signatures</h2>
    <div class="section-content">
      ${Object.keys(signatures).length > 0 ? 
        Object.entries(signatures).map(([key, sig]: [string, any]) => `
          <div class="field">
            <div class="field-label">${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
            ${renderSignature(key)}
          </div>
        `).join('') : 
        '<p>No signatures recorded.</p>'
      }
    </div>
  </div>
  
  <div class="footer">
    <p>This document was generated from the Omega Longevity client intake system.</p>
    <p>Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
  </div>
</body>
</html>
  `;
}
