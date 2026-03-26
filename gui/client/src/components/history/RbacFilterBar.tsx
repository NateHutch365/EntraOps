import { useState } from 'react';
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
import type { RbacSystem } from '../../../../shared/types/api';

const RBAC_SYSTEMS: RbacSystem[] = [
  'EntraID',
  'ResourceApps',
  'IdentityGovernance',
  'DeviceManagement',
  'Defender',
];

interface RbacFilterBarProps {
  selected: RbacSystem[];
  onChange: (systems: RbacSystem[]) => void;
}

export function RbacFilterBar({ selected, onChange }: RbacFilterBarProps) {
  const [open, setOpen] = useState(false);

  function toggle(system: RbacSystem) {
    const next = selected.includes(system)
      ? selected.filter(s => s !== system)
      : [...selected, system];
    onChange(next);
  }

  function remove(system: RbacSystem) {
    onChange(selected.filter(s => s !== system));
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
            RBAC System
            <ChevronDown size={12} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search systems…" className="h-8 text-xs" />
            <CommandList>
              <CommandEmpty>No systems found</CommandEmpty>
              <CommandGroup>
                {RBAC_SYSTEMS.map(system => (
                  <CommandItem
                    key={system}
                    value={system}
                    onSelect={() => toggle(system)}
                    className="text-xs"
                  >
                    <Check
                      size={12}
                      className={cn('mr-2', selected.includes(system) ? 'opacity-100' : 'opacity-0')}
                    />
                    {system}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.map(system => (
        <Badge key={system} variant="secondary" className="gap-1 text-xs">
          {system}
          <button
            type="button"
            onClick={() => remove(system)}
            className="ml-0.5 rounded-sm hover:bg-muted focus:outline-none"
            aria-label={`Remove ${system} filter`}
          >
            <X size={10} />
          </button>
        </Badge>
      ))}
    </div>
  );
}
