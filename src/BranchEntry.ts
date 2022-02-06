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
import type { MatrixFilesID, FileEncryptionStatus, IFileEntry, IFolderEntry, MatrixFiles } from '.';
import { ArrayBufferBlob } from './ArrayBufferBlob';
import { AutoBindingEmitter } from './AutoBindingEmitter';
import axios from 'axios';

export class BranchEntry extends AutoBindingEmitter implements IFileEntry {
    constructor(private files: MatrixFiles, public parent: IFolderEntry, public branch: MSC3089Branch) {
        super(files.client);
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
        const versions = await this.branch.getVersionHistory();
        return versions.map(x => new BranchEntry(this.files, this.parent, x));
    }

    isFolder = false;

    get name(): string {
        return this.branch.getName();
    }

    getName(): string {
        return this.name;
    }

    getParent() {
        return this.parent;
    }

    get path() {
        return [...this.parent.getPath(), this.getName()];
    }

    getPath() {
        return this.path;
    }

    async getCreationDate() {
        const history = await this.branch.getVersionHistory();
        return new Date(history[history.length - 1].indexEvent.getTs());
    }

    async getLastModifiedDate() {
        return new Date((await this.branch.getFileEvent()).getTs());
    }

    async delete() {
        return this.branch.delete();
    }

    async rename(name: string) {
        return this.branch.setName(name);
    }

    async copyAsVersion(fileTo: IFileEntry) {
        const blob = await this.getBlob();
        return fileTo.addVersion(blob);
    }

    async copyTo(resolvedParent: IFolderEntry, fileName: string): Promise<MatrixFilesID> {
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
                await newFile.addVersion(downloadedVersion, v.getName());
            }
        }

        return newFileId;
    }

    async moveTo(resolvedParent: IFolderEntry, fileName: string): Promise <MatrixFilesID> {
        // simple rename?
        if (resolvedParent.id === this.getParent().id) {
            await this.rename(fileName);
            return this.id;
        }

        const newFile = await this.copyTo(resolvedParent, fileName);
        await this.delete();
        return newFile;
    }

    async addVersion(file: ArrayBufferBlob, newName?: string): Promise<void> {
        const {
            mimetype,
            size,
            data,
        } = file;
        const encrypted = await encryptAttachment(data);

        return this.branch.createNewVersion(newName ?? this.getName(), Buffer.from(encrypted.data), encrypted.info, {
            info: {
                mimetype,
                size,
            },
        });

        // TODO: ideally we would return the new IFileEntry
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

    isLocked() {
        return this.locked;
    }

    async setLocked(locked: boolean): Promise<void> {
        return this.branch.setLocked(locked);
    }

    timelineChanged(e: MatrixEvent, r: Room) {
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

    getEncryptionStatus(): FileEncryptionStatus {
        return this.encryptionStatus;
    }
}
