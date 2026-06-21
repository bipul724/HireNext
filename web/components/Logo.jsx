import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Logo component with adjustable size
 * @param {Object} props
 * @param {'sm' | 'md' | 'lg' | 'xl'} props.size - Size of the logo (default: 'md')
 * @param {string} props.className - Additional CSS classes
 */
const Logo = ({ size = 'md', className = '' }) => {
    // Size configurations
    const sizes = {
        sm: {
            icon: 'h-6 w-6',
            iconInner: 'h-3.5 w-3.5',
            text: 'text-base',
        },
        md: {
            icon: 'h-8 w-8',
            iconInner: 'h-5 w-5',
            text: 'text-xl',
        },
        lg: {
            icon: 'h-10 w-10',
            iconInner: 'h-6 w-6',
            text: 'text-2xl',
        },
        xl: {
            icon: 'h-12 w-12',
            iconInner: 'h-7 w-7',
            text: 'text-3xl',
        },
    };

    const currentSize = sizes[size] || sizes.md;

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className={`flex ${currentSize.icon} items-center justify-center rounded-lg bg-indigo-600 shadow-lg shadow-indigo-500/20`}>
                <Sparkles className={`${currentSize.iconInner} text-white`} />
            </div>
            <span className={`${currentSize.text} font-bold tracking-tight text-slate-900`}>
                Hire<span className="text-indigo-600">Next</span>
            </span>
        </div>
    );
};

export default Logo;
