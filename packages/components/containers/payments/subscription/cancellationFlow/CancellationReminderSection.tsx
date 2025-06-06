import { useEffect, useState } from 'react';

import { addDays, fromUnixTime, isBefore } from 'date-fns';
import { c } from 'ttag';

import { useSubscription } from '@proton/account/subscription/hooks';
import { useUser } from '@proton/account/user/hooks';
import { Button, ButtonLike } from '@proton/atoms';
import SettingsLink from '@proton/components/components/link/SettingsLink';
import useSettingsLink from '@proton/components/components/link/useSettingsLink';
import useModalState from '@proton/components/components/modalTwo/useModalState';
import useAppTitle from '@proton/components/hooks/useAppTitle';
import useVPNServersCount from '@proton/components/hooks/useVPNServersCount';
import { PLANS } from '@proton/payments';
import { type APP_NAMES } from '@proton/shared/lib/constants';
import useFlag from '@proton/unleash/useFlag';

import { useSubscriptionModal } from '../SubscriptionModalProvider';
import { useCancelSubscriptionFlow } from '../cancelSubscription/useCancelSubscriptionFlow';
import { SUBSCRIPTION_STEPS } from '../constants';
import useSubscriptionModalTelemetry from '../useSubscriptionModalTelemetry';
import CancelConfirmationModal from './CancelConfirmationModal';
import CancelRedirectionModal from './CancelRedirectionModal';
import ReminderSectionFeatures from './ReminderSectionFeatures';
import ReminderSectionPlan from './ReminderSectionPlan';
import ReminderSectionTestimonials from './ReminderSectionTestimonials';
import { getReminderPageConfig } from './reminderPageConfig';
import useCancellationFlow from './useCancellationFlow';
import useCancellationTelemetry from './useCancellationTelemetry';

interface Props {
    app: APP_NAMES;
}

export const CancellationReminderSection = ({ app }: Props) => {
    const [user] = useUser();
    const [subscription] = useSubscription();
    const { reportCancellationOnSameDay } = useSubscriptionModalTelemetry();
    const [openSubscriptionModal] = useSubscriptionModal();
    const [{ paid }] = useVPNServersCount();
    const { b2bAccess, b2cAccess, redirectToDashboard, setStartedCancellation } = useCancellationFlow();
    const { sendCancelPageKeepPlanReport, sendCancelPageConfirmCancelReport } = useCancellationTelemetry();

    const { cancelSubscription, cancelSubscriptionModals } = useCancelSubscriptionFlow({
        app,
    });

    const [cancelModalProps, setCancelModalOpen, cancelRenderModal] = useModalState();
    const [redirectModalProps, setRedirectModalOpen, redirectRenderModal] = useModalState();

    const [config, setConfig] = useState<ReturnType<typeof getReminderPageConfig> | null>(
        getReminderPageConfig({ app, subscription, user })
    );

    const goToSettings = useSettingsLink();

    useEffect(() => {
        const newConfig = getReminderPageConfig({ app, subscription, user });
        setConfig(newConfig);
    }, [b2bAccess, b2cAccess, paid]);

    useAppTitle(c('Subscription reminder').t`Cancel subscription`);

    const isUpsellEnabled = useFlag('NewCancellationFlowUpsell');

    if ((!b2bAccess && !b2cAccess) || !config) {
        redirectToDashboard();
        return;
    }

    const handleCancelSubscription = async () => {
        setCancelModalOpen(false);
        // We inform that the cancellation process was started to avoid redirection once finished
        setStartedCancellation(true);

        const isSubscriptionReminderFlow = !isUpsellEnabled || !config.upsellPlan;

        const hasCancelledOnSameDayHeSubscribed =
            subscription?.CreateTime && isBefore(new Date(), addDays(fromUnixTime(subscription.CreateTime), 1));
        const { status } = await cancelSubscription({
            subscriptionReminderFlow: isSubscriptionReminderFlow,
            upsellPlanId: config.upsellPlan,
        });

        if (hasCancelledOnSameDayHeSubscribed) {
            void reportCancellationOnSameDay();
        }

        if (status === 'cancelled' || status === 'downgraded') {
            setRedirectModalOpen(true);
        } else if (status === 'upsold') {
            openSubscriptionModal({
                step: SUBSCRIPTION_STEPS.CHECKOUT,
                disablePlanSelection: true,
                plan: config.upsellPlan,
                metrics: { source: 'dashboard' },
                onClose: () => {
                    goToSettings('/dashboard');
                },
            });
        } else {
            goToSettings('/dashboard');
        }

        setStartedCancellation(false);
    };

    const keepSubscription = c('Subscription reminder').t`Keep subscription`;
    // Translator: Text is "Keep " followed by the plan name.
    const keepPlanName = c('Subscription reminder').t`Keep ${config.planName}`;
    const ctaText = config.plan === PLANS.BUNDLE ? keepSubscription : keepPlanName;

    return (
        <>
            <div className="overflow-auto" data-testid="cancellation-flow:reminder-container">
                <div className="container-section-sticky">
                    <ReminderSectionPlan {...config.reminder} />
                    <div className="columns-1 md:columns-2 gap-10 mt-6">
                        <ReminderSectionFeatures {...config.features} />
                        <ReminderSectionTestimonials {...config.testimonials} />
                    </div>
                    <div className="flex justify-center gap-4 mb-8">
                        <ButtonLike
                            as={SettingsLink}
                            onClick={() => {
                                sendCancelPageKeepPlanReport();
                            }}
                            path="/dashboard"
                            shape="outline"
                            color="weak"
                            className="flex flex-nowrap gap-2 items-center justify-center"
                        >
                            {c('Subscription reminder').t`Keep subscription`}
                        </ButtonLike>

                        <Button
                            color="danger"
                            data-testid="cancellation-flow:confirm-cancellation"
                            onClick={() => {
                                sendCancelPageConfirmCancelReport();
                                setCancelModalOpen(true);
                            }}
                        >{c('Subscription reminder').t`Cancel subscription`}</Button>
                    </div>
                </div>
            </div>
            {cancelRenderModal && (
                <CancelConfirmationModal
                    {...cancelModalProps}
                    ctaText={ctaText}
                    cancelSubscription={async () => {
                        await handleCancelSubscription();
                    }}
                    upsellPlan={config.upsellPlan}
                    {...config.confirmationModal}
                />
            )}
            {redirectRenderModal && (
                <CancelRedirectionModal {...redirectModalProps} planName={config.planName} plan={config.plan} />
            )}

            {cancelSubscriptionModals}
        </>
    );
};
