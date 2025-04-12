'use client';

import {
    Menubar,
    MenubarContent,
    MenubarItem,
    MenubarMenu,
    MenubarTrigger,
} from '@/components/ui/menubar';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Navbar() {
    const [user, setUser] = useState<{
        user_id: number;
        username: string;
    } | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) {
                console.error('Failed to parse user data:', error);
                localStorage.removeItem('user');
                setUser(null);
            }
        } else {
            setUser(null);
        }
        const handleUserLogin = () => {
            const updatedUser = localStorage.getItem('user');
            if (updatedUser) {
                setUser(JSON.parse(updatedUser));
            } else {
                setUser(null);
            }
        };
        window.addEventListener('user-login', handleUserLogin);

        return () => {
            window.removeEventListener('user-login', handleUserLogin);
        };
    }, [pathname]);

    function handleLogout() {
        localStorage.removeItem('user');
        setUser(null);
        toast.info('Logged out successfully');
        router.push('/');
    }

    return (
        <Menubar className="p-8 sticky top-0 flex justify-between">
            <div className="flex">
                <MenubarMenu>
                    <MenubarTrigger className="text-2xl font-bold">
                        <Link href="/">SNFS</Link>
                    </MenubarTrigger>
                </MenubarMenu>
                <MenubarMenu>
                    <MenubarTrigger>Users</MenubarTrigger>
                    <MenubarContent>
                        {!user ? (
                            <>
                                <MenubarItem asChild>
                                    <Link href="/users/register">Register</Link>
                                </MenubarItem>
                                <MenubarItem asChild>
                                    <Link href="/users/login">Login</Link>
                                </MenubarItem>
                            </>
                        ) : (
                            <div className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                                Logged in as:{' '}
                                <span className="font-bold">
                                    {user.username}
                                </span>{' '}
                                | id:{' '}
                                <span className="font-bold">
                                    {user.user_id}
                                </span>
                            </div>
                        )}
                    </MenubarContent>
                </MenubarMenu>
                <MenubarMenu>
                    <MenubarTrigger>Stock Lists</MenubarTrigger>
                    <MenubarContent>
                        <MenubarItem asChild>
                            <Link href="/stocklists/create">Create List</Link>
                        </MenubarItem>
                        <MenubarItem asChild>
                            <Link href="/stocklists/view">View Lists</Link>
                        </MenubarItem>
                    </MenubarContent>
                </MenubarMenu>
                <MenubarMenu>
                    <MenubarTrigger>Stocks</MenubarTrigger>
                    <MenubarContent>
                        <MenubarItem asChild>
                            <Link href="/stocks/view">View Stocks</Link>
                        </MenubarItem>
                    </MenubarContent>
                </MenubarMenu>
                <MenubarMenu>
                    <MenubarTrigger>Requests</MenubarTrigger>
                    <MenubarContent>
                        <MenubarItem asChild>
                            <Link href="/requests/view">View Requests</Link>
                        </MenubarItem>
                        <MenubarItem asChild>
                            <Link href="/requests/send">Send Request</Link>
                        </MenubarItem>
                    </MenubarContent>
                </MenubarMenu>
                <MenubarMenu>
                    <MenubarTrigger>Friends</MenubarTrigger>
                    <MenubarContent>
                        <MenubarItem asChild>
                            <Link href="/friends">My Friends</Link>
                        </MenubarItem>
                    </MenubarContent>
                </MenubarMenu>
                <MenubarMenu>
                    <MenubarTrigger>Reviews</MenubarTrigger>
                    <MenubarContent>
                        <MenubarItem asChild>
                            <Link href="/reviews/view">View Reviews</Link>
                        </MenubarItem>
                    </MenubarContent>
                </MenubarMenu>
                <MenubarMenu>
                    <MenubarTrigger>Portfolios</MenubarTrigger>
                    <MenubarContent>
                        <MenubarItem asChild>
                            <Link href="/portfolios/create">
                                Create Portfolio
                            </Link>
                        </MenubarItem>
                        <MenubarItem asChild>
                            <Link href="/portfolios/view">View Portfolios</Link>
                        </MenubarItem>
                    </MenubarContent>
                </MenubarMenu>
            </div>

            {user && (
                <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        Logged in as:{' '}
                        <span className="font-bold">{user.username}</span> | id:{' '}
                        <span className="font-bold">{user.user_id}</span>
                    </div>
                    <Button size="sm" onClick={handleLogout}>
                        Logout
                    </Button>
                </div>
            )}
        </Menubar>
    );
}
