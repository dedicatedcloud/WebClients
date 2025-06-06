import { createContext, useContext } from 'react';

import type { AddressType, CustomAddressID, MonitorAddress } from '@proton/pass/lib/monitor/types';
import type { MaybeNull, UniqueItem } from '@proton/pass/types';

export type AsyncMonitorState = {
    data: UniqueItem[];
    count: number;
    loading: boolean;
};

export interface MonitorContextValue {
    didLoad: boolean;
    breaches: {
        data: {
            alias: MonitorAddress<AddressType.ALIAS>[];
            proton: MonitorAddress<AddressType.PROTON>[];
            custom: MonitorAddress<AddressType.CUSTOM>[];
        };
        count: number;
        loading: boolean;
    };
    insecure: AsyncMonitorState;
    duplicates: { data: UniqueItem[][]; count: number };
    missing2FAs: AsyncMonitorState;
    excluded: { data: UniqueItem[]; count: number };
    addAddress: () => void;
    verifyAddress: (address: MonitorAddress<AddressType.CUSTOM>, sentAt?: number) => void;
    deleteAddress: (addressId: CustomAddressID) => void;
    sync: () => void;
}

export const MonitorContext = createContext<MaybeNull<MonitorContextValue>>(null);

export const useMonitor = (): MonitorContextValue => {
    const ctx = useContext(MonitorContext);
    if (!ctx) throw new Error('MonitorContext not initialized');
    return ctx;
};
