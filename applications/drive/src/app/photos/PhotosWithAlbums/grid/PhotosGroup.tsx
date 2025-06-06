import type { CSSProperties, FC } from 'react';

import { c } from 'ttag';

import { Checkbox, Loader } from '@proton/components';

type Props = {
    style: CSSProperties;
    text: string;
    showSeparatorLine: boolean;
    onSelect: (isSelected: boolean) => void;
    selected: boolean | 'some';
    isLoading: boolean;
    year?: number;
    month?: number;
};

export const PhotosGroup: FC<Props> = ({
    style,
    text,
    showSeparatorLine,
    onSelect,
    selected,
    isLoading,
    year,
    month,
}) => {
    return (
        <div
            style={style}
            data-testid="month-text"
            className="photos-group text-semibold text-no-wrap text-capitalize py-3 flex items-center flex-nowrap"
            data-year={year || 0}
            data-month={month || 0}
        >
            <Checkbox
                className="mr-2"
                checked={!!selected}
                data-testid="photos-group-checkbox"
                indeterminate={selected === 'some'}
                onChange={() => {
                    if (selected === 'some') {
                        onSelect(true);
                    } else {
                        onSelect(!selected);
                    }
                }}
                // Note: browsers combine aria-label and the actual label, the translation string is correct
                aria-label={
                    // translator: Used by screen readers to provide context for Photos groups (e.g. Select all items for September)
                    c('Info').t`Select all items for`
                }
            >
                {text}
            </Checkbox>
            {isLoading && <Loader className="ml-2 flex items-center" />}
            {showSeparatorLine && <hr className="w-full m-0 ml-3 h-0 border-bottom border-weak" />}
        </div>
    );
};
