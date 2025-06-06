import { combineReducers } from '@reduxjs/toolkit';

import { protonDomainsReducer } from '@proton/account';
import {
    calendarSettingsReducer,
    calendarsBootstrapReducer,
    calendarsReducer,
    holidaysDirectoryReducer,
} from '@proton/calendar';
import { breachesCountReducer, securityCenterReducer } from '@proton/components';
import { conversationCountsReducer, filtersReducer, messageCountsReducer } from '@proton/mail';
import { sharedReducers } from '@proton/redux-shared-store';

import { attachmentsReducer } from './attachments/attachmentsSlice';
import { composersReducer } from './composers/composersSlice';
import { contactsReducer } from './contacts/contactsSlice';
import { conversationsReducer } from './conversations/conversationsSlice';
import { elementsReducer } from './elements/elementsSlice';
import { incomingDefaultsReducer } from './incomingDefaults/incomingDefaultsSlice';
import { layoutReducer } from './layout/layoutSlice';
import { messagesReducer } from './messages/messagesSlice';
import { newsletterSubscriptionsReducer } from './newsletterSubscriptions/newsletterSubscriptionsSlice';
import { snoozeReducer } from './snooze/snoozeSlice';

export const rootReducer = combineReducers({
    ...sharedReducers,
    ...filtersReducer,
    ...messageCountsReducer,
    ...conversationCountsReducer,
    ...calendarsReducer,
    ...calendarsBootstrapReducer,
    ...calendarSettingsReducer,
    ...holidaysDirectoryReducer,
    ...attachmentsReducer,
    ...composersReducer,
    ...contactsReducer,
    ...conversationsReducer,
    ...elementsReducer,
    ...incomingDefaultsReducer,
    ...layoutReducer,
    ...messagesReducer,
    ...snoozeReducer,
    ...securityCenterReducer,
    ...breachesCountReducer,
    ...protonDomainsReducer,
    ...newsletterSubscriptionsReducer,
});

export type MailState = ReturnType<typeof rootReducer>;
