import React from 'react';
import { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface MetricCardProps {
  title: string;
  value: number | string | null;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  formatValue?: (value: number) => string;
  className?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  formatValue,
  className,
  color = 'blue',
}) => {
  const colorClasses = {
    blue: {
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      border: 'border-blue-200',
    },
    green: {
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      border: 'border-green-200',
    },
    purple: {
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      border: 'border-purple-200',
    },
    orange: {
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      border: 'border-orange-200',
    },
    red: {
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      border: 'border-red-200',
    },
    gray: {
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
      border: 'border-gray-200',
    },
  };

  const colors = colorClasses[color];

  const displayValue = value === null || value === undefined
    ? 'N/A'
    : typeof value === 'number'
    ? formatValue
      ? formatValue(value)
      : value.toFixed(2)
    : value;

  return (
    <div
      className={clsx(
        'card border-2 hover:shadow-lg transition-shadow',
        colors.border,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className={clsx('p-2 rounded-lg', colors.iconBg)}>
              <Icon className={clsx('w-5 h-5', colors.iconColor)} />
            </div>
            <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          </div>
          <div className="ml-14">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {displayValue}
              </span>
              {trend && (
                <span
                  className={clsx(
                    'text-sm font-medium',
                    trend.isPositive ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {trend.isPositive ? '+' : ''}
                  {trend.value.toFixed(1)}%
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

