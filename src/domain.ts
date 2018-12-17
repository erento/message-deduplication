export enum DeliveryInfoState {
    Delivered,
    InProgress,
}

export interface DeliveryInfo {
    state: DeliveryInfoState;
    createdTime: string;
}

export interface DeliveryStorage<T> {
    get (key: string): Promise<T | undefined>;

    set (key: string, value: T, duration?: number): Promise<void>;
}
