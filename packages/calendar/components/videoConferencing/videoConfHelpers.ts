import { c } from 'ttag';

import { type BaseMeetingUrls, VIDEO_CONF_SERVICES } from './constants';

export const isVideoConfOnlyLink = (data: BaseMeetingUrls) => {
    return data.meetingUrl && !data.joiningInstructions && !data.meetingId && !data.password;
};

export const getVideoConfCopy = (service: VIDEO_CONF_SERVICES) => {
    if (service === VIDEO_CONF_SERVICES.GOOGLE_MEET) {
        return c('Google Meet').t`Join Google Meet`;
    }

    if (service === VIDEO_CONF_SERVICES.ZOOM) {
        return c('Zoom').t`Join Zoom meeting`;
    }

    if (service === VIDEO_CONF_SERVICES.SLACK) {
        return c('Slack').t`Join Slack huddle`;
    }

    if (service === VIDEO_CONF_SERVICES.TEAMS) {
        return c('Teams').t`Join Teams meeting`;
    }
};
