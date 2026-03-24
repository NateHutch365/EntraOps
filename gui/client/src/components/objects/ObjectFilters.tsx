import { useState } from 'react';
import type React from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Static option lists — values must match server filter expectations
const STATIC_OPTIONS = {
  tier: ['ControlPlane', 'ManagementPlane', 'UserAccess', 'Unclassified'],
  rbac: ['EntraID', 'ResourceApps', 'IdentityGovernance', 'DeviceManagement', 'Defender'],
  pim: ['Permanent', 'Eligible', 'NoAssignment'],
  onprem: ['true', 'false'],
} as const;

const FILTER_LABELS = {
  tier: 'Tier',
  rbac: 'RBAC System',
  type: 'Object Type',
  pim: 'PIM Type',
  onprem: 'On-Prem Sync',
} as const;

type FilterKey = keyof typeof FILTER_LABELS;

// Human-readable display for onprem values
function onpremLabel(value: string): string {
  if (value === 'true') return 'On-Prem';
  if (value === 'false') return 'Cloud Only';
  return value;
}

export interface ObjectFiltersProps {
  q: string;
  tier: string[];
  rbac: string[];
  type: string[];
  pim: string[];
  onprem: string;
  availableTypes: string[];
  onQChange: (v: string) => void;
  onTierChange: (v: string[]) => void;
  onRbacChange: (v: string[]) => void;
  onTypeChange: (v: string[]) => void;
  onPimChange: (v: string[]) => void;
  onOnpremChange: (v: string) => void;
}

// ----------------------------------------------------------------
// Internal: multi-select popover (Popover + Command pattern)
// ----------------------------------------------------------------
function MultiSelectPopover({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: string[];
  selected: string[];
  onSelect: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  function toggle(value: string) {
    const next = selected.includes(value)
      ? selected.filter(s => s !== value)
      : [...selected, value];
    onSelect(next);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-9 text-sm font-normal',
            selected.length > 0 && 'border-fluent-accent text-fluent-accent'
          )}
        >
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-xs">
              {selected.length}
            </Badge>
          )}
          <ChevronDown size={14} className="ml-1.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${label}...`} />
          <CommandList>
            <CommandEmpty>No options found</CommandEmpty>
            <CommandGroup>
              {options.map(opt => (
                <CommandItem key={opt} value={opt} onSelect={() => toggle(opt)}>
                  <Check
                    size={14}
                    className={cn('mr-2', selected.includes(opt) ? 'opacity-100' : 'opacity-0')}
                  />
                  {opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ----------------------------------------------------------------
// Exported: ObjectFilters
// ----------------------------------------------------------------
export function ObjectFilters({
  q,
  tier,
  rbac,
  type,
  pim,
  onprem,
  availableTypes,
  onQChange,
  onTierChange,
  onRbacChange,
  onTypeChange,
  onPimChange,
  onOnpremChange,
}: ObjectFiltersProps) {
  // Flatten all active filter values for chip display
  const activeChips: Array<{ filter: FilterKey; value: string; displayValue: string }> = [
    ...tier.map(v => ({ filter: 'tier' as FilterKey, value: v, displayValue: v })),
    ...rbac.map(v => ({ filter: 'rbac' as FilterKey, value: v, displayValue: v })),
    ...type.map(v => ({ filter: 'type' as FilterKey, value: v, displayValue: v })),
    ...pim.map(v => ({ filter: 'pim' as FilterKey, value: v, displayValue: v })),
    ...(onprem ? [{ filter: 'onprem' as FilterKey, value: onprem, displayValue: onpremLabel(onprem) }] : []),
  ];

  function removeChip(filter: FilterKey, value: string) {
    if (filter === 'tier') onTierChange(tier.filter(v => v !== value));
    else if (filter === 'rbac') onRbacChange(rbac.filter(v => v !== value));
    else if (filter === 'type') onTypeChange(type.filter(v => v !== value));
    else if (filter === 'pim') onPimChange(pim.filter(v => v !== value));
    else if (filter === 'onprem') onOnpremChange('');
  }

  return (
    <div className="space-y-3">
      {/* Filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Search objects..."
          value={q}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onQChange(e.target.value)}
          className="w-64 h-9"
        />
        <MultiSelectPopover
          label={FILTER_LABELS.tier}
          options={STATIC_OPTIONS.tier as unknown as string[]}
          selected={tier}
          onSelect={onTierChange}
        />
        <MultiSelectPopover
          label={FILTER_LABELS.rbac}
          options={STATIC_OPTIONS.rbac as unknown as string[]}
          selected={rbac}
          onSelect={onRbacChange}
        />
        <MultiSelectPopover
          label={FILTER_LABELS.type}
          options={availableTypes}
          selected={type}
          onSelect={onTypeChange}
        />
        <MultiSelectPopover
          label={FILTER_LABELS.pim}
          options={STATIC_OPTIONS.pim as unknown as string[]}
          selected={pim}
          onSelect={onPimChange}
        />
        {/* On-Prem Sync: single-select toggle (mutually exclusive: on-prem OR cloud-only) */}
        <MultiSelectPopover
          label={FILTER_LABELS.onprem}
          options={STATIC_OPTIONS.onprem as unknown as string[]}
          selected={onprem ? [onprem] : []}
          onSelect={vals => onOnpremChange(vals[vals.length - 1] ?? '')}
        />
      </div>

      {/* Active filter chips — accent-outlined, dismissible (UI-SPEC: border-fluent-accent) */}
      {activeChips.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {activeChips.map(({ filter, value, displayValue }) => (
            <Badge
              key={`${filter}:${value}`}
              variant="outline"
              className="border-fluent-accent text-fluent-accent text-xs cursor-default"
            >
              <span className="mr-1 text-muted-foreground">{FILTER_LABELS[filter]}:</span>
              {displayValue}
              <button
                className="ml-1.5 hover:text-destructive transition-colors"
                onClick={() => removeChip(filter, value)}
                aria-label={`Remove ${displayValue} filter`}
              >
                <X size={12} />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
