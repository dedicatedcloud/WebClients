import { CHANGESET_KEY_PREFIX, FULLSYNC } from '../constants/cache';

export const clearChangeSet = (fingerprint: string) => {
    Object.keys(window.localStorage)
        .filter((x) => x.startsWith(CHANGESET_KEY_PREFIX + fingerprint + '_'))
        .forEach((x) => localStorage.removeItem(x));
};

/**
 * Checks if initial full sync is done for a given wallet and account.
 *
 * @param {string} fingerprint - The fingerprint of the wallet.
 * @param {string} derivationPath - The derivation path of the account.
 * @returns {boolean} - Returns true if initial full sync is done, otherwise false.
 */
export const isFullSyncDone = (fingerprint: string, derivationPath: string): boolean => {
    return !!localStorage.getItem(FULLSYNC + fingerprint + '_' + derivationPath);
};

/**
 * Save if initial full sync is done for a given wallet and account.
 *
 * @param {string} fingerprint - The fingerprint of the wallet.
 * @param {string} derivationPath - The derivation path of the account.
 */
export const setFullSyncDone = (fingerprint: string, derivationPath: string) => {
    localStorage.setItem(FULLSYNC + fingerprint + '_' + derivationPath, 'true');
};

export const clearWalletData = (fingerprints: string[]) => {
    Object.keys(window.localStorage)
        .filter((x) => {
            return fingerprints.some(
                (fingerprint) =>
                    x.startsWith(CHANGESET_KEY_PREFIX + fingerprint) ||
                    x.startsWith(FULLSYNC + fingerprint) ||
                    x.startsWith('passphrase_' + fingerprint)
            );
        })
        .forEach((x) => localStorage.removeItem(x));
};

export const clearWalletAccountMetricsData = (accountIDs: string[]) => {
    Object.keys(window.localStorage)
        .filter((x) => {
            return accountIDs.some((accountID) => x.startsWith('metrics:wallet_account:' + accountID));
        })
        .forEach((x) => localStorage.removeItem(x));
};
