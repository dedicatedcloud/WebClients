import { type FC, useEffect } from 'react';

import { c } from 'ttag';

import { Card } from '@proton/pass/components/Layout/Card/Card';
import { VaultIcon } from '@proton/pass/components/Vault/VaultIcon';
import { useRequest } from '@proton/pass/hooks/useRequest';
import { type AccessItem, AccessTarget } from '@proton/pass/lib/access/types';
import { getShareAccessOptions } from '@proton/pass/store/actions';
import type { VaultShareItem } from '@proton/pass/store/reducers';
import { NewUserInviteState } from '@proton/pass/types';

import { PendingNewUser } from './PendingNewUser';

type Props = VaultShareItem & AccessItem & { onInvitesReady: () => void };

export const PendingNewUsersForShare: FC<Props> = ({
    content,
    newUserInvites,
    newUserInvitesReady,
    shareId,
    onInvitesReady,
}) => {
    const vaultName = content.name;
    const { revalidate, loading, error } = useRequest(getShareAccessOptions, {
        initial: { shareId },
        loading: true,
        onSuccess: onInvitesReady,
    });

    /** Revalidate the share access options on mount. This
     * will effectively refresh the share's `newUserInvites` */
    useEffect(() => revalidate({ shareId }), []);

    return (
        <div className="flex flex-column gap-2 w-full">
            <div className="flex gap-x-3 items-center">
                <VaultIcon size={4} color={content.display.color} icon={content.display.icon} />
                <div className="text-xl text-bold text-ellipsis max-w-full">{vaultName}</div>
            </div>

            {error ? (
                <Card type="danger" className="text-sm">
                    {c('Error').t`Could not retrieve user invites for the "${vaultName}" vault`}
                </Card>
            ) : (
                <>
                    {!loading
                        ? newUserInvites?.map(
                              (invite) =>
                                  invite.state === NewUserInviteState.READY && (
                                      <PendingNewUser
                                          key={invite.newUserInviteId}
                                          shareId={shareId}
                                          target={AccessTarget.Vault}
                                          {...invite}
                                      />
                                  )
                          )
                        : Array.from({ length: newUserInvitesReady }, (_, idx) => (
                              <div key={`loader-${idx}`} className="pass-skeleton pass-skeleton--box my-1.5" />
                          ))}
                </>
            )}
        </div>
    );
};
