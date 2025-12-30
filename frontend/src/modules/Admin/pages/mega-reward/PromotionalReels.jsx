import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiPlay, FiVideo, FiBarChart2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

// Sample video URLs for demo purposes
const SAMPLE_VIDEOS = [
    { label: 'Reel 1 (Demo)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
    { label: 'Reel 2 (Demo)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
    { label: 'Reel 3 (Demo)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
];

// Initial Mock Data for Testing
const MOCK_INITIAL_REELS = [
    {
        id: 9001,
        title: 'Mega Monsoon Sale 2025',
        description: 'Exclusive monsoon deals! Share this reel to enter the Lucky Draw. Win exciting prizes worth ₹50,000!',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
        isPromotional: true,
        uploadedBy: 'admin',
        shares: 45,
        likes: 120,
        comments: 15,
        dateAdded: new Date().toISOString()
    },
    {
        id: 9002,
        title: 'New Year Special Giveaways',
        description: 'Celebrate the New Year with our special giveaway event. Share now to participate!',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
        isPromotional: true,
        uploadedBy: 'admin',
        shares: 89,
        likes: 230,
        comments: 42,
        dateAdded: new Date(Date.now() - 86400000).toISOString()
    }
];

const PromotionalReels = () => {
    // Initialize state from localStorage or fallback to Mock Data
    const [reels, setReels] = useState(() => {
        const savedReels = localStorage.getItem('promotional_reels');
        if (savedReels) {
            return JSON.parse(savedReels);
        }
        return MOCK_INITIAL_REELS;
    });

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        videoUrl: '',
        thumbnail: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400' // Default dummy thumbnail
    });

    // Save to localStorage whenever reels change
    useEffect(() => {
        localStorage.setItem('promotional_reels', JSON.stringify(reels));
    }, [reels]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddReel = (e) => {
        e.preventDefault();
        if (!formData.title || !formData.videoUrl) {
            toast.error('Please fill in required fields');
            return;
        }

        const newReel = {
            id: Date.now(),
            ...formData,
            isPromotional: true,
            uploadedBy: 'admin',
            shares: 0,
            likes: 0,
            comments: 0,
            dateAdded: new Date().toISOString()
        };

        setReels(prev => [newReel, ...prev]);
        toast.success('Promotional Reel Added Successfully');
        setFormData({
            title: '',
            description: '',
            videoUrl: '',
            thumbnail: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400'
        });
    };

    const handleDeleteReel = (id) => {
        if (window.confirm('Are you sure you want to remove this promotional reel?')) {
            setReels(prev => prev.filter(r => r.id !== id));
            toast.success('Reel Removed');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Promotional Reels</h1>
                    <p className="text-gray-500 mt-1">Upload and manage exclusive reels for the Mega Reward program.</p>
                </div>
                <div className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold flex items-center gap-2">
                    <FiBarChart2 />
                    {reels.length} Active Reels
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Upload Form */}
                <div className="lg:col-span-8">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white text-sm">
                                    <FiPlus />
                                </span>
                                Upload New Reel
                            </h2>
                        </div>

                        <div className="p-6">
                            <form onSubmit={handleAddReel} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Reel Title <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                name="title"
                                                value={formData.title}
                                                onChange={handleInputChange}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                                                placeholder="e.g. Monsoon Sale Blast"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                                            <textarea
                                                name="description"
                                                value={formData.description}
                                                onChange={handleInputChange}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all h-32 resize-none"
                                                placeholder="Write a catchy description..."
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Video Source <span className="text-red-500">*</span></label>
                                            <div className="space-y-2">
                                                <select
                                                    onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer"
                                                    value={formData.videoUrl && SAMPLE_VIDEOS.find(v => v.url === formData.videoUrl) ? formData.videoUrl : ''}
                                                >
                                                    <option value="">Select a Demo Video</option>
                                                    {SAMPLE_VIDEOS.map((v, i) => (
                                                        <option key={i} value={v.url}>{v.label}</option>
                                                    ))}
                                                </select>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        name="videoUrl"
                                                        value={formData.videoUrl}
                                                        onChange={handleInputChange}
                                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pl-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm"
                                                        placeholder="Or paste direct video URL"
                                                    />
                                                    <FiVideo className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Thumbnail Image</label>
                                            <div className="flex gap-3">
                                                <input
                                                    type="text"
                                                    name="thumbnail"
                                                    value={formData.thumbnail}
                                                    onChange={handleInputChange}
                                                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm"
                                                    placeholder="https://image-url.com..."
                                                />
                                                <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                                                    {formData.thumbnail ? (
                                                        <img src={formData.thumbnail} alt="Preview" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300"><FiVideo /></div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100 flex justify-end">
                                    <button
                                        type="submit"
                                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-purple-600/20 transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        <FiPlus />
                                        Publish Reel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Right Column: Preview / Stats (Placeholder) */}
                <div className="lg:col-span-4">
                    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl shadow-lg p-6 text-white mb-6">
                        <h3 className="text-lg font-bold mb-2">Mega Reward Status</h3>
                        <p className="text-purple-100 text-sm mb-4">Reels are the gateway to the Mega Reward. Ensure high-quality content to boost participation.</p>
                        <div className="flex gap-4">
                            <div className="bg-white/10 rounded-lg p-3 flex-1 text-center backdrop-blur-sm">
                                <div className="text-2xl font-bold">{reels.reduce((acc, r) => acc + (r.shares || 0), 0)}</div>
                                <div className="text-xs text-purple-200 uppercase tracking-wide">Total Shares</div>
                            </div>
                            <div className="bg-white/10 rounded-lg p-3 flex-1 text-center backdrop-blur-sm">
                                <div className="text-2xl font-bold">{reels.reduce((acc, r) => acc + (r.likes || 0), 0)}</div>
                                <div className="text-xs text-purple-200 uppercase tracking-wide">Total Likes</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <h3 className="text-xl font-bold text-gray-900 mb-6 mt-10">Active Promotional Reels</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {reels.length === 0 ? (
                    <div className="col-span-full text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiVideo className="text-3xl text-gray-300" />
                        </div>
                        <h3 className="text-gray-900 font-semibold text-lg">No Reels Yet</h3>
                        <p className="text-gray-500">Upload your first promotional reel to get started.</p>
                    </div>
                ) : (
                    reels.map(reel => (
                        <div key={reel.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group">
                            {/* Video Preview */}
                            <div className="relative aspect-[9/16] bg-black">
                                <video src={reel.videoUrl} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />

                                {/* Overlay Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

                                {/* Badge */}
                                <div className="absolute top-3 right-3 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg">
                                    PROMO
                                </div>

                                {/* Play Button Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/20 backdrop-blur-[2px]">
                                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/50 text-white shadow-xl transform scale-50 group-hover:scale-100 transition-transform">
                                        <FiPlay className="ml-1 text-xl" />
                                    </div>
                                </div>

                                {/* Bottom Info (Over Video) */}
                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                    <h3 className="font-bold text-white text-lg leading-tight mb-1 drop-shadow-md truncate">{reel.title}</h3>
                                    <p className="text-gray-300 text-xs line-clamp-2 drop-shadow-sm mb-3">{reel.description || 'No description'}</p>

                                    {/* Stats Row */}
                                    <div className="flex items-center gap-3 text-white/90 text-xs font-medium">
                                        <span className="flex items-center gap-1"><FiPlay /> {Math.floor(Math.random() * 1000) + 100}</span>
                                        <span className="flex items-center gap-1"><FiTrash2 /> {reel.shares}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                <span className="text-xs text-gray-500 font-medium">{new Date(reel.dateAdded).toLocaleDateString()}</span>
                                <button
                                    onClick={() => handleDeleteReel(reel.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold"
                                >
                                    <FiTrash2 className="text-sm" /> Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default PromotionalReels;
