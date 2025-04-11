'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

export default function ViewRequests() {
    const [user, setUser] = useState<{
        user_id: number;
        username: string;
    } | null>(null);
    const [requests, setRequests] = useState<
        {
            request_id: string;
            sender: { id: string; username: string };
            status: string;
            timestamp: string;
        }[]
    >([]);

    // Use useCallback to memoize the function
    const fetchRequestsData = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetch(
                `http://localhost:8000/requests/view?userId=${user?.user_id}`,
                { method: 'GET' }
            );
            const data = await res.json();
            setRequests(data.received_requests);
        } catch {
            toast.error('Failed to refresh requests');
        }
    }, [user]); // Add user as dependency

    async function handleAccept(requestId: string) {
        const res = await fetch(
            `http://localhost:8000/requests/accept?requestId=${requestId}`,
            {
                method: 'PATCH',
            }
        );
        const data = await res.json();
        if (!res.ok) {
            toast.error(data.error);
            return;
        }
        toast.success(data.message, {
            description: `request_id: ${data.request.request_id}, status: ${data.request.status}`,
        });
        await fetchRequestsData();
    }

    async function handleReject(requestId: string) {
        const res = await fetch(
            `http://localhost:8000/requests/reject?requestId=${requestId}`,
            {
                method: 'PATCH',
            }
        );
        const data = await res.json();
        if (!res.ok) {
            toast.error(data.error);
            return;
        }
        toast.warning(data.message, {
            description: `request_id: ${data.request.request_id}, status: ${data.request.status}`,
        });
        await fetchRequestsData();
    }

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);

    useEffect(() => {
        if (user) fetchRequestsData();
    }, [user, fetchRequestsData]); // Add fetchRequestsData to the dependency array

    return (
        <div className="grid w-full gap-2 p-4 max-w-4xl mx-auto">
            <h1 className="pb-5 text-3xl font-bold text-center">
                View Friend Requests
            </h1>

            <div className="p-2" />

            {requests.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Sender</TableHead>
                            <TableHead>Sender ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date Received</TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests.map((request) => (
                            <TableRow key={request.request_id}>
                                <TableCell className="font-medium">
                                    {request.sender.username}
                                </TableCell>
                                <TableCell>{request.sender.id}</TableCell>
                                <TableCell className="capitalize">
                                    {request.status}
                                </TableCell>
                                <TableCell>
                                    {new Date(
                                        request.timestamp
                                    ).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            handleAccept(request.request_id)
                                        }
                                    >
                                        Accept
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() =>
                                            handleReject(request.request_id)
                                        }
                                    >
                                        Reject
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <div className="text-center text-gray-500 py-4">
                    No pending requests found
                </div>
            )}
        </div>
    );
}
