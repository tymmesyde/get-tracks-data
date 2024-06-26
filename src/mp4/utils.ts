import { bufferToInt } from '@/utils';

export type BoxContainer = {
    name: string,
    size: number,
    data: Buffer,
    dataSize: number,
    offset: number,
};

export type Box = {
    version: number,
    offset: number,
};

type TKHDBox = Box & {
    creationTime: number,
    modificationTime: number,
    id: number,
};

export type MDHDBox = Box & {
    language: string,
};

export type HDLRBox = Box & {
    handlerType: string,
    name: string,
};

type SampleEntry = {
    size: number,
    name: string,
    data: Buffer,
};

export type STSDBox = Box & {
    samples: number,
    entries: SampleEntry[],
};

const parseTKHDBox = (buffer: Buffer, offset = 0): TKHDBox => {
    const version = buffer[offset];

    const creationTime = buffer.readUInt32BE(offset + 4);
    const modificationTime = buffer.readUInt32BE(offset + 8);
    const id = buffer.readUInt32BE(offset + 12);

    return {
        version,
        creationTime,
        modificationTime,
        id,
        offset,
    };
};

const parseMDHDBox = (buffer: Buffer, offset = 0): MDHDBox => {
    const version = buffer[offset];

    const languageOffset = offset + (version === 1 ? 32 : 20);
    const language = buffer.readUInt16BE(languageOffset);

    const chars: number[] = [];
    chars[0] = (language >> 10) & 0x1F;
    chars[1] = (language >> 5) & 0x1F;
    chars[2] = (language) & 0x1F;

    const languageString = String.fromCharCode(
        chars[0] + 0x60,
        chars[1] + 0x60,
        chars[2] + 0x60
    );

    return {
        version,
        language: languageString,
        offset,
    };
};

const parseHDLRBox = (buffer: Buffer, offset = 0): HDLRBox => {
    const version = buffer[offset];

    const handlerTypeOffset = offset + 4 + 4;
    const handlerType = buffer.subarray(handlerTypeOffset, handlerTypeOffset + 4).toString();

    const nameOffset = handlerTypeOffset + 4 + 12;
    const name = buffer.subarray(nameOffset, buffer.length - 1).toString();
    
    return {
        version,
        handlerType,
        name,
        offset,
    };
};

const parseSTSDBox = (buffer: Buffer, offset = 0): STSDBox => {
    const version = buffer[offset];

    const samples = buffer.readUInt32BE(offset + 4);

    const entries: SampleEntry[] = [];
    for (let i = 1; i < (samples + 1); i++) {
        const size = buffer.readUInt32BE(offset + (8 * i));
        const name = buffer.subarray(offset + (12 * i), offset + (16 * i)).toString();
        const data = buffer.subarray(offset + (16 * i), offset + (16 * i) + size);

        entries.push({
            size,
            name,
            data,
        });
    };

    return {
        version,
        samples,
        entries,
        offset,
    };
};

const parseBox = (buffer: Buffer, offset = 0): BoxContainer => {
    const size = buffer.readUInt32BE(offset);
    
    const name = buffer.subarray(offset + 4, offset + 8).toString();

    const bigSizeOffset = offset + 8;
    const bigSize = size === 1 ? bufferToInt(buffer.subarray(bigSizeOffset, bigSizeOffset + 8)) : null;

    const dataOffset = offset + 8 + (bigSize ? 8 : 0);
    const _size = bigSize ?? size;

    const data = buffer.subarray(dataOffset, size === 1 ? buffer.length :offset + size);
    const dataSize = _size - 8;

    return {
        name,
        size: _size,
        data,
        dataSize,
        offset,
    };
};

const parseBoxes = (buffer: Buffer) => {
    const boxes: BoxContainer[] = [];

    for (let offset = 0; offset < buffer.length;) {
        const box = parseBox(buffer, offset);
        boxes.push(box);

        offset += box.size;
    }

    return boxes;
};

export {
    parseTKHDBox,
    parseMDHDBox,
    parseHDLRBox,
    parseSTSDBox,
    parseBox,
    parseBoxes,
};