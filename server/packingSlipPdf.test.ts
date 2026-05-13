import { describe, it, expect } from 'vitest';

describe('Packing Slip PDF Generation', () => {
  describe('PDF Module Import', () => {
    it('should export generatePackingSlipPdf function', async () => {
      const pdfModule = await import('./packingSlipPdf');
      expect(pdfModule.generatePackingSlipPdf).toBeDefined();
      expect(typeof pdfModule.generatePackingSlipPdf).toBe('function');
    });

    it('should export generateBatchPackingSlipsPdf function', async () => {
      const pdfModule = await import('./packingSlipPdf');
      expect(pdfModule.generateBatchPackingSlipsPdf).toBeDefined();
      expect(typeof pdfModule.generateBatchPackingSlipsPdf).toBe('function');
    });
  });

  describe('Router Procedures', () => {
    it('should have downloadPdf procedure in packingSlip router', async () => {
      const { appRouter } = await import('./routers');
      expect(appRouter.packingSlip.downloadPdf).toBeDefined();
    }, 30000);

    it('should have downloadBatchPdf procedure in packingSlip router', async () => {
      const { appRouter } = await import('./routers');
      expect(appRouter.packingSlip.downloadBatchPdf).toBeDefined();
    }, 30000);
  });

  describe('PDFKit Dependency', () => {
    it('should be able to import pdfkit', async () => {
      const PDFDocument = await import('pdfkit');
      expect(PDFDocument).toBeDefined();
    });
  });
});
