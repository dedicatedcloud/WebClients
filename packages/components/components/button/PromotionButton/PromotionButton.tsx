import type { ElementType, ForwardedRef } from 'react';
import { forwardRef } from 'react';

import type { ButtonLikeProps } from '@proton/atoms';
import { ButtonLike, CircleLoader } from '@proton/atoms';
import Icon, { type IconName, type IconSize } from '@proton/components/components/icon/Icon';
import type { Breakpoints } from '@proton/components/hooks/useActiveBreakpoint';
import useActiveBreakpoint from '@proton/components/hooks/useActiveBreakpoint';
import useUid from '@proton/components/hooks/useUid';
import type { PolymorphicForwardRefExoticComponent, PolymorphicPropsWithRef } from '@proton/react-polymorphic-types';
import clsx from '@proton/utils/clsx';

import './PromotionButton.scss';

type ButtonButtonLikeProps = ButtonLikeProps<'button'>;

interface OwnProps extends Omit<ButtonLikeProps<'button'>, 'as' | 'ref'> {
    iconName?: IconName;
    icon?: boolean;
    iconSize?: IconSize;
    iconGradient?: boolean;
    upsell?: boolean;
    shape?: ButtonButtonLikeProps['shape'];
    size?: ButtonButtonLikeProps['size'];
    className?: string;
    loading?: boolean;
    responsive?: boolean;
    buttonGradient?: boolean;
    fullGradient?: boolean;
    breakpoint?: keyof Breakpoints['viewportWidth'];
}

export type PromotionButtonProps<E extends ElementType> = PolymorphicPropsWithRef<OwnProps, E>;

const defaultElement = ButtonLike;

const PromotionButtonBase = <E extends ElementType = typeof defaultElement>(
    {
        children,
        iconName,
        icon,
        iconGradient = true,
        iconSize,
        shape = 'outline',
        size = 'medium',
        upsell,
        as,
        className,
        loading,
        responsive = false,
        buttonGradient = true,
        fullGradient = false,
        breakpoint = '>=large',
        ...rest
    }: PromotionButtonProps<E>,
    ref: ForwardedRef<Element>
) => {
    const { viewportWidth } = useActiveBreakpoint();

    if (iconSize === undefined) {
        switch (true) {
            case (icon && upsell) || size === 'small':
                iconSize = 4;
                break;
            default:
                iconSize = 5;
                break;
        }
    }

    if (responsive && !viewportWidth[breakpoint]) {
        shape = 'ghost';
        icon = true;
        iconSize = 5;
    }

    const Element: ElementType = as || defaultElement;

    const uid = useUid('linear-gradient');

    return (
        <ButtonLike
            as={Element}
            ref={ref}
            type="button"
            icon={icon}
            color="weak"
            shape={shape}
            size={size}
            className={clsx(
                'max-w-full flex items-center',
                buttonGradient && 'button-promotion',
                iconGradient && 'button-promotion--icon-gradient',
                fullGradient && 'button-promotion--full-gradient',
                upsell && 'button-promotion--upgrade',
                size === 'small' && 'text-sm',
                className
            )}
            {...rest}
        >
            <span
                className={clsx(
                    'relative flex flex-nowrap items-center',
                    size === 'small' ? 'gap-1' : 'gap-2',
                    responsive && viewportWidth['>=large'] ? 'w-full' : undefined
                )}
            >
                {iconName && (
                    <Icon
                        name={iconName}
                        className="shrink-0"
                        size={iconSize}
                        style={
                            buttonGradient && !fullGradient
                                ? { fill: `url(#${uid}) var(--text-norm)` }
                                : { color: 'inherit' }
                        }
                    />
                )}
                <span className={clsx(icon ? 'sr-only' : 'block text-ellipsis')}>{children}</span>
                {loading && <CircleLoader />}
            </span>
            {iconName && iconGradient ? (
                <svg aria-hidden="true" focusable="false" className="sr-only">
                    <linearGradient id={uid}>
                        <stop offset="0%" stopColor="var(--color-stop-1)" />
                        <stop offset="100%" stopColor="var(--color-stop-2)" />
                    </linearGradient>
                </svg>
            ) : undefined}
        </ButtonLike>
    );
};

const PromotionButton: PolymorphicForwardRefExoticComponent<OwnProps, typeof defaultElement> =
    forwardRef(PromotionButtonBase);

export default PromotionButton;
