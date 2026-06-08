import "dotenv/config";
function required(name, value) {
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
function toNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
export const env = {
    port: toNumber(process.env.PORT, 4001),
    publicBaseUrl: required("PUBLIC_BASE_URL", process.env.PUBLIC_BASE_URL),
    supabaseUrl: required("SUPABASE_URL", process.env.SUPABASE_URL),
    supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
    asterisk: {
        ariUrl: required("ASTERISK_ARI_URL", process.env.ASTERISK_ARI_URL),
        ariUser: required("ASTERISK_ARI_USER", process.env.ASTERISK_ARI_USER),
        ariPassword: required("ASTERISK_ARI_PASSWORD", process.env.ASTERISK_ARI_PASSWORD),
        ariApp: process.env.ASTERISK_ARI_APP || "axion-voice",
        amiHost: required("ASTERISK_AMI_HOST", process.env.ASTERISK_AMI_HOST),
        amiPort: toNumber(process.env.ASTERISK_AMI_PORT, 5038),
        amiUser: required("ASTERISK_AMI_USER", process.env.ASTERISK_AMI_USER),
        amiPassword: required("ASTERISK_AMI_PASSWORD", process.env.ASTERISK_AMI_PASSWORD),
        agentEndpointSuffix: process.env.ASTERISK_AGENT_ENDPOINT_SUFFIX || "-webrtc",
        soundsDir: process.env.ASTERISK_SOUNDS_DIR || "/var/lib/asterisk/sounds",
        externalMediaHost: process.env.ASTERISK_EXTERNAL_MEDIA_HOST || "127.0.0.1",
        externalMediaBindAddress: process.env.ASTERISK_EXTERNAL_MEDIA_BIND_ADDRESS || "0.0.0.0",
        externalMediaStartPort: toNumber(process.env.ASTERISK_EXTERNAL_MEDIA_START_PORT, 18000)
    },
    recordingsDir: required("RECORDINGS_DIR", process.env.RECORDINGS_DIR),
    recordingsPublicBaseUrl: required("RECORDINGS_PUBLIC_BASE_URL", process.env.RECORDINGS_PUBLIC_BASE_URL),
    voiceDefaultOrigemId: process.env.VOICE_DEFAULT_ORIGEM_ID || null
};
