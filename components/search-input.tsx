'use client';

import { useEffect, useState, useRef } from 'react';
import { Input } from '@/components/ui/input';

interface SearchInputProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export function SearchInput({
  onSearch,
  placeholder = 'Search...',
  debounceMs = 300,
}: SearchInputProps) {
  const [value, setValue] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onSearchRef = useRef(onSearch);

  // Keep the onSearch ref up to date
  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onSearchRef.current(value);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, debounceMs]);

  return (
    <Input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      className="w-full"
    />
  );
}
