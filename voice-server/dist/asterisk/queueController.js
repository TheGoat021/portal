import { createCallEvent, findCallByUniqueId, setCallQueued } from "../services/callService.js";
import { logger } from "../utils/logger.js";
export async function handleQueueAmiEvent(event) {
    const eventName = event.Event;
    if (!eventName)
        return;
    const call = await findCallByUniqueId(event.Uniqueid || event.Linkedid || null);
    if (eventName === "QueueCallerJoin" && call?.id) {
        await setCallQueued(String(call.id), event.Queue || null);
        return;
    }
    if (call?.id) {
        await createCallEvent(String(call.id), `ami.${eventName}`, event);
        return;
    }
    logger.info("AMI queue event without mapped call", {
        eventName,
        queue: event.Queue,
        uniqueId: event.Uniqueid
    });
}
