import { useEffect, useMemo, useState } from 'react';

import type { PrivateKeyReference, PublicKeyReference } from '@proton/crypto';
import { CryptoProxy } from '@proton/crypto';
import type { CachedOrganizationKey } from '@proton/shared/lib/interfaces';
import { getFormattedAlgorithmName } from '@proton/shared/lib/keys';

const useDisplayOrganizationKey = (organizationKey?: CachedOrganizationKey) => {
    const [parsedKey, setParsedKey] = useState<PublicKeyReference | PrivateKeyReference>();

    useEffect(() => {
        void (async () => {
            if (!organizationKey) {
                setParsedKey(undefined);
                return;
            }
            if (organizationKey.privateKey) {
                setParsedKey(organizationKey.privateKey);
                return;
            }
            if (organizationKey.Key.PrivateKey) {
                // We import the key as PublicKey since importing it as PrivateKey requires knowing the passphrase to decrypt it.
                const key = await CryptoProxy.importPublicKey({ armoredKey: organizationKey.Key.PrivateKey }).catch(
                    () => undefined
                );
                setParsedKey(key);
                return;
            }
            setParsedKey(undefined);
        })();
    }, [organizationKey]);

    return useMemo(() => {
        const algorithmInfo = parsedKey?.getAlgorithmInfo();
        const fingerprint = parsedKey?.getFingerprint() ?? '';
        const isDecrypted = parsedKey?.isPrivate() ?? false;
        return {
            algorithm: algorithmInfo ? getFormattedAlgorithmName(algorithmInfo, parsedKey!.getVersion()) : '',
            fingerprint,
            isDecrypted,
        };
    }, [parsedKey]);
};

export default useDisplayOrganizationKey;
