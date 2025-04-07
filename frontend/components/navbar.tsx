import {
    Menubar,
    MenubarContent,
    MenubarItem,
    MenubarMenu,
    MenubarTrigger,
} from '@/components/ui/menubar';
import Link from 'next/link';

export default function Navbar() {
    return (
        <Menubar className="p-8 sticky top-0">
            <MenubarMenu>
                <MenubarTrigger className="text-2xl font-bold">
                    <Link href="/">SNFS</Link>
                </MenubarTrigger>
            </MenubarMenu>
            <MenubarMenu>
                <MenubarTrigger>Users</MenubarTrigger>
                <MenubarContent>
                    <MenubarItem asChild>
                        <Link href="/users/register">Register</Link>
                    </MenubarItem>
                    <MenubarItem asChild>
                        <Link href="/users/login">Login</Link>
                    </MenubarItem>
                    <MenubarItem asChild>
                        <Link href="/users/portfolio">View Portfolio</Link>
                    </MenubarItem>
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
                <MenubarTrigger>Reviews</MenubarTrigger>
                <MenubarContent>
                    <MenubarItem>
                        <Link href="/reviews/view">View Reviews</Link>
                    </MenubarItem>
                    <MenubarItem>
                        <Link href="/reviews/write">Write Review</Link>
                    </MenubarItem>
                    <MenubarItem>
                        <Link href="/reviews/edit">Edit Review</Link>
                    </MenubarItem>
                    <MenubarItem>
                        <Link href="/reviews/delete">Delete Review</Link>
                    </MenubarItem>
                </MenubarContent>
            </MenubarMenu>
        </Menubar>
    );
}
