import type { ChangeEvent } from 'react';
import { useEffect, useState } from 'react';

import { c } from 'ttag';

import { Tooltip } from '@proton/atoms';
import type { ModalOwnProps } from '@proton/components/components/modalTwo/Modal';
import Prompt from '@proton/components/components/prompt/Prompt';
import useNotifications from '@proton/components/hooks/useNotifications';
import useLoading from '@proton/hooks/useLoading';
import { WALLET_APP_NAME } from '@proton/shared/lib/constants';
import { validateEmailAddress } from '@proton/shared/lib/helpers/email';
import walletUserDark from '@proton/styles/assets/img/wallet/wallet-user-dark.jpg';
import walletUser from '@proton/styles/assets/img/wallet/wallet-user.jpg';
import { useWalletApiClients } from '@proton/wallet';
import { WalletThemeOption } from '@proton/wallet/utils/theme';

import { Button, Input } from '../../atoms';
import { ModalParagraph } from '../../atoms/ModalParagraph';
import { EmailSelect } from '../EmailSelect';
import { useWalletTheme } from '../Layout/Theme/WalletThemeProvider';

interface InviteModalOwnProps {
    onInviteSent: (email: string) => void;
    defaultInviterAddressID?: string;
}

type Props = ModalOwnProps & InviteModalOwnProps;

export const InviteModal = ({ defaultInviterAddressID, onInviteSent, ...modalProps }: Props) => {
    const theme = useWalletTheme();
    const [selectedInviterId, setSelectedInviterId] = useState<string>();

    useEffect(() => {
        if (!selectedInviterId && defaultInviterAddressID) {
            setSelectedInviterId(defaultInviterAddressID);
        }
    }, [defaultInviterAddressID, selectedInviterId]);

    const [email, setEmail] = useState('');
    const walletApi = useWalletApiClients();
    const { createNotification } = useNotifications();
    const [loadingInvite, withLoadingInvite] = useLoading();

    const errorMessage = (() => {
        if (!selectedInviterId) {
            return c('Wallet invite').t`You need to select an email to send from`;
        }

        if (!email) {
            return c('Wallet invite').t`Email address is required`;
        }

        if (!validateEmailAddress(email)) {
            return c('Wallet invite').t`Email address is not valid`;
        }

        return null;
    })();

    const handleSend = async () => {
        if (!selectedInviterId || !validateEmailAddress(email)) {
            return;
        }

        try {
            await walletApi.invite.sendNewcomerInvite(email, selectedInviterId);

            onInviteSent(email);
            createNotification({ text: c('Bitcoin send').t`Invitation sent` });
        } catch (error: any) {
            createNotification({
                text:
                    error?.error ??
                    c('Bitcoin send').t`Invitation could not be sent. Please check details and try again.`,
            });
        }
    };

    return (
        <Prompt
            {...modalProps}
            buttons={[
                <Tooltip title={errorMessage}>
                    <Button
                        data-testid="send-invite-confirm-button"
                        fullWidth
                        color="norm"
                        shape="solid"
                        size="large"
                        disabled={!!errorMessage}
                        onClick={() => {
                            void withLoadingInvite(handleSend());
                        }}
                        loading={loadingInvite}
                    >{c('Wallet invite').t`Send invite email now`}</Button>
                </Tooltip>,
                <Button
                    fullWidth
                    color="weak"
                    shape="solid"
                    size="large"
                    onClick={() => {
                        modalProps.onClose?.();
                    }}
                >{c('Wallet invite').t`Not now`}</Button>,
            ]}
        >
            <div className="flex flex-column">
                <div className="flex items-center flex-column">
                    <img
                        src={theme === WalletThemeOption.WalletDark ? walletUserDark : walletUser}
                        alt=""
                        className="w-custom h-custom"
                        style={{ '--w-custom': '15rem', '--h-custom': '10.438rem' }}
                    />

                    <h1 className="block text-semibold text-4xl text-center mb-2">{c('Wallet invite').t`Invites`}</h1>
                </div>

                <ModalParagraph>
                    {
                        // translator: Invite your friends and family to Proton Wallet so you can all send Bitcoin via Email.
                        c('Wallet invite')
                            .t`Invite your friends and family to ${WALLET_APP_NAME} so you can all send Bitcoin via Email.`
                    }
                </ModalParagraph>

                <div className="flex flex-row mt-2 w-full">
                    <EmailSelect
                        value={selectedInviterId}
                        onChange={(addressID) => {
                            setSelectedInviterId(addressID);
                        }}
                    />
                </div>

                <div className="flex flex-row mt-2 w-full">
                    <Input
                        id="invitee-email-input"
                        data-testid="invitee-email-input"
                        label={c('Wallet invite').t`Email address`}
                        placeholder={c('Wallet invite').t`Your friend's email`}
                        value={email}
                        onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                            setEmail(event.target.value);
                        }}
                    />
                </div>
            </div>
        </Prompt>
    );
};
