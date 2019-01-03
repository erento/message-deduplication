# Message Deduplication

**Possible usage for:**
- Google Pub/Sub "only once delivery"
- Long running jobs
- ...

To get as close as possible to "only-once delivery" this library stores temporary information to a selectable storage (in memory or redis) and verifies if the message has to be processed.

**The message has 3 states:**
- Not existing (new message)

    Such a message should be processed by a subscriber.

- In progress

    Such a message will be checked if the processing time is longer than `ENV.MAX_ACKNOWLEDGE_TIME` (max. acknowledge message time).
    - If it **is not** longer, it **should not** be processed.
    - If it **is** longer, it **should** be marked to be processed (to reset a time) and processed again.

- Delivered

    Such a message should not be processed again.

*Known issue:*

It can happen (though, it is not likely) that the message comes so fast that the storage would not be able to store it.
In this case, message would be still marked as ready to be processed and not "In Progress" and it would duplicate a processing.

## How to use it

```typescript
import {CanDeliver, canBeDelivered, setAsDelivered, setInProgress} from '@erento/message-deduplication';

const subscriberName = 'my-subscriber-name';

async function processMessage(message) {
    const messageDeliveryStatus: CanDeliver = await canBeDelivered(message.id, subscriberName);
    if (messageDeliveryStatus === CanDeliver.Yes) {
        await setInProgress(message.id, subscriberName);

        // process a message (your application logic)

        await setAsDelivered(message.id, subscriberName);
    } else if (messageDeliveryStatus === CanDeliver.NoAlreadyDelivered) {
        // Message was already delivered.
    } else if (messageDeliveryStatus === CanDeliver.NoInProgress) {
        // NACK the message = message should be retried (consider to retry the message with some small delay)
    }
}
```

**Setup:**

The behaviour can be modified by following environment variables:

- `MD_IN_MEMORY_ONLY` (default: true)

    Boolean value defining if it should use in-memory cache or redis. In memory is not recommended in case you run the service on kubernetes.

- `MD_MAX_ACKNOWLEDGE_TIME` (default: 900)

    A time in seconds. This time specifies, how long the script should run until it allows another delivery attempt. Note, that it doesn't send the message again, but only marks to be processed again. Resending of the message should be done by the publisher, e.g.: Google Pub/Sub Publisher.

- `MD_MAX_MESSAGE_DURATION` (default: 864000 = 10 days)

    A time in seconds. This time specifies, what is the maximum lifetime of the message saved in the storage.

- `MD_REDIS_HOSTNAME` (default: 127.0.0.1)

    The path to the redis client.

- `MD_REDIS_PORT` (default: 6379)

    The port of redis client.

- `MD_REDIS_PASSWORD` (default: `my#secret#passw0rd!`)

    The password to redis client. Set password as empty string to not require any password. 

- `MD_REDIS_OPTIONS` (default: _no value_)

    The options provided to the redis client, if provided.

## Stay in touch

* [Erento's developers](mailto:developers@erento.com) 

## License

This module is [MIT licensed](LICENSE.md).
