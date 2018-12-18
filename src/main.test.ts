import * as moment from 'moment';

const mockGetter: jest.Mock = jest.fn();
const mockSetter: jest.Mock = jest.fn();

jest.mock('./storage', () => {
    return {
        getDeliveryStorage: (): DeliveryStorage<DeliveryInfo> => {
            return {
                get: mockGetter,
                set: mockSetter,
            };
        },
    };
});

import {DeliveryInfo, DeliveryInfoState, DeliveryStorage} from './domain';
import {canStartProcessing, setAsDelivered, setInProgress} from './main';

const messageId: string = '121212121';
const subscriberName: string = 'some service_random-name2!';
const expectedKey: string = '121212121_some service_random-name2!';

describe('message deduplication', (): void => {
    beforeEach((): void => {
        mockGetter.mockReset();
        mockSetter.mockReset();
    });

    describe('set message', (): void => {
        test('should set a message to in progress', async (): Promise<void> => {
            await expect(setInProgress(messageId, subscriberName)).resolves.toBeUndefined();
            expect(mockSetter).toHaveBeenCalledWith(expectedKey, <DeliveryInfo> {
                state: DeliveryInfoState.InProgress,
                createdTime: expect.stringContaining(moment().utc().toISOString().substr(0, 17)),
            });
        });
        test('should set a message to delivered', async (): Promise<void> => {
            mockGetter.mockResolvedValue(<DeliveryInfo> {
                state: DeliveryInfoState.InProgress,
                createdTime: moment().utc().toISOString(),
            });
            await expect(setAsDelivered(messageId, subscriberName)).resolves.toBeUndefined();
            expect(mockSetter).toHaveBeenCalledWith(expectedKey, <DeliveryInfo> {
                state: DeliveryInfoState.Delivered,
                createdTime: expect.stringContaining(moment().utc().toISOString().substr(0, 17)),
            });
        });

        test('should fail to set a message to delivered if message doesn\'t exist', async (): Promise<void> => {
            mockGetter.mockResolvedValue(undefined);
            await expect(setAsDelivered(messageId, subscriberName)).rejects.toThrowErrorMatchingSnapshot();
            expect(mockSetter).not.toHaveBeenCalled();
        });

        test('should fail to set a message to delivered if is not in progress', async (): Promise<void> => {
            mockGetter.mockResolvedValue(<DeliveryInfo> {
                state: DeliveryInfoState.Delivered,
                createdTime: moment().toISOString(),
            });
            await expect(setAsDelivered(messageId, subscriberName)).rejects.toThrowError();
            expect(mockSetter).not.toHaveBeenCalled();
        });
    });

    describe('if message can be processed', (): void => {
        test('should throw an error in case message ID or subscriber name is not provided', async (): Promise<void> => {
            await expect(canStartProcessing(<any> null, <any> null)).rejects.toThrowErrorMatchingSnapshot();
            await expect(canStartProcessing(<any> undefined, <any> undefined)).rejects.toThrowErrorMatchingSnapshot();
            await expect(canStartProcessing('', '')).rejects.toThrowErrorMatchingSnapshot();
            await expect(canStartProcessing(<any> NaN, <any> NaN)).rejects.toThrowErrorMatchingSnapshot();
            await expect(canStartProcessing('', 'a')).rejects.toThrowErrorMatchingSnapshot();
            await expect(canStartProcessing('a', '')).rejects.toThrowErrorMatchingSnapshot();
        });

        test('should return true if it is a new message', async (): Promise<void> => {
            await expect(canStartProcessing(messageId, subscriberName)).resolves.toEqual(true);
        });

        test('should return false if it is delivered', async (): Promise<void> => {
            mockGetter.mockResolvedValue(<DeliveryInfo> {state: DeliveryInfoState.Delivered, createdTime: 'some time'});
            await expect(canStartProcessing(messageId, subscriberName)).resolves.toEqual(false);
            expect(mockGetter).toHaveBeenCalledWith(expectedKey);
        });

        test('should return false if it is in progress and not expired', async (): Promise<void> => {
            mockGetter.mockResolvedValue(<DeliveryInfo> {
                state: DeliveryInfoState.InProgress,
                createdTime: moment().subtract(2, 'minutes').toISOString(),
            });
            await expect(canStartProcessing(messageId, subscriberName)).resolves.toEqual(false);
            expect(mockGetter).toHaveBeenCalledWith(expectedKey);
        });

        test('should return true if it is in progress but expired', async (): Promise<void> => {
            mockGetter.mockResolvedValue(<DeliveryInfo> {
                state: DeliveryInfoState.InProgress,
                createdTime: moment().utc().subtract(20, 'minutes').toISOString(),
            });
            await expect(canStartProcessing(messageId, subscriberName)).resolves.toEqual(true);
            expect(mockGetter).toHaveBeenCalledWith(expectedKey);
        });
    });
});
