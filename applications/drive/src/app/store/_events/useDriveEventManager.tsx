import { createContext, useContext, useMemo, useRef } from 'react';

import { useApi, useEventManager } from '@proton/components';
import metrics from '@proton/metrics';
import { queryLatestVolumeEvent, queryVolumeEvents } from '@proton/shared/lib/api/drive/volume';
import type { EventManager } from '@proton/shared/lib/eventManager/eventManager';
import createEventManager from '@proton/shared/lib/eventManager/eventManager';
import { captureMessage } from '@proton/shared/lib/helpers/sentry';
import type { Api } from '@proton/shared/lib/interfaces';
import type { DriveEventsResult } from '@proton/shared/lib/interfaces/drive/events';
import generateUID from '@proton/utils/generateUID';

import { isIgnoredErrorForReporting, logError } from '../../utils/errorHandling';
import { UserAvailabilityTypes } from '../../utils/metrics/types/userSuccessMetricsTypes';
import { userSuccessMetrics } from '../../utils/metrics/userSuccessMetrics';
import { driveEventsResultToDriveEvents } from '../_api';
import type { VolumeTypeForEvents } from '../_volumes';
import { EventsMetrics, countEventsPerType, getErrorCategory } from './driveEventsMetrics';
import type { DriveCoreEvent, DriveEvent, EventHandler } from './interface';

const DRIVE_EVENT_HANDLER_ID_PREFIX = 'drive-event-handler';

const DRIVE_EVENT_MANAGER_FUNCTIONS_STUB = {
    getSubscriptionIds: () => [],
    clear: () => undefined,

    eventHandlers: {
        register: () => 'id',
        unregister: () => false,
        subscribeToCore: () => () => {},
    },

    volumes: {
        startSubscription: () => {
            throw Error('Usage of uninitialized DriveEventManager!');
        },
        pauseSubscription: () => {},
        unsubscribe: () => {},
    },

    pollEvents: {
        volumes: () => Promise.resolve(),
        driveEvents: () => Promise.resolve(),
    },
};

export function useDriveEventManagerProvider(api: Api, generalEventManager: EventManager<DriveCoreEvent>) {
    const isPollingManually = useRef(false);
    const eventHandlers = useRef(new Map<string, EventHandler>());
    const eventManagers = useRef(new Map<string, EventManager<DriveEventsResult>>());
    const eventsMetrics = useMemo(() => new EventsMetrics(), [api, generalEventManager]);

    const genericHandler = (volumeId: string, type: VolumeTypeForEvents, driveEvents: DriveEventsResult) => {
        countEventsPerType(type, driveEvents);

        if (!driveEvents.Events?.length) {
            return;
        }

        eventsMetrics.batchStart(volumeId, driveEvents);

        const handlerPromises: unknown[] = [];
        eventHandlers.current.forEach((handler) => {
            handlerPromises.push(
                handler(volumeId, driveEventsResultToDriveEvents(driveEvents), (eventId: string, event: DriveEvent) => {
                    // Our app is depending on the events but it could avoid it
                    // completely if we update local state after receiving OK
                    // from the backend. Web polls extensively for this reason
                    // and any poll should be ignored from processed events
                    // because those are the events we could technically avoid.
                    // We want to know how many such events it is.
                    if (!isPollingManually.current) {
                        eventsMetrics.processed(eventId, event);
                    }
                })
            );
        });

        /*
            forcing .poll function's returned Promise to be resolved
            *after* event processin is finished
        */
        return Promise.all(handlerPromises).then(() => {
            eventsMetrics.batchCompleted(volumeId, driveEvents.EventID, type);
        });
    };

    const createVolumeEventManager = async (volumeId: string, volumeType: VolumeTypeForEvents) => {
        try {
            const { EventID } = await api<{ EventID: string }>(queryLatestVolumeEvent(volumeId));

            const eventManager = createEventManager<DriveEventsResult>({
                eventID: EventID,
                getEvents: ({ eventID, ...rest }) => {
                    return api<DriveEventsResult>({ ...queryVolumeEvents(volumeId, eventID), ...rest });
                },
            });

            eventManagers.current.set(volumeId, eventManager);

            return eventManager;
        } catch (e) {
            // TODO: DRVWEB-4319 Implement sync errors & sync erroring users
            // This metric will have to be redone
            metrics.drive_sync_errors_total.increment({
                type: getErrorCategory(e),
                // This is in fact volumeType but since the metric is old we haven't updated yet and are using shareType as volumeType
                shareType: volumeType,
            });
            if (!isIgnoredErrorForReporting(e)) {
                userSuccessMetrics.mark(UserAvailabilityTypes.coreFeatureError);
            }
            throw e;
        }
    };

    /**
     * Creates event manager for a specified volume and starts interval polling of event.
     */
    const subscribeToVolume = async (volumeId: string, type: VolumeTypeForEvents) => {
        const eventManager = await createVolumeEventManager(volumeId, type);
        eventManager.subscribe((payload: DriveEventsResult) => genericHandler(volumeId, type, payload));
        eventManagers.current.set(volumeId, eventManager);
    };

    /**
     * Subscribe to core events from the general event manager
     */
    const subscribeToCoreEvents = (listener: (event: DriveCoreEvent) => void) => {
        return generalEventManager.subscribe((event) => {
            listener(event);
        });
    };

    /**
     * Creates an event manager for a specified volume if doesn't exist,
     * and starts event polling
     */
    const startVolumeSubscription = async (volumeId: string, type: VolumeTypeForEvents) => {
        if (!eventManagers.current.get(volumeId)) {
            await subscribeToVolume(volumeId, type);
        }
        eventManagers.current.get(volumeId)!.start();
    };

    /**
     * Pauses event polling for the volume. Returns false if there's no event manager
     * associated with the volumeId
     */
    const pauseVolumeSubscription = (volumeId: string): boolean => {
        const volumeSubscription = eventManagers.current.get(volumeId);
        if (volumeSubscription) {
            volumeSubscription.stop();
            return true;
        }

        return false;
    };

    /**
     * Stops event listening, empties handlers and clears reference to the event manager
     */
    const unsubscribeFromVolume = (volumeId: string): boolean => {
        eventManagers.current.get(volumeId)?.reset();
        return eventManagers.current.delete(volumeId);
    };

    /**
     * Polls drive events for a volume
     * @private
     */
    const pollVolume = async (volumeId: string): Promise<void> => {
        const eventManager = eventManagers.current.get(volumeId);

        if (!eventManager) {
            captureMessage('Trying to call non-existing event manager');
            return;
        }

        await eventManager.call().catch(logError);
    };

    /**
     * Polls events for specified list of volumes
     */
    const pollVolumeEvents = async (
        volumeIds: string | string[],
        params: { includeCommon: boolean } = { includeCommon: false }
    ) => {
        isPollingManually.current = true;

        const volumeIdsArray = Array.isArray(volumeIds) ? volumeIds : [volumeIds];
        const pollingTasks = [];

        if (params.includeCommon) {
            pollingTasks.push(generalEventManager.call());
        }

        pollingTasks.push(...volumeIdsArray.map((volumeId) => pollVolume(volumeId)));

        await Promise.all(pollingTasks)
            .catch(logError)
            .finally(() => {
                isPollingManually.current = false;
            });
    };

    /**
     *  Polls drive events for all subscribed volumes
     */
    const pollDriveEvents = async (params: { includeCommon: boolean } = { includeCommon: false }): Promise<void> => {
        isPollingManually.current = true;

        const pollingPromises: Promise<unknown>[] = [];
        if (params.includeCommon) {
            pollingPromises.push(generalEventManager.call());
        }
        eventManagers.current.forEach((eventManager) => {
            pollingPromises.push(eventManager.call());
        });

        await Promise.all(pollingPromises)
            .catch(logError)
            .finally(() => {
                isPollingManually.current = false;
            });
    };

    /**
     * Registers passed event handler to process currenlty active share subscriptions by specific id
     */
    const registerEventHandlerById = (id: string, callback: EventHandler): string => {
        eventHandlers.current.set(id, callback);
        return id;
    };

    /**
     * Registers passed event handler to process currenlty active share subscriptions
     */
    const registerEventHandler = (callback: EventHandler): string => {
        const callbackUID = generateUID(DRIVE_EVENT_HANDLER_ID_PREFIX);
        return registerEventHandlerById(callbackUID, callback);
    };

    /**
     * Removes event handler
     */
    const unregisterEventHandler = (callbackId: string): boolean => {
        return eventHandlers.current.delete(callbackId);
    };

    /**
     * List share ids which event manager subscribed to
     */
    const getSubscriptionIds = (): string[] => {
        return Array.from(eventManagers.current.keys());
    };

    /**
     * Cancels all ongoing requests, clears timeout and references to all listeners
     * event managers and handlers
     */
    const clear = () => {
        // clear timeouts and listeners
        eventManagers.current.forEach((_, key) => {
            unsubscribeFromVolume(key);
        });
        // clear references to event managers
        eventManagers.current.clear();
        // clear event handlers
        eventHandlers.current.clear();
    };

    return {
        getSubscriptionIds,
        clear,

        volumes: {
            startSubscription: startVolumeSubscription,
            pauseSubscription: pauseVolumeSubscription,
            unsubscribe: unsubscribeFromVolume,
        },

        eventHandlers: {
            register: registerEventHandler,
            unregister: unregisterEventHandler,
            subscribeToCore: subscribeToCoreEvents,
        },

        pollEvents: {
            volumes: pollVolumeEvents,
            driveEvents: pollDriveEvents,
        },
    };
}

const DriveEventManagerContext = createContext<ReturnType<typeof useDriveEventManagerProvider> | null>(null);

export function DriveEventManagerProvider({ children }: { children: React.ReactNode }) {
    const api = useApi();
    const generalEventManager = useEventManager();
    const driveEventManager = useDriveEventManagerProvider(api, generalEventManager);

    return <DriveEventManagerContext.Provider value={driveEventManager}>{children}</DriveEventManagerContext.Provider>;
}

export const useDriveEventManager = () => {
    const state = useContext(DriveEventManagerContext);
    if (!state) {
        // DriveEventManager might be uninitialized in some cases.
        // For example, public shares do not have this implemented yet.
        // Better would be to not have event manager as required automatic
        // dependency, but that requires bigger changes. In the end, this
        // situation is just because of how React hooks work. One day, once
        // this all is shifted to worker instead, we can make it nicer.
        return DRIVE_EVENT_MANAGER_FUNCTIONS_STUB;
    }
    return state;
};
