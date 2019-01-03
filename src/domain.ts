export enum DeliveryInfoState {
    Delivered,
    InProgress,
}

export enum CanDeliver {
    NoAlreadyDelivered,
    NoInProgress,
    Yes,
}

export interface DeliveryInfo {
    state: DeliveryInfoState;
    createdTime: string;
}

export interface DeliveryStorage<T> {
    _type: 'in-memory' | 'redis';
    get (key: string): Promise<T | undefined>;
    set (key: string, value: T, duration?: number): Promise<void>;
}
