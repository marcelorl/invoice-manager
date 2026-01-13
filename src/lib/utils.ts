import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parse } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '$0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(isNaN(num) ? 0 : num);
}

export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? 0 : num;
}

export function formatDate(date: string | Date): string {
  try {
    // If string, parse as local date (YYYY-MM-DD format)
    if (typeof date === 'string') {
      // Handle ISO timestamps (with T or Z)
      if (date.includes('T') || date.includes('Z')) {
        const parsed = new Date(date);
        if (isNaN(parsed.getTime())) return 'Invalid Date';
        return format(parsed, 'MMM dd, yyyy');
      }
      // Handle YYYY-MM-DD format
      const parsed = parse(date, 'yyyy-MM-dd', new Date());
      if (isNaN(parsed.getTime())) return 'Invalid Date';
      return format(parsed, 'MMM dd, yyyy');
    }
    // If Date object, format it
    if (isNaN(date.getTime())) return 'Invalid Date';
    return format(date, 'MMM dd, yyyy');
  } catch (error) {
    console.error('Error formatting date:', date, error);
    return 'Invalid Date';
  }
}

export function formatDateForInput(date: string | Date): string {
  // If already a string in YYYY-MM-DD format, return as-is
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  // If string, parse as local date first
  const d = typeof date === 'string' ? parse(date, 'yyyy-MM-dd', new Date()) : date;

  // Format as YYYY-MM-DD using local date components
  return format(d, 'yyyy-MM-dd');
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'paid':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'pending':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'overdue':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'sent':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function generateInvoiceNumber(): string {
  const prefix = 'INV';
  const number = Math.floor(Math.random() * 10000).toString().padStart(2, '0');
  return `${prefix}-${number}`;
}

export function isFriday(): boolean {
  return new Date().getDay() === 5;
}

export function getNextFriday(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
  const nextFriday = new Date(today);
  nextFriday.setDate(today.getDate() + daysUntilFriday);
  return nextFriday;
}

export function getLastDayOfMonth(): Date {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth() + 1, 0);
}

export function isLastDayOfMonth(): boolean {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return today.getDate() === lastDay.getDate();
}

export function getDaysUntilDue(dueDate: string): number {
  // Parse due date as local date
  const due = parse(dueDate, 'yyyy-MM-dd', new Date());
  const today = new Date();
  // Set both to midnight for accurate day comparison
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
