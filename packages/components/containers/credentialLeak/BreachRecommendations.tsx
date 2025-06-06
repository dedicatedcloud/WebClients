import { c } from 'ttag';

import { Href } from '@proton/atoms';
import Icon from '@proton/components/components/icon/Icon';
import type { FetchedBreaches } from '@proton/components/containers/credentialLeak/models';
import { getBlogURL } from '@proton/shared/lib/helpers/url';

interface Props {
    actions: FetchedBreaches['actions'];
    inModal?: boolean;
}

// html removed from BE payloads until parsing and sanitizing is added
// const parseHTML = (htmlString: string) => {
//     const regex = /<a href="(.*?)">(.*?)<\/a>/g;
//     let match;
//     const parts = [];
//     let lastIndex = 0;

//     while ((match = regex.exec(htmlString)) !== null) {
//         const [fullMatch, href, text] = match;
//         const plainText = htmlString.substring(lastIndex, match.index);
//         parts.push(plainText);
//         parts.push(
//             <a key={parts.length} href={href} target="_blank" rel="noopener noreferrer">
//                 {text}
//             </a>
//         );
//         lastIndex = match.index + fullMatch.length;
//     }
//     parts.push(htmlString.substring(lastIndex));

//     return parts;
// };

const getIcon = (code: string) => {
    if (code === 'password_source') {
        return 'key';
    }
    if (code === 'password_exposed') {
        return 'key';
    }
    if (code === '2fa') {
        return 'locks';
    }
    if (code === 'aliases') {
        return 'alias';
    }
    if (code === 'stay_alert') {
        return 'exclamation-circle';
    }
    if (code === 'passwords_all') {
        return 'key';
    }
    if (code === 'clean_devices') {
        return 'pass-laptop';
    }
};

interface ActionProps {
    code: string;
    action: string;
    link?: string;
}
const Action = ({ code, action, link }: ActionProps) => {
    const iconName = getIcon(code);

    return (
        <div className="flex flex-nowrap dropdown-item-button relative py-3 px-4">
            {iconName && <Icon name={iconName} className="shrink-0 mt-0 mr-2" />}
            {link ? (
                <Href href={link} className="flex-1 expand-click-area color-inherit text-no-decoration">
                    {action}
                </Href>
            ) : (
                <span className="flex-1">{action}</span>
            )}
        </div>
    );
};

const BreachRecommendations = ({ actions, inModal = false }: Props) => {
    if (!actions) {
        return null;
    }

    const dataLeakedLink = (
        <Href href={getBlogURL('/breach-recommendations')} key="link">
            {
                // translator: full sentence is: Learn what to do <if your data is leaked>
                c('Link').t`if your data is leaked`
            }
        </Href>
    );

    return (
        <>
            {inModal ? (
                <h2 className="text-semibold text-rg mb-2">{c('Title').t`Recommended actions`}</h2>
            ) : (
                <h3 className="text-semibold text-rg mb-2">{c('Title').t`Recommended actions`}</h3>
            )}
            <ul className="unstyled m-0">
                {actions.map(({ code, name, urls }) => {
                    return (
                        <li className="border-top border-weak text-sm relative" key={name}>
                            <Action code={code} action={name} link={urls?.[0]} />
                        </li>
                    );
                })}
                <li className="py-3 px-4 border-top border-bottom border-weak color-weak text-sm">
                    {
                        // translator: full sentence is: Learn what to do <if your data is leaked>
                        c('Info').jt`Learn what to do ${dataLeakedLink}`
                    }
                </li>
            </ul>
        </>
    );
};

export default BreachRecommendations;
