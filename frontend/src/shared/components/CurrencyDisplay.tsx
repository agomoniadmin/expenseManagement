import clsx from 'clsx';

interface CurrencyDisplayProps {
  amount: number;
  currency?: string;
  className?: string;
  colorize?: boolean;
}

export function CurrencyDisplay({ amount, currency, className, colorize }: CurrencyDisplayProps) {
  const code = currency && currency.trim().length === 3 ? currency : 'USD';
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
  }).format(amount);

  return (
    <span
      className={clsx(
        className,
        colorize && amount > 0 && 'text-green-600',
        colorize && amount < 0 && 'text-red-600',
      )}
    >
      {formatted}
    </span>
  );
}
