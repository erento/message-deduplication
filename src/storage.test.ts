const redisOn: jest.Mock = jest.fn();
const redisAuth: jest.Mock = jest.fn();
const createClientMock: jest.Mock = jest.fn().mockImplementation(() => {
    return {
        on: redisOn,
        auth: redisAuth,
    };
});
jest.mock('redis', () => {
    return {
        createClient: createClientMock,
    };
});

import {getDeliveryStorage} from './storage';

describe('Storage', (): void => {
    test('should return the in memory storage', (): void => {
        expect(getDeliveryStorage(true)).toEqual(expect.objectContaining({
            get: expect.any(Function),
            set: expect.any(Function),
        }));
        expect(redisOn).not.toHaveBeenCalled();
        expect(redisAuth).not.toHaveBeenCalled();
        expect(createClientMock).not.toHaveBeenCalled();
    });

    test('should return redis storage', (): void => {
        expect(getDeliveryStorage(false)).toEqual(expect.objectContaining({
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
