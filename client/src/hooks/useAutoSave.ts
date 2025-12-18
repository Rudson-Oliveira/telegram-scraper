import { useEffect, useState, useCallback, useRef } from 'react';
import { trpc } from '@/lib/trpc';

interface AutoSaveState {
  lastSaved: Date | null;
  isSaving: boolean;
  error: string | null;
}

interface AutoSaveData {
  filters?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  uiState?: Record<string, unknown>;
}

export function useAutoSave(interval: number = 30000) {
  const [state, setState] = useState<AutoSaveState>({
    lastSaved: null,
    isSaving: false,
    error: null,
  });
  
  const dataRef = useRef<AutoSaveData>({});
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const autoSaveMutation = trpc.system.autoSave.useMutation({
    onSuccess: () => {
      setState(prev => ({
        ...prev,
        lastSaved: new Date(),
        isSaving: false,
        error: null,
      }));
    },
    onError: (err) => {
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: err.message || 'Erro ao salvar',
      }));
    },
  });

  const save = useCallback(async () => {
    if (state.isSaving) return;
    
    setState(prev => ({ ...prev, isSaving: true }));
    
    try {
      await autoSaveMutation.mutateAsync({
        data: JSON.stringify(dataRef.current),
        timestamp: Date.now(),
      });
    } catch {
      // Error handled by onError callback
    }
  }, [autoSaveMutation, state.isSaving]);

  const updateData = useCallback((newData: Partial<AutoSaveData>) => {
    dataRef.current = { ...dataRef.current, ...newData };
    
    // Debounce save
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }
    saveTimeout.current = setTimeout(save, 2000);
  }, [save]);

  // Auto-save interval
  useEffect(() => {
    const intervalId = setInterval(save, interval);
    return () => clearInterval(intervalId);
  }, [save, interval]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (Object.keys(dataRef.current).length > 0) {
        navigator.sendBeacon('/api/trpc/system.autoSave', JSON.stringify({
          data: JSON.stringify(dataRef.current),
          timestamp: Date.now(),
        }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const formatLastSaved = useCallback(() => {
    if (!state.lastSaved) return null;
    return state.lastSaved.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [state.lastSaved]);

  return {
    ...state,
    save,
    updateData,
    formatLastSaved,
  };
}

export default useAutoSave;
