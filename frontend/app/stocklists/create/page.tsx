'use client';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Trash2, Plus } from 'lucide-react';

// Define an interface for stocks in a list
interface StockItem {
    symbol: string;
    shares: number;
    id: string; // Temporary ID for UI management
}

export default function CreateStockList() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [visibility, setVisibility] = useState('private');
    const [symbol, setSymbol] = useState('');
    const [shares, setShares] = useState('');
    const [tempStocks, setTempStocks] = useState<StockItem[]>([]);
    const [user, setUser] = useState<{
        user_id: number;
        username: string;
    } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
    const [symbolSearch, setSymbolSearch] = useState('');

    // Check for logged in user on component mount
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        } else {
            toast.error('Please log in to create stock lists');
            router.push('/users/login');
        }
    }, [router]);

    // Fetch available symbols for autocomplete
    useEffect(() => {
        async function fetchSymbols() {
            if (!symbolSearch) return;

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

        fetchSymbols();
    }, [symbolSearch]);

    // Add stock to temporary list
    const addStockToTemp = () => {
        if (!symbol) {
            toast.error('Please enter a stock symbol');
            return;
        }

        if (!shares || parseInt(shares) <= 0) {
            toast.error('Please enter a valid number of shares');
            return;
        }

        // Check for duplicate symbol
        const duplicateIndex = tempStocks.findIndex(
            (stock) => stock.symbol.toUpperCase() === symbol.toUpperCase()
        );

        if (duplicateIndex >= 0) {
            // Update shares for existing symbol
            const updatedStocks = [...tempStocks];
            updatedStocks[duplicateIndex].shares = parseInt(shares);
            setTempStocks(updatedStocks);
            toast.success(`Updated shares for ${symbol}`);
        } else {
            // Add new stock
            setTempStocks([
                ...tempStocks,
                {
                    symbol: symbol.toUpperCase(),
                    shares: parseInt(shares),
                    id: Date.now().toString(), // Simple unique ID
                },
            ]);
            toast.success(`Added ${shares} shares of ${symbol}`);
        }

        // Clear inputs
        setSymbol('');
        setShares('');
        setAvailableSymbols([]);
    };

    // Remove stock from temporary list
    const removeStock = (id: string) => {
        setTempStocks(tempStocks.filter((stock) => stock.id !== id));
    };

    async function handleCreateList(e: React.FormEvent) {
        e.preventDefault();

        if (!user) {
            toast.error('Please log in to create stock lists');
            router.push('/users/login');
            return;
        }

        if (tempStocks.length === 0) {
            toast.error('Please add at least one stock to your list');
            return;
        }

        setIsSubmitting(true);

        try {
            // First create the list
            const res = await fetch('http://localhost:8000/stocklists/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: user.user_id,
                    name,
                    visibility,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error);
                return;
            }

            const listId = data.stockList.list_id;

            // Now add all stocks to the list
            for (const stock of tempStocks) {
                const itemRes = await fetch(
                    'http://localhost:8000/stocklists/add_item',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            user_id: user.user_id,
                            list_id: listId,
                            symbol: stock.symbol,
                            num_shares: stock.shares,
                        }),
                    }
                );

                if (!itemRes.ok) {
                    const itemData = await itemRes.json();
                    toast.error(
                        `Failed to add ${stock.symbol}: ${itemData.error}`
                    );
                }
            }

            toast.success('Stock list created successfully!', {
                description: `Created "${name}" with ${tempStocks.length} stocks`,
            });

            // Navigate to view page
            router.push('/stocklists/view');
        } catch (error) {
            toast.error(String(error));
        } finally {
            setIsSubmitting(false);
        }
    }

    if (!user) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Authentication Required</CardTitle>
                    <CardDescription>
                        Please log in to create stock lists
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => router.push('/users/login')}>
                        Go to Login
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-10">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-2xl">
                                Create Stock List
                            </CardTitle>
                            <CardDescription>
                                Create a new stock list and add stocks to it
                            </CardDescription>
                        </div>
                        <div className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                            Creating as {user.username}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-6">
                        <div className="grid gap-2">
                            <Label>List Name</Label>
                            <Input
                                value={name}
                                required
                                onChange={(e) => setName(e.target.value)}
                                placeholder="My Favorite Stocks"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Visibility</Label>
                            <select
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none"
                                value={visibility}
                                onChange={(e) => setVisibility(e.target.value)}
                            >
                                <option value="private">Private</option>
                                <option value="shared">Shared</option>
                                <option value="public">Public</option>
                            </select>
                        </div>

                        {/* Add stocks to the list */}
                        <div className="border rounded-md p-4">
                            <h3 className="text-lg font-medium mb-4">
                                Add Stocks
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="relative">
                                    <Label>Stock Symbol</Label>
                                    <Input
                                        value={symbol}
                                        onChange={(e) => {
                                            const value =
                                                e.target.value.toUpperCase();
                                            setSymbol(value);
                                            setSymbolSearch(value);
                                        }}
                                        placeholder="e.g., AAPL"
                                        className="mt-1"
                                    />
                                    {availableSymbols.length > 0 &&
                                        symbolSearch && (
                                            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                                                {availableSymbols.map((s) => (
                                                    <div
                                                        key={s}
                                                        className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        onClick={() => {
                                                            setSymbol(s);
                                                            setSymbolSearch('');
                                                            setAvailableSymbols(
                                                                []
                                                            );
                                                        }}
                                                    >
                                                        {s}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                </div>
                                <div>
                                    <Label>Number of Shares</Label>
                                    <Input
                                        value={shares}
                                        type="number"
                                        onChange={(e) =>
                                            setShares(e.target.value)
                                        }
                                        placeholder="e.g., 10"
                                        min="1"
                                        className="mt-1"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <Button
                                        type="button"
                                        onClick={addStockToTemp}
                                        className="w-full mt-1"
                                    >
                                        <Plus className="h-4 w-4 mr-1" /> Add
                                        Stock
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Show list of added stocks */}
                        {tempStocks.length > 0 && (
                            <div className="border rounded-md p-4">
                                <h3 className="text-lg font-medium mb-4">
                                    Stocks in List
                                </h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Symbol</TableHead>
                                            <TableHead className="text-right">
                                                Shares
                                            </TableHead>
                                            <TableHead className="w-[100px]">
                                                Actions
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tempStocks.map((stock) => (
                                            <TableRow key={stock.id}>
                                                <TableCell className="font-medium">
                                                    {stock.symbol}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {stock.shares}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            removeStock(
                                                                stock.id
                                                            )
                                                        }
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 p-0 h-8 w-8"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        <Button
                            onClick={handleCreateList}
                            disabled={
                                isSubmitting || tempStocks.length === 0 || !name
                            }
                            className="w-full"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Stock List'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
