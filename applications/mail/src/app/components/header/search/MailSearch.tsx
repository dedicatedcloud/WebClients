import { useEffect, useState } from 'react';

import type { Location } from 'history';

import { useAddresses } from '@proton/account/addresses/hooks';
import { useUser } from '@proton/account/user/hooks';
import {
    TopNavbarListItemSearchButton,
    useActiveBreakpoint,
    usePopperAnchor,
    useProgressiveRollout,
    useToggle,
} from '@proton/components';
import useSearchTelemetry from '@proton/encrypted-search/lib/useSearchTelemetry';
import { FeatureCode } from '@proton/features';
import { useFolders, useLabels } from '@proton/mail';
import generateUID from '@proton/utils/generateUID';

import { ADVANCED_SEARCH_OVERLAY_CLOSE_EVENT } from '../../../constants';
import { useEncryptedSearchContext } from '../../../containers/EncryptedSearchProvider';
import { isEncryptedSearchAvailable } from '../../../helpers/encryptedSearch/esUtils';
import { extractSearchParameters } from '../../../helpers/mailboxUrl';
import { useClickMailContent } from '../../../hooks/useClickMailContent';
import AdvancedSearch from './AdvancedSearch';
import MailSearchInput from './MailSearchInput';
import SearchOverlay from './SearchOverlay';

import './Search.scss';

interface Props {
    labelID: string;
    location: Location;
    columnMode: boolean;
}

const MailSearch = ({ labelID, location, columnMode }: Props) => {
    const [uid] = useState(generateUID('advanced-search-overlay'));
    const isESUserInterfaceAvailable = useProgressiveRollout(FeatureCode.ESUserInterface);
    const { anchorRef, isOpen, open, close } = usePopperAnchor<HTMLInputElement>();
    const searchParams = extractSearchParameters(location);
    const [searchInputValue, setSearchInputValue] = useState(searchParams.keyword || '');
    const [user] = useUser();
    const [, loadingLabels] = useLabels();
    const [, loadingFolders] = useFolders();
    const [, loadingAddresses] = useAddresses();
    const { esStatus, cacheIndexedDB, closeDropdown, esIndexingProgressState } = useEncryptedSearchContext();
    const { dropdownOpened, esEnabled } = esStatus;
    const showEncryptedSearch = isEncryptedSearchAvailable(user, isESUserInterfaceAvailable);
    // Show more from inside AdvancedSearch to persist the state when the overlay is closed
    const { state: showMore, toggle: toggleShowMore } = useToggle(false);

    const breakpoints = useActiveBreakpoint();

    const { sendClearSearchFieldsReport } = useSearchTelemetry();

    const loading = loadingLabels || loadingFolders || loadingAddresses;

    useEffect(() => {
        if (!isOpen) {
            closeDropdown();
        }
    }, [isOpen]);

    useEffect(() => {
        if (dropdownOpened) {
            open();
        }
    }, [dropdownOpened]);

    useEffect(() => {
        setSearchInputValue(searchParams?.keyword || '');
    }, [location]);

    useClickMailContent(() => {
        close();
    });

    const handleOpen = () => {
        if (isOpen) {
            return;
        }

        if (!loading) {
            anchorRef.current?.blur();
            void cacheIndexedDB();
            open();
        }
    };

    // Listen to close events from composer or iframes
    useEffect(() => {
        document.addEventListener('dropdownclose', close);
        document.addEventListener(ADVANCED_SEARCH_OVERLAY_CLOSE_EVENT, close);

        return () => {
            document.removeEventListener('dropdownclose', close);
            document.removeEventListener(ADVANCED_SEARCH_OVERLAY_CLOSE_EVENT, close);
        };
    }, [close]);

    const handleClearSearchField = () => {
        setSearchInputValue('');
        sendClearSearchFieldsReport(esEnabled);
    };

    return (
        <>
            {breakpoints.viewportWidth['<=small'] || breakpoints.viewportWidth.medium ? (
                <div className="topnav-listItem flex shrink-0 pl-1">
                    <TopNavbarListItemSearchButton onClick={handleOpen} />
                </div>
            ) : (
                <MailSearchInput
                    loading={loading}
                    ref={anchorRef}
                    value={searchInputValue}
                    onClearSearch={handleClearSearchField}
                    onOpen={handleOpen}
                    adaptWidth={columnMode}
                />
            )}
            <SearchOverlay id={uid} isOpen={isOpen} anchorRef={anchorRef} onClose={close}>
                <AdvancedSearch
                    showEncryptedSearch={showEncryptedSearch}
                    onClose={close}
                    esIndexingProgressState={esIndexingProgressState}
                    showMore={showMore}
                    toggleShowMore={toggleShowMore}
                    searchInputValue={searchInputValue}
                    labelID={labelID}
                />
            </SearchOverlay>
        </>
    );
};

export default MailSearch;
