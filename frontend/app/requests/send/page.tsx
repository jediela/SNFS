'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function SendRequest() {
    const [user, setUser] = useState<{
        user_id: number;
        username: string;
    } | null>(null);
    const [receiverId, setReceiverId] = useState('');

    async function handleSend(e: React.FormEvent) {
        e.preventDefault();
        if (!user) return;
        try {
            const res = await fetch('http://localhost:8000/requests/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    senderId: user.user_id,
                    receiverId,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error);
                return;
            }
            toast.success(data.message, {
                description: `request_id: ${data.request.request_id}, sender_id: ${data.request.from_user_id}, receiver_id: ${data.request.to_user_id}, Status: ${data.request.status}`,
            });
            setReceiverId('');
        } catch (error) {
            toast.error(String(error));
        }
    }

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);

    return (
        <>
            <h1 className="pb-5 text-3xl font-bold text-center">
                Send Request
            </h1>
            <form onSubmit={handleSend}>
                <div className="flex flex-col gap-6">
                    <div className="grid gap-2">
                        <div className="flex items-center">
                            <Label>Send Request to: User ID</Label>
                        </div>
                        <Input
                            placeholder="Receiver User ID"
                            value={receiverId}
                            required
                            onChange={(e) => setReceiverId(e.target.value)}
                        />
                    </div>
                    <Button type="submit" className="w-full">
                        Send Request
                    </Button>
                </div>
            </form>
        </>
    );
}
