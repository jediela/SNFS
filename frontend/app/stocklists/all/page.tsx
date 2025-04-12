'use client';

import { useEffect, useState } from 'react';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface StockList {
    list_id: number;
    name: string;
    user_id: number;
    visibility: string;
}

export default function MyStockLists() {
    const [user, setUser] = useState<{
        user_id: number;
        username: string;
    } | null>(null);
    const [openDialogId, setOpenDialogId] = useState<number | null>(null);
    const [shareUsername, setShareUsername] = useState('');
    const [stockLists, setStockLists] = useState<StockList[]>([]);

    async function fetchStockLists() {
        if (!user) return;
        try {
            const res = await fetch(
                `http://localhost:8000/stocklists/mine?userId=${user.user_id}`,
                { method: 'GET' }
            );
            const data = await res.json();
            setStockLists(data.stockLists || []);
        } catch {
            toast.error('Failed to load stock lists');
            setStockLists([]);
        }
    }

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);

    useEffect(() => {
        if (user) fetchStockLists();
    }, [user]);

    async function handleShare(listId: number) {
        if (!shareUsername) return toast.error('Username is required');

        try {
            const res = await fetch(`http://localhost:8000/stocklists/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    listId,
                    ownerId: user?.user_id,
                    username: shareUsername,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || 'Failed to share list');
                return;
            }

            toast.success(data.message || 'List shared!');
            setOpenDialogId(null);
            setShareUsername('');
        } catch {
            toast.error('Error sharing list');
        }
    }

    return (
        <>
            <h1 className="pb-5 text-3xl font-bold text-center">
                My Stock Lists
            </h1>

            {stockLists && stockLists.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stockLists.map((list) => (
                        <Card key={list.list_id}>
                            <CardHeader>
                                <CardTitle>{list.name}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Visibility:{' '}
                                    <span className="capitalize">
                                        {list.visibility}
                                    </span>
                                </p>
                            </CardContent>
                            {list.visibility === 'shared' && (
                                <CardFooter className="flex justify-between">
                                    <Dialog
                                        open={openDialogId === list.list_id}
                                        onOpenChange={(open) =>
                                            setOpenDialogId(
                                                open ? list.list_id : null
                                            )
                                        }
                                    >
                                        <DialogTrigger asChild>
                                            <Button variant="outline">
                                                Share List
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>
                                                    Share with a friend
                                                </DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                <Input
                                                    placeholder="Enter friend's username"
                                                    value={shareUsername}
                                                    onChange={(e) =>
                                                        setShareUsername(
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                                <DialogFooter>
                                                    <Button
                                                        onClick={() =>
                                                            handleShare(
                                                                list.list_id
                                                            )
                                                        }
                                                    >
                                                        Share
                                                    </Button>
                                                </DialogFooter>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </CardFooter>
                            )}
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-4">
                    <p className="text-lg text-muted-foreground">
                        You have no stock lists yet.
                    </p>
                </div>
            )}
        </>
    );
}
