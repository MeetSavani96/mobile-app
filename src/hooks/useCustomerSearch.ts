import { useState, useEffect, useCallback, useRef } from 'react';
import { CustomerService } from '../utils/customerService';
import type { Customer } from '../types/customer';

/**
 * Filter customer array locally by query (case-insensitive search on full_name, phone, email)
 */
export function filterCustomersLocally(customers: Customer[], query: string): Customer[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return customers.filter(c => {
    const nameMatch = c.full_name ? c.full_name.toLowerCase().includes(q) : false;
    const phoneMatch = c.phone ? c.phone.toLowerCase().includes(q) : false;
    const emailMatch = c.email ? c.email.toLowerCase().includes(q) : false;
    return nameMatch || phoneMatch || emailMatch;
  });
}

export interface UseCustomerSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: Customer[];
  searchLoading: boolean;
  searchError: string;
  clearSearch: () => void;
  refreshCustomers: () => Promise<void>;
}

export function useCustomerSearch(): UseCustomerSearchReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const fetchedRef = useRef(false);

  const fetchDataset = useCallback(async () => {
    setSearchLoading(true);
    setSearchError('');
    try {
      const { data } = await CustomerService.getCustomers('', 500);
      setAllCustomers(data || []);
      fetchedRef.current = true;
    } catch (err: any) {
      setSearchError(err.message || 'Failed to fetch customers.');
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Fetch customer list once on mount / initialization
  useEffect(() => {
    if (!fetchedRef.current) {
      fetchDataset();
    }
  }, [fetchDataset]);

  // Filter locally whenever search query or customer list changes
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }

    // Perform instantaneous local filtering
    const matched = filterCustomersLocally(allCustomers, trimmed);
    setSearchResults(matched);
  }, [searchQuery, allCustomers]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    searchLoading,
    searchError,
    clearSearch,
    refreshCustomers: fetchDataset,
  };
}
