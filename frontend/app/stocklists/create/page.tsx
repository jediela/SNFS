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

export default function CreateStockList() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [visibility, setVisibility] = useState('private');
    const [listId, setListId] = useState<number | null>(null);
    const [symbol, setSymbol] = useState('');
    const [shares, setShares] = useState('');
    const [user, setUser] = useState<{
        user_id: number;
        username: string;
    } | null>(null);

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

    async function handleCreateList(e: React.FormEvent) {
        e.preventDefault();

        if (!user) {
            toast.error('Please log in to create stock lists');
            router.push('/users/login');
            return;
        }

        try {
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

            setListId(data.stockList.list_id);
            toast.success('Stock list created successfully!', {
                description: `List ID: ${data.stockList.list_id}, Name: ${data.stockList.name}`,
            });
        } catch (error) {
            toast.error(String(error));
        }
    }

    async function handleAddStock(e: React.FormEvent) {
        e.preventDefault();
        if (!listId || !user) {
            toast.error('Please create a stock list first');
            return;
        }

        try {
            const res = await fetch(
                'http://localhost:8000/stocklists/add_item',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user_id: user.user_id, // Add user_id to verify ownership
                        list_id: listId,
                        symbol,
                        num_shares: parseInt(shares),
                    }),
                }
            );
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error);
                return;
            }

            setSymbol('');
            setShares('');
            toast.success('Stock added to list!', {
                description: `Added ${data.item.num_shares} shares of ${data.item.symbol}`,
            });
        } catch (error) {
            toast.error(String(error));
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
                    <form onSubmit={handleCreateList}>
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
                                    onChange={(e) =>
                                        setVisibility(e.target.value)
                                    }
                                >
                                    <option value="private">Private</option>
                                    <option value="shared">Shared</option>
                                    <option value="public">Public</option>
                                </select>
                            </div>
                            <Button type="submit" className="w-full">
                                Create Stock List
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {listId && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Add Stocks</CardTitle>
                        <CardDescription>
                            Add stocks to your list (List ID: {listId})
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddStock}>
                            <div className="flex flex-col gap-6">
                                <div className="grid gap-2">
                                    <Label>Stock Symbol</Label>
                                    <Input
                                        value={symbol}
                                        required
                                        onChange={(e) =>
                                            setSymbol(
                                                e.target.value.toUpperCase()
                                            )
                                        }
                                        placeholder="e.g., AAPL"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Number of Shares</Label>
                                    <Input
                                        value={shares}
                                        type="number"
                                        required
                                        onChange={(e) =>
                                            setShares(e.target.value)
                                        }
                                        placeholder="e.g., 10"
                                    />
                                </div>
                                <Button type="submit" className="w-full">
                                    Add Stock
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
