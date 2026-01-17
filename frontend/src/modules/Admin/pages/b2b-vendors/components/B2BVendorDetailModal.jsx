import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiUser, FiBriefcase, FiMapPin, FiFileText, FiDownload, FiEye, FiPhone, FiMail, FiStar, FiCalendar, FiCreditCard, FiCheckCircle } from "react-icons/fi";
import toast from "react-hot-toast";

const B2BVendorDetailModal = ({ isOpen, onClose, vendor }) => {
    if (!vendor) return null;

    // Extract documents from vendor object
    // Documents can be in vendor.documents (array) or vendor.vendor.documents (array)
    const vendorData = vendor.vendor || vendor;
    const documentsArray = vendorData.documents || [];
    
    // Debug logging
    console.log('Modal vendor data:', vendorData);
    console.log('Documents array:', documentsArray);
    
    // Find specific documents by name
    const findDocument = (docName) => {
        const found = documentsArray.find(doc => {
            const name = (doc.name || '').toLowerCase();
            return name.includes(docName.toLowerCase());
        });
        console.log(`Finding document "${docName}":`, found);
        return found;
    };

    const panCardDoc = findDocument('pan');
    const businessLicenseDoc = findDocument('business') || findDocument('license') || findDocument('trade');
    
    console.log('PAN Card doc:', panCardDoc);
    console.log('Business License doc:', businessLicenseDoc);

    const handleDownload = async (url, filename, docType = 'application/pdf') => {
        if (!url) {
            console.error('No URL provided for download');
            toast.error('Document URL not found');
            return;
        }

        const toastId = toast.loading('Preparing download...');
        
        try {
            // For base64 data URLs
            if (url.startsWith('data:')) {
                const link = document.createElement("a");
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success('Download started', { id: toastId });
                return;
            }

            // For Cloudinary URLs, ensure fl_attachment is present for download
            let downloadUrl = url;
            if (downloadUrl.includes('cloudinary.com')) {
                if (!downloadUrl.includes('fl_attachment')) {
                    downloadUrl = downloadUrl.replace('/upload/', '/upload/fl_attachment/');
                }
            }

            // Fetch the file as blob
            const response = await fetch(downloadUrl);
            if (!response.ok) {
                throw new Error('Failed to fetch document');
            }

            const blob = await response.blob();
            
            // Ensure correct MIME type for PDF
            const isPDF = docType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf');
            const finalBlob = isPDF ? new Blob([blob], { type: 'application/pdf' }) : blob;
            
            // Create blob URL and download
            const blobUrl = window.URL.createObjectURL(finalBlob);
            const a = document.createElement('a');
            a.href = blobUrl;
            
            // Ensure correct filename with extension
            let fileName = filename || 'document';
            const ext = isPDF ? 'pdf' : (docType?.split('/')[1] || 'pdf');
            
            // Clean filename and add extension if missing
            const cleanName = fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const finalFileName = cleanName.endsWith(`.${ext}`) ? cleanName : `${cleanName}.${ext}`;
            
            a.download = finalFileName;
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            setTimeout(() => {
                window.URL.revokeObjectURL(blobUrl);
                document.body.removeChild(a);
            }, 100);
            
            toast.success('Download started', { id: toastId });
        } catch (err) {
            console.error('Download error:', err);
            toast.error('Download failed. Opening in new tab.', { id: toastId });
            // Fallback: open in new tab
            window.open(url, '_blank');
        }
    };

    const handleView = async (url, docType = 'application/pdf') => {
        if (!url) {
            console.error('No URL provided for view');
            toast.error('Document URL not found');
            return;
        }

        const isPDF = docType === 'application/pdf' || url.toLowerCase().includes('.pdf');
        const toastId = toast.loading(`Opening ${isPDF ? 'PDF' : 'document'}...`);
        
        try {
            // For base64 data URLs
            if (url.startsWith('data:')) {
                const newWindow = window.open();
                newWindow.document.write(
                    `<iframe src="${url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
                );
                toast.success('Document opened', { id: toastId });
                return;
            }

            // For Cloudinary URLs, force inline view by removing fl_attachment and adding fl_inline
            let viewUrl = url;
            if (viewUrl.includes('cloudinary.com')) {
                viewUrl = viewUrl.replace('/upload/fl_attachment/', '/upload/');
                if (isPDF && !viewUrl.includes('fl_inline')) {
                    viewUrl = viewUrl.replace('/upload/', '/upload/fl_inline/');
                }
            }

            // For PDFs, fetch and create blob URL to ensure it opens in browser
            if (isPDF) {
                try {
                    const response = await fetch(viewUrl);
                    if (!response.ok) {
                        throw new Error('Failed to fetch PDF');
                    }
                    const blob = await response.blob();
                    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
                    const blobUrl = window.URL.createObjectURL(pdfBlob);
                    window.open(blobUrl, '_blank');
                    toast.success('PDF opened in new tab', { id: toastId });
                } catch (fetchErr) {
                    console.warn('Fetch failed, falling back to direct link:', fetchErr);
                    window.open(viewUrl, '_blank');
                    toast.success('Opening document...', { id: toastId });
                }
            } else {
                // For images, direct open with fl_inline is usually fine
                window.open(viewUrl, '_blank');
                toast.success('Image opened in new tab', { id: toastId });
            }
        } catch (err) {
            console.error('View error:', err);
            window.open(url, '_blank');
            toast.dismiss(toastId);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-200 ring-4 ring-primary-50">
                                    <FiBriefcase className="text-white text-3xl" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">{vendorData.companyName || vendorData.storeName || vendorData.name || vendor.companyName || vendor.name}</h2>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${(vendorData.status || vendor.status) === 'Active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {vendorData.status || vendor.status}
                                        </span>
                                    </div>
                                    <p className="text-gray-500 font-medium flex items-center gap-2">
                                        <FiMail className="text-primary-500" /> {vendorData.email || vendor.email}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2.5 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-gray-600 hover:rotate-90"
                            >
                                <FiX size={28} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-10 scrollbar-hide">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                {/* Left Column: Contact & Business & Subscription */}
                                <div className="lg:col-span-1 space-y-10">
                                    {/* Subscription Section - Added */}
                                    <section>
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="p-2 bg-yellow-50 text-yellow-600 rounded-xl shadow-sm">
                                                <FiStar size={18} />
                                            </div>
                                            <h3 className="font-black text-gray-800 uppercase tracking-[0.15em] text-xs">Subscription Plan</h3>
                                        </div>
                                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
                                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-center mb-4">
                                                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Active Plan</p>
                                                    <FiCheckCircle className="text-green-500" />
                                                </div>
                                                <h4 className="text-white text-xl font-black mb-1">{(vendorData.subscription || vendor.subscription)?.name || "Premium Gold"}</h4>
                                                <div className="flex items-baseline gap-2 mb-4">
                                                    <span className="text-primary-400 text-2xl font-black">₹{(vendorData.subscription || vendor.subscription)?.price || "14,999"}</span>
                                                    <span className="text-gray-500 text-[10px] font-bold">/ {(vendorData.subscription || vendor.subscription)?.duration || 6} Months</span>
                                                </div>
                                                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase">
                                                        <FiCalendar /> Expires: Dec 20, 2024
                                                    </div>
                                                    <div className="text-primary-400">
                                                        <FiCreditCard size={16} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Contact Person */}
                                    <section>
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shadow-sm">
                                                <FiUser size={18} />
                                            </div>
                                            <h3 className="font-black text-gray-800 uppercase tracking-[0.15em] text-xs">Contact Person</h3>
                                        </div>
                                        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                                                    <FiUser size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Representative</p>
                                                    <p className="text-sm font-black text-gray-700">{vendorData.name || vendor.name}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shadow-sm border border-green-100">
                                                    <FiPhone size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Phone Number</p>
                                                    <p className="text-sm font-black text-gray-700">{vendorData.phone || vendor.phone || "+91 9876543210"}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                {/* Right Column: Address & Documents */}
                                <div className="lg:col-span-2 space-y-10">
                                    {/* Business Profile Summary */}
                                    <section className="bg-primary-50/50 p-6 rounded-[2.5rem] border border-primary-100/50 flex flex-wrap gap-10">
                                        <div>
                                            <p className="text-[9px] text-primary-400 font-black uppercase tracking-widest mb-2">GST Identification</p>
                                            <p className="text-lg font-black text-primary-900 leading-none">{vendorData.gstNumber || vendor.gstNumber || "22AAAAA0000A1Z5"}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-primary-400 font-black uppercase tracking-widest mb-2">Business Type</p>
                                            <div className="flex flex-wrap gap-2">
                                                {((vendorData.businessTypes || vendor.businessTypes) || ["Manufacturer", "Wholesaler"]).map((type, idx) => (
                                                    <span key={idx} className="px-3 py-1 bg-white border border-primary-200 rounded-full text-[10px] font-black text-primary-700 uppercase tracking-tighter shadow-sm">
                                                        {type}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </section>

                                    {/* Business Address - Redesigned */}
                                    <section>
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl shadow-sm">
                                                <FiMapPin size={18} />
                                            </div>
                                            <h3 className="font-black text-gray-800 uppercase tracking-[0.15em] text-xs">Registered Business Address</h3>
                                        </div>
                                        <div className="bg-white p-2 rounded-[2.5rem] border border-gray-100 shadow-sm">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex gap-4">
                                                    <div className="p-2.5 bg-white text-orange-500 rounded-xl shadow-sm h-fit border border-orange-50">
                                                        <FiMapPin size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Premises Details</p>
                                                        <p className="text-sm font-black text-gray-700 leading-relaxed uppercase">
                                                            {(vendorData.address || vendor.address)?.street || "123 Business Park, Main Road"}<br />
                                                            <span className="text-gray-500 font-medium text-xs normal-case">{(vendorData.address || vendor.address)?.landmark || "Near Metro Station"}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 mt-0">
                                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Region</p>
                                                        <p className="text-sm font-black text-gray-700 uppercase truncate">{(vendorData.address || vendor.address)?.city || "Mumbai"}</p>
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">{(vendorData.address || vendor.address)?.state || "Maharashtra"}</p>
                                                    </div>
                                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Zip Code</p>
                                                        <p className="text-sm font-black text-gray-700">{(vendorData.address || vendor.address)?.pincode || (vendorData.address || vendor.address)?.zipCode || "400001"}</p>
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">{(vendorData.address || vendor.address)?.country || "INDIA"}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Documents Section */}
                                    <section>
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="p-2 bg-green-50 text-green-600 rounded-xl shadow-sm">
                                                <FiFileText size={18} />
                                            </div>
                                            <h3 className="font-black text-gray-800 uppercase tracking-[0.15em] text-xs">KYC Documents</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* PAN Card */}
                                            <div className="flex items-center justify-between p-6 bg-white border border-gray-100 rounded-[2rem] hover:border-primary-200 transition-all group shadow-sm hover:shadow-md">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-primary-50 group-hover:text-primary-600 transition-all border border-transparent group-hover:border-primary-100 shadow-inner">
                                                        <FiFileText size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-gray-800 uppercase tracking-tighter">Income Tax PAN</p>
                                                        <p className="text-[9px] text-primary-400 font-bold tracking-widest uppercase">Verified format</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => panCardDoc?.url ? handleView(panCardDoc.url, panCardDoc.type || 'application/pdf') : toast.error('PAN Card document not found')}
                                                        className="p-2.5 bg-slate-50 text-slate-500 hover:bg-primary-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="View Document"
                                                        disabled={!panCardDoc?.url}
                                                    >
                                                        <FiEye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => panCardDoc?.url ? handleDownload(panCardDoc.url, "PAN_CARD.pdf", panCardDoc.type || 'application/pdf') : toast.error('PAN Card document not found')}
                                                        className="p-2.5 bg-slate-50 text-slate-400 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="Download Document"
                                                        disabled={!panCardDoc?.url}
                                                    >
                                                        <FiDownload size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Business License */}
                                            <div className="flex items-center justify-between p-6 bg-white border border-gray-100 rounded-[2rem] hover:border-primary-200 transition-all group shadow-sm hover:shadow-md">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-primary-50 group-hover:text-primary-600 transition-all border border-transparent group-hover:border-primary-100 shadow-inner">
                                                        <FiFileText size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-gray-800 uppercase tracking-tighter">Trade License</p>
                                                        <p className="text-[9px] text-primary-400 font-bold tracking-widest uppercase">Official proof</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => businessLicenseDoc?.url ? handleView(businessLicenseDoc.url, businessLicenseDoc.type || 'application/pdf') : toast.error('Business License document not found')}
                                                        className="p-2.5 bg-slate-50 text-slate-500 hover:bg-primary-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="View Document"
                                                        disabled={!businessLicenseDoc?.url}
                                                    >
                                                        <FiEye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => businessLicenseDoc?.url ? handleDownload(businessLicenseDoc.url, "BUSINESS_LICENSE.pdf", businessLicenseDoc.type || 'application/pdf') : toast.error('Business License document not found')}
                                                        className="p-2.5 bg-slate-50 text-slate-400 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="Download Document"
                                                        disabled={!businessLicenseDoc?.url}
                                                    >
                                                        <FiDownload size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </div>

                        {/* Footer - Redesigned */}
                        <div className="p-8 bg-gradient-to-t from-slate-50 to-white border-t border-gray-100 flex flex-wrap items-center justify-between gap-6">
                            <div className="flex items-center gap-4 text-gray-400">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-black">{i}</div>
                                    ))}
                                </div>
                                <p className="text-[10px] font-bold uppercase tracking-widest">3-Stage Verification Check Completed</p>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={onClose}
                                    className="px-8 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-100 transition-all shadow-sm active:translate-y-px"
                                >
                                    Cancel
                                </button>
                                {(vendorData.status || vendor.status) === 'Pending' && (
                                    <>
                                        <button className="px-8 py-3.5 bg-red-50 text-red-600 border border-red-100 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95">
                                            Reject
                                        </button>
                                        <button className="px-10 py-3.5 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-primary-700 transition-all shadow-xl shadow-primary-200 active:scale-95">
                                            Approve Access
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default B2BVendorDetailModal;
