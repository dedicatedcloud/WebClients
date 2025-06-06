import { Href, Tooltip } from '@proton/atoms';
import { Icon, Loader } from '@proton/components';
import clsx from '@proton/utils/clsx';

import { getSendIconHref, getStatusIconName } from '../../helpers/message/icon';
import type { StatusIcon } from '../../models/crypto';

interface Props extends Partial<StatusIcon> {
    loading?: boolean;
    disabled?: boolean;
    useTooltip?: boolean;
    className?: string;
    isDetailsModal?: boolean;
    shouldHaveHref?: boolean;
}

const EncryptionStatusIcon = ({
    isEncrypted,
    fill,
    text,
    loading,
    shouldHaveHref = true,
    /**
     * Disabled is for the case when composer is fully disabled
     */
    disabled,
    useTooltip = true,
    className,
    isDetailsModal = false,
    colorClassName,
}: Props) => {
    if (loading) {
        return <Loader className="icon-size-4 m-auto flex" />;
    }
    if (fill === undefined && isEncrypted === undefined) {
        return null;
    }

    const href = shouldHaveHref && getSendIconHref({ isEncrypted, fill });
    const iconName = getStatusIconName({ isEncrypted, fill });
    const tooltip = useTooltip ? text : undefined;

    const spanClassNames = clsx(['inline-flex shrink-0 align-middle', className]);
    const icon = iconName && (
        <Icon size={4} name={iconName} className={colorClassName} alt={text || ''} data-testid="encryption-icon" />
    );

    if (isDetailsModal) {
        return <span className={spanClassNames}>{icon}</span>;
    }

    return (
        <Tooltip title={tooltip} data-testid="encryption-icon-tooltip">
            <span className={spanClassNames}>
                {href ? (
                    <Href href={href} className="flex shrink-0 m-auto" tabIndex={disabled ? -1 : undefined}>
                        {icon}
                    </Href>
                ) : (
                    icon
                )}
            </span>
        </Tooltip>
    );
};

export default EncryptionStatusIcon;
