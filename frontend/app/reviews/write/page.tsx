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
import { Textarea } from '@/components/ui/textarea';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, Suspense, useRef } from 'react';
import { toast } from 'sonner';

function WriteReviewForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [listId, setListId] = useState('');
    const [content, setContent] = useState('');
    const [listExists, setListExists] = useState(false);
    const [stockListName, setStockListName] = useState('');
    const [isCheckingList, setIsCheckingList] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [user, setUser] = useState<{
        user_id: number;
        username: string;
    } | null>(null);

    const checkedListsRef = useRef<Set<string>>(new Set());
    const isFirstRenderRef = useRef(true);

    // Define checkStockListExistence with useCallback
    const checkStockListExistence = useCallback(
        async (idToCheck = listId) => {
            if (!idToCheck || !user) {
                toast.error('Please log in and provide a list ID');
                return;
            }

            // Skip if we're already checking or we've checked this list in this session
            const cacheKey = `${idToCheck}-${user.user_id}`;
            if (isCheckingList || checkedListsRef.current.has(cacheKey)) {
                return;
            }

            setIsCheckingList(true);
            try {
                const res = await fetch(
                    `http://localhost:8000/reviews/list/${idToCheck}?user_id=${user.user_id}`
                );
                const data = await res.json();

                if (!res.ok) {
                    toast.error(data.error || 'Failed to fetch stock list');
                    setListExists(false);
                    setStockListName('');
                    // Don't add to checked lists on error so user can retry
                    return;
                }

                // Mark this list as checked
                checkedListsRef.current.add(cacheKey);

                setListExists(true);
                setStockListName(data.stockList.name);
                toast.success(`Stock list found: ${data.stockList.name}`);
            } catch (error) {
                toast.error(String(error));
                setListExists(false);
                setStockListName('');
            } finally {
                setIsCheckingList(false);
            }
        },
        [listId, user, isCheckingList]
    ); // Add isCheckingList to dependencies

    // Make checkListDirectly function a memoized function with useCallback
    const checkListDirectly = useCallback(
        async (id: string, userData: { user_id: number; username: string }) => {
            if (isCheckingList) return;

            const cacheKey = `${id}-${userData.user_id}`;
            if (checkedListsRef.current.has(cacheKey)) return;

            setIsCheckingList(true);
            try {
                const res = await fetch(
                    `http://localhost:8000/reviews/list/${id}?user_id=${userData.user_id}`
                );
                const data = await res.json();

                if (!res.ok) {
                    toast.error(data.error || 'Failed to fetch stock list');
                    setListExists(false);
                    setStockListName('');
                    return;
                }

                checkedListsRef.current.add(cacheKey);
                setListExists(true);
                setStockListName(data.stockList.name);
                toast.success(`Stock list found: ${data.stockList.name}`);
            } catch (error) {
                toast.error(String(error));
                setListExists(false);
                setStockListName('');
            } finally {
                setIsCheckingList(false);
            }
        },
        [isCheckingList]
    ); // Add isCheckingList as a dependency

    // Check for logged in user and URL params on mount
    useEffect(() => {
        if (!isFirstRenderRef.current) {
            return; // Skip effect after first render
        }

        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        } else {
            toast.error('Please log in to write reviews');
        }

        // Get list_id from URL if present
        const listIdParam = searchParams.get('list_id');
        if (listIdParam) {
            setListId(listIdParam);

            // Auto-check the list existence if we have a user - with slight delay to ensure user is set
            if (storedUser) {
                const timer = setTimeout(() => {
                    const userData = JSON.parse(storedUser);
                    // Do direct API call here instead of using the callback to avoid dependency issues
                    checkListDirectly(listIdParam, userData);
                }, 100);

                return () => clearTimeout(timer);
            }
        }

        isFirstRenderRef.current = false;
    }, [searchParams, checkListDirectly]); // Add checkListDirectly to dependencies

    // Reset check status when list ID changes
    useEffect(() => {
        if (listId) {
            setListExists(false);
            setStockListName('');
        }
    }, [listId]);

    async function handleSubmitReview(e: React.FormEvent) {
        e.preventDefault();

        if (!user) {
            toast.error('Please log in to submit a review');
            router.push('/users/login');
            return;
        }

        if (!listExists) {
            toast.error('Please check if the stock list exists first');
            return;
        }

        if (!content.trim()) {
            toast.error('Review content cannot be empty');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('http://localhost:8000/reviews/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: user.user_id,
                    list_id: parseInt(listId),
                    content,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || 'Failed to submit review');
                return;
            }

            toast.success('Review submitted successfully');

            // Go back to the view reviews page
            router.push(`/reviews/view?list_id=${listId}`);
        } catch (error) {
            toast.error(String(error));
        } finally {
            setIsSubmitting(false);
        }
    }

    // Use this handler instead of directly calling checkStockListExistence to reset the cache
    function handleCheckListClick() {
        // Reset the cache for this list ID so we can check again
        if (user) {
            const cacheKey = `${listId}-${user.user_id}`;
            checkedListsRef.current.delete(cacheKey);
        }
        checkStockListExistence();
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl font-bold">
                    Write Review
                </CardTitle>
                <CardDescription>
                    Share your thoughts about a stock list
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!user ? (
                    <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/30 p-4">
                        <p className="text-yellow-800 dark:text-yellow-200">
                            Please log in to write reviews
                        </p>
                        <Button
                            className="mt-2"
                            onClick={() => router.push('/users/login')}
                        >
                            Go to Login
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmitReview} className="space-y-4">
                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <Label>Stock List ID</Label>
                                <Input
                                    value={listId}
                                    onChange={(e) => {
                                        setListId(e.target.value);
                                    }}
                                    placeholder="Enter the list ID you want to review"
                                    disabled={isCheckingList || isSubmitting}
                                />
                            </div>
                            <Button
                                type="button"
                                onClick={handleCheckListClick}
                                disabled={
                                    !listId || isCheckingList || isSubmitting
                                }
                            >
                                {isCheckingList ? 'Checking...' : 'Check List'}
                            </Button>
                        </div>

                        {listExists && (
                            <div className="rounded-md bg-green-50 dark:bg-green-900/30 p-3 text-green-800 dark:text-green-200">
                                Stock list found:{' '}
                                <strong>{stockListName}</strong>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Your Review</Label>
                            <Textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Write your review here (max 4000 characters)"
                                rows={8}
                                disabled={!listExists || isSubmitting}
                                maxLength={4000}
                            />
                            <p className="text-xs text-muted-foreground text-right">
                                {content.length}/4000 characters
                            </p>
                        </div>

                        <div className="flex justify-between">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    !listExists ||
                                    !content.trim() ||
                                    isSubmitting
                                }
                            >
                                {isSubmitting
                                    ? 'Submitting...'
                                    : 'Submit Review'}
                            </Button>
                        </div>
                    </form>
                )}
            </CardContent>
        </Card>
    );
}

export default function WriteReviewPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-pulse flex space-x-4">
                        <div className="h-10 w-10 bg-muted rounded-full"></div>
                        <div className="space-y-4 flex-1">
                            <div className="h-4 bg-muted rounded w-3/4"></div>
                            <div className="h-4 bg-muted rounded"></div>
                            <div className="h-4 bg-muted rounded w-5/6"></div>
                        </div>
                    </div>
                </div>
            }
        >
            <WriteReviewForm />
        </Suspense>
    );
}
