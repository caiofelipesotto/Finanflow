import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { getMonthName } from '../utils/formatters';

interface MonthSelectorProps {
  selectedYear: number;
  selectedMonth: number; // 0-indexed (0 = Jan, 11 = Dec)
  onChangeMonth: (year: number, month: number) => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  selectedYear,
  selectedMonth,
  onChangeMonth,
}) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const isCurrentMonth = selectedYear === currentYear && selectedMonth === currentMonth;

  const handlePrev = () => {
    if (selectedMonth === 0) {
      onChangeMonth(selectedYear - 1, 11);
    } else {
      onChangeMonth(selectedYear, selectedMonth - 1);
    }
  };

  const handleNext = () => {
    if (selectedMonth === 11) {
      onChangeMonth(selectedYear + 1, 0);
    } else {
      onChangeMonth(selectedYear, selectedMonth + 1);
    }
  };

  const handleCurrent = () => {
    onChangeMonth(currentYear, currentMonth);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="ui-panel flex items-center p-0.5">
        <button
          onClick={handlePrev}
          title="Mês Anterior"
          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 px-3 py-1 text-sm font-semibold text-neutral-900 min-w-[150px] justify-center select-none">
          <Calendar className="w-4 h-4 text-neutral-400" />
          <span>
            {getMonthName(selectedMonth)} {selectedYear}
          </span>
        </div>

        <button
          onClick={handleNext}
          title="Próximo Mês"
          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {!isCurrentMonth && (
        <button
          onClick={handleCurrent}
          className="px-2.5 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 rounded-md transition-colors whitespace-nowrap"
        >
          Ir para Mês Atual
        </button>
      )}
    </div>
  );
};
