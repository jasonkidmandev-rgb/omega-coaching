import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Check-in Coach Response Fix', () => {
  const checkinReviewPath = join(__dirname, '../client/src/pages/admin/CheckinReview.tsx');
  const checkinRouterPath = join(__dirname, './clientCorner/checkinRouter.ts');
  
  let checkinReviewContent: string;
  let checkinRouterContent: string;
  
  beforeAll(() => {
    checkinReviewContent = readFileSync(checkinReviewPath, 'utf-8');
    checkinRouterContent = readFileSync(checkinRouterPath, 'utf-8');
  });

  describe('CheckinReview.tsx - Frontend Fix', () => {
    it('should have addCoachResponseMutation defined', () => {
      expect(checkinReviewContent).toContain('addCoachResponseMutation');
      expect(checkinReviewContent).toContain('trpc.checkin.addCoachResponse.useMutation');
    });

    it('should call addCoachResponseMutation.mutateAsync in handleSubmitReview', () => {
      expect(checkinReviewContent).toContain('addCoachResponseMutation.mutateAsync');
    });

    it('should save coach response BEFORE marking as reviewed', () => {
      const addResponseIndex = checkinReviewContent.indexOf('addCoachResponseMutation.mutateAsync');
      const markReviewedIndex = checkinReviewContent.indexOf('markReviewedMutation.mutate');
      expect(addResponseIndex).toBeGreaterThan(-1);
      expect(markReviewedIndex).toBeGreaterThan(-1);
      expect(addResponseIndex).toBeLessThan(markReviewedIndex);
    });

    it('should pass checkinId, responseType, textContent, and mediaUrl to addCoachResponse', () => {
      // Check that the mutation call includes the required fields
      expect(checkinReviewContent).toContain('checkinId,');
      expect(checkinReviewContent).toContain('responseType,');
      expect(checkinReviewContent).toContain('textContent:');
      expect(checkinReviewContent).toContain('mediaUrl,');
    });

    it('should handle errors gracefully with try-catch', () => {
      // The handleSubmitReview should be wrapped in try-catch
      const handleSubmitStart = checkinReviewContent.indexOf('const handleSubmitReview');
      const handleSubmitEnd = checkinReviewContent.indexOf('};', checkinReviewContent.indexOf('Failed to submit review'));
      const handleSubmitBody = checkinReviewContent.substring(handleSubmitStart, handleSubmitEnd);
      expect(handleSubmitBody).toContain('try {');
      expect(handleSubmitBody).toContain('catch (error)');
      expect(handleSubmitBody).toContain('Failed to submit review');
    });

    it('should use Promise-based FileReader instead of callback-based', () => {
      // The old code used reader.onloadend callback which caused the response to not be saved
      // The new code should use a Promise wrapper
      expect(checkinReviewContent).toContain('new Promise<string>');
      expect(checkinReviewContent).not.toContain('reader.onloadend = async');
    });
  });

  describe('checkinRouter.ts - Backend Chat Integration', () => {
    it('should import protocolComments from schema', () => {
      expect(checkinRouterContent).toContain('protocolComments');
    });

    it('should post coach response to protocol comments (chat thread)', () => {
      // The addCoachResponse mutation should insert into protocolComments
      expect(checkinRouterContent).toContain('protocolComments');
      expect(checkinRouterContent).toContain('Check-In Review');
    });

    it('should look up the checkin record to get clientProtocolId', () => {
      expect(checkinRouterContent).toContain('checkins.clientProtocolId');
      expect(checkinRouterContent).toContain('checkins.weekNumber');
    });

    it('should set authorType to coach for the chat message', () => {
      expect(checkinRouterContent).toContain("authorType: 'coach'");
    });

    it('should not fail the whole operation if chat posting fails', () => {
      expect(checkinRouterContent).toContain('Failed to post coach response to chat');
      // The chat posting should be in a try-catch that doesn't re-throw
      expect(checkinRouterContent).toContain('catch (chatError)');
    });

    it('should include week number and date in the chat message', () => {
      expect(checkinRouterContent).toContain('weekNumber');
      expect(checkinRouterContent).toContain('dateStr');
    });

    it('should handle both text and media responses in chat message', () => {
      expect(checkinRouterContent).toContain('input.textContent');
      expect(checkinRouterContent).toContain('input.mediaUrl');
      expect(checkinRouterContent).toContain('Video response');
      expect(checkinRouterContent).toContain('Voice response');
    });
  });
});
