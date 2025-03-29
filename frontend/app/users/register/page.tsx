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
import { useState } from 'react';
import { toast } from 'sonner';

export default function Register() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    async function handleRegister(e: React.FormEvent) {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:8000/users/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    password,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error);
                return;
            }

            setUsername('');
            setPassword('');
            toast.success(data.message, {
                description: `user_id: ${data.user.user_id}, Username: ${data.user.username}, Password: ${data.user.password}`,
            });
        } catch (error) {
            toast.error(String(error));
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">
                    Register for an account
                </CardTitle>
                <CardDescription>
                    Enter your email below to register your account
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleRegister}>
                    <div className="flex flex-col gap-6">
                        <div className="grid gap-2">
                            <Label>Username</Label>
                            <Input
                                value={username}
                                required
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center">
                                <Label>Password</Label>
                            </div>
                            <Input
                                value={password}
                                type="password"
                                required
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="w-full">
                            Sign Up
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
