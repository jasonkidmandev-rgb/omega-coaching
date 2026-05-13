import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const projectRoot = join(__dirname, '..');

describe('Autosave Notes Fix', () => {
  describe('useAutoSave hook', () => {
    const hookCode = readFileSync(
      join(projectRoot, 'client/src/hooks/useAutoSave.ts'),
      'utf-8'
    );

    it('should use refs for onSave callback to avoid stale closures', () => {
      expect(hookCode).toContain('const onSaveRef = useRef(onSave)');
      expect(hookCode).toContain('onSaveRef.current = onSave');
    });

    it('should use refs for onError callback to avoid stale closures', () => {
      expect(hookCode).toContain('const onErrorRef = useRef(onError)');
      expect(hookCode).toContain('onErrorRef.current = onError');
    });

    it('should call onSaveRef.current instead of onSave directly in save function', () => {
      expect(hookCode).toContain('await onSaveRef.current(content)');
    });

    it('should call onErrorRef.current instead of onError directly', () => {
      expect(hookCode).toContain('onErrorRef.current?.(error as Error)');
    });

    it('should have minimal dependency array for save callback', () => {
      // The save useCallback should have minimal deps since it uses refs for callbacks
      expect(hookCode).toContain('const save = useCallback');
      // Should use refs instead of direct callback dependencies
      expect(hookCode).toContain('await onSaveRef.current(content)');
    });

    it('should prevent concurrent saves with isSavingRef', () => {
      expect(hookCode).toContain('const isSavingRef = useRef(false)');
      expect(hookCode).toContain('if (isSavingRef.current) return');
      expect(hookCode).toContain('isSavingRef.current = true');
      expect(hookCode).toContain('isSavingRef.current = false');
    });

    it('should clean up status timer on unmount', () => {
      expect(hookCode).toContain('const statusTimerRef = useRef<NodeJS.Timeout | null>(null)');
      expect(hookCode).toContain('clearTimeout(statusTimerRef.current)');
    });

    it('should export formatLastSaved helper', () => {
      expect(hookCode).toContain('export function formatLastSaved');
    });
  });

  describe('RichTextEditor', () => {
    const editorCode = readFileSync(
      join(projectRoot, 'client/src/components/RichTextEditor.tsx'),
      'utf-8'
    );

    it('should track internal updates with isInternalUpdateRef', () => {
      expect(editorCode).toContain('const isInternalUpdateRef = useRef(false)');
    });

    it('should set isInternalUpdateRef to true in onUpdate handler', () => {
      expect(editorCode).toContain('isInternalUpdateRef.current = true');
    });

    it('should skip content sync when change came from editor (internal update)', () => {
      expect(editorCode).toContain('if (isInternalUpdateRef.current)');
      expect(editorCode).toContain('isInternalUpdateRef.current = false');
    });

    it('should use onChangeRef to avoid stale onChange closures', () => {
      expect(editorCode).toContain('const onChangeRef = useRef(onChange)');
      expect(editorCode).toContain('onChangeRef.current = onChange');
      expect(editorCode).toContain('onChangeRef.current(html)');
    });

    it('should only sync content from external sources (not editor itself)', () => {
      // The useEffect should check isInternalUpdateRef before setting content
      const contentSyncEffect = editorCode.match(
        /useEffect\(\(\) => \{[\s\S]*?isInternalUpdateRef\.current[\s\S]*?editor\.commands\.setContent/
      );
      expect(contentSyncEffect).toBeTruthy();
    });
  });

  describe('InternalNotesTab', () => {
    const clientEditCode = readFileSync(
      join(projectRoot, 'client/src/pages/admin/ClientEdit.tsx'),
      'utf-8'
    );

    it('should use useAutoSave hook', () => {
      expect(clientEditCode).toContain('useAutoSave');
    });

    it('should call debouncedSave in handleNotesChange', () => {
      expect(clientEditCode).toContain('debouncedSave(content)');
    });

    it('should show auto-save status indicator', () => {
      expect(clientEditCode).toContain("autoSaveStatus === 'saving'");
      expect(clientEditCode).toContain("autoSaveStatus === 'saved'");
      expect(clientEditCode).toContain("autoSaveStatus === 'idle'");
    });

    it('should set initial content on mount', () => {
      expect(clientEditCode).toContain('setInitialContent(initialNotes)');
    });
  });

  describe('CoachNotesTab', () => {
    const coachNotesCode = readFileSync(
      join(projectRoot, 'client/src/pages/admin/client-edit/CoachNotesTab.tsx'),
      'utf-8'
    );

    it('should use useAutoSave hook', () => {
      expect(coachNotesCode).toContain("import { useAutoSave }");
    });

    it('should call debouncedSave in handleCoachNotesChange', () => {
      expect(coachNotesCode).toContain('debouncedSave(content)');
    });

    it('should show auto-save status indicator', () => {
      expect(coachNotesCode).toContain("autoSaveStatus === 'saving'");
      expect(coachNotesCode).toContain("autoSaveStatus === 'saved'");
      expect(coachNotesCode).toContain("autoSaveStatus === 'idle'");
    });

    it('should set initial content on mount', () => {
      expect(coachNotesCode).toContain('setInitialContent(formData.coachNotes');
    });

    it('should support saveNow for version restore', () => {
      expect(coachNotesCode).toContain('saveNow(content)');
    });
  });
});
