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
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, Suspense, useRef } from 'react';
import { toast } from 'sonner';

interface Review {
    review_id: number;
    user_id: number;
    list_id: number;
    content: string;
    timestamp: string;
    username: string;
    list_name?: string;
}

interface StockList {
    list_id: number;
    name: string;
    visibility: string;
    creator_name: string;
}

function ReviewsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [listId, setListId] = useState('');
    const [reviews, setReviews] = useState<Review[]>([]);
    const [stockList, setStockList] = useState<StockList | null>(null);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<{
        user_id: number;
        username: string;
    } | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'user'>('list');

    // Add refs to track fetched lists and prevent repeated API calls
    const fetchedListsRef = useRef<Set<string>>(new Set());
    const initialLoadDoneRef = useRef(false);

    // Define fetchReviewsForList with useCallback to prevent unnecessary re-renders
    const fetchReviewsForList = useCallback(
        async (id = listId) => {
            if (!id) {
                toast.error('Please enter a stock list ID');
                return;
            }

            // Skip if we're already loading or have fetched this list before in this session
            const cacheKey = `list-${id}-${user?.user_id || 'guest'}`;
            if (loading || fetchedListsRef.current.has(cacheKey)) {
                return;
            }

            fetchedListsRef.current.add(cacheKey);
            setLoading(true);

            try {
                const url = `http://localhost:8000/reviews/list/${id}${user ? `?user_id=${user.user_id}` : ''}`;
                const res = await fetch(url);
                const data = await res.json();

                if (!res.ok) {
                    toast.error(data.error || 'Failed to fetch reviews');
                    setReviews([]);
                    setStockList(null);
                    return;
                }

                // Ensure reviews is always an array, even if the API returns null
                const reviewsArray = Array.isArray(data.reviews)
                    ? data.reviews
                    : [];

                setReviews(reviewsArray);
                setStockList(data.stockList);
                setViewMode('list');

                // Only show info toast on manual searches, not initial load
                if (initialLoadDoneRef.current && reviewsArray.length === 0) {
                    toast.info('No reviews found for this stock list');
                }
            } catch (error) {
                toast.error(String(error));
                setReviews([]);
                setStockList(null);
            } finally {
                setLoading(false);
                initialLoadDoneRef.current = true;
            }
        },
        [listId, user, loading]
    );

    // Define fetchUserReviews with useCallback - similar safeguards needed here
    const fetchUserReviews = useCallback(
        async (userId: number) => {
            if (!userId) return;

            const cacheKey = `user-${userId}`;
            if (loading || fetchedListsRef.current.has(cacheKey)) {
                return;
            }

            fetchedListsRef.current.add(cacheKey);
            setLoading(true);

            try {
                const res = await fetch(
                    `http://localhost:8000/reviews/user/${userId}`
                );
                const data = await res.json();

                if (!res.ok) {
                    toast.error(data.error || 'Failed to fetch your reviews');
                    setReviews([]);
                    return;
                }

                // Ensure reviews is always an array
                const reviewsArray = Array.isArray(data.reviews)
                    ? data.reviews
                    : [];
                setReviews(reviewsArray);
                setStockList(null);
                setViewMode('user');

                // Only show info toast on manual actions, not initial load
                if (initialLoadDoneRef.current && reviewsArray.length === 0) {
                    toast.info('You have not written any reviews yet');
                }
            } catch (error) {
                toast.error(String(error));
                setReviews([]);
            } finally {
                setLoading(false);
                initialLoadDoneRef.current = true;
            }
        },
        [loading]
    );

    useEffect(() => {
        // Reset the fetch tracking when searchParams changes
        fetchedListsRef.current.clear();

        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }

        // Check if we have a list_id in the URL
        const listIdParam = searchParams.get('list_id');
        if (listIdParam) {
            setListId(listIdParam);
            setViewMode('list');
            // Auto-fetch reviews if we have a list ID
            fetchReviewsForList(listIdParam);
        } else if (storedUser) {
            // If no list ID but user is logged in, show user's reviews
            setViewMode('user');
            fetchUserReviews(JSON.parse(storedUser).user_id);
        }
    }, [searchParams, fetchReviewsForList, fetchUserReviews]); // Add both functions to dependencies

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        // Clear the cache before a manual search
        fetchedListsRef.current.clear();
        fetchReviewsForList();
    }

    // Reset the cache when switching views
    function handleViewModeSwitch(userId: number) {
        fetchedListsRef.current.clear();
        setViewMode('user');
        fetchUserReviews(userId);
    }

    function formatDate(dateString: string) {
        return new Date(dateString).toLocaleString();
    }

    function handleWriteReview() {
        if (listId) {
            router.push(`/reviews/write?list_id=${listId}`);
        } else {
            router.push('/reviews/write');
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
                        <div>
                            <CardTitle className="text-2xl font-bold">
                                {viewMode === 'list'
                                    ? 'Stock List Reviews'
                                    : 'My Reviews'}
                            </CardTitle>
                            <CardDescription>
                                {viewMode === 'list'
                                    ? 'View all reviews for a specific stock list'
                                    : "Reviews you've written for stock lists"}
                            </CardDescription>
                        </div>

                        {user && (
                            <div className="flex gap-2">
                                <Button
                                    variant={
                                        viewMode === 'user'
                                            ? 'default'
                                            : 'outline'
                                    }
                                    onClick={() =>
                                        handleViewModeSwitch(user.user_id)
                                    }
                                >
                                    My Reviews
                                </Button>
                                <Button onClick={handleWriteReview}>
                                    Write a Review
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>

                {viewMode === 'list' && (
                    <CardContent>
                        <form
                            onSubmit={handleSearch}
                            className="flex gap-2 mb-6"
                        >
                            <Input
                                value={listId}
                                onChange={(e) => setListId(e.target.value)}
                                placeholder="Enter stock list ID to view reviews"
                                className="flex-1"
                                disabled={loading}
                            />
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Loading...' : 'Search'}
                            </Button>
                        </form>

                        {stockList && (
                            <div className="bg-muted p-4 rounded-md mb-6">
                                <h3 className="font-medium text-lg">
                                    {stockList.name}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Created by: {stockList.creator_name} |
                                    Visibility: {stockList.visibility}
                                </p>
                            </div>
                        )}
                    </CardContent>
                )}
            </Card>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-pulse space-y-4 w-full max-w-2xl">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-10 bg-muted rounded"></div>
                        <div className="h-20 bg-muted rounded"></div>
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                    </div>
                </div>
            ) : reviews.length > 0 ? (
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <Card key={review.review_id}>
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-medium">
                                            {review.username}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDate(review.timestamp)}
                                        </p>
                                    </div>

                                    {viewMode === 'user' && (
                                        <div className="bg-muted text-xs px-2 py-1 rounded">
                                            List: {review.list_name}
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2 whitespace-pre-wrap bg-muted/50 p-4 rounded-md">
                                    {review.content}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <p className="text-muted-foreground mb-4">
                            {viewMode === 'list'
                                ? stockList
                                    ? 'No reviews found for this stock list.'
                                    : 'Enter a stock list ID to view reviews.'
                                : "You haven't written any reviews yet."}
                        </p>
                        {user && (
                            <Button onClick={handleWriteReview}>
                                Write a Review
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default function ViewReviewsPage() {
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
            <ReviewsContent />
        </Suspense>
    );
}
