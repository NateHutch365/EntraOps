import { CRON_OPTIONS, describeCron } from '@/lib/cron';
import { cn } from '@/lib/utils';

interface CronPickerProps {
  value: string;
  onChange: (cron: string) => void;
  disabled?: boolean;
}

const SELECT_CLASS = cn(
  'h-9 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm',
  'transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
  'disabled:cursor-not-allowed disabled:opacity-50'
);

export function CronPicker({ value, onChange, disabled }: CronPickerProps) {
  const rawParts = (value ?? '* * * * *').trim().split(/\s+/);
  const minute = rawParts[0] ?? '*';
  const hour = rawParts[1] ?? '*';
  const dom = rawParts[2] ?? '*';
  const month = rawParts[3] ?? '*';
  const dow = rawParts[4] ?? '*';

  function handleChange(index: number, newVal: string) {
    const parts = [minute, hour, dom, month, dow];
    parts[index] = newVal;
    onChange(parts.join(' '));
  }

  const preview = describeCron(`${minute} ${hour} ${dom} ${month} ${dow}`);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Minute</span>
          <select
            className={SELECT_CLASS}
            value={minute}
            onChange={(e) => handleChange(0, e.target.value)}
            disabled={disabled}
            aria-label="Minute"
          >
            {CRON_OPTIONS.minute.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Hour</span>
          <select
            className={SELECT_CLASS}
            value={hour}
            onChange={(e) => handleChange(1, e.target.value)}
            disabled={disabled}
            aria-label="Hour"
          >
            {CRON_OPTIONS.hour.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Day of Month</span>
          <select
            className={SELECT_CLASS}
            value={dom}
            onChange={(e) => handleChange(2, e.target.value)}
            disabled={disabled}
            aria-label="Day of month"
          >
            {CRON_OPTIONS.dom.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Month</span>
          <select
            className={SELECT_CLASS}
            value={month}
            onChange={(e) => handleChange(3, e.target.value)}
            disabled={disabled}
            aria-label="Month"
          >
            {CRON_OPTIONS.month.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Day of Week</span>
          <select
            className={SELECT_CLASS}
            value={dow}
            onChange={(e) => handleChange(4, e.target.value)}
            disabled={disabled}
            aria-label="Day of week"
          >
            {CRON_OPTIONS.dow.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{preview}</p>
    </div>
  );
}
