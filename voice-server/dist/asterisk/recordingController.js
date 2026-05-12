import { createRecording } from "../services/recordingService.js";
import { createCallEvent } from "../services/callService.js";
export async function handleRecordingFinished(payload) {
    const recording = await createRecording(payload);
    await createCallEvent(payload.callId, "recording.completed", {
        filePath: payload.filePath,
        publicUrl: recording.public_url,
        durationSeconds: payload.durationSeconds ?? null
    });
    return recording;
}
