import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface ChipEditorProps {
  actions: string[];
  onChange: (actions: string[]) => void;
  disabled?: boolean;
}

export function ChipEditor({ actions, onChange, disabled }: ChipEditorProps) {
  const [inputValue, setInputValue] = useState('');

  function handleAdd() {
    const trimmed = inputValue.trim();
    if (trimmed && !actions.includes(trimmed)) {
      onChange([...actions, trimmed]);
      setInputValue('');
    }
  }

  return (
    <div className="flex flex-wrap gap-1 items-start">
      {actions.map((action, i) => (
        <Badge
          key={i}
          variant="secondary"
          className="font-mono text-xs flex items-center gap-1 pr-1"
        >
          {action}
          {!disabled && (
            <button
              type="button"
              className="ml-1 rounded-full hover:bg-muted p-0.5"
              onClick={() => onChange(actions.filter((_, idx) => idx !== i))}
              aria-label={`Remove ${action}`}
            >
              <X size={12} />
            </button>
          )}
        </Badge>
      ))}
      {!disabled && (
        <div className="flex gap-2 mt-2 w-full">
          <Input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            placeholder="Add action (e.g. microsoft.directory/...)"
            className="font-mono text-xs h-8"
          />
          <Button type="button" size="sm" variant="outline" onClick={handleAdd}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
