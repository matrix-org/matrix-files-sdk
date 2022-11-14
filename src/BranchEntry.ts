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

import type { MSC3089Branch } from 'matrix-js-sdk/lib/models/MSC3089Branch';
import type { MatrixEvent, Room } from 'matrix-js-sdk/lib';
import { encryptAttachment, decryptAttachment } from 'matrix-encrypt-attachment';
import type { MatrixFilesID, FileEncryptionStatus, IFileEntry, IFolderEntry, MatrixFiles, TreeSpaceEntry } from '.';
import { ArrayBufferBlob } from './ArrayBufferBlob';
import { AutoBindingEmitter } from './AutoBindingEmitter';
import axios from 'axios';
import { PendingBranchEntry } from './PendingBranchEntry';

export class BranchEntry extends AutoBindingEmitter implements IFileEntry {
    constructor(private files: MatrixFiles, public parent: TreeSpaceEntry, public branch: MSC3089Branch) {
        super(files.client, `BranchEntry(${branch.id})`);
        super.setEventHandlers({ 'Room.timeline': this.timelineChanged });
    }

    get id(): string {
        return this.branch.id;
    }

    get version(): number {
        return this.branch.version;
    }

    async getCreatedByUserId() {
        return (await this.branch.getFileEvent()).event.sender ?? '';
    }

    async getVersionHistory(): Promise<IFileEntry[]> {
        const versions: BranchEntry[] = [];
        versions.push(this); // start with ourselves

        let childEvent: MatrixEvent | undefined;
        let parentEvent = await this.branch.getFileEvent();
        do {
            const replacingEventId = parentEvent.getRelation()?.event_id;

            if (replacingEventId) {
                childEvent = this.parent.treespace.room.findEventById(replacingEventId);
                if (childEvent) {
                    const childBranch = this.parent.treespace.getFile(childEvent.getId());
                    if (childBranch) {
                        versions.push(new BranchEntry(this.files, this.parent, childBranch!));
                        parentEvent = childEvent;
                        continue;
                    }
                }
            }
            break;
        } while (childEvent);

        return versions;
    }

    isFolder = false;

    get name(): string {
        return this.branch.getName();
    }

    get path() {
        return [...this.parent.path, this.name];
    }

    get writable() {
        return this.parent?.writable ?? false;
    }

    async getCreationDate() {
        const history = await this.branch.getVersionHistory();
        return new Date(history[history.length - 1].indexEvent.getTs());
    }

    async getLastModifiedDate() {
        return new Date((await this.branch.getFileEvent()).getTs());
    }

    async delete() {
        this.trace('delete', this.path.join('/'));
        return this.branch.delete();
    }

    async rename(name: string) {
        this.trace('rename', `${this.path.join('/')} to ${name}`);
        return this.branch.setName(name);
    }

    async copyAsVersion(fileTo: IFileEntry) {
        this.trace('copyAsVersion', `${this.path.join('/')} to ${fileTo.path.join('/')}`);
        const blob = await this.getBlob();
        return fileTo.addVersion(blob);
    }

    async copyTo(resolvedParent: IFolderEntry, fileName: string): Promise<MatrixFilesID> {
        this.trace('copyTo', `${this.path.join('/')} to ${resolvedParent.path.join('/')}/${fileName}`);

        const versions = await this.getVersionHistory();
        // process versions in order that they were created
        versions.reverse();

        // make first version
        const firstVersion = versions.shift();
        const downloadedFile = await firstVersion!.getBlob();
        const newFileId = await resolvedParent.addFile(fileName, downloadedFile);

        const newFile = await resolvedParent.getChildById(newFileId) as IFileEntry | undefined;
        if (!newFile) {
            throw new Error('New file not found');
        }

        // make subsequent versions if needed
        while (versions.length > 0) {
            const v = versions.shift();
            if (v) {
                const downloadedVersion = await v.getBlob();
                await newFile.addVersion(downloadedVersion, v.name);
            }
        }

        return newFileId;
    }

    async moveTo(resolvedParent: IFolderEntry, fileName: string): Promise <MatrixFilesID> {
        this.trace('moveTo', `${this.path.join('/')} to ${resolvedParent.path.join('/')}/${fileName}`);

        // simple rename?
        if (resolvedParent.id === this.parent.id) {
            await this.rename(fileName);
            return this.id;
        }

        const newFile = await this.copyTo(resolvedParent, fileName);
        await this.delete();
        return newFile;
    }

    async addVersion(file: ArrayBufferBlob, newName?: string): Promise<MatrixFilesID> {
        const name = newName ?? this.name;
        this.trace('addVersion', `${this.path.join('/')} with name ${name}`);

        // because adding a file/version is not atomic we add a placeholder pending entry to prevent concurrent adds:
        const newEntry = new PendingBranchEntry(
            this.files,
            this.parent,
            `(pending_version_for_${this.id}@${Date.now()})`,
            name,
            this,
            file,
            this.files.client.isRoomEncrypted(this.id) ? 'decrypted' : 'encryptionNotEnabled',
            this.files.client.getUserId()!,
            {
                ...this.branch.indexEvent.getContent(),
                version: this.branch.version + 1,
            },
        );

        this.files.addPendingEntry(newEntry);

        const {
            mimetype,
            size,
            data,
        } = file;
        const encrypted = await encryptAttachment(data);

        const { event_id: id } = await this.branch.createNewVersion(
            name,
            Buffer.from(encrypted.data),
            encrypted.info,
            {
                info: {
                    mimetype,
                    size,
                },
            },
        );

        // TODO: ideally we would return the new IFileEntry

        newEntry.setSent(id);

        return id;
    }

    async getBlob(): Promise<ArrayBufferBlob> {
        const file = await this.branch.getFileInfo();

        // we use axios for consistent binary handling across browsers and Node.js
        const response = await axios.get<ArrayBuffer>(file.httpUrl, { responseType: 'arraybuffer' });
        const data = await decryptAttachment(response.data, file.info);

        const { info } = (await this.branch.getFileEvent()).getOriginalContent();

        return {
            data,
            mimetype: info?.mimetype ?? 'application/octet-stream',
            size: data.byteLength,
        };
    }

    private getLoadedFileEvent(): MatrixEvent | undefined {
        const room = this.branch.directory.room;
        return room.getUnfilteredTimelineSet().findEventById(this.id);
    }

    async getSize(): Promise<number> {
        const event = await this.branch.getFileEvent();
        const size = event.getOriginalContent().info?.size;
        return typeof size === 'number' ? size : -1;
    }

    get locked(): boolean {
        return this.branch.isLocked();
    }

    async setLocked(locked: boolean): Promise<void> {
        return this.branch.setLocked(locked);
    }

    timelineChanged(e: MatrixEvent, r: Room) {
        this.trace('event(timelineChanged)', `room ${r.roomId} type ${e.getType()}`);
        if (r.roomId === this.parent.id && e.replacingEventId() === this.id) {
            this.emit('modified', this, e);
            this.parent.emit('modified', this, e);
        }
    }

    get encryptionStatus(): FileEncryptionStatus {
        const e = this.getLoadedFileEvent();
        if (!e || e.isDecryptionFailure()) {
            return 'decryptionFailed';
        }
        if (e.isBeingDecrypted()) {
            return 'decryptionPending';
        }
        if (e.getClearContent()) {
            return 'decrypted';
        }
        return e.isEncrypted() ? 'encrypted' : 'encryptionNotEnabled';
    }
}
