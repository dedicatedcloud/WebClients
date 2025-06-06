import { c } from 'ttag';

import { MAIL_APP_NAME } from '@proton/shared/lib/constants';

import type { Parameters } from './interface';

const planName = `${MAIL_APP_NAME} Plus`;

const data = (): Parameters => ({
    title: c('Metadata title').t`Try ${planName} for free with this link`,
    description: c('Metadata title').t`Private and secure email, no bank card required`,
});

export default data;
