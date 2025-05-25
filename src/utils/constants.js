/**
 * Constants for WhatsApp Web Library
 * Defines all constants, enums, and configuration values
 */

// WhatsApp Web connection states
const WAState = {
    UNPAIRED: 'UNPAIRED',
    PAIRING: 'PAIRING',
    UNPAIRED_IDLE: 'UNPAIRED_IDLE',
    CONNECTED: 'CONNECTED',
    OPENING: 'OPENING',
    PAIRING_IDLE: 'PAIRING_IDLE',
    TIMEOUT: 'TIMEOUT',
    DESTROYED: 'DESTROYED'
};

// WhatsApp Web events
const WAEvents = {
    QR: 'qr',
    AUTHENTICATED: 'authenticated',
    AUTH_FAILURE: 'auth_failure',
    READY: 'ready',
    MESSAGE: 'message',
    MESSAGE_CREATE: 'message_create',
    MESSAGE_ACK: 'message_ack',
    MESSAGE_REVOKE_EVERYONE: 'message_revoke_everyone',
    MESSAGE_REVOKE_ME: 'message_revoke_me',
    DISCONNECTED: 'disconnected',
    STATE_CHANGE: 'state_change',
    GROUP_JOIN: 'group_join',
    GROUP_LEAVE: 'group_leave',
    GROUP_UPDATE: 'group_update',
    CONTACT_CHANGED: 'contact_changed',
    PRESENCE_UPDATE: 'presence_update',
    TYPING: 'typing',
    CHAT_STATE: 'chat_state'
};

// Message acknowledgment states
const MessageAck = {
    ERROR: -1,
    PENDING: 0,
    SERVER: 1,
    DEVICE: 2,
    READ: 3,
    PLAYED: 4
};

// Chat types
const ChatTypes = {
    SOLO: 'solo',
    GROUP: 'group',
    BROADCAST: 'broadcast'
};

// Message types
const MessageTypes = {
    TEXT: 'text',
    IMAGE: 'image',
    VIDEO: 'video',
    AUDIO: 'audio',
    VOICE: 'voice',
    DOCUMENT: 'document',
    STICKER: 'sticker',
    CONTACT: 'contact',
    CONTACT_CARD_MULTI: 'multi_vcard',
    LOCATION: 'location',
    LIVE_LOCATION: 'live_location',
    GROUP_INVITE: 'group_invite',
    GROUP_NOTIFICATION: 'group_notification',
    UNKNOWN: 'unknown',
    REVOKED: 'revoked'
};

// Media types
const MediaTypes = {
    IMAGE: 'image',
    VIDEO: 'video',
    AUDIO: 'audio',
    DOCUMENT: 'document',
    STICKER: 'sticker'
};

// Presence states
const PresenceState = {
    AVAILABLE: 'available',
    COMPOSING: 'composing',
    RECORDING: 'recording',
    PAUSED: 'paused'
};

// Group notification types
const GroupNotificationTypes = {
    ADD: 'add',
    INVITE: 'invite',
    REMOVE: 'remove',
    LEAVE: 'leave',
    SUBJECT: 'subject',
    DESCRIPTION: 'description',
    PICTURE: 'picture',
    ANNOUNCE: 'announce',
    RESTRICT: 'restrict'
};

// WhatsApp Web endpoints
const Endpoints = {
    WEBSOCKET: [
        'wss://web.whatsapp.com/ws/chat',
        'wss://w1.web.whatsapp.com/ws/chat',
        'wss://w2.web.whatsapp.com/ws/chat',
        'wss://w3.web.whatsapp.com/ws/chat',
        'wss://w4.web.whatsapp.com/ws/chat'
    ],
    MEDIA_UPLOAD: 'https://mmg.whatsapp.net/upload',
    MEDIA_DOWNLOAD: 'https://mmg.whatsapp.net/download'
};

// Protocol versions
const ProtocolVersion = {
    MAJOR: 2,
    MINOR: 2009,
    PATCH: 8
};

// Client information
const ClientInfo = {
    PLATFORM: 'web',
    RELEASE_CHANNEL: 'stable',
    USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    ORIGIN: 'https://web.whatsapp.com'
};

// File size limits (in bytes)
const FileLimits = {
    IMAGE: 16 * 1024 * 1024,      // 16 MB
    VIDEO: 64 * 1024 * 1024,      // 64 MB
    AUDIO: 16 * 1024 * 1024,      // 16 MB
    DOCUMENT: 100 * 1024 * 1024,  // 100 MB
    STICKER: 512 * 1024           // 512 KB
};

// Supported MIME types
const SupportedMimeTypes = {
    IMAGE: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif'
    ],
    VIDEO: [
        'video/mp4',
        'video/3gpp',
        'video/quicktime',
        'video/x-msvideo',
        'video/mkv'
    ],
    AUDIO: [
        'audio/aac',
        'audio/mp4',
        'audio/mpeg',
        'audio/amr',
        'audio/ogg',
        'audio/wav'
    ],
    DOCUMENT: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'application/zip',
        'application/x-rar-compressed',
        'application/x-tar',
        'application/gzip'
    ]
};

// Cryptographic constants
const CryptoConstants = {
    CURVE25519_KEY_SIZE: 32,
    AES_KEY_SIZE: 32,
    HMAC_KEY_SIZE: 32,
    IV_SIZE: 16,
    MAC_SIZE: 32,
    SALT_SIZE: 32
};

// Timeout values (in milliseconds)
const Timeouts = {
    AUTH: 60000,              // 1 minute
    QR_CODE: 60000,           // 1 minute
    MESSAGE_SEND: 30000,      // 30 seconds
    MEDIA_UPLOAD: 300000,     // 5 minutes
    MEDIA_DOWNLOAD: 300000,   // 5 minutes
    WEBSOCKET_PING: 30000,    // 30 seconds
    WEBSOCKET_PONG: 10000,    // 10 seconds
    RECONNECT_BASE: 1000,     // 1 second
    RECONNECT_MAX: 30000      // 30 seconds
};

// Retry limits
const RetryLimits = {
    WEBSOCKET_RECONNECT: 10,
    MESSAGE_SEND: 3,
    MEDIA_UPLOAD: 3,
    MEDIA_DOWNLOAD: 3,
    AUTH: 3
};

// Error codes
const ErrorCodes = {
    AUTH_FAILURE: 'AUTH_FAILURE',
    CONNECTION_FAILED: 'CONNECTION_FAILED',
    MESSAGE_SEND_FAILED: 'MESSAGE_SEND_FAILED',
    MEDIA_UPLOAD_FAILED: 'MEDIA_UPLOAD_FAILED',
    MEDIA_DOWNLOAD_FAILED: 'MEDIA_DOWNLOAD_FAILED',
    INVALID_SESSION: 'INVALID_SESSION',
    RATE_LIMITED: 'RATE_LIMITED',
    PHONE_NOT_CONNECTED: 'PHONE_NOT_CONNECTED',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

// Regular expressions
const RegexPatterns = {
    PHONE_NUMBER: /^\+?[1-9]\d{1,14}$/,
    JID: /^(\d+)@(s\.whatsapp\.net|g\.us|broadcast)$/,
    MESSAGE_ID: /^[A-F0-9]{32}$/i,
    BASE64: /^[A-Za-z0-9+/]+=*$/,
    URL: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
};

// WhatsApp Binary Protocol Tags (from reverse engineering)
const WATags = {
    LIST_EMPTY: 0,
    STREAM_END: 2,
    DICTIONARY_0: 236,
    DICTIONARY_1: 237,
    DICTIONARY_2: 238,
    DICTIONARY_3: 239,
    LIST_8: 248,
    LIST_16: 249,
    JID_PAIR: 250,
    HEX_8: 251,
    BINARY_8: 252,
    BINARY_20: 253,
    BINARY_32: 254,
    NIBBLE_8: 255,
    SINGLE_BYTE_MAX: 256,
    PACKED_MAX: 254
};

// WhatsApp Single Byte Tokens (from reverse engineering)
const WASingleByteTokens = [
    null,null,null,"200","400","404","500","501","502","action","add",
    "after","archive","author","available","battery","before","body",
    "broadcast","chat","clear","code","composing","contacts","count",
    "create","debug","delete","demote","duplicate","encoding","error",
    "false","filehash","from","g.us","group","groups_v2","height","id",
    "image","in","index","invis","item","jid","kind","last","leave",
    "live","log","media","message","mimetype","missing","modify","name",
    "notification","notify","out","owner","participant","paused",
    "picture","played","presence","preview","promote","query","raw",
    "read","receipt","received","recipient","recording","relay",
    "remove","response","resume","retry","s.whatsapp.net","seconds",
    "set","size","status","subject","subscribe","t","text","to","true",
    "type","unarchive","unavailable","url","user","value","web","width",
    "mute","read_only","admin","creator","short","update","powersave",
    "checksum","epoch","block","previous","409","replaced","reason",
    "spam","modify_tag","message_info","delivery","emoji","title",
    "description","canonical-url","matched-text","star","unstar",
    "media_key","filename","identity","unread","page","page_count",
    "search","media_message","security","call_log","profile","ciphertext",
    "invite","gif","vcard","frequent","privacy","blacklist","whitelist",
    "verify","location","document","elapsed","revoke_invite","expiration",
    "unsubscribe","disable","vname","old_jid","new_jid","announcement",
    "locked","prop","label","color","call","offer","call-id",
    "quick_reply", "sticker", "pay_t", "accept", "reject", "sticker_pack",
    "invalid", "canceled", "missed", "connected", "result", "audio",
    "video", "recent"
];

// WhatsApp Metrics (from reverse engineering)
const WAMetrics = {
    DEBUG_LOG: 1,
    QUERY_RESUME: 2,
    QUERY_RECEIPT: 3,
    QUERY_MEDIA: 4,
    QUERY_CHAT: 5,
    QUERY_CONTACTS: 6,
    QUERY_MESSAGES: 7,
    PRESENCE: 8,
    PRESENCE_SUBSCRIBE: 9,
    GROUP: 10,
    READ: 11,
    CHAT: 12,
    RECEIVED: 13,
    PIC: 14,
    STATUS: 15,
    MESSAGE: 16,
    QUERY_ACTIONS: 17,
    BLOCK: 18,
    QUERY_GROUP: 19,
    QUERY_PREVIEW: 20,
    QUERY_EMOJI: 21,
    QUERY_MESSAGE_INFO: 22,
    SPAM: 23,
    QUERY_SEARCH: 24,
    QUERY_IDENTITY: 25,
    QUERY_URL: 26,
    PROFILE: 27,
    CONTACT: 28,
    QUERY_VCARD: 29,
    QUERY_STATUS: 30,
    QUERY_STATUS_UPDATE: 31,
    PRIVACY_STATUS: 32,
    QUERY_LIVE_LOCATIONS: 33,
    LIVE_LOCATION: 34,
    QUERY_VNAME: 35,
    QUERY_LABELS: 36,
    CALL: 37,
    QUERY_CALL: 38,
    QUERY_QUICK_REPLIES: 39,
    QUERY_CALL_OFFER: 40,
    QUERY_RESPONSE: 41,
    QUERY_STICKER_PACKS: 42,
    QUERY_STICKERS: 43,
    ADD_OR_REMOVE_LABELS: 44,
    QUERY_NEXT_LABEL_COLOR: 45,
    QUERY_LABEL_PALETTE: 46,
    CREATE_OR_DELETE_LABELS: 47,
    EDIT_LABELS: 48
};

// WhatsApp Flags (from reverse engineering)
const WAFlags = {
    IGNORE: 1 << 7,
    ACK_REQUEST: 1 << 6,
    AVAILABLE: 1 << 5,
    NOT_AVAILABLE: 1 << 4,
    EXPIRES: 1 << 3,
    SKIP_OFFLINE: 1 << 2
};

// WhatsApp Media App Info (from reverse engineering)
const WAMediaAppInfo = {
    imageMessage: "WhatsApp Image Keys",
    stickerMessage: "WhatsApp Image Keys",
    videoMessage: "WhatsApp Video Keys",
    audioMessage: "WhatsApp Audio Keys",
    documentMessage: "WhatsApp Document Keys"
};

// WhatsApp servers
const WAServers = {
    CLIENT: 'c.us',
    GROUP: 'g.us',
    BROADCAST: 'broadcast',
    SERVER: 's.whatsapp.net'
};

// Default configuration
const DefaultConfig = {
    SESSION_PATH: './session.json',
    KEYS_PATH: './keys',
    QR_TIMEOUT: 60000,
    AUTH_TIMEOUT: 60000,
    RESTART_ON_CRASH: true,
    MAX_RECONNECT_ATTEMPTS: 10,
    HEARTBEAT_INTERVAL: 30000,
    PRESENCE_INTERVAL: 30000
};

module.exports = {
    WAState,
    WAEvents,
    MessageAck,
    ChatTypes,
    MessageTypes,
    MediaTypes,
    PresenceState,
    GroupNotificationTypes,
    Endpoints,
    ProtocolVersion,
    ClientInfo,
    FileLimits,
    SupportedMimeTypes,
    CryptoConstants,
    Timeouts,
    RetryLimits,
    ErrorCodes,
    RegexPatterns,
    WATags,
    WASingleByteTokens,
    WAMetrics,
    WAFlags,
    WAMediaAppInfo,
    WAServers,
    DefaultConfig
};
