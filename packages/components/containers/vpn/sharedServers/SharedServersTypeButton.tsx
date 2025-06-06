import React from 'react';

import Radio from '@proton/components/components/input/Radio';
import { illustrations, isValidLabel } from '@proton/components/containers/vpn/sharedServers/illustrations';
import clsx from '@proton/utils/clsx';
import noop from '@proton/utils/noop';

type SharedServersTypeButtonProps = {
    onClick: () => void;
    label: string;
    description: string;
    isSelected?: boolean;
};

const SharedServersTypeButton: React.FC<SharedServersTypeButtonProps> = ({
    onClick,
    label,
    description,
    isSelected = false,
}) => {
    const selectedStyle = {
        background:
            'linear-gradient(78deg, color-mix(in srgb, var(--interaction-norm-minor-1) 80%, transparent) 0%, color-mix(in srgb, var(--interaction-norm-minor-2) 20%, transparent) 100%)',
    };

    return (
        <button
            type="button"
            aria-pressed={isSelected}
            className={clsx(
                'flex flex-row border flex-nowrap rounded-lg w-full overflow-hidden gap-4 text-left',
                isSelected ? 'border-primary' : 'border-weak bg-norm'
            )}
            style={isSelected ? selectedStyle : {}}
            onClick={onClick}
        >
            {/* Top Section: Radio and Text */}
            <div className="flex flex-row flex-nowrap items-start gap-2 px-4 py-4 w-full">
                <span aria-hidden="true" className="shrink-0">
                    <Radio id={label} checked={isSelected} onChange={noop} name={label} tabIndex={-1} />
                </span>
                <div className="flex-1 pt-0.5">
                    <p className="mt-0 mb-1">
                        <strong>{label}</strong>
                    </p>
                    <p className="m-0 color-weak text-sm">{description}</p>
                </div>
            </div>

            <div className="bg-white rounded-lg flex items-center w-32 h-32 justify-center self-end">
                <img
                    src={
                        isValidLabel(label)
                            ? isSelected
                                ? illustrations[label].selected
                                : illustrations[label].deselected
                            : '#'
                    }
                    alt=""
                />
            </div>
        </button>
    );
};

export default SharedServersTypeButton;
