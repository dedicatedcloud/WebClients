/*
 * This file is auto-generated. Do not modify it manually!
 * Run 'yarn workspace @proton/icons build' to update the icons react components.
 */
import React from 'react';

import type { IconSize } from '../types';

interface IconProps extends React.SVGProps<SVGSVGElement> {
    /** If specified, renders an sr-only element for screenreaders */
    alt?: string;
    /** If specified, renders an inline title element */
    title?: string;
    /**
     * The size of the icon
     * Refer to the sizing taxonomy: https://design-system.protontech.ch/?path=/docs/components-icon--basic#sizing
     */
    size?: IconSize;
}

export const IcThreeDotsHorizontal = ({
    alt,
    title,
    size = 4,
    className = '',
    viewBox = '0 0 16 16',
    ...rest
}: IconProps) => {
    return (
        <>
            <svg
                viewBox={viewBox}
                className={`icon-size-${size} ${className}`}
                role="img"
                focusable="false"
                aria-hidden="true"
                {...rest}
            >
                {title ? <title>{title}</title> : null}

                <path d="M4 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path>
                <path d="M9 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path>
                <path d="M14 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path>
            </svg>
            {alt ? <span className="sr-only">{alt}</span> : null}
        </>
    );
};
