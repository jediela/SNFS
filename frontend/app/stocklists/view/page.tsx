'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { AlertCircle, Trash2, Edit } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface StockListItem {
    symbol: string;
    num_shares: number;
    company_name: string;
}

interface StockList {
    list_id: number;
    user_id: number;
    name: string;
    visibility: string;
    creator_name: string;
    access_type: string;
    items: StockListItem[];
}

export default function ViewStockLists() {
    const [userId, setUserId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [stockLists, setStockLists] = useState<StockList[]>([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
    const router = useRouter();

    const fetchStockLists = useCallback(
        async (uid: number | null = null) => {
            try {
                let url = 'http://localhost:8000/stocklists/lists';
                const params = new URLSearchParams();

                if (uid) {
                    params.append('user_id', uid.toString());
                }

                if (searchTerm) {
                    params.append('search', searchTerm);
                }

                if (params.toString()) {
                    url += '?' + params.toString();
                }

                const res = await fetch(url);
                const data = await res.json();

                if (!res.ok) {
                    toast.error(data.error);
                    return;
                }

                setStockLists(data.stockLists);

                if (data.stockLists.length === 0) {
                    toast.info('No stock lists found');
                } else {
                    toast.success(
                        `Found ${data.stockLists.length} stock lists`
                    );
                }
            } catch (error) {
                toast.error(String(error));
            }
        },
        [searchTerm]
    );

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            setUserId(user.user_id.toString());
            setIsLoggedIn(true);
            fetchStockLists(user.user_id);
        } else {
            fetchStockLists();
        }
    }, [fetchStockLists]);

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        fetchStockLists(isLoggedIn ? parseInt(userId) : null);
    }

    async function handleDeleteList(listId: number) {
        setIsDeleting(true);
        try {
            const res = await fetch(
                `http://localhost:8000/stocklists/${listId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user_id: parseInt(userId),
                    }),
                }
            );

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error);
                return;
            }

            toast.success(data.message);

            setStockLists((prev) =>
                prev.filter((list) => list.list_id !== listId)
            );
            setDeleteConfirmId(null);
        } catch (error) {
            toast.error(String(error));
        } finally {
            setIsDeleting(false);
        }
    }

    function handleWriteReview(listId: number) {
        router.push(`/reviews/write?list_id=${listId}`);
    }

    function handleViewReviews(listId: number) {
        router.push(`/reviews/view?list_id=${listId}`);
    }

    function handleViewStats(listId: number) {
        router.push(`/stocklists/${listId}/stats`);
    }

    return (
        <div className="space-y-10">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-2xl">
                            View Stock Lists
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search stock lists by name..."
                            className="flex-1"
                        />
                        <Button type="submit">Search</Button>
                    </form>
                </CardContent>
            </Card>

            {stockLists.length > 0 && (
                <div className="space-y-6">
                    {stockLists.map((list) => (
                        <Card key={list.list_id}>
                            <CardHeader>
                                <div className="flex justify-between">
                                    <div>
                                        <CardTitle>{list.name}</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <p className="text-muted-foreground text-sm">
                                                Created by: {list.creator_name}{' '}
                                                | Visibility: {list.visibility}
                                            </p>

                                            {/* Delete button (only show for owned lists) */}
                                            {isLoggedIn &&
                                                list.access_type ===
                                                    'owned' && (
                                                    <>
                                                        {deleteConfirmId ===
                                                        list.list_id ? (
                                                            <div className="flex items-center gap-2 ml-2 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded-md">
                                                                <AlertCircle className="h-4 w-4 text-red-500" />
                                                                <span className="text-xs text-red-600 dark:text-red-400">
                                                                    Confirm
                                                                    delete?
                                                                </span>
                                                                <Button
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    disabled={
                                                                        isDeleting
                                                                    }
                                                                    onClick={() =>
                                                                        handleDeleteList(
                                                                            list.list_id
                                                                        )
                                                                    }
                                                                >
                                                                    Yes, Delete
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        setDeleteConfirmId(
                                                                            null
                                                                        )
                                                                    }
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        router.push(
                                                                            `/stocklists/edit/${list.list_id}`
                                                                        )
                                                                    }
                                                                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                                                >
                                                                    <Edit className="h-4 w-4 mr-1" />{' '}
                                                                    Edit
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                                    onClick={() =>
                                                                        setDeleteConfirmId(
                                                                            list.list_id
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash2 className="h-4 w-4 mr-1" />{' '}
                                                                    Delete
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="bg-muted px-3 py-1 rounded-full text-sm">
                                            {list.access_type === 'owned'
                                                ? 'Private'
                                                : list.access_type === 'shared'
                                                  ? 'Shared with you'
                                                  : 'Public'}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                handleViewStats(list.list_id)
                                            }
                                        >
                                            View Stats
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                handleViewReviews(list.list_id)
                                            }
                                        >
                                            View Reviews
                                        </Button>
                                        {isLoggedIn && (
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    handleWriteReview(
                                                        list.list_id
                                                    )
                                                }
                                            >
                                                Write Review
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Symbol</TableHead>
                                            <TableHead className="text-right">
                                                Shares
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {list.items.length > 0 ? (
                                            list.items.map((item) => (
                                                <TableRow key={item.symbol}>
                                                    <TableCell className="font-medium">
                                                        {item.symbol}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {item.num_shares}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={2}
                                                    className="text-center"
                                                >
                                                    No stocks in this list
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {stockLists.length === 0 && (
                <Card>
                    <CardContent className="py-8">
                        <p className="text-center text-muted-foreground">
                            No stock lists found.{' '}
                            {!isLoggedIn && 'Log in to see more lists or '}
                            create a new stock list.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
