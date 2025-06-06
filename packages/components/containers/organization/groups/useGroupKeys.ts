import { useAddresses } from '@proton/account/addresses/hooks';
import { useGetOrganizationKey } from '@proton/account/organizationKey/hooks';
import { useGetUser } from '@proton/account/user/hooks';
import { useGetUserKeys } from '@proton/account/userKeys/hooks';
import useApi from '@proton/components/hooks/useApi';
import useAuthentication from '@proton/components/hooks/useAuthentication';
import useGetPublicKeysForInbox from '@proton/components/hooks/useGetPublicKeysForInbox';
import useNotifications from '@proton/components/hooks/useNotifications';
import type { PrivateKeyReference } from '@proton/crypto/lib';
import { KEYGEN_CONFIGS, KEYGEN_TYPES } from '@proton/shared/lib/constants';
import type { Address, DecryptedAddressKey } from '@proton/shared/lib/interfaces';
import { addAddressKeysProcess } from '@proton/shared/lib/keys';
import { getDecryptedGroupAddressKey } from '@proton/shared/lib/keys/groupKeys';

import useKTVerifier from '../../keyTransparency/useKTVerifier';

const keyGenConfig = KEYGEN_CONFIGS[KEYGEN_TYPES.CURVE25519];

const useGroupKeys = () => {
    const getUserKeys = useGetUserKeys();
    const api = useApi();
    const getUser = useGetUser();
    const authentication = useAuthentication();
    const [addresses = []] = useAddresses();
    const getPublicKeysForInbox = useGetPublicKeysForInbox();
    const { createNotification } = useNotifications();
    const getOrganizationKey = useGetOrganizationKey();
    const createKTVerifier = useKTVerifier();

    const addNewGroupAddressMemberKey = async (groupAddress: Address, groupAddressKey: DecryptedAddressKey) => {
        const userKeys = await getUserKeys();
        const { keyTransparencyCommit, keyTransparencyVerify } = await createKTVerifier();
        const [newKey] = await addAddressKeysProcess({
            api,
            userKeys,
            keyGenConfig,
            addresses,
            address: groupAddress,
            addressKeys: [groupAddressKey],
            keyPassword: authentication.getPassword(),
            keyTransparencyVerify,
        });
        const { privateKey: groupKey } = newKey;
        await keyTransparencyCommit(await getUser(), userKeys);

        return {
            groupKey,
            groupAddressKey,
        };
    };

    const getGroupAddressKey = async (
        groupAddress: Address,
        // this function is faster if called with organizationKey
        organizationKey: PrivateKeyReference | undefined = undefined
    ): Promise<DecryptedAddressKey> => {
        if (organizationKey === undefined) {
            const cachedOrganizationKey = await getOrganizationKey();
            if (cachedOrganizationKey.privateKey === undefined) {
                throw new Error('Organization key is undefined');
            }
            organizationKey = cachedOrganizationKey.privateKey;
        }

        const encryptedKeys = groupAddress.Keys;
        const groupAddressKey = await getDecryptedGroupAddressKey(encryptedKeys, organizationKey);

        if (groupAddressKey === undefined) {
            throw new Error('Missing group address keys');
        }

        if (groupAddressKey.privateKey === undefined) {
            throw new Error('Missing group address private key');
        }

        return groupAddressKey;
    };

    const getMemberPublicKeys = async (memberEmail: string) => {
        const memberPublicKeys = await getPublicKeysForInbox({
            email: memberEmail,
            lifetime: 0,
        });

        if (memberPublicKeys.Errors) {
            memberPublicKeys.Errors.forEach((error: string) => {
                createNotification({ text: error, type: 'error' });
            });
            throw new Error('Failed to get member public keys');
        }

        return memberPublicKeys;
    };

    return {
        addNewGroupAddressMemberKey,
        getGroupAddressKey,
        getMemberPublicKeys,
    };
};

export default useGroupKeys;
