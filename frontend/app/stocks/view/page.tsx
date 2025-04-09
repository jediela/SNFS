'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface StockPrice {
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    symbol: string;
}

interface PaginationInfo {
    page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
}

export default function StocksView() {
    const [stocks, setStocks] = useState<StockPrice[]>([]);
    const [symbol, setSymbol] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [page, setPage] = useState(1);
    const PER_PAGE = 10;
    const [pagination, setPagination] = useState<PaginationInfo>({
        page: 1,
        per_page: PER_PAGE,
        total_items: 0,
        total_pages: 1,
    });
    const [loading, setLoading] = useState(false);
    const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
    const [symbolSearch, setSymbolSearch] = useState('');

    // Fetch available symbols for autocomplete
    useEffect(() => {
        async function fetchSymbols() {
            try {
                const res = await fetch(
                    `http://localhost:8000/stocks/symbols?search=${symbolSearch}&limit=20`
                );
                if (!res.ok) {
                    throw new Error('Failed to fetch symbols');
                }
                const data = await res.json();
                setAvailableSymbols(data.symbols || []);
            } catch (error) {
                console.error('Error fetching symbols:', error);
            }
        }

        if (symbolSearch) {
            fetchSymbols();
        }
    }, [symbolSearch]);

    // Fetch stock data
    const fetchStocks = async (resetPage = false) => {
        if (resetPage) {
            setPage(1);
        }
        
        setLoading(true);
        const currentPage = resetPage ? 1 : page;
        
        try {
            let url = `http://localhost:8000/stocks/?page=${currentPage}&per_page=${PER_PAGE}`;
            if (symbol) url += `&symbol=${symbol}`;
            if (startDate) url += `&start_date=${startDate}`;
            if (endDate) url += `&end_date=${endDate}`;

            const res = await fetch(url);
            if (!res.ok) {
                throw new Error('Failed to fetch stock data');
            }
            
            const data = await res.json();
            setStocks(data.stocks || []);
            setPagination(data.pagination || {
                page: currentPage,
                per_page: PER_PAGE,
                total_items: 0,
                total_pages: 1,
            });
            
            if (data.stocks?.length === 0) {
                toast.info('No stock data found for the specified criteria');
            }
        } catch (error) {
            console.error('Error fetching stock data:', error);
            toast.error('Failed to load stock data');
            setStocks([]);
        } finally {
            setLoading(false);
        }
    };

    // Initial data load
    useEffect(() => {
        fetchStocks();
    }, [page]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchStocks(true);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.total_pages) {
            setPage(newPage);
        }
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num);
    };

    const formatVolume = (volume: number) => {
        if (volume >= 1000000) {
            return `${(volume / 1000000).toFixed(2)}M`;
        } else if (volume >= 1000) {
            return `${(volume / 1000).toFixed(2)}K`;
        }
        return volume.toString();
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString();
    };

    // pagination rendering
    function renderPagination() {
        const { page, total_pages } = pagination;
        
        // Calculate range of pages to show
        let startPage = Math.max(1, page - 2);
        let endPage = Math.min(total_pages, page + 2);
        
        // Adjust to always show 5 pages when possible
        if (endPage - startPage < 4) {
            if (startPage === 1) {
                endPage = Math.min(5, total_pages);
            } else {
                startPage = Math.max(1, endPage - 4);
            }
        }
        
        const pages = [];
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        
        return (
            <div className="flex items-center justify-center gap-1">
                <button 
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                    className={`px-3 py-1 rounded border ${page <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                >
                    Previous
                </button>
                
                {startPage > 1 && (
                    <>
                        <button 
                            onClick={() => handlePageChange(1)}
                            className="px-3 py-1 rounded border hover:bg-gray-100"
                        >
                            1
                        </button>
                        {startPage > 2 && <span>...</span>}
                    </>
                )}
                
                {pages.map((p) => (
                    <button 
                        key={p}
                        onClick={() => handlePageChange(p)}
                        className={`px-3 py-1 rounded border ${p === page ? 'bg-gray-200 font-bold' : 'hover:bg-gray-100'}`}
                    >
                        {p}
                    </button>
                ))}
                
                {endPage < total_pages && (
                    <>
                        {endPage < total_pages - 1 && <span>...</span>}
                        <button 
                            onClick={() => handlePageChange(total_pages)}
                            className="px-3 py-1 rounded border hover:bg-gray-100"
                        >
                            {total_pages}
                        </button>
                    </>
                )}
                
                <button 
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= total_pages}
                    className={`px-3 py-1 rounded border ${page >= total_pages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                >
                    Next
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Stock Price Data</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="symbol">Stock Symbol</Label>
                                <div className="relative">
                                    <Input
                                        id="symbol"
                                        placeholder="e.g., AAPL"
                                        value={symbol}
                                        onChange={(e) => {
                                            setSymbol(e.target.value.toUpperCase());
                                            setSymbolSearch(e.target.value.toUpperCase());
                                        }}
                                    />
                                    {availableSymbols.length > 0 && symbolSearch && (
                                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                                            {availableSymbols.map((s) => (
                                                <div
                                                    key={s}
                                                    className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    onClick={() => {
                                                        setSymbol(s);
                                                        setSymbolSearch('');
                                                    }}
                                                >
                                                    {s}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="startDate">Start Date</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endDate">End Date</Label>
                                <Input
                                    id="endDate"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end pt-2">
                            {/* Remove the perPage dropdown selector */}
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Loading...' : 'Search'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Symbol</TableHead>
                                    <TableHead>Date</TableHead>
                                    {/* Replace Tooltip with title attribute */}
                                    <TableHead className="text-right" title="First trade price of the day">
                                        <div className="flex items-center justify-end">
                                            Open <span className="ml-1 text-gray-500 text-xs"></span>
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-right" title="Highest price of the day">
                                        <div className="flex items-center justify-end">
                                            High <span className="ml-1 text-gray-500 text-xs"></span>
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-right" title="Lowest price of the day">
                                        <div className="flex items-center justify-end">
                                            Low <span className="ml-1 text-gray-500 text-xs"></span>
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-right" title="Last trade price of the day">
                                        <div className="flex items-center justify-end">
                                            Close <span className="ml-1 text-gray-500 text-xs"></span>
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-right" title="Total shares traded">
                                        <div className="flex items-center justify-end">
                                            Volume <span className="ml-1 text-gray-500 text-xs"></span>
                                        </div>
                                    </TableHead>
                                    </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            {Array.from({ length: 7 }).map((_, j) => (
                                                <TableCell key={j}>
                                                    <div className="h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : stocks && stocks.length > 0 ? (
                                    stocks.map((stock, index) => (
                                        <TableRow key={`${stock.symbol}-${stock.timestamp}-${index}`}>
                                            <TableCell className="font-medium">
                                                {stock.symbol}
                                            </TableCell>
                                            <TableCell>{formatDate(stock.timestamp)}</TableCell>
                                            <TableCell className="text-right">{formatNumber(stock.open)}</TableCell>
                                            <TableCell className="text-right">{formatNumber(stock.high)}</TableCell>
                                            <TableCell className="text-right">{formatNumber(stock.low)}</TableCell>
                                            <TableCell className="text-right">{formatNumber(stock.close)}</TableCell>
                                            <TableCell className="text-right">{formatVolume(stock.volume)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10">
                                            No stock data found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Always show pagination if there's more than one page */}
            {pagination.total_pages > 1 && (
                <div className="flex justify-center mt-6">
                    {renderPagination()}
                </div>
            )}
        </div>
    );
}
