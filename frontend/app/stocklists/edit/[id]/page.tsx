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
import { useParams, useRouter } from 'next/navigation';
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
import { Trash2, Plus, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface StockListItem {
    symbol: string;
    num_shares: number;
    company_name: string;
    list_id: number;
    id?: string; // For new items that haven't been saved yet
}

interface StockList {
    list_id: number;
    user_id: number;
    name: string;
    visibility: string;
    creator_name: string;
    items: StockListItem[];
}

export default function EditStockList() {
    const router = useRouter();
    const { id } = useParams();
    
    const [stockList, setStockList] = useState<StockList | null>(null);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [visibility, setVisibility] = useState('private');
    
    const [symbol, setSymbol] = useState('');
    const [shares, setShares] = useState('');
    const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
    const [symbolSearch, setSymbolSearch] = useState('');
    
    const [user, setUser] = useState<{
        user_id: number;
        username: string;
    } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Check for logged in user on component mount
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        } else {
            toast.error('Please log in to edit stock lists');
            router.push('/users/login');
        }
    }, [router]);

    // Fetch stock list data
    useEffect(() => {
        if (!user || !id) return;

        async function fetchStockList() {
            try {
                const res = await fetch(
                    `http://localhost:8000/stocklists/list/${id}?user_id=${user?.user_id}`
                );
                const data = await res.json();

                if (!res.ok) {
                    toast.error(data.error || 'Failed to load stock list');
                    router.push('/stocklists/view');
                    return;
                }

                if (!data.stockList) {
                    toast.error('Stock list not found');
                    router.push('/stocklists/view');
                    return;
                }

                // Check if the user owns the list
                if (data.stockList.user_id !== user?.user_id) {
                    toast.error('You can only edit your own stock lists');
                    router.push('/stocklists/view');
                    return;
                }

                setStockList(data.stockList);
                setName(data.stockList.name);
                setVisibility(data.stockList.visibility);
            } catch (error) {
                toast.error('An error occurred while loading the stock list');
                console.error(error);
            } finally {
                setLoading(false);
            }
        }

        fetchStockList();
    }, [user, id, router]);

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

    // Add stock to the list
    const addStock = async () => {
        if (!stockList || !user || !symbol || !shares) {
            toast.error('Please enter both symbol and number of shares');
            return;
        }

        const numShares = parseInt(shares);
        if (isNaN(numShares) || numShares <= 0) {
            toast.error('Please enter a valid number of shares');
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch('http://localhost:8000/stocklists/add_item', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: user.user_id,
                    list_id: stockList.list_id,
                    symbol: symbol.toUpperCase(),
                    num_shares: numShares,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || 'Failed to add stock');
                return;
            }

            toast.success(`Added ${numShares} shares of ${symbol}`);
            
            // Update the local list with the new item including company name (if available)
            const updatedList = { ...stockList };
            updatedList.items = [
                ...updatedList.items,
                {
                    symbol: symbol.toUpperCase(),
                    num_shares: numShares,
                    company_name: data.item.company_name || `Company ${symbol.toUpperCase()}`,
                    list_id: stockList.list_id
                }
            ];
            
            setStockList(updatedList);
            setSymbol('');
            setShares('');
            setAvailableSymbols([]);

        } catch (error) {
            toast.error('An error occurred while adding the stock');
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Remove stock from the list
    const removeStock = async (stockSymbol: string) => {
        if (!stockList || !user) return;

        try {
            const res = await fetch(`http://localhost:8000/stocklists/remove_item`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: user.user_id,
                    list_id: stockList.list_id,
                    symbol: stockSymbol,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || 'Failed to remove stock');
                return;
            }

            toast.success(`Removed ${stockSymbol} from list`);
            
            // Update local state to remove the item
            const updatedList = { ...stockList };
            updatedList.items = updatedList.items.filter(
                (item) => item.symbol !== stockSymbol
            );
            
            setStockList(updatedList);

        } catch (error) {
            toast.error('An error occurred while removing the stock');
            console.error(error);
        }
    };

    // Update list name and visibility
    const updateListDetails = async () => {
        if (!stockList || !user || !name) {
            toast.error('Please provide a name for the list');
            return;
        }

        try {
            const res = await fetch(`http://localhost:8000/stocklists/update/${stockList.list_id}`, {
                method: 'PUT',
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
                toast.error(data.error || 'Failed to update list details');
                return;
            }

            toast.success('Stock list details updated');
            
            // Update local state
            setStockList({
                ...stockList,
                name,
                visibility,
            });

        } catch (error) {
            toast.error('An error occurred while updating the list');
            console.error(error);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-40 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!stockList) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Stock List Not Found</CardTitle>
                    <CardDescription>
                        The stock list you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => router.push('/stocklists/view')}>
                        Back to Stock Lists
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
                                Edit Stock List
                            </CardTitle>
                            <CardDescription>
                                Update your stock list details and manage stocks
                            </CardDescription>
                        </div>
                        <Button variant="outline" onClick={() => router.push('/stocklists/view')}>
                            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Lists
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    onChange={(e) =>
                                        setVisibility(e.target.value)
                                    }
                                >
                                    <option value="private">Private</option>
                                    <option value="shared">Shared</option>
                                    <option value="public">Public</option>
                                </select>
                            </div>
                        </div>
                        
                        <Button onClick={updateListDetails}>
                            Update List Details
                        </Button>

                        {/* Add stocks to the list */}
                        <div className="border rounded-md p-4 mt-6">
                            <h3 className="text-lg font-medium mb-4">Add Stocks</h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="relative">
                                    <Label>Stock Symbol</Label>
                                    <Input
                                        value={symbol}
                                        onChange={(e) => {
                                            const value = e.target.value.toUpperCase();
                                            setSymbol(value);
                                            setSymbolSearch(value);
                                        }}
                                        placeholder="e.g., AAPL"
                                        className="mt-1"
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
                                                        setAvailableSymbols([]);
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
                                        onClick={addStock}
                                        className="w-full mt-1"
                                        disabled={isSubmitting}
                                    >
                                        <Plus className="h-4 w-4 mr-1" /> Add Stock
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Show list of stocks */}
                        <div className="border rounded-md p-4">
                            <h3 className="text-lg font-medium mb-4">Stocks in List</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Symbol</TableHead>
                                        <TableHead className="text-right">Shares</TableHead>
                                        <TableHead className="w-[100px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stockList.items.length > 0 ? (
                                        stockList.items.map((item) => (
                                            <TableRow key={item.symbol}>
                                                <TableCell className="font-medium">{item.symbol}</TableCell>
                                                <TableCell className="text-right">{item.num_shares}</TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeStock(item.symbol)}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 p-0 h-8 w-8"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                                                No stocks in this list yet
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
