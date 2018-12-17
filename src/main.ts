import * as moment from 'moment';
import {DeliveryInfo, DeliveryInfoState, DeliveryStorage} from './domain';
import {getDeliveryStorage} from './storage';

const storage: DeliveryStorage<DeliveryInfo> = getDeliveryStorage(
    process.env.MD_IN_MEMORY_ONLY ? !!process.env.MD_IN_MEMORY_ONLY : true,
);

const MAX_ACKNOWLEDGE_TIME: { unit: moment.DurationInputArg2, value: moment.DurationInputArg1 } = {
    unit: 'seconds',
    value: process.env.MD_MAX_ACKNOWLEDGE_TIME || 900,
};

export async function setInProgress (messageId: string, subscriberName: string): Promise<void> {
    const messageDeliveryKey: string = getMessageDeliveryKey(messageId, subscriberName);
    await storage.set(messageDeliveryKey, {
        state: DeliveryInfoState.InProgress,
        createdTime: moment().utc().toISOString(),
    });
}

export async function setAsDelivered (messageId: string, subscriberName: string): Promise<void> {
    const messageDeliveryKey: string = getMessageDeliveryKey(messageId, subscriberName);

    const message: DeliveryInfo | undefined = await storage.get(messageDeliveryKey);
    if (!message) {
        throw new Error(`Couldn't find a message.`);
    }

    if (message.state !== DeliveryInfoState.InProgress) {
        throw new Error(
            `The message is not in the correct state. Message should be in progress to be marked as delivered. ` +
            `Current message: "${JSON.stringify(message)}".`,
        );
    }

    await storage.set(messageDeliveryKey, {
        state: DeliveryInfoState.InProgress,
        createdTime: moment().utc().toISOString(),
    });
}

export async function canStartProcessing (messageId: string, subscriberName: string): Promise<boolean> {
    if (!messageId || !subscriberName) {
        throw new Error(`Message ID "${messageId}" and subscriber name "${subscriberName}" have to be provided.`);
    }

    const messageDeliveryKey: string = getMessageDeliveryKey(messageId, subscriberName);

    const deliveryInfo: DeliveryInfo | undefined = await storage.get(messageDeliveryKey);
    if (deliveryInfo !== undefined) {
        if (deliveryInfo.state === DeliveryInfoState.Delivered) {
            return false;
        }

        const expiredTime: moment.Moment = moment().utc().subtract(MAX_ACKNOWLEDGE_TIME.value, MAX_ACKNOWLEDGE_TIME.unit);
        if (deliveryInfo.state === DeliveryInfoState.InProgress) {
            if (moment(deliveryInfo.createdTime).utc().isAfter(expiredTime)) {
                return false;
            }
        }
    }

    return true;
}

function getMessageDeliveryKey (messageId: string, subscriberName: string): string {
    return `${messageId || ''}_${subscriberName || ''}`;
}
