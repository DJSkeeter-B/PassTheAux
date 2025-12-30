import React from 'react';
import QRCode from 'react-qr-code';
import { X, Download, Share2 } from 'lucide-react';
import { Event } from '../types';

interface QRCodeModalProps {
    title: string;
    subtitle?: string;
    link: string;
    logoUrl?: string;
    onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ title, subtitle, link, logoUrl, onClose }) => {
    // Logic: If customQrImageUrl exists (LOGO provided), we might want to overlay it.
    // React-qr-code doesn't support center image natively efficiently without SVG manipulation.
    // For MVP/Speed, we will just use the standard QR code, but if we wanted "Logo Centric", 
    // we would position the logo absolutely over the center of the QR code.
    // A "Full QR Code" is requested unless Logo provided.

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-3xl w-full max-w-sm relative flex flex-col items-center shadow-2xl animate-in zoom-in-50 duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 transition"
                >
                    <X size={24} />
                </button>

                <div className="text-center mb-6">
                    <h3 className="text-2xl font-black text-slate-900 mb-1">{title}</h3>
                    {subtitle && <p className="text-slate-500 text-sm font-medium">{subtitle}</p>}
                </div>

                <div className="relative p-2 bg-white rounded-xl shadow-inner border border-slate-100">
                    <div style={{ height: "auto", margin: "0 auto", maxWidth: 200, width: "100%" }}>
                        <QRCode
                            size={256}
                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                            value={link}
                            viewBox={`0 0 256 256`}
                            fgColor="#000000"
                            bgColor="#ffffff"
                        />
                    </div>
                    {/* Logo Overlay Logic */}
                    {logoUrl && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-12 h-12 bg-white p-1 rounded-full shadow-lg flex items-center justify-center overflow-hidden">
                                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover rounded-full" />
                            </div>
                        </div>
                    )}
                </div>

                <p className="mt-6 text-xs text-slate-400 font-medium text-center bg-slate-100 px-3 py-1 rounded-full">
                    Scan to join the Queue
                </p>

                <div className="grid grid-cols-2 gap-3 w-full mt-8">
                    <button className="flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition">
                        <Download size={16} /> Save
                    </button>
                    <button className="flex items-center justify-center gap-2 py-3 bg-indigo-100 text-indigo-700 rounded-xl font-bold text-sm hover:bg-indigo-200 transition">
                        <Share2 size={16} /> Share
                    </button>
                </div>
            </div>
        </div>
    );
};
