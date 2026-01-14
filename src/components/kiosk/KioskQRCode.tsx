import React from 'react';
import QRCode from 'react-qr-code';

interface KioskQRCodeProps {
    url: string;
    imageUrl?: string;
    label?: string;
}

export const KioskQRCode: React.FC<KioskQRCodeProps> = ({ url, imageUrl, label }) => {
    return (
        <div className="flex flex-col items-center justify-center bg-white p-6 rounded-3xl shadow-2xl">
            <div className="relative flex items-center justify-center">
                <QRCode
                    value={url}
                    size={256}
                    level="H"
                />
                {imageUrl && (
                    <div className="absolute bg-white p-1 rounded-full">
                        <img
                            src={imageUrl}
                            alt="Logo"
                            className="w-12 h-12 object-contain rounded-full"
                        />
                    </div>
                )}
            </div>
            {label && (
                <p className="mt-4 text-black font-bold text-xl uppercase tracking-widest">{label}</p>
            )}
        </div>
    );
};

