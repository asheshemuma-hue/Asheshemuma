import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationFooterProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const PaginationFooter: React.FC<PaginationFooterProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 text-xs text-slate-500">
      <div className="tabular-nums">
        Showing {startItem} to {endItem} of {totalItems} {totalItems === 1 ? 'entry' : 'entries'}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span
          aria-current="page"
          className="w-6 h-6 rounded-full bg-[#D93025] text-white text-xs font-semibold flex items-center justify-center tabular-nums shadow-2xs"
        >
          {currentPage}
        </span>

        {totalPages > 1 && currentPage < totalPages && (
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            className="w-6 h-6 rounded-full text-slate-600 hover:bg-slate-100 text-xs font-medium flex items-center justify-center tabular-nums transition-colors cursor-pointer"
          >
            {currentPage + 1}
          </button>
        )}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
