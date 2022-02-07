/*
Copyright 2021-2022 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { EventType, UNSTABLE_MSC3089_BRANCH } from 'matrix-js-sdk/lib/@types/event';
import type { MSC3089TreeSpace } from 'matrix-js-sdk/lib/models/MSC3089TreeSpace';
import type { MatrixEvent, Room, RoomMember, RoomState } from 'matrix-js-sdk/lib';
import { encryptAttachment } from 'matrix-encrypt-attachment';
import {
    IFolderEntry, IFileEntry, IEntry, MatrixFiles, FolderRole,
    MatrixFilesID, IFolderMembership, ArrayBufferBlob,
} from '.';
import { BranchEntry } from './BranchEntry';
import { AbstractFolderEntry } from './AbstractFolderEntry';
import { TreeSpaceMembership } from './TreeSpaceMembership';

export class TreeSpaceEntry extends AbstractFolderEntry {
    constructor(private files: MatrixFiles, parent: IFolderEntry, public treespace: MSC3089TreeSpace) {
        super(files.client, parent);
        super.setEventHandlers({
            'Room.name': this.nameChanged,
            'Room.timeline': this.timelineChanged,
            'RoomState.events': this.roomState,
        });
    }

    get id(): string {
        return this.treespace.roomId;
    }

    isFolder = true;

    get name(): string {
        return this.treespace.room.name;
    }

    async getCreatedByUserId(): Promise<string | undefined> {
        return this.createEvent?.sender?.userId;
    }

    async getChildren(): Promise<IEntry[]> {
        return await Promise.resolve([
            ...this.treespace.getDirectories().map(d => new TreeSpaceEntry(this.files, this, d)),
            ...this.treespace.listFiles().map(f => new BranchEntry(this.files, this, f)),
        ]);
    }

    async getChildByName(name: string): Promise<IEntry | undefined> {
        return (await this.getChildren()).find(x => x.name === name);
    }

    async getChildById(id: MatrixFilesID): Promise<IEntry | undefined> {
        return (await this.getChildren()).find(x => x.id === id);
    }

    async addChildFolder(name: string): Promise<MatrixFilesID> {
        const d = await this.treespace.createDirectory(name);
        return d.id;
    }

    private get createEvent() {
        return this.treespace.room.currentState.getStateEvents(EventType.RoomCreate, '');
    }

    async getCreationDate() {
        const createEvent = this.createEvent;
        return createEvent ? new Date(createEvent.getTs()) : undefined;
    }

    async getLastModifiedDate() {
        return new Date(this.treespace.room.getLastActiveTimestamp());
    }

    async delete() {
        return this.treespace.delete();
    }

    async rename(name: string) {
        return this.treespace.setName(name);
    }

    async copyTo(resolvedParent: IFolderEntry, fileName: string): Promise <MatrixFilesID> {
        // TODO: Implement this
        throw new Error('Not implemented');
    }

    async moveTo(resolvedParent: IFolderEntry, fileName: string): Promise <MatrixFilesID> {
        // simple rename?
        if (resolvedParent.id === this.parent?.id) {
            await this.rename(fileName);
            return this.id;
        }

        // TODO: Implement this
        throw new Error('Not implemented');
    }

    async addFile(name: string, file: ArrayBufferBlob): Promise <MatrixFilesID> {
        const existing = await this.getChildByName(name);
        if (existing && existing.isFolder) {
            throw new Error('A folder with that name already exists');
        }
        if (existing) {
            const existingFile = existing as IFileEntry;
            await existingFile.addVersion(file);
            return existingFile.id;
        }

        const directory = this.treespace;

        const {
            mimetype,
            size,
            data,
        } = file;

        const encrypted = await encryptAttachment(data);

        const {
            event_id: id,
        } = await directory.createFile(name, Buffer.from(encrypted.data), encrypted.info, {
            info: {
                mimetype,
                size,
            },
        });

        return id;
    }

    private mapMember(m: RoomMember) {
        return new TreeSpaceMembership(this.files, this.treespace, m);
    }

    get members(): IFolderMembership[] {
        const ms: RoomMember[] = this.treespace.room.getMembers();
        return ms.map(m => this.mapMember(m));
    }

    getMembership(userId: string): IFolderMembership {
        const m: RoomMember | null = this.treespace.room.getMember(userId);
        if (!m) {
            throw new Error('Not a member');
        }
        return this.mapMember(m);
    }

    async inviteMember(userId: string, role: FolderRole): Promise<IFolderMembership> {
        await this.treespace.invite(userId);
        return this.getMembership(userId);
    }

    async removeMember(userId: string): Promise<void> {
        await this.files.client.kick(this.treespace.roomId, userId);
    }

    async setMemberRole(userId: string, role: FolderRole): Promise<IFolderMembership> {
        await this.treespace.setPermissions(userId, role);
        return this.getMembership(userId);
    }

    get ownMembership(): IFolderMembership {
        return this.getMembership(this.files.getClient().getUserId());
    }

    private emitModified(e: MatrixEvent | Room) {
        this.emit('modified', e);
        const parent = this.parent;
        if (parent) {
            parent.emit('modified', this, e);
        }
    }

    nameChanged(r: Room) {
        if (r.roomId === this.id) {
            this.emitModified(r);
        } else {
            // see if the room is a child folder/space of us
            const parents = r.currentState.getStateEvents(EventType.SpaceParent);
            if (parents.length > 0 && parents[0].getStateKey() === this.id) {
                this.emitModified(r);
            }
        }
    }

    timelineChanged(e: MatrixEvent, r: Room) {
        if (r.roomId === this.id && e.getType() === UNSTABLE_MSC3089_BRANCH.name) {
            // look for new branch entry
            this.emitModified(e);
        }
    }

    roomState(e: MatrixEvent, s: RoomState) {
        // new child:
        if (s.roomId === this.id && e.getType() === EventType.SpaceChild) {
            this.emitModified(e);
        }
    }
}
