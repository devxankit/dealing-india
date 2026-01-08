import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiPlay, FiVideo, FiBarChart2, FiLoader, FiUpload, FiImage } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../../shared/utils/api';

const PromotionalReels = () => {
    // Track which reel is being hovered to load its video source lazily
    const [hoveredReelId, setHoveredReelId] = useState(null);
    const [reels, setReels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [activeCampaign, setActiveCampaign] = useState(null);

    // File upload states
    const [videoFile, setVideoFile] = useState(null);
    const [thumbnailFile, setThumbnailFile] = useState(null);
    const [previewVideo, setPreviewVideo] = useState('');
    const [previewThumbnail, setPreviewThumbnail] = useState('');
    const [uploadingVideo, setUploadingVideo] = useState(false);
    const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        videoUrl: '', // Will be used if user enters manual URL
        thumbnail: '' // Will be used if user enters manual URL
    });

    useEffect(() => {
        fetchReels();
        fetchActiveCampaign();
    }, []);

    const fetchActiveCampaign = async () => {
        try {
            const response = await api.get('/admin/mega-reward/settings');
            if (response.success && response.data) {
                const active = response.data.find(c => c.isActive);
                setActiveCampaign(active);
            }
        } catch (error) {
            console.error('Failed to fetch active campaign:', error);
        }
    };

    const fetchReels = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/promotional-reels');
            if (response.success) {
                setReels(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch reels:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        if (type === 'video') {
            if (file.size > 100 * 1024 * 1024) { // Increased to 100MB
                toast.error('Video size should be less than 100MB');
                return;
            }
            setVideoFile(file);
            setPreviewVideo(URL.createObjectURL(file));
            setUploadingVideo(true);

            try {
                const data = new FormData();
                data.append('file', file);
                data.append('folder', 'promotional-reels/videos');
                data.append('resourceType', 'video');

                const response = await api.post('/admin/media/upload', data, {
                    timeout: 0 // Disable timeout for large uploads
                });

                if (response.success) {
                    setFormData(prev => ({ ...prev, videoUrl: response.data.secure_url }));
                    toast.success('Video uploaded successfully');
                }
            } catch (error) {
                console.error('Video upload error:', error);
                toast.error('Video upload failed');
                setVideoFile(null);
                setPreviewVideo('');
            } finally {
                setUploadingVideo(false);
            }
        } else if (type === 'thumbnail') {
            if (file.size > 10 * 1024 * 1024) {
                toast.error('Thumbnail size should be less than 10MB');
                return;
            }
            setThumbnailFile(file);
            setPreviewThumbnail(URL.createObjectURL(file));
            setUploadingThumbnail(true);

            try {
                const data = new FormData();
                data.append('file', file);
                data.append('folder', 'promotional-reels/thumbnails');

                const response = await api.post('/admin/media/upload', data);

                if (response.success) {
                    setFormData(prev => ({ ...prev, thumbnail: response.data.secure_url }));
                    toast.success('Thumbnail uploaded');
                }
            } catch (error) {
                console.error('Thumbnail upload error:', error);
                toast.error('Thumbnail upload failed');
                setThumbnailFile(null);
                setPreviewThumbnail('');
            } finally {
                setUploadingThumbnail(false);
            }
        }
    };

    const handleAddReel = async (e) => {
        e.preventDefault();

        // Validation: Need either a file or a URL for both video and thumbnail (thumbnail optional technically but good to have)
        const hasVideo = videoFile || formData.videoUrl;

        if (!formData.title || !hasVideo) {
            toast.error('Please provide a title and a video (upload or URL)');
            return;
        }

        setSubmitting(true);
        try {
            // Use FormData for file uploads
            const data = new FormData();
            data.append('title', formData.title);
            data.append('description', formData.description);

            if (formData.videoUrl) {
                data.append('videoUrl', formData.videoUrl);
            }

            if (formData.thumbnail) {
                data.append('thumbnailUrl', formData.thumbnail);
            }

            if (activeCampaign) {
                data.append('megaRewardId', activeCampaign._id);
            }

            // Note: If you have a specific endpoint or logic for multipart/form-data, ensure backend handles it.
            // Our current backend setup might need adjustment to handle mulitpart/form-data if not already set up.
            // Assuming we are sending this to an endpoint that supports file uploads or we need to convert to base64 frontend side first?
            // The prompt says "store on Cloudinary", which is typically handled by backend.
            // Let's assume the backend controller we set up calls a service that handles Cloudinary upload.
            // Wait, looking at previous backend code, it expects JSON body provided to `create`.
            // We need to update backend to support file upload or handle it here.
            // BUT: The user asked to "write backend accordingly". 
            // So we will send FormData and update backend to handle it.

            const response = await api.post('/admin/promotional-reels', data);

            if (response.success) {
                toast.success('Promotional Reel Added Successfully');
                // Reset form
                setFormData({
                    title: '',
                    description: '',
                    videoUrl: '',
                    thumbnail: ''
                });
                setVideoFile(null);
                setThumbnailFile(null);
                setPreviewVideo('');
                setPreviewThumbnail('');

                fetchReels();
            }
        } catch (error) {
            console.error('Add reel error:', error);
            toast.error(error.message || 'Failed to upload reel');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteReel = async (id) => {
        if (window.confirm('Are you sure you want to remove this promotional reel?')) {
            try {
                const response = await api.delete(`/admin/promotional-reels/${id}`);
                if (response.success) {
                    toast.success('Reel Removed');
                    fetchReels();
                }
            } catch (error) {
                console.error('Delete reel error:', error);
            }
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
                                        {/* Video Input Section */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Video Source <span className="text-red-500">*</span></label>

                                            {/* Tabs or Toggle for File vs URL could go here, but let's keep it simple: Show both options */}
                                            <div className="space-y-3">
                                                {/* Option 1: File Upload */}
                                                <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${videoFile ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
                                                    <input
                                                        type="file"
                                                        accept="video/*"
                                                        id="video-upload"
                                                        className="hidden"
                                                        onChange={(e) => handleFileChange(e, 'video')}
                                                    />
                                                    <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                                        {uploadingVideo ? <FiLoader className="text-2xl text-purple-600 animate-spin" /> : <FiUpload className={`text-2xl ${videoFile ? 'text-purple-600' : 'text-gray-400'}`} />}
                                                        <span className={`text-sm font-medium ${videoFile ? 'text-purple-700' : 'text-gray-500'}`}>
                                                            {uploadingVideo ? 'Uploading to cloud...' : videoFile ? videoFile.name : 'Click to upload video file'}
                                                        </span>
                                                        {!videoFile && !uploadingVideo && <span className="text-xs text-gray-400">MP4, WebM (Max 100MB)</span>}
                                                    </label>
                                                    {videoFile && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.preventDefault(); setVideoFile(null); setPreviewVideo(''); }}
                                                            className="mt-2 text-xs text-red-500 hover:underline"
                                                        >
                                                            Remove file
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="text-center text-xs text-gray-400 font-medium">OR</div>

                                                {/* Option 2: URL Input */}
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        name="videoUrl"
                                                        value={formData.videoUrl}
                                                        onChange={(e) => {
                                                            handleInputChange(e);
                                                            setVideoFile(null);
                                                            setPreviewVideo(e.target.value);
                                                        }}
                                                        disabled={!!videoFile}
                                                        className={`w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pl-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm ${videoFile ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        placeholder="Paste direct video URL"
                                                    />
                                                    <FiVideo className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Thumbnail Input Section */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Thumbnail Image</label>

                                            <div className="space-y-3">
                                                {/* Option 1: File Upload */}
                                                <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${thumbnailFile ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        id="thumbnail-upload"
                                                        className="hidden"
                                                        onChange={(e) => handleFileChange(e, 'thumbnail')}
                                                    />
                                                    <label htmlFor="thumbnail-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                                        {uploadingThumbnail ? <FiLoader className="text-2xl text-purple-600 animate-spin" /> : <FiImage className={`text-2xl ${thumbnailFile ? 'text-purple-600' : 'text-gray-400'}`} />}
                                                        <span className={`text-sm font-medium ${thumbnailFile ? 'text-purple-700' : 'text-gray-500'}`}>
                                                            {uploadingThumbnail ? 'Uploading...' : thumbnailFile ? thumbnailFile.name : 'Click to upload thumbnail'}
                                                        </span>
                                                    </label>
                                                    {thumbnailFile && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.preventDefault(); setThumbnailFile(null); setPreviewThumbnail(''); }}
                                                            className="mt-2 text-xs text-red-500 hover:underline"
                                                        >
                                                            Remove file
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="text-center text-xs text-gray-400 font-medium">OR</div>

                                                {/* Option 2: URL Input */}
                                                <div className="flex gap-3">
                                                    <input
                                                        type="text"
                                                        name="thumbnail"
                                                        value={formData.thumbnail}
                                                        onChange={(e) => {
                                                            handleInputChange(e);
                                                            setThumbnailFile(null);
                                                            setPreviewThumbnail(e.target.value);
                                                        }}
                                                        disabled={!!thumbnailFile}
                                                        className={`flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm ${thumbnailFile ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        placeholder="https://image-url.com..."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={submitting || uploadingVideo || uploadingThumbnail}
                                        className="px-8 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {submitting ? <FiLoader className="animate-spin" /> : <FiPlus />}
                                        {submitting ? 'Creating...' : (uploadingVideo || uploadingThumbnail) ? 'Please wait for upload...' : 'Create Promotional Reel'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Right Column: Live Preview / Stats */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-gray-900 rounded-[2.5rem] p-6 text-white shadow-2xl relative overflow-hidden border border-purple-500/20">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
                        <h3 className="text-sm font-black tracking-widest uppercase text-purple-400 mb-6 flex items-center gap-2">
                            <FiPlay /> Live Preview
                        </h3>

                        <div className="aspect-[9/16] bg-black rounded-3xl overflow-hidden relative border border-white/10 shadow-2xl mx-auto max-w-[240px]">
                            {previewVideo || formData.videoUrl ? (
                                <video
                                    key={previewVideo || formData.videoUrl}
                                    src={previewVideo || formData.videoUrl}
                                    className="w-full h-full object-cover"
                                    autoPlay
                                    muted
                                    loop
                                    // Add error handling for invalid video sources
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                    onLoadedData={(e) => { e.target.style.display = 'block'; }}
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 p-8 text-center">
                                    <FiVideo className="text-4xl mb-2 opacity-20" />
                                    <p className="text-xs font-bold">Select a video or enter URL to see preview</p>
                                </div>
                            )}

                            {/* Thumbnail Preview Overlay (only if no video playing or manual toggle? 
                                Actually standard behavior: show video if available. 
                                Could show thumbnail briefly or if video fails.) 
                             */}

                            {/* Reel Overlay Simulation */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none p-4 flex flex-col justify-end">
                                <h4 className="font-bold text-sm mb-1">{formData.title || 'Reel Title'}</h4>
                                <p className="text-[10px] text-gray-300 line-clamp-2">{formData.description || 'Reel description will appear here...'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reels List */}
            <div className="mt-12">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    Active Promotional Reels
                    {loading && <FiLoader className="animate-spin text-purple-600" />}
                </h2>

                {reels.length === 0 && !loading ? (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <FiVideo className="mx-auto text-4xl text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No promotional reels found.</p>
                        <p className="text-sm text-gray-400">Upload your first reel to get started!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {reels.map((reel) => (
                            <div
                                key={reel._id}
                                className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm group hover:shadow-md transition-all"
                                onMouseEnter={() => setHoveredReelId(reel._id)}
                                onMouseLeave={() => setHoveredReelId(null)}
                            >
                                <div className="aspect-[9/16] relative bg-gray-100 overflow-hidden">
                                    {hoveredReelId === reel._id ? (
                                        <video
                                            src={reel.videoUrl}
                                            className="w-full h-full object-cover"
                                            autoPlay
                                            muted
                                            loop
                                        />
                                    ) : (
                                        <img src={reel.thumbnail || 'https://via.placeholder.com/400x700?text=No+Thumbnail'} alt={reel.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    )}
                                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold text-white flex items-center gap-1">
                                        <FiPlay className="text-[8px]" /> {reel.shares || 0} Shares
                                    </div>
                                    <button
                                        onClick={() => handleDeleteReel(reel._id)}
                                        className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-gray-900 text-sm mb-1 truncate">{reel.title}</h3>
                                    <p className="text-xs text-gray-500 line-clamp-2 h-8">{reel.description}</p>
                                    <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        <div className="flex flex-col">
                                            <span>{new Date(reel.createdAt).toLocaleDateString()}</span>
                                            {reel.megaRewardId ? (
                                                <span className="text-purple-600 mt-1">Linked to Campaign</span>
                                            ) : (
                                                <span className="text-red-400 mt-1">Not Linked</span>
                                            )}
                                        </div>
                                        <span className={`text-xs ${reel.isActive ? 'text-green-600' : 'text-gray-400'} font-bold`}>
                                            {reel.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PromotionalReels;
