import React, { useState, useEffect } from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const DatePicker = ({ value, onChange, placeholder = "DD/MM/YYYY", className, ...props }) => {
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (value) {
      // Handle value in various formats (YYYY-MM-DD, DD/MM/YYYY, or Date object)
      if (value instanceof Date) {
        setSelectedDate(value);
      } else if (typeof value === 'string') {
        // Try to parse as YYYY-MM-DD first
        if (value.includes('-') && value.split('-').length === 3) {
          const [year, month, day] = value.split('-');
          setSelectedDate(new Date(year, month - 1, day));
        } else if (value.includes('-')) {
          // Try to parse as dd-mm-yyyy
          const [day, month, year] = value.split('-');
          setSelectedDate(new Date(year, month - 1, day));
        } else if (value.includes('/')) {
          // Try to parse as dd/mm/yyyy (legacy support)
          const [day, month, year] = value.split('/');
          setSelectedDate(new Date(year, month - 1, day));
        }
      }
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  const handleChange = (date) => {
    setSelectedDate(date);
    if (onChange) {
      // Convert to YYYY-MM-DD format for backend
      if (date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        onChange(`${year}-${month}-${day}`);
      } else {
        onChange('');
      }
    }
  };

  return (
    <div className="relative">
      <ReactDatePicker
        selected={selectedDate}
        onChange={handleChange}
        dateFormat="dd/MM/yyyy"
        placeholderText={placeholder}
        className={cn(
          "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        calendarClassName="bg-white border border-slate-200 rounded-lg shadow-lg"
        {...props}
      />
    </div>
  );
};

const DateTimePicker = ({ value, onChange, placeholder = "DD/MM/YYYY HH:mm", className, ...props }) => {
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (value) {
      // Handle value in various formats (ISO datetime, or Date object)
      if (value instanceof Date) {
        setSelectedDate(value);
      } else if (typeof value === 'string') {
        // Try to parse as ISO datetime (YYYY-MM-DDTHH:mm:ss.sssZ)
        if (value.includes('T') || value.includes('-')) {
          const parsedDate = new Date(value);
          if (!isNaN(parsedDate.getTime())) {
            setSelectedDate(parsedDate);
          }
        }
      }
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  const handleChange = (date) => {
    setSelectedDate(date);
    if (onChange) {
      // Convert to ISO datetime format for backend
      if (date) {
        onChange(date.toISOString());
      } else {
        onChange('');
      }
    }
  };

  return (
    <div className="relative">
      <ReactDatePicker
        selected={selectedDate}
        onChange={handleChange}
        dateFormat="dd/MM/yyyy HH:mm"
        placeholderText={placeholder}
        showTimeSelect
        timeFormat="HH:mm"
        timeIntervals={15}
        className={cn(
          "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        calendarClassName="bg-white border border-slate-200 rounded-lg shadow-lg"
        {...props}
      />
    </div>
  );
};

export { DatePicker, DateTimePicker };
export default DatePicker;
