import React, { useState, useEffect } from 'react';
import { FiStar } from 'react-icons/fi';
import { FaStar } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../../../shared/utils/api';
import { useAuthStore } from '../../../shared/store/authStore';
import StarRating from './StarRating';
import toast from 'react-hot-toast';

/**
 * Detail-page rating: shows average stars + count; lets logged-in user set their rating.
 * targetType: 'product' | 'lotslot' | 'property'
 * targetId: string
 * averageRating, ratingCount: from entity
 * onRated: optional callback after submit (e.g. refetch to update average)
 */
const RateThisBlock = ({ targetType, targetId, averageRating = 0, ratingCount = 0, onRated }) => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();
    const [userRating, setUserRating] = useState(null);
    const [hoverStar, setHoverStar] = useState(0);
    const [loading, setLoading] = useState(false);
    const [fetchingUser, setFetchingUser] = useState(true);

    useEffect(() => {
        if (!targetId || !targetType) return;
        const fetchUserRating = async () => {
            if (!isAuthenticated) {
                setFetchingUser(false);
                return;
            }
            try {
                const res = await api.get('/rating/user', {
                    params: { targetType, targetId },
                });
                if (res?.data?.data?.rating != null) setUserRating(res.data.data.rating);
                else if (res?.data?.rating != null) setUserRating(res.data.rating);
            } catch (e) {
                // ignore
            } finally {
                setFetchingUser(false);
            }
        };
        fetchUserRating();
    }, [targetType, targetId, isAuthenticated]);

    const handleSubmitRating = async (stars) => {
        if (!isAuthenticated) {
            navigate('/b2b/login');
            return;
        }
        setLoading(true);
        try {
            await api.post('/rating', {
                targetType,
                targetId,
                rating: stars,
                comment: '',
            });
            setUserRating(stars);
            toast.success('Rating saved');
            onRated?.();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to save rating');
        } finally {
            setLoading(false);
        }
    };

    const displayRating = averageRating || 0;
    const displayCount = ratingCount || 0;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] md:text-xs text-gray-500 font-black uppercase tracking-wider">
                    Rating
                </span>
                <StarRating averageRating={displayRating} ratingCount={displayCount} size="md" />
            </div>

            {!fetchingUser && isAuthenticated && (
                <div className="flex flex-col gap-2">
                    <span className="text-xs text-gray-600 font-bold uppercase tracking-wider">Your rating:</span>
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                disabled={loading}
                                onMouseEnter={() => setHoverStar(star)}
                                onMouseLeave={() => setHoverStar(0)}
                                onClick={() => handleSubmitRating(star)}
                                className="p-1 rounded hover:opacity-80 transition-opacity disabled:opacity-50"
                            >
                                {(hoverStar ? hoverStar >= star : userRating >= star) ? (
                                    <FaStar size={22} style={{ color: '#fbbf24' }} />
                                ) : (
                                    <FiStar size={22} style={{ color: '#e5e7eb' }} />
                                )}
                            </button>
                        ))}
                    </div>
                    {userRating && (
                        <span className="text-xs text-gray-500 font-bold">{userRating}/5</span>
                    )}
                </div>
            )}

            {!fetchingUser && !isAuthenticated && (
                <p className="text-xs text-gray-600">
                    <button
                        type="button"
                        onClick={() => navigate('/b2b/login')}
                        className="font-bold text-primary-600 hover:underline uppercase tracking-wider border border-primary-200 px-3 py-2 rounded-lg hover:bg-primary-50"
                    >
                        Login to rate
                    </button>
                </p>
            )}
        </div>
    );
};

export default RateThisBlock;
