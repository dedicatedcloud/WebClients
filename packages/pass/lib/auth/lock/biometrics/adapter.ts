import { c } from 'ttag';

import type { PassCoreContextValue } from '@proton/pass/components/Core/PassCoreProvider';
import {
    fromBiometricsEncryptedOfflineKD,
    intoBiometricsEncryptedOfflineKD,
} from '@proton/pass/lib/auth/lock/biometrics/utils';
import { type LockAdapter, LockMode } from '@proton/pass/lib/auth/lock/types';
import type { AuthService } from '@proton/pass/lib/auth/service';
import { getInvalidPasswordString } from '@proton/pass/lib/auth/utils';
import { getOfflineComponents } from '@proton/pass/lib/cache/crypto';
import { decryptData, encryptData, importSymmetricKey } from '@proton/pass/lib/crypto/utils/crypto-helpers';
import { PassCryptoError } from '@proton/pass/lib/crypto/utils/errors';
import { loadCoreCryptoWorker } from '@proton/pass/lib/crypto/utils/worker';
import { PassEncryptionTag } from '@proton/pass/types';
import { SilentError } from '@proton/pass/utils/errors/errors';
import { logger } from '@proton/pass/utils/logger';
import { getEpoch } from '@proton/pass/utils/time/epoch';
import { stringToUint8Array, uint8ArrayToString } from '@proton/shared/lib/helpers/encoding';
import noop from '@proton/utils/noop';

export const generateBiometricsKey = async (core: PassCoreContextValue, offlineKD: string): Promise<string> => {
    const key = await core.generateBiometricsKey!();
    const rawOfflineKD = stringToUint8Array(offlineKD);
    const rawEncryptedOfflineKD = await encryptData(key, rawOfflineKD, PassEncryptionTag.BiometricOfflineKD);
    return intoBiometricsEncryptedOfflineKD(uint8ArrayToString(rawEncryptedOfflineKD));
};

/** Password locking involves the offline configuration. As such,
 * we can only password lock if we have a valid offline config in
 * order to be able to verify the user password locally without an
 * SRP flow. Booting offline should rely on this lock adapter */
export const biometricsLockAdapterFactory = (auth: AuthService, core: PassCoreContextValue): LockAdapter => {
    const { authStore, api, getPersistedSession, onSessionPersist } = auth.config;

    /** Persist the `unlockRetryCount` without re-encrypting
     * the authentication session blob */
    const setRetryCount = async (retryCount: number) => {
        if (retryCount >= 3) {
            authStore.setUnlockRetryCount(0);
            authStore.setEncryptedOfflineKD(undefined);
            authStore.setLockMode(LockMode.PASSWORD);
            await auth.lock(LockMode.PASSWORD, { broadcast: true, soft: true, userInitiated: true });
            throw new Error(c('Warning').t`Too many attempts`);
        }

        authStore.setUnlockRetryCount(retryCount);
        const localID = authStore.getLocalID();
        const encryptedSession = await getPersistedSession(localID);

        if (encryptedSession) {
            encryptedSession.unlockRetryCount = retryCount;
            await onSessionPersist?.(JSON.stringify(encryptedSession));
        }
    };

    const adapter: LockAdapter = {
        type: LockMode.BIOMETRICS,

        check: async () => {
            logger.info(`[BiometricLock] checking password lock`);

            const offlineConfig = authStore.getOfflineConfig();
            const offlineVerifier = authStore.getOfflineVerifier();
            if (!(offlineConfig && offlineVerifier)) return { mode: LockMode.NONE, locked: false };

            authStore.setLockLastExtendTime(getEpoch());
            return { mode: adapter.type, locked: false, ttl: authStore.getLockTTL() };
        },

        /** Creating a password lock should first verify the user password
         * with SRP. Only then should we compute the offline components.
         * Repersists the session with the `offlineKD` encrypted in the session
         * blob. As such creating a biometrics lock is online-only. */
        create: async ({ secret, ttl }, onBeforeCreate) => {
            logger.info(`[BiometricLock] creating biometrics lock`);

            const verified = await auth.confirmPassword(secret);
            if (!verified) throw new Error(getInvalidPasswordString(authStore));

            if (!authStore.hasOfflinePassword()) {
                const { offlineConfig, offlineKD, offlineVerifier } = await getOfflineComponents(secret);
                authStore.setOfflineConfig(offlineConfig);
                authStore.setOfflineKD(offlineKD);
                authStore.setOfflineVerifier(offlineVerifier);
            }

            const offlineKD = authStore.getOfflineKD();
            if (!offlineKD) throw new Error('Missing offline KD');

            const encryptedOfflineKD = await generateBiometricsKey(core, offlineKD);

            await onBeforeCreate?.();

            authStore.setEncryptedOfflineKD(encryptedOfflineKD);
            authStore.setLockMode(adapter.type);
            authStore.setLockTTL(ttl);
            authStore.setLockLastExtendTime(getEpoch());
            authStore.setUnlockRetryCount(0);

            await auth.persistSession().catch(noop);

            return { mode: adapter.type, locked: false, ttl };
        },

        /** Resets every auth store properties relative to offline
         * mode and re-persists the session accordingly */
        delete: async () => {
            logger.info(`[BiometricLock] deleting biometrics lock`);
            authStore.setLockLastExtendTime(undefined);
            authStore.setLockTTL(undefined);
            authStore.setLockMode(LockMode.NONE);
            authStore.setLocked(false);
            authStore.setUnlockRetryCount(0);
            authStore.setEncryptedOfflineKD(undefined);

            await auth.persistSession().catch(noop);

            return { mode: LockMode.NONE, locked: false };
        },

        /** Password locking should reset the in-memory `OfflineKD`.
         * Remove the session lock token as well preeventively in case
         * a user ends up in a situation with both a password and an
         * API lock - this should not happen */
        lock: async () => {
            logger.info(`[BiometricLock] locking session`);
            authStore.setOfflineKD(undefined);
            authStore.setLockToken(undefined);
            authStore.setLocked(true);

            return { mode: adapter.type, locked: true };
        },

        /** Password unlocking involves checking if we can decrypt the
         * `encryptedCacheKey` with the argon2 derivation of the provided
         * secret. The `offlineKD` is encrypted in the session blob, as
         * such, we cannot rely on it for comparison when booting offline.
         * Load the crypto workers early in case password unlocking
         * happens before we boot the application state (hydrate.saga) */
        unlock: async (biometricsSecret: string) => {
            const retryCount = authStore.getUnlockRetryCount() + 1;

            /** API may have been flagged as sessionLocked before
             * booting offline - as such reset the api state to
             * avoid failing subsequent requests. */
            await api.reset();

            try {
                /** Errors with fetching the biometrics secret
                 * will be handled during fetching it - here we only need
                 * to make sure we're still increasing the count  */
                if (!biometricsSecret) throw new SilentError();

                await loadCoreCryptoWorker();

                const offlineConfig = authStore.getOfflineConfig();
                const offlineVerifier = authStore.getOfflineVerifier();
                const offlineEncryptedKD = authStore.getEncryptedOfflineKD();

                if (!(offlineConfig && offlineVerifier && offlineEncryptedKD)) {
                    throw new PassCryptoError('Invalid biometric lock');
                }

                const biometricsCryptoKey = await importSymmetricKey(stringToUint8Array(biometricsSecret));

                const offlineKD = await decryptData(
                    biometricsCryptoKey,
                    stringToUint8Array(fromBiometricsEncryptedOfflineKD(offlineEncryptedKD).key),
                    PassEncryptionTag.BiometricOfflineKD
                );

                const offlineKey = await importSymmetricKey(offlineKD);

                /** this will throw if the derived offlineKD is incorrect */
                await decryptData(offlineKey, stringToUint8Array(offlineVerifier), PassEncryptionTag.Offline);
                const hash = uint8ArrayToString(offlineKD);

                authStore.setOfflineKD(hash);
                authStore.setLocked(false);

                await setRetryCount(0);

                return hash;
            } catch (err) {
                if (err instanceof PassCryptoError) {
                    /* Fall back to password lock in case the biometrics key can't be decrypted */
                    authStore.setUnlockRetryCount(0);
                    authStore.setEncryptedOfflineKD(undefined);
                    authStore.setLockMode(LockMode.PASSWORD);
                    await auth.lock(LockMode.PASSWORD, { broadcast: true, soft: true, userInitiated: true });
                    throw err;
                }

                await setRetryCount(retryCount);
                await auth.lock(adapter.type, { broadcast: true, soft: true, userInitiated: true });
                throw err;
            }
        },
    };

    return adapter;
};
