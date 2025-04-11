'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from '@/components/ui/table';
import { toast } from 'sonner';

interface Friend {
    friend_id: number;
    username: string;
    since: string;
}

export default function FriendsPage() {
    const [user, setUser] = useState<{
        user_id: number;
        username: string;
    } | null>(null);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);
    useEffect(() => {
        if (user) fetchFriends(user.user_id);
    }, [user]);

    async function fetchFriends(userId: number) {
        try {
            const response = await fetch(
                `http://localhost:8000/friends/view?userId=${userId}`
            );
            const result = await response.json();

            if (response.ok) {
                setFriends(result.friends || []);
            } else {
                toast.error(result.error);
            }
        } catch {
            toast.error('Something went wrong while loading friends');
        } finally {
            setLoading(false);
        }
    }

    async function handleRemoveFriend(friend_id: number) {
        if (!user) return;

        try {
            const res = await fetch(`http://localhost:8000/friends/remove`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.user_id,
                    friendId: friend_id,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error);
                return;
            }

            toast.success(data.message);
            setFriends((prev) => prev.filter((f) => f.friend_id !== friend_id));
        } catch {
            toast.error('An error occurred while removing friend');
        }
    }

    if (loading) {
        return (
            <div className="p-6 space-y-4">
                <Skeleton className="h-8 w-[200px]" />
                <Skeleton className="h-4 w-[300px]" />
                <Skeleton className="h-[300px] w-full" />
            </div>
        );
    }

    return (
        <div className="grid w-full gap-2 p-4 max-w-4xl mx-auto">
            <h1 className="pb-5 text-3xl font-bold text-center">
                Your Friends
            </h1>

            <div className="p-2" />

            {friends.length === 0 ? (
                <p className="text-muted-foreground">
                    You have no friends yet.
                </p>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Username</TableHead>
                            <TableHead>User ID</TableHead>
                            <TableHead>Friends Since</TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {friends.map((friend) => (
                            <TableRow key={friend.friend_id}>
                                <TableCell>{friend.username}</TableCell>
                                <TableCell>{friend.friend_id}</TableCell>
                                <TableCell>
                                    {new Date(friend.since).toLocaleDateString(
                                        'en-US',
                                        {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                        }
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="destructive"
                                        onClick={() =>
                                            handleRemoveFriend(friend.friend_id)
                                        }
                                    >
                                        Remove Friend
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}
