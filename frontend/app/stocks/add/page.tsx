'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function AddStockData() {
    const [user, setUser] = useState<{ user_id: number; username: string } | null>(null);
    const [symbol, setSymbol] = useState('');
    const [date, setDate] = useState('');
    const [open, setOpen] = useState('');
    const [high, setHigh] = useState('');
    const [low, setLow] = useState('');
    const [close, setClose] = useState('');
    const [volume, setVolume] = useState('');
    const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
    const [symbolSearch, setSymbolSearch] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    // Set minimum date to 2018-02-08 (day after MAX_DATE in the view)
    const MIN_DATE = '2018-02-08';
    const today = new Date().toISOString().split('T')[0];

    // Check for logged in user
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

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

    // Update high/low when open/close changes for better UX
    useEffect(() => {
        if (open && !high) {
            setHigh(open);
        }
        if (close && !low) {
            setLow(close);
        }
    }, [open, close, high, low]);

    // Validate date is within allowed range
    const validateDate = (dateStr: string) => {
        if (!dateStr) return false;
        
        const selectedDate = new Date(dateStr);
        const minDate = new Date(MIN_DATE);
        
        if (selectedDate < minDate) {
            toast.error(`Date must be on or after ${MIN_DATE}`);
            return false;
        }
        
        return true;
    };

    // Handle form submission
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        
        if (!user) {
            toast.error('Please log in to add stock data');
            return;
        }

        // Basic validation
        if (!symbol || !date || !close || !volume) {
            toast.error('Symbol, date, close price, and volume are required');
            return;
        }

        // Date validation
        if (!validateDate(date)) {
            return;
        }

        // Ensure numerical values are valid
        const numOpen = open ? parseFloat(open) : null;
        const numHigh = high ? parseFloat(high) : null;
        const numLow = low ? parseFloat(low) : null;
        const numClose = parseFloat(close);
        const numVolume = parseInt(volume, 10);

        // Additional validation for price values
        if (
            (numOpen !== null && isNaN(numOpen)) ||
            (numHigh !== null && isNaN(numHigh)) ||
            (numLow !== null && isNaN(numLow)) ||
            isNaN(numClose) || 
            isNaN(numVolume)
        ) {
            toast.error('Please enter valid numerical values');
            return;
        }

        // Check if high is higher than low
        if (numHigh !== null && numLow !== null && numHigh < numLow) {
            toast.error('High price must be greater than low price');
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch('http://localhost:8000/stocks/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: user.user_id,
                    symbol: symbol.toUpperCase(),
                    timestamp: date,
                    open: numOpen,
                    high: numHigh,
                    low: numLow,
                    close: numClose,
                    volume: numVolume,
                }),
            });

            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || 'Error adding stock data');
            }

            toast.success('Stock data added successfully', {
                description: `Added ${symbol.toUpperCase()} data for ${date}`,
            });

            // Clear the form
            setSymbol('');
            setDate('');
            setOpen('');
            setHigh('');
            setLow('');
            setClose('');
            setVolume('');
            
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Add Stock Data</CardTitle>
                    <CardDescription>
                        Add new stock price data from {MIN_DATE} onward. This data will be incorporated into analysis and predictions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="symbol">Stock Symbol</Label>
                                <div className="relative">
                                    <Input
                                        id="symbol"
                                        placeholder="e.g., AAPL"
                                        value={symbol}
                                        onChange={(e) => {
                                            const value = e.target.value.toUpperCase();
                                            setSymbol(value);
                                            setSymbolSearch(value);
                                        }}
                                        required
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
                                <Label htmlFor="date">Date</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    max={today}
                                    min={MIN_DATE}
                                    required
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Only dates from {MIN_DATE} onward are accepted
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="open">Open Price</Label>
                                <Input
                                    id="open"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="Optional"
                                    value={open}
                                    onChange={(e) => setOpen(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="high">High Price</Label>
                                <Input
                                    id="high"
                                    type="number"
                                    step="0.01"
                                    min={low || '0'}
                                    placeholder="Optional"
                                    value={high}
                                    onChange={(e) => setHigh(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="low">Low Price</Label>
                                <Input
                                    id="low"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={high || undefined}
                                    placeholder="Optional"
                                    value={low}
                                    onChange={(e) => setLow(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="close">Close Price</Label>
                                <Input
                                    id="close"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="Required"
                                    value={close}
                                    onChange={(e) => setClose(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="volume">Volume</Label>
                            <Input
                                id="volume"
                                type="number"
                                min="1"
                                step="1"
                                placeholder="Number of shares traded"
                                value={volume}
                                onChange={(e) => setVolume(e.target.value)}
                                required
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button 
                                type="button" 
                                variant="outline"
                                onClick={() => router.push('/stocks/view')}
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Adding...' : 'Add Stock Data'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
