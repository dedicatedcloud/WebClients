import { render } from '@testing-library/react';

import { useSubscribeEventManager } from '@proton/components/hooks/useHandler';
import { applyHOCs, withConfig, withNotifications, withPaymentSwitcherContext, withReduxStore } from '@proton/testing';

import InvoicesSection from './InvoicesSection';

jest.mock('../../hooks/useHandler', () => {
    return {
        __esModule: true,
        ...jest.requireActual('../../hooks/useHandler'),
        useSubscribeEventManager: jest.fn(),
    };
});

const requestMock = jest.fn();

jest.mock('../../hooks/useApiResult', () => {
    return {
        __esModule: true,
        ...jest.requireActual('../../hooks/useApiResult'),
        default: jest.fn().mockReturnValue({
            request: () => requestMock(),
        }),
    };
});

jest.mock('@proton/account/user/hooks', () => ({
    __esModule: true,
    useUser: jest.fn(() => [{ isPaid: false, Flags: {} }, false]),
    useGetUser: jest.fn(() => [{ isPaid: false, Flags: {} }, false]),
}));

jest.mock('@proton/account/subscription/hooks', () => {
    return {
        __esModule: true,
        useSubscription: jest.fn().mockReturnValue([]),
    };
});

jest.mock('../../hooks/useModals', () => {
    return {
        __esModule: true,
        default: jest.fn().mockReturnValue({
            createModal: jest.fn(),
        }),
    };
});

jest.mock('@proton/components/payments/client-extensions/useChargebeeContext');

const InvoicesSectionContext = applyHOCs(
    withConfig(),
    withPaymentSwitcherContext(),
    withNotifications(),
    withReduxStore()
)(InvoicesSection);

describe('InvoicesSection', () => {
    let useSubscribeEventManagerMock: jest.Mock;

    beforeAll(() => {
        useSubscribeEventManagerMock = useSubscribeEventManager as jest.Mock;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should request the list of invoices again when there is an Invoices event', () => {
        render(<InvoicesSectionContext />);

        expect(useSubscribeEventManagerMock).toHaveBeenCalledTimes(1);
        let [callback] = useSubscribeEventManagerMock.mock.lastCall;

        callback({
            Invoices: [{ ID: '123' }],
        });

        expect(requestMock).toHaveBeenCalledTimes(2);
    });

    it('should not request invoices additionally if the Invoices array is empty', () => {
        render(<InvoicesSectionContext />);

        expect(useSubscribeEventManagerMock).toHaveBeenCalledTimes(1);
        let [callback] = useSubscribeEventManagerMock.mock.lastCall;

        callback({
            Invoices: [],
        });

        // it's just the initial request
        expect(requestMock).toHaveBeenCalledTimes(1);
    });

    it('should not request invoices if the Invoices are not there ', () => {
        render(<InvoicesSectionContext />);

        let useSubscribeEventManagerMock = useSubscribeEventManager as jest.Mock;
        expect(useSubscribeEventManagerMock).toHaveBeenCalledTimes(1);
        let [callback] = useSubscribeEventManagerMock.mock.lastCall;

        callback({});

        // it's just the initial request
        expect(requestMock).toHaveBeenCalledTimes(1);
    });

    it('should not request invoices if the callback does not have an argument', () => {
        render(<InvoicesSectionContext />);

        let useSubscribeEventManagerMock = useSubscribeEventManager as jest.Mock;
        expect(useSubscribeEventManagerMock).toHaveBeenCalledTimes(1);
        let [callback] = useSubscribeEventManagerMock.mock.lastCall;

        callback();

        // it's just the initial request
        expect(requestMock).toHaveBeenCalledTimes(1);
    });
});
