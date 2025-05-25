/**
 * WhatsApp Binary Reader (from reverse engineering)
 * Reads WhatsApp's binary protocol messages
 */

const { WATags, WASingleByteTokens } = require('../utils/constants');

class WABinaryReader {
    constructor(data) {
        this.data = Buffer.isBuffer(data) ? data : Buffer.from(data);
        this.index = 0;
    }

    checkEOS(length) {
        if (this.index + length > this.data.length) {
            throw new Error("End of stream reached");
        }
    }

    readByte() {
        this.checkEOS(1);
        const ret = this.data[this.index];
        this.index += 1;
        return ret;
    }

    readIntN(n, littleEndian = false) {
        this.checkEOS(n);
        let ret = 0;
        for (let i = 0; i < n; i++) {
            const currShift = littleEndian ? i : n - 1 - i;
            ret |= this.data[this.index + i] << (currShift * 8);
        }
        this.index += n;
        return ret;
    }

    readInt16(littleEndian = false) {
        return this.readIntN(2, littleEndian);
    }

    readInt20() {
        this.checkEOS(3);
        const ret = ((this.data[this.index] & 15) << 16) + 
                   (this.data[this.index + 1] << 8) + 
                   this.data[this.index + 2];
        this.index += 3;
        return ret;
    }

    readInt32(littleEndian = false) {
        return this.readIntN(4, littleEndian);
    }

    readInt64(littleEndian = false) {
        return this.readIntN(8, littleEndian);
    }

    readPacked8(tag) {
        const startByte = this.readByte();
        let ret = "";
        
        for (let i = 0; i < (startByte & 127); i++) {
            const currByte = this.readByte();
            ret += this.unpackByte(tag, (currByte & 0xF0) >> 4) + 
                   this.unpackByte(tag, currByte & 0x0F);
        }
        
        if ((startByte >> 7) !== 0) {
            ret = ret.slice(0, ret.length - 1);
        }
        
        return ret;
    }

    unpackByte(tag, value) {
        if (tag === WATags.NIBBLE_8) {
            return this.unpackNibble(value);
        } else if (tag === WATags.HEX_8) {
            return this.unpackHex(value);
        }
        throw new Error(`Unknown pack tag: ${tag}`);
    }

    unpackNibble(value) {
        if (value >= 0 && value <= 9) {
            return String.fromCharCode(48 + value); // '0' + value
        } else if (value === 10) {
            return "-";
        } else if (value === 11) {
            return ".";
        } else if (value === 15) {
            return "\0";
        }
        throw new Error(`Invalid nibble to unpack: ${value}`);
    }

    unpackHex(value) {
        if (value < 0 || value > 15) {
            throw new Error(`Invalid hex to unpack: ${value}`);
        }
        if (value < 10) {
            return String.fromCharCode(48 + value); // '0' + value
        } else {
            return String.fromCharCode(65 + value - 10); // 'A' + value - 10
        }
    }

    isListTag(tag) {
        return tag === WATags.LIST_EMPTY || 
               tag === WATags.LIST_8 || 
               tag === WATags.LIST_16;
    }

    readListSize(tag) {
        if (tag === WATags.LIST_EMPTY) {
            return 0;
        } else if (tag === WATags.LIST_8) {
            return this.readByte();
        } else if (tag === WATags.LIST_16) {
            return this.readInt16();
        }
        throw new Error(`Invalid tag for list size: ${tag}`);
    }

    readString(tag) {
        if (tag >= 3 && tag <= 235) {
            let token = this.getToken(tag);
            if (token === "s.whatsapp.net") {
                token = "c.us";
            }
            return token;
        }

        if (tag === WATags.DICTIONARY_0 || tag === WATags.DICTIONARY_1 || 
            tag === WATags.DICTIONARY_2 || tag === WATags.DICTIONARY_3) {
            return this.getTokenDouble(tag - WATags.DICTIONARY_0, this.readByte());
        } else if (tag === WATags.LIST_EMPTY) {
            return null;
        } else if (tag === WATags.BINARY_8) {
            return this.readStringFromChars(this.readByte());
        } else if (tag === WATags.BINARY_20) {
            return this.readStringFromChars(this.readInt20());
        } else if (tag === WATags.BINARY_32) {
            return this.readStringFromChars(this.readInt32());
        } else if (tag === WATags.JID_PAIR) {
            const i = this.readString(this.readByte());
            const j = this.readString(this.readByte());
            if (i === null || j === null) {
                throw new Error(`Invalid jid pair: ${i}, ${j}`);
            }
            return i + "@" + j;
        } else if (tag === WATags.NIBBLE_8 || tag === WATags.HEX_8) {
            return this.readPacked8(tag);
        } else {
            throw new Error(`Invalid string with tag ${tag}`);
        }
    }

    readStringFromChars(length) {
        this.checkEOS(length);
        const ret = this.data.slice(this.index, this.index + length).toString('utf8');
        this.index += length;
        return ret;
    }

    readAttributes(n) {
        const ret = {};
        if (n === 0) {
            return ret;
        }
        
        for (let i = 0; i < n; i++) {
            const index = this.readString(this.readByte());
            const value = this.readString(this.readByte());
            if (index && value) {
                ret[index] = value;
            }
        }
        
        return ret;
    }

    readList(tag) {
        const ret = [];
        const size = this.readListSize(tag);
        
        for (let i = 0; i < size; i++) {
            ret.push(this.readNode());
        }
        
        return ret;
    }

    readNode() {
        const listSize = this.readListSize(this.readByte());
        const descrTag = this.readByte();
        
        if (descrTag === WATags.STREAM_END) {
            throw new Error("Unexpected stream end");
        }
        
        const descr = this.readString(descrTag);
        
        if (listSize === 0 || !descr) {
            throw new Error("Invalid node");
        }
        
        const attrs = this.readAttributes(Math.floor((listSize - 1) / 2));
        
        if (listSize % 2 === 1) {
            return [descr, attrs, null];
        }

        const tag = this.readByte();
        let content;
        
        if (this.isListTag(tag)) {
            content = this.readList(tag);
        } else if (tag === WATags.BINARY_8) {
            content = this.readBytes(this.readByte());
        } else if (tag === WATags.BINARY_20) {
            content = this.readBytes(this.readInt20());
        } else if (tag === WATags.BINARY_32) {
            content = this.readBytes(this.readInt32());
        } else {
            content = this.readString(tag);
        }
        
        return [descr, attrs, content];
    }

    readBytes(n) {
        this.checkEOS(n);
        const ret = this.data.slice(this.index, this.index + n);
        this.index += n;
        return ret;
    }

    getToken(index) {
        if (index < 3 || index >= WASingleByteTokens.length) {
            throw new Error(`Invalid token index: ${index}`);
        }
        return WASingleByteTokens[index];
    }

    getTokenDouble(index1, index2) {
        const n = 256 * index1 + index2;
        // For now, return a fallback since we don't have double byte tokens implemented
        return `DOUBLE_TOKEN_${n}`;
    }
}

/**
 * Read WhatsApp binary message
 */
function whatsappReadBinary(data, withMessages = false) {
    try {
        const node = new WABinaryReader(data).readNode();
        
        if (withMessages && node && Array.isArray(node) && node[1]) {
            // Process message arrays if needed
            node[2] = whatsappReadMessageArray(node[2]);
        }
        
        return node;
    } catch (error) {
        console.error('Failed to read binary message:', error);
        throw error;
    }
}

function whatsappReadMessageArray(msgs) {
    if (!Array.isArray(msgs)) {
        return msgs;
    }
    
    const ret = [];
    for (const x of msgs) {
        if (Array.isArray(x) && x[0] === "message") {
            // Decode WebMessageInfo if available
            ret.push(x); // For now, just pass through
        } else {
            ret.push(x);
        }
    }
    
    return ret;
}

module.exports = {
    WABinaryReader,
    whatsappReadBinary,
    whatsappReadMessageArray
};
