import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { env } from "../env.js";
const greetingCache = new Map();
const execFileAsync = promisify(execFile);
function buildGreetingName(queueSlug, audioUrl) {
    const parsed = path.parse(new URL(audioUrl).pathname);
    const baseName = parsed.name || "greeting";
    const safeSlug = queueSlug.replace(/[^a-z0-9-_]/gi, "-").toLowerCase() || "queue";
    return {
        safeSlug,
        fileName: `${baseName}-${crypto.createHash("sha1").update(audioUrl).digest("hex").slice(0, 8)}`
    };
}
async function convertGreetingFile(inputFile, outputFile, format) {
    await execFileAsync("ffmpeg", [
        "-y",
        "-i",
        inputFile,
        "-ar",
        "8000",
        "-ac",
        "1",
        "-f",
        format,
        outputFile
    ]);
}
export async function resolveQueueGreetingAsset(input) {
    const audioUrl = String(input.greetingAudioUrl || "").trim();
    if (!audioUrl)
        return null;
    const cached = greetingCache.get(audioUrl);
    if (cached)
        return cached;
    const response = await fetch(audioUrl);
    if (!response.ok) {
        throw new Error(`Failed to download queue greeting audio (${response.status})`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const { safeSlug, fileName } = buildGreetingName(input.queueSlug, audioUrl);
    const relativeDir = path.join("axion-voice", "queues", safeSlug);
    const absoluteDir = path.join(env.asterisk.soundsDir, relativeDir);
    const wavPath = path.join(absoluteDir, `${fileName}.wav`);
    const alawPath = path.join(absoluteDir, `${fileName}.alaw`);
    const ulawPath = path.join(absoluteDir, `${fileName}.ulaw`);
    await fs.mkdir(absoluteDir, { recursive: true });
    await fs.writeFile(wavPath, buffer);
    await convertGreetingFile(wavPath, alawPath, "alaw");
    await convertGreetingFile(wavPath, ulawPath, "mulaw");
    const asset = {
        mediaKey: path.posix.join("axion-voice", "queues", safeSlug, fileName),
        wavPath,
        alawPath,
        ulawPath
    };
    greetingCache.set(audioUrl, asset);
    return asset;
}
