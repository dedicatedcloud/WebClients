import type { ButtonHTMLAttributes, DetailedHTMLProps } from 'react';

import { Tooltip } from '@proton/atoms';
import clsx from '@proton/utils/clsx';

const ToolbarButton = ({
    children,
    disabled = false,
    className = '',
    title,
    onClick,
    ...rest
}: DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>) => (
    <Tooltip title={title}>
        <button
            type="button"
            disabled={disabled}
            className={clsx(['editor-toolbar-button interactive-pseudo-inset relative m-0 flex', className])}
            onClick={onClick}
            {...rest}
        >
            {children}
        </button>
    </Tooltip>
);

export default ToolbarButton;
