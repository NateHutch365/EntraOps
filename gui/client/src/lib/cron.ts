export const CRON_OPTIONS = {
  minute: [
    { value: '*', label: 'Every minute (*)' },
    { value: '0', label: '0' },
    { value: '5', label: '5' },
    { value: '10', label: '10' },
    { value: '15', label: '15' },
    { value: '20', label: '20' },
    { value: '30', label: '30' },
    { value: '45', label: '45' },
  ],
  hour: [
    { value: '*', label: 'Every hour (*)' },
    { value: '0', label: '0 (midnight)' },
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '5', label: '5' },
    { value: '6', label: '6' },
    { value: '7', label: '7' },
    { value: '8', label: '8' },
    { value: '9', label: '9' },
    { value: '10', label: '10' },
    { value: '11', label: '11' },
    { value: '12', label: '12 (noon)' },
    { value: '13', label: '13' },
    { value: '14', label: '14' },
    { value: '15', label: '15' },
    { value: '16', label: '16' },
    { value: '17', label: '17' },
    { value: '18', label: '18' },
    { value: '19', label: '19' },
    { value: '20', label: '20' },
    { value: '21', label: '21' },
    { value: '22', label: '22' },
    { value: '23', label: '23' },
  ],
  dom: [
    { value: '*', label: 'Every day (*)' },
    { value: '1', label: '1st' },
    { value: '15', label: '15th' },
    { value: '28', label: '28th' },
  ],
  month: [
    { value: '*', label: 'Every month (*)' },
    { value: '1', label: 'Jan' },
    { value: '2', label: 'Feb' },
    { value: '3', label: 'Mar' },
    { value: '4', label: 'Apr' },
    { value: '5', label: 'May' },
    { value: '6', label: 'Jun' },
    { value: '7', label: 'Jul' },
    { value: '8', label: 'Aug' },
    { value: '9', label: 'Sep' },
    { value: '10', label: 'Oct' },
    { value: '11', label: 'Nov' },
    { value: '12', label: 'Dec' },
  ],
  dow: [
    { value: '*', label: 'Every day (*)' },
    { value: '0', label: 'Sun' },
    { value: '1', label: 'Mon' },
    { value: '2', label: 'Tue' },
    { value: '3', label: 'Wed' },
    { value: '4', label: 'Thu' },
    { value: '5', label: 'Fri' },
    { value: '6', label: 'Sat' },
  ],
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function ordinal(n: number): string {
  if (n >= 11 && n <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export function describeCron(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;

  const [minute, hour, dom, month, dow] = parts;

  // Every minute
  if (minute === '*' && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return 'Every minute';
  }

  // Every hour at specific minute
  if (minute !== '*' && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return `Every hour at minute ${minute}`;
  }

  // Daily at specific time
  if (minute !== '*' && hour !== '*' && dom === '*' && month === '*' && dow === '*') {
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);
    return `Daily at ${h}:${m.toString().padStart(2, '0')}`;
  }

  // Weekly on specific day at specific time
  if (minute !== '*' && hour !== '*' && dom === '*' && month === '*' && dow !== '*') {
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);
    const dayName = DOW_NAMES[parseInt(dow, 10)] ?? `weekday ${dow}`;
    const timeStr = h === 0 && m === 0 ? 'midnight' : `${h}:${m.toString().padStart(2, '0')}`;
    return `Weekly on ${dayName} at ${timeStr}`;
  }

  // Monthly on specific day at specific time
  if (minute !== '*' && hour !== '*' && dom !== '*' && month === '*' && dow === '*') {
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);
    const d = parseInt(dom, 10);
    return `Monthly on the ${dom}${ordinal(d)} at ${h}:${m.toString().padStart(2, '0')}`;
  }

  // Yearly: specific month and day
  if (minute !== '*' && hour !== '*' && dom !== '*' && month !== '*' && dow === '*') {
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);
    const d = parseInt(dom, 10);
    const monthName = MONTH_NAMES[parseInt(month, 10) - 1] ?? `month ${month}`;
    return `Yearly in ${monthName} on the ${dom}${ordinal(d)} at ${h}:${m.toString().padStart(2, '0')}`;
  }

  // Fallback: describe non-wildcard fields
  const desc: string[] = [];
  if (minute !== '*') desc.push(`minute ${minute}`);
  if (hour !== '*') desc.push(`hour ${hour}`);
  if (dom !== '*') desc.push(`day ${dom}`);
  if (month !== '*') {
    const monthName = MONTH_NAMES[parseInt(month, 10) - 1];
    desc.push(monthName ? `in ${monthName}` : `month ${month}`);
  }
  if (dow !== '*') {
    const dayName = DOW_NAMES[parseInt(dow, 10)];
    desc.push(dayName ? `on ${dayName}` : `weekday ${dow}`);
  }
  return desc.length > 0 ? `At ${desc.join(', ')}` : cron;
}
