// Shared icon renderer — used by GameLoop (abilities) and BottomControls.
import React from 'react';
import { Sword, Shield, Zap, Heart, Skull, Ghost, Footprints, Crosshair, Wind, Flame, Droplets, Book, Hammer, Wand, Tornado } from 'lucide-react';

export const renderIcon = (iconName: string, size: number = 24, className: string = '') => {
    switch (iconName) {
        case 'Sword': return <Sword size={size} className={className} />;
        case 'Shield': return <Shield size={size} className={className} />;
        case 'Zap': return <Zap size={size} className={className} />;
        case 'Heart': return <Heart size={size} className={className} />;
        case 'Skull': return <Skull size={size} className={className} />;
        case 'Ghost': return <Ghost size={size} className={className} />;
        case 'Footprints': return <Footprints size={size} className={className} />;
        case 'Crosshair': return <Crosshair size={size} className={className} />;
        case 'Hurricane': return <Tornado size={size} className={className} />;
        case 'Tornado': return <Tornado size={size} className={className} />;
        case 'Wind': return <Wind size={size} className={className} />;
        case 'Flame': return <Flame size={size} className={className} />;
        case 'Droplets': return <Droplets size={size} className={className} />;
        case 'Book': return <Book size={size} className={className} />;
        case 'Hammer': return <Hammer size={size} className={className} />;
        case 'Wand': return <Wand size={size} className={className} />;
        default: return <Zap size={size} className={className} />;
    }
};
