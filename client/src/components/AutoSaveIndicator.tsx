import { Check, Loader2, AlertCircle } from 'lucide-react';
import { useAutoSave } from '@/hooks/useAutoSave';

export function AutoSaveIndicator() {
  const { lastSaved, isSaving, error, formatLastSaved } = useAutoSave(30000);
  
  if (error) {
    return (
      <div className="flex items-center gap-2 text-xs text-red-400">
        <AlertCircle className="h-3 w-3" />
        <span>Erro ao salvar</span>
      </div>
    );
  }
  
  if (isSaving) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Salvando...</span>
      </div>
    );
  }
  
  if (lastSaved) {
    return (
      <div className="flex items-center gap-2 text-xs text-green-400">
        <Check className="h-3 w-3" />
        <span>✔️ Salvo às {formatLastSaved()}</span>
      </div>
    );
  }
  
  return null;
}

export default AutoSaveIndicator;
