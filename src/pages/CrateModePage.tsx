import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DjCrateWidget } from '../components/DjCrateWidget';

export const CrateModePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const handleClose = async () => {
        // 1. Reset Window Size (Standard Desktop App Size)
        const isElectron = !!(window as any).electronAPI;
        if (isElectron) {
            await (window as any).electronAPI.toggleFloating(false);
        }

        // 2. Navigate back to DJ Dashboard (Queue)
        if (id) {
            navigate(`/dj/event/${id}`);
        } else {
            navigate('/dj');
        }
    };

    if (!id) return <div>Invalid Event ID</div>;

    return (
        <div className="w-full h-full bg-transparent">
            <DjCrateWidget
                eventId={id}
                onCloseWidget={handleClose}
            />
        </div>
    );
};
