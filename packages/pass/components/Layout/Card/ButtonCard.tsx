import type { FC } from 'react';

import { Button } from '@proton/atoms';
import { Icon } from '@proton/components';
import { CardContent, type CardContentProps } from '@proton/pass/components/Layout/Card/CardContent';
import clsx from '@proton/utils/clsx';

import { CardIcon } from './CardIcon';
import { type CardType, getCardTheme } from './utils';

import './ButtonCard.scss';

export type ButtonCardProps = CardContentProps & {
    disabled?: boolean;
    type?: CardType;
    onClick?: () => void;
};

export const ButtonCard: FC<ButtonCardProps> = ({ actions, disabled, title, subtitle, icon, type, onClick }) => (
    <div
        className={clsx(
            getCardTheme(type),
            'pass-button-card',
            type && `pass-button-card:${type}`,
            disabled && 'pointer-events-none'
        )}
    >
        <Button
            shape="solid"
            fullWidth
            size="medium"
            className={clsx(
                'border-weak flex justify-space-between flex-nowrap items-center rounded-lg button-fluid',
                !onClick && 'cursor-default',
                !type && 'bg-weak'
            )}
            onClick={onClick}
        >
            <CardContent
                className="p-1"
                icon={
                    icon
                        ? () => (
                              <div className="w-custom shrink-0" style={{ '--w-custom': '1.5em' }}>
                                  {typeof icon === 'function' ? icon() : <CardIcon icon={icon} />}
                              </div>
                          )
                        : undefined
                }
                title={title}
                titleClassname="text-semibold"
                subtitle={subtitle}
                actions={
                    <div className="flex shrink-0 gap-1">
                        {actions}
                        {onClick && !disabled && (
                            <Icon name="chevron-right" size={5} className={type ? 'color-strong' : 'color-weak'} />
                        )}
                    </div>
                }
            />
        </Button>
    </div>
);
