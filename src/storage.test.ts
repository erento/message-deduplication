let redisOn: jest.Mock;
let redisAuth: jest.Mock;
const createClientMock: jest.Mock = jest.fn();

jest.mock('redis', () => {
    return {
        createClient: createClientMock,
    };
});

import {DeliveryInfo, DeliveryStorage} from './domain';
import {getDeliveryStorage} from './storage';

describe('Storage', (): void => {
    beforeEach((): void => {
        // redisOn = ;
        // redisAuth = ;
        createClientMock.mockReset();
        redisOn = jest.fn();
        redisAuth = jest.fn();
        createClientMock.mockImplementation(() => {
            return {
                on: redisOn,
                auth: redisAuth,
            };
        });
    });

    test.each([
        undefined,
        null,
        true,
        1,
        '1',
    ])('should get in-memory storage type based on env variables', (processMockedValue: any): void => {
        process.env.MD_IN_MEMORY_ONLY = processMockedValue;
        expect(getDeliveryStorage()).toEqual(expect.objectContaining(<DeliveryStorage<DeliveryInfo>> {
            _type: 'in-memory',
            get: expect.any(Function),
            set: expect.any(Function),
        }));
        expect(redisOn).not.toHaveBeenCalled();
        expect(redisAuth).not.toHaveBeenCalled();
        expect(createClientMock).not.toHaveBeenCalled();
    });

    test.each([
        false,
        0,
        '0',
    ])('should get redis storage type based on env variables', (processMockedValue: any): void => {
        expect(getDeliveryStorage(processMockedValue)).toEqual(expect.objectContaining(<DeliveryStorage<DeliveryInfo>> {
            _type: 'redis',
            get: expect.any(Function),
            set: expect.any(Function),
        }));
        expect(createClientMock).toHaveBeenCalledTimes(1);
        expect(redisOn).toHaveBeenCalledTimes(1);
        expect(redisOn).toHaveBeenCalledWith('error', expect.anything());
        expect(redisAuth).toHaveBeenCalledTimes(1);
        expect(redisAuth).toHaveBeenCalledWith('my#secret#passw0rd!');
    });
});
