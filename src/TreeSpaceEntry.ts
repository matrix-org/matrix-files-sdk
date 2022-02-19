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
import { PendingBranchEntry } from './PendingBranchEntry';

export class TreeSpaceEntry extends AbstractFolderEntry {
    constructor(private files: MatrixFiles, parent: IFolderEntry, public treespace: MSC3089TreeSpace) {
        super(files.client, parent, `TreeSpaceEntry(${treespace.id})`);
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

    get writable() {
        return this.ownMembership.canWrite;
    }

    get name(): string {
        return this.treespace.room.name;
    }

    async getCreatedByUserId(): Promise<string | undefined> {
        return this.createEvent?.sender?.userId;
    }

    async getChildren(): Promise<IEntry[]> {
        let children: IEntry[] = await Promise.resolve([
            ...this.treespace.getDirectories().map(d => new TreeSpaceEntry(this.files, this, d)),
            ...this.treespace.listFiles().map(f => new BranchEntry(this.files, this, f)),
        ]);
        const pending = this.files.getPendingEntries(this);

        // adding pending if not already present
        pending.forEach((p) => {
            if (!children.find(c => c.id === p.id)) {
                children.push(p);
                // if this pending entry replaces a previous one then remove the previous one from the list
                if ('replacesEntry' in p) {
                    if (p.replacesEntry) {
                        children = children.filter(x => x.id !== p.replacesEntry?.id);
                    }
                }
            } else {
                this.files.clearPendingEntry(p);
            }
        });

        return children;
    }

    async getChildByName(name: string): Promise<IEntry | undefined> {
        return (await this.getChildren()).find(x => x.name === name);
    }

    async getChildById(id: MatrixFilesID): Promise<IEntry | undefined> {
        return (await this.getChildren()).find(x => x.id === id);
    }

    async addChildFolder(name: string): Promise<MatrixFilesID> {
        this.trace(`addChildFolder() ${this.path.join('/')} with name ${name}`);
        const d = await this.treespace.createDirectory(name);
        this.files.addPendingEntry(new TreeSpaceEntry(this.files, this, d));
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
        const ts = this.treespace.room.getLastActiveTimestamp();
        return ts > 0 ? new Date(ts) : undefined;
    }

    async delete() {
        this.trace('delete', this.path.join('/'));
        return this.treespace.delete();
    }

    async rename(name: string) {
        this.trace('rename', `${this.path.join('/')} to ${name}`);
        return this.treespace.setName(name);
    }

    async copyTo(resolvedParent: IFolderEntry, fileName: string): Promise <MatrixFilesID> {
        this.trace('copyTo', `${this.path.join('/')} to ${resolvedParent.path.join('/')}/${fileName}`);
        // TODO: Implement this
        throw new Error('Not implemented');
    }

    async moveTo(resolvedParent: IFolderEntry, fileName: string): Promise <MatrixFilesID> {
        this.trace('moveTo', `${this.path.join('/')} to ${resolvedParent.path.join('/')}/${fileName}`);

        // simple rename?
        if (resolvedParent.id === this.parent?.id) {
            await this.rename(fileName);
            return this.id;
        }

        // TODO: Implement this
        throw new Error('Not implemented');
    }

    async addFile(name: string, file: ArrayBufferBlob): Promise <MatrixFilesID> {
        this.trace('addFile', `${this.path.join('/')} with name ${name}`);
        const existing = await this.getChildByName(name);
        if (existing && existing.isFolder) {
            throw new Error('A folder with that name already exists');
        }
        if (existing) {
            this.trace('addFile', `Found existing entry for file: ${existing.id}`);
            const existingFile = existing as IFileEntry;
            await existingFile.addVersion(file);
            return existingFile.id;
        }

        // because adding a file/version is not atomic we add a placeholder pending entry to prevent concurrent adds:
        const newEntry = new PendingBranchEntry(
            this.files,
            this,
            `(pending_file_for_${this.id}@${Date.now()})`,
            name,
            undefined,
            file,
            this.files.client.isRoomEncrypted(this.id) ? 'decrypted' : 'encryptionNotEnabled',
            this.files.client.getUserId(),
            { // TODO: this is a hack and really we should get directory.createFile() to return the index event content for caching
                name,
                active: true,
                version: 1,
            },
        );

        this.files.addPendingEntry(newEntry);

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

        newEntry.setSent(id);

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
