import PDFDocument from 'pdfkit';
import { getDb } from '../db';
import { checkins, checkinResponses, checkinCoachResponses, clientProtocols, users } from '../../drizzle/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

interface CheckinData {
  id: number;
  clientName: string;
  clientEmail: string;
  submittedAt: Date | null;
  overallScore: number | null;
  hasLowScore: boolean | null;
  weekNumber: number | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  responses: Array<{
    questionText: string;
    questionType: string;
    responseValue: string | null;
    numericValue: number | null;
  }>;
  coachResponse: {
    responseText: string | null;
    reviewedAt: Date | null;
    reviewedBy: string | null;
  } | null;
}

export async function generateCheckinPdf(
  checkinId: number
): Promise<Buffer> {
  const database = await getDb();
  if (!database) throw new Error('Database not available');

  // Get check-in data
  const [checkin] = await database
    .select()
    .from(checkins)
    .where(eq(checkins.id, checkinId));

  if (!checkin) throw new Error('Check-in not found');

  // Get client protocol
  const [protocol] = await database
    .select()
    .from(clientProtocols)
    .where(eq(clientProtocols.id, checkin.clientProtocolId));

  // Get responses
  const responses = await database
    .select()
    .from(checkinResponses)
    .where(eq(checkinResponses.checkinId, checkinId));

  // Get coach response
  const [coachResponse] = await database
    .select()
    .from(checkinCoachResponses)
    .where(eq(checkinCoachResponses.checkinId, checkinId));

  // Create PDF
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(24).fillColor('#1a365d').text('Weekly Check-In Report', { align: 'center' });
    doc.moveDown();

    // Client Info
    doc.fontSize(12).fillColor('#4a5568');
    doc.text(`Client: ${protocol?.clientName || 'Unknown'}`, { continued: true });
    doc.text(`   Email: ${protocol?.clientEmail || 'Unknown'}`);
    doc.moveDown(0.5);

    // Check-in Details
    doc.fontSize(10).fillColor('#718096');
    if (checkin.submittedAt) {
      doc.text(`Submitted: ${new Date(checkin.submittedAt).toLocaleDateString('en-US', { timeZone: 'America/Denver', 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      })}`);
    }
    if (checkin.weekNumber) {
      doc.text(`Week ${checkin.weekNumber}`);
    }
    if (checkin.periodStart && checkin.periodEnd) {
      doc.text(`Period: ${new Date(checkin.periodStart).toLocaleDateString('en-US', { timeZone: 'America/Denver' })} - ${new Date(checkin.periodEnd).toLocaleDateString('en-US', { timeZone: 'America/Denver' })}`);
    }
    doc.moveDown();

    // Overall Score
    if (checkin.overallScore !== null) {
      const scoreColor = checkin.overallScore >= 7 ? '#38a169' : checkin.overallScore >= 5 ? '#d69e2e' : '#e53e3e';
      doc.fontSize(16).fillColor(scoreColor);
      doc.text(`Overall Score: ${checkin.overallScore}/10`, { align: 'center' });
      doc.moveDown();
    }

    // Divider
    doc.strokeColor('#e2e8f0').lineWidth(1);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Responses
    doc.fontSize(14).fillColor('#2d3748').text('Responses', { underline: true });
    doc.moveDown(0.5);

    responses.forEach((response, index) => {
      doc.fontSize(11).fillColor('#4a5568');
      doc.text(`${index + 1}. ${response.questionText}`);
      
      doc.fontSize(10).fillColor('#1a202c');
      if (response.questionType === 'scale') {
        const score = response.scaleValue || 0;
        const scoreColor = score >= 7 ? '#38a169' : score >= 5 ? '#d69e2e' : '#e53e3e';
        doc.fillColor(scoreColor).text(`   Score: ${score}/10`);
      } else if (response.questionType === 'boolean') {
        doc.text(`   ${response.booleanValue ? '✓ Yes' : '✗ No'}`);
      } else {
        doc.text(`   ${response.textValue || 'No response'}`);
      }
      doc.moveDown(0.5);
    });

    // Coach Response
    if (coachResponse) {
      doc.moveDown();
      doc.strokeColor('#e2e8f0').lineWidth(1);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      doc.fontSize(14).fillColor('#2d3748').text('Coach Feedback', { underline: true });
      doc.moveDown(0.5);

      if (coachResponse.createdAt) {
        doc.fontSize(10).fillColor('#718096');
        doc.text(`Reviewed: ${new Date(coachResponse.createdAt).toLocaleDateString('en-US', { timeZone: 'America/Denver', 
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        })}`);
      }

      if (coachResponse.textContent) {
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#1a202c');
        doc.text(coachResponse.textContent);
      }

      if (coachResponse.responseType === 'voice' && coachResponse.mediaUrl) {
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#3182ce');
        doc.text('🎤 Voice note attached (see online portal)');
      }

      if (coachResponse.responseType === 'video' && coachResponse.mediaUrl) {
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#3182ce');
        doc.text('🎬 Video response attached (see online portal)');
      }
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#a0aec0');
    doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { timeZone: 'America/Denver', 
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    })}`, { align: 'center' });
    doc.text('Omega Longevity - Health Coach Protocol Manager', { align: 'center' });

    doc.end();
  });
}

export async function generateCheckinHistoryPdf(
  clientProtocolId: number,
  startDate?: Date,
  endDate?: Date
): Promise<Buffer> {
  const database = await getDb();
  if (!database) throw new Error('Database not available');

  // Get client protocol
  const [protocol] = await database
    .select()
    .from(clientProtocols)
    .where(eq(clientProtocols.id, clientProtocolId));

  if (!protocol) throw new Error('Client protocol not found');

  // Build query conditions
  const conditions = [eq(checkins.clientProtocolId, clientProtocolId), eq(checkins.status, 'submitted')];
  if (startDate) conditions.push(gte(checkins.submittedAt, startDate));
  if (endDate) conditions.push(lte(checkins.submittedAt, endDate));

  // Get all check-ins
  const allCheckins = await database
    .select()
    .from(checkins)
    .where(and(...conditions))
    .orderBy(desc(checkins.submittedAt));

  // Create PDF
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(24).fillColor('#1a365d').text('Check-In History Report', { align: 'center' });
    doc.moveDown();

    // Client Info
    doc.fontSize(14).fillColor('#2d3748');
    doc.text(`Client: ${protocol.clientName || 'Unknown'}`);
    doc.fontSize(10).fillColor('#718096');
    doc.text(`Email: ${protocol.clientEmail || 'Unknown'}`);
    if (startDate || endDate) {
      doc.text(`Period: ${startDate ? startDate.toLocaleDateString('en-US', { timeZone: 'America/Denver' }) : 'Beginning'} - ${endDate ? endDate.toLocaleDateString('en-US', { timeZone: 'America/Denver' }) : 'Present'}`);
    }
    doc.text(`Total Check-ins: ${allCheckins.length}`);
    doc.moveDown();

    // Summary Stats
    if (allCheckins.length > 0) {
      const scores = allCheckins.filter(c => c.overallScore !== null).map(c => c.overallScore!);
      const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 'N/A';
      const lowScoreCount = allCheckins.filter(c => c.hasLowScore).length;

      doc.fontSize(12).fillColor('#2d3748').text('Summary', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#4a5568');
      doc.text(`Average Score: ${avgScore}/10`);
      doc.text(`Check-ins with Low Scores (≤5): ${lowScoreCount}`);
      doc.moveDown();
    }

    // Divider
    doc.strokeColor('#e2e8f0').lineWidth(1);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Check-in List
    doc.fontSize(12).fillColor('#2d3748').text('Check-in Details', { underline: true });
    doc.moveDown(0.5);

    allCheckins.forEach((checkin, index) => {
      // Check if we need a new page
      if (doc.y > 700) {
        doc.addPage();
      }

      const scoreColor = (checkin.overallScore || 0) >= 7 ? '#38a169' : (checkin.overallScore || 0) >= 5 ? '#d69e2e' : '#e53e3e';

      doc.fontSize(11).fillColor('#1a202c');
      doc.text(`Week ${checkin.weekNumber || index + 1}`, { continued: true });
      doc.fillColor('#718096').text(` - ${checkin.submittedAt ? new Date(checkin.submittedAt).toLocaleDateString('en-US', { timeZone: 'America/Denver' }) : 'Not submitted'}`, { continued: true });
      doc.fillColor(scoreColor).text(`   Score: ${checkin.overallScore !== null ? checkin.overallScore + '/10' : 'N/A'}`);
      
      if (checkin.hasLowScore) {
        doc.fontSize(9).fillColor('#e53e3e').text('   ⚠ Low score flagged');
      }
      
      doc.moveDown(0.3);
    });

    // Trend Analysis
    if (allCheckins.length >= 4) {
      doc.addPage();
      doc.fontSize(14).fillColor('#2d3748').text('Trend Analysis', { underline: true });
      doc.moveDown();

      const recentScores = allCheckins.slice(0, 4).filter(c => c.overallScore !== null).map(c => c.overallScore!);
      const olderScores = allCheckins.slice(4, 8).filter(c => c.overallScore !== null).map(c => c.overallScore!);

      if (recentScores.length > 0 && olderScores.length > 0) {
        const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
        const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
        const trend = recentAvg - olderAvg;

        doc.fontSize(10).fillColor('#4a5568');
        doc.text(`Recent 4 weeks average: ${recentAvg.toFixed(1)}/10`);
        doc.text(`Previous 4 weeks average: ${olderAvg.toFixed(1)}/10`);
        
        const trendColor = trend > 0 ? '#38a169' : trend < 0 ? '#e53e3e' : '#718096';
        const trendText = trend > 0 ? `↑ Improving (+${trend.toFixed(1)})` : trend < 0 ? `↓ Declining (${trend.toFixed(1)})` : '→ Stable';
        doc.fillColor(trendColor).text(`Trend: ${trendText}`);
      }
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#a0aec0');
    doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { timeZone: 'America/Denver', 
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    })}`, { align: 'center' });
    doc.text('Omega Longevity - Health Coach Protocol Manager', { align: 'center' });

    doc.end();
  });
}
