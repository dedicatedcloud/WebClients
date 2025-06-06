import metrics from '@proton/metrics/index';
import { getSilentApi } from '@proton/shared/lib/api/helpers/customConfig';
import type { TelemetryReport } from '@proton/shared/lib/api/telemetry';
import { TelemetryKeyTransparencyErrorEvents, TelemetryMeasurementGroups } from '@proton/shared/lib/api/telemetry';
import { sendMultipleTelemetryReports } from '@proton/shared/lib/helpers/metrics';
import type { Api, SimpleMap } from '@proton/shared/lib/interfaces';
import { KeyTransparencyActivation } from '@proton/shared/lib/interfaces';

import { ktSentryReport } from '../helpers/utils';
import { AddressAuditStatus, type SelfAuditResult } from '../interfaces';
import { getWarningReason } from '../shared/telemetry';

export const reportSelfAuditErrors = ({
    selfAuditResult,
    api,
    ktActivation,
}: {
    api: Api;
    ktActivation: KeyTransparencyActivation;
    selfAuditResult: SelfAuditResult;
}) => {
    const failedAddressAuditsResults = selfAuditResult.addressAuditResults.filter(
        ({ status }) => status !== AddressAuditStatus.Success
    );
    const failedLocalStorageAuditsOwn = selfAuditResult.localStorageAuditResultsOwnAddress.filter(
        ({ success }) => !success
    );
    const failedLocalStorageAuditsOther = selfAuditResult.localStorageAuditResultsOtherAddress.filter(
        ({ success }) => !success
    );

    const failedAddressAudits = failedAddressAuditsResults.map(({ email, status, warningDetails }) => ({
        email,
        status,
        warningDetails,
    }));
    const failedLSAuditsOwn = failedLocalStorageAuditsOwn.map(({ email }) => email);
    const failedLSAuditsOther = failedLocalStorageAuditsOther.map(({ email }) => email);

    const tooManyRetries = selfAuditResult.error?.tooManyRetries;

    if (
        failedAddressAudits.filter(({ status }) => status === AddressAuditStatus.Failure).length ||
        failedLSAuditsOwn.length ||
        failedLSAuditsOther.length ||
        tooManyRetries
    ) {
        ktSentryReport('Self audit would display an error', {
            failedAddressAudits,
            failedLSAuditsOwn,
            failedLSAuditsOther,
            tooManyRetries: selfAuditResult.error?.tooManyRetries,
        });
    }

    if (failedAddressAudits.length || failedLSAuditsOwn.length || failedLSAuditsOther.length || tooManyRetries) {
        const reports: TelemetryReport[] = [];

        const group = {
            measurementGroup: TelemetryMeasurementGroups.keyTransparency,
            event: TelemetryKeyTransparencyErrorEvents.self_audit_error,
        };

        const visibility = ktActivation === KeyTransparencyActivation.SHOW_UI ? 'visible' : 'hidden';

        if (tooManyRetries) {
            const dimensions: SimpleMap<string> = {
                type: 'too_many_retries',
                result: 'warning',
                reason: 'too_many_retries',
                visibility: visibility,
            };
            reports.push({
                ...group,
                dimensions,
            });
            void metrics.crypto_keytransparency_errors_total.increment({
                level: 'warning',
                type: 'self-audit',
                visibility: visibility,
            });
        }

        failedAddressAuditsResults.forEach(({ status, warningDetails }) => {
            const isWarning = status === AddressAuditStatus.Warning;
            const dimensions: SimpleMap<string> = {
                type: 'address',
                result: isWarning ? 'warning' : 'failure',
                reason: getWarningReason(warningDetails),
                visibility: visibility,
            };
            reports.push({
                ...group,
                dimensions,
            });
            void metrics.crypto_keytransparency_errors_total.increment({
                level: isWarning ? 'warning' : 'error',
                type: 'self-audit',
                visibility: visibility,
            });
        });
        failedLocalStorageAuditsOwn.forEach(() => {
            const dimensions: SimpleMap<string> = {
                type: 'local_storage_own_keys',
                result: 'failure',
                reason: 'local_key_changes_not_applied',
                visibility: visibility,
            };

            reports.push({
                ...group,
                dimensions,
            });
            void metrics.crypto_keytransparency_errors_total.increment({
                level: 'error',
                type: 'self-audit',
                visibility: visibility,
            });
        });
        failedLocalStorageAuditsOther.forEach(() => {
            const dimensions: SimpleMap<string> = {
                type: 'local_storage_other_keys',
                result: 'failure',
                reason: 'past_keys_not_authentic',
                visibility: visibility,
            };
            reports.push({
                ...group,
                dimensions,
            });
            void metrics.crypto_keytransparency_errors_total.increment({
                level: 'error',
                type: 'public-key-audit',
                visibility: visibility,
            });
        });

        void sendMultipleTelemetryReports({
            api: getSilentApi(api),
            reports,
        });
    }
};
