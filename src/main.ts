import * as moment from 'moment';
import {CanDeliver, DeliveryInfo, DeliveryInfoState, DeliveryStorage} from './domain';
import {getDeliveryStorage} from './storage';

declare var process: {
    env: {
        MD_MAX_ACKNOWLEDGE_TIME: number | string;
    };
};

export {CanDeliver};

const DEFAULT_ACKNOWLEDGE_TIME: number = 900;
const storage: DeliveryStorage<DeliveryInfo> = getDeliveryStorage();

const MAX_ACKNOWLEDGE_TIME: { unit: moment.DurationInputArg2; value: moment.DurationInputArg1 } = {
    unit: 'seconds',
    value: process.env.MD_MAX_ACKNOWLEDGE_TIME ? process.env.MD_MAX_ACKNOWLEDGE_TIME : DEFAULT_ACKNOWLEDGE_TIME,
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
        state: DeliveryInfoState.Delivered,
        createdTime: moment().utc().toISOString(),
    });
}

export async function canBeDelivered (messageId: string, subscriberName: string): Promise<CanDeliver> {
    if (!messageId || !subscriberName) {
        throw new Error(`Message ID "${messageId}" and subscriber name "${subscriberName}" have to be provided.`);
    }

    const messageDeliveryKey: string = getMessageDeliveryKey(messageId, subscriberName);

    const deliveryInfo: DeliveryInfo | undefined = await storage.get(messageDeliveryKey);
    if (!deliveryInfo) {
        return CanDeliver.Yes;
    }

    if (deliveryInfo.state === DeliveryInfoState.Delivered) {
        return CanDeliver.NoAlreadyDelivered;
    }

    const expiredTime: moment.Moment = moment().utc().subtract(MAX_ACKNOWLEDGE_TIME.value, MAX_ACKNOWLEDGE_TIME.unit);
    if (deliveryInfo.state === DeliveryInfoState.InProgress) {
        if (moment(deliveryInfo.createdTime).utc().isAfter(expiredTime)) {
            return CanDeliver.NoInProgress;
        }
    }

    return CanDeliver.Yes;
}

function getMessageDeliveryKey (messageId: string, subscriberName: string): string {
    return `${messageId || ''}_${subscriberName || ''}`;
}
