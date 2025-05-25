/**
 * WhatsApp Binary Writer (from reverse engineering)
 * Writes WhatsApp's binary protocol messages
 */

const { WATags, WASingleByteTokens } = require('../utils/constants');

class WABinaryWriter {
    constructor() {
        this.data = [];
    }

    getData() {
        return Buffer.from(this.data);
    }

    pushByte(value) {
        this.data.push(value & 0xFF);
    }

    pushIntN(value, n, littleEndian = false) {
        for (let i = 0; i < n; i++) {
            const currShift = littleEndian ? i : n - 1 - i;
            this.data.push((value >> (currShift * 8)) & 0xFF);
        }
    }

    pushInt20(value) {
        this.pushBytes([(value >> 16) & 0x0F, (value >> 8) & 0xFF, value & 0xFF]);
    }

    pushInt16(value) {
        this.pushIntN(value, 2);
    }

    pushInt32(value) {
        this.pushIntN(value, 4);
    }

    pushInt64(value) {
        this.pushIntN(value, 8);
    }

    pushBytes(bytes) {
        if (Buffer.isBuffer(bytes)) {
            this.data.push(...bytes);
        } else if (Array.isArray(bytes)) {
            this.data.push(...bytes);
        } else {
            throw new Error('Invalid bytes parameter');
        }
    }

    pushString(str) {
        if (typeof str === 'string') {
            const buffer = Buffer.from(str, 'utf8');
            this.data.push(...buffer);
        } else {
            throw new Error('Invalid string parameter');
        }
    }

    writeByteLength(length) {
        if (length >= 4294967296) {
            throw new Error(`String too large to encode (len = ${length})`);
        }

        if (length >= (1 << 20)) {
            this.pushByte(WATags.BINARY_32);
            this.pushInt32(length);
        } else if (length >= 256) {
            this.pushByte(WATags.BINARY_20);
            this.pushInt20(length);
        } else {
            this.pushByte(WATags.BINARY_8);
            this.pushByte(length);
        }
    }

    writeNode(node) {
        if (!node) {
            return;
        }
        
        if (!Array.isArray(node) || node.length !== 3) {
            throw new Error('Invalid node');
        }

        const numAttributes = this.getNumValidKeys(node[1]);
        
        this.writeListStart(2 * numAttributes + 1 + (node[2] ? 1 : 0));
        this.writeString(node[0]);
        this.writeAttributes(node[1]);
        this.writeChildren(node[2]);
    }

    writeString(token, isValue = false) {
        if (typeof token !== 'string') {
            throw new Error('Invalid string');
        }

        // Handle special case for c.us
        if (!isValue && token === "c.us") {
            this.writeToken(WASingleByteTokens.indexOf("s.whatsapp.net"));
            return;
        }

        // Check if token exists in single byte tokens
        const tokenIndex = WASingleByteTokens.indexOf(token);
        if (tokenIndex !== -1) {
            if (tokenIndex < WATags.SINGLE_BYTE_MAX) {
                this.writeToken(tokenIndex);
            } else {
                // Handle double byte tokens (not fully implemented)
                const singleByteOverflow = tokenIndex - WATags.SINGLE_BYTE_MAX;
                const dictionaryIndex = singleByteOverflow >> 8;
                if (dictionaryIndex < 0 || dictionaryIndex > 3) {
                    throw new Error(`Double byte dictionary token out of range: ${token} ${tokenIndex}`);
                }
                this.writeToken(WATags.DICTIONARY_0 + dictionaryIndex);
                this.writeToken(singleByteOverflow % 256);
            }
        } else {
            // Check if it's a JID
            const jidSepIndex = token.indexOf("@");
            if (jidSepIndex >= 1) {
                this.writeJid(token.substring(0, jidSepIndex), token.substring(jidSepIndex + 1));
            } else {
                this.writeStringRaw(token);
            }
        }
    }

    writeStringRaw(str) {
        const buffer = Buffer.from(str, 'utf8');
        this.writeByteLength(buffer.length);
        this.pushBytes(buffer);
    }

    writeJid(jidLeft, jidRight) {
        this.pushByte(WATags.JID_PAIR);
        if (jidLeft && jidLeft.length > 0) {
            this.writeString(jidLeft);
        } else {
            this.writeToken(WATags.LIST_EMPTY);
        }
        this.writeString(jidRight);
    }

    writeToken(token) {
        if (token < 245) {
            this.pushByte(token);
        } else if (token <= 500) {
            throw new Error('Invalid token');
        }
    }

    writeAttributes(attrs) {
        if (!attrs) {
            return;
        }
        
        for (const [key, value] of Object.entries(attrs)) {
            if (value !== null && value !== undefined) {
                this.writeString(key);
                this.writeString(value);
            }
        }
    }

    writeChildren(children) {
        if (!children) {
            return;
        }

        if (typeof children === 'string') {
            this.writeString(children, true);
        } else if (Buffer.isBuffer(children)) {
            this.writeByteLength(children.length);
            this.pushBytes(children);
        } else if (Array.isArray(children)) {
            this.writeListStart(children.length);
            for (const child of children) {
                this.writeNode(child);
            }
        } else {
            throw new Error('Invalid children');
        }
    }

    writeListStart(listSize) {
        if (listSize === 0) {
            this.pushByte(WATags.LIST_EMPTY);
        } else if (listSize < 256) {
            this.pushByte(WATags.LIST_8);
            this.pushByte(listSize);
        } else {
            this.pushByte(WATags.LIST_16);
            this.pushInt16(listSize);
        }
    }

    writePackedBytes(str) {
        try {
            this.writePackedBytesImpl(str, WATags.NIBBLE_8);
        } catch (e) {
            this.writePackedBytesImpl(str, WATags.HEX_8);
        }
    }

    writePackedBytesImpl(str, dataType) {
        const buffer = Buffer.from(str, 'utf8');
        const numBytes = buffer.length;
        
        if (numBytes > WATags.PACKED_MAX) {
            throw new Error(`Too many bytes to nibble-encode: len = ${numBytes}`);
        }

        this.pushByte(dataType);
        this.pushByte((numBytes % 2 > 0 ? 128 : 0) | Math.ceil(numBytes / 2));

        for (let i = 0; i < Math.floor(numBytes / 2); i++) {
            this.pushByte(this.packBytePair(dataType, buffer[2 * i], buffer[2 * i + 1]));
        }
        
        if (numBytes % 2 !== 0) {
            this.pushByte(this.packBytePair(dataType, buffer[numBytes - 1], 0));
        }
    }

    packBytePair(packType, part1, part2) {
        if (packType === WATags.NIBBLE_8) {
            return (this.packNibble(part1) << 4) | this.packNibble(part2);
        } else if (packType === WATags.HEX_8) {
            return (this.packHex(part1) << 4) | this.packHex(part2);
        } else {
            throw new Error(`Invalid byte pack type: ${packType}`);
        }
    }

    packNibble(value) {
        if (typeof value === 'number') {
            value = String.fromCharCode(value);
        }
        
        if (value >= "0" && value <= "9") {
            return parseInt(value);
        } else if (value === "-") {
            return 10;
        } else if (value === ".") {
            return 11;
        } else if (value === "\x00" || value === 0) {
            return 15;
        }
        
        throw new Error(`Invalid byte to pack as nibble: ${value}`);
    }

    packHex(value) {
        if (typeof value === 'number') {
            value = String.fromCharCode(value);
        }
        
        if ((value >= "0" && value <= "9") || 
            (value >= "A" && value <= "F") || 
            (value >= "a" && value <= "f")) {
            return parseInt(value, 16);
        } else if (value === "\x00" || value === 0) {
            return 15;
        }
        
        throw new Error(`Invalid byte to pack as hex: ${value}`);
    }

    getNumValidKeys(obj) {
        if (!obj || typeof obj !== 'object') {
            return 0;
        }
        
        return Object.keys(obj).filter(key => 
            obj[key] !== null && obj[key] !== undefined
        ).length;
    }
}

/**
 * Write WhatsApp binary message
 */
function whatsappWriteBinary(node) {
    try {
        const writer = new WABinaryWriter();
        writer.writeNode(node);
        return writer.getData();
    } catch (error) {
        console.error('Failed to write binary message:', error);
        throw error;
    }
}

module.exports = {
    WABinaryWriter,
    whatsappWriteBinary
};
