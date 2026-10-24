import React from 'react';
import { cn } from '@/utils/cn';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {}

export const Table: React.FC<TableProps> = ({ className, ...props }) => (
  <div className="w-full overflow-x-auto rounded-lg border border-cinema-border">
    <table
      className={cn('w-full text-left text-sm text-slate-300 border-collapse', className)}
      {...props}
    />
  </div>
);

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  ...props
}) => (
  <thead
    className={cn('bg-slate-900/90 text-xs uppercase font-semibold text-slate-400 border-b border-cinema-border', className)}
    {...props}
  />
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  ...props
}) => (
  <tbody
    className={cn('divide-y divide-cinema-border bg-cinema-card/50', className)}
    {...props}
  />
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className,
  ...props
}) => (
  <tr
    className={cn(
      'transition-colors hover:bg-slate-800/40 focus:bg-slate-800/60',
      className
    )}
    {...props}
  />
);

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  ...props
}) => (
  <th
    className={cn('px-4 py-3.5 font-medium tracking-wider text-slate-300 whitespace-nowrap', className)}
    {...props}
  />
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  ...props
}) => (
  <td className={cn('px-4 py-3.5 whitespace-nowrap', className)} {...props} />
);
