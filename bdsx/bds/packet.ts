import { abstract } from "../common";
import { AbstractClass, AbstractMantleClass, nativeClass, nativeField } from "../nativeclass";
import { CxxString, int32_t, uint32_t } from "../nativetype";
import { SharedPtr } from "../sharedpointer";
import { NetworkIdentifier } from "./networkidentifier";
import { MinecraftPacketIds } from "./packetids";
import { procHacker } from "./proc";
import { BinaryStream } from "./stream";

// export interface PacketType<T> extends StructureType<T>
// {
//     readonly ID:number;
// }

export const PacketReadResult = uint32_t.extends({
    PacketReadNoError: 0,
    PacketReadError: 1,
});
export type PacketReadResult = uint32_t;

export const StreamReadResult = int32_t.extends({
    Disconnect: 0,
    Pass: 1,
    Warning: 2, // disconnect at 3 times
    Ignore: 0x7f,
});
export type StreamReadResult = int32_t;

@nativeClass(null)
export class ExtendedStreamReadResult extends AbstractClass {
    @nativeField(StreamReadResult)
	streamReadResult:StreamReadResult;
    @nativeField(int32_t)
	dummy:int32_t;
	// array?
}

const sharedptr_of_packet = Symbol('sharedptr');

@nativeClass(0x30)
export class Packet extends AbstractMantleClass {
    static ID:number;
    [sharedptr_of_packet]?:SharedPtr<any>|null;

    getId():MinecraftPacketIds {
        abstract();
    }
    getName():CxxString {
        abstract();
    }
    write(stream:BinaryStream):void {
        abstract();
    }
    read(stream:BinaryStream):PacketReadResult {
        abstract();
    }
    readExtended(read:ExtendedStreamReadResult, stream:BinaryStream):ExtendedStreamReadResult {
        abstract();
    }

    /**
     * same with target.send
     */
    sendTo(target:NetworkIdentifier, unknownarg?:number):void {
        abstract();
    }
    dispose():void {
        this[sharedptr_of_packet]!.dispose();
        this[sharedptr_of_packet] = null;
    }

    /**
     * @deprecated unintuitive, the returning value need to be `dispose()`
     */
    static create<T extends Packet>(this:{new(alloc?:boolean):T, ID:number, ref():any}):T {
        return (this as any).allocate();
    }

    /**
     * @return the returning value need to be `dispose()`
     */
    static allocate<T>(this:new()=>T, copyFrom?:T|null):T {
        if (copyFrom != null) throw Error(`not implemented, unable to copy the packet class`);

        const packetThis = this as any as {new():(T&Packet), ID:number};
        const id = (this as any).ID;
        if (id == null) throw Error('Packet class is abstract, please use named class instead (ex. LoginPacket)');
        const SharedPacket = SharedPtr.make(packetThis);
        const sharedptr = new SharedPacket(true);
        createPacketRaw(sharedptr, id);

        const packet = sharedptr.p;
        if (packet === null) throw Error(`${this.name} is not created`);
        packet[sharedptr_of_packet] = sharedptr;
        return packet;
    }
}

export const PacketSharedPtr = SharedPtr.make(Packet);
export type PacketSharedPtr = SharedPtr<Packet>;

export const createPacketRaw = procHacker.js("MinecraftPackets::createPacket", PacketSharedPtr, null, PacketSharedPtr, int32_t);
