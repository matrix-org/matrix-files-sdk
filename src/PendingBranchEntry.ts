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

import { encryptAttachment } from 'matrix-encrypt-attachment';
import {
    FileType, IContent, IEncryptedFile, ISendEventResponse, RelationType, UNSTABLE_MSC3089_BRANCH,
} from 'matrix-js-sdk/lib';
import type { MatrixFilesID, FileEncryptionStatus, IFileEntry, IFolderEntry, MatrixFiles, TreeSpaceEntry } from '.';
import { ArrayBufferBlob } from './ArrayBufferBlob';
import { AutoBindingEmitter } from './AutoBindingEmitter';
import { IPendingEntry } from './IPendingEntry';

export class PendingBranchEntry extends AutoBindingEmitter implements IFileEntry, IPendingEntry {
    private date: Date = new Date();
    constructor(
        private files: MatrixFiles,
        public parent: TreeSpaceEntry,
        private privateId: string,
        public name: string,
        public replacesEntry: IFileEntry | undefined,
        private blob: ArrayBufferBlob,
        public encryptionStatus: FileEncryptionStatus,
        private createdByUserId: string,
        private indexEventContent: IContent,
    ) {
        super(files.client, () => `PendingBranchEntry(${this.id})`);
        this.sentPromise = new Promise<string>((resolve) => {
            this.resolve = resolve;
        });
        this.version = indexEventContent.version;
    }

    public version: number;

    private sentPromise: Promise<string>;
    private sent = false;
    private resolve!: (id: MatrixFilesID) => void;

    get id() {
        return this.privateId;
    }

    setSent(id: string) {
        if (this.sent) {
            throw new Error('Event has already been marked as sent');
        }
        this.trace('setSent', `Real ID is ${id}`);
        this.privateId = id;
        this.sent = true;
        this.resolve(id);
    }

    async getCreatedByUserId() {
        return this.createdByUserId;
    }

    async getVersionHistory(): Promise<IFileEntry[]> {
        return [this];
    }

    isFolder = false;

    get path() {
        return [...this.parent.path, this.name];
    }

    get writable() {
        return this.parent?.writable ?? false;
    }

    async getCreationDate() {
        return this.date;
    }

    async getLastModifiedDate() {
        return this.date;
    }

    async delete() {
        this.trace('delete', this.path.join('/'));
        throw new Error('Unable to delete pending branch');
    }

    async rename(name: string) {
        this.trace('rename', `${this.path.join('/')} to ${name}`);
        throw new Error('Unable to rename pending branch');
    }

    async copyAsVersion(fileTo: IFileEntry): Promise<MatrixFilesID> {
        this.trace('copyAsVersion', `${this.path.join('/')} to ${fileTo.path.join('/')}`);
        throw new Error('Unable to copy pending branch');
    }

    async copyTo(resolvedParent: IFolderEntry, fileName: string): Promise<MatrixFilesID> {
        this.trace('copyTo', `${this.path.join('/')} to ${resolvedParent.path.join('/')}/${fileName}`);
        throw new Error('Unable to copy pending branch');
    }

    async moveTo(resolvedParent: IFolderEntry, fileName: string): Promise <MatrixFilesID> {
        this.trace('moveTo', `${this.path.join('/')} to ${resolvedParent.path.join('/')}/${fileName}`);
        throw new Error('Unable to move pending branch');
    }

    private async createNewVersion(
        name: string,
        encryptedContents: FileType,
        info: Partial<IEncryptedFile>,
        additionalContent?: IContent,
    ): Promise<ISendEventResponse> {
        const fileEventResponse = await this.parent.treespace.createFile(name, encryptedContents, info, {
            ...(additionalContent ?? {}),
            'm.new_content': true,
            'm.relates_to': {
                'rel_type': RelationType.Replace,
                'event_id': this.id,
            },
        });

        // Update the version of the new event
        await this.files.client.sendStateEvent(this.parent.id, UNSTABLE_MSC3089_BRANCH.name, {
            active: true,
            name: name,
            version: this.version + 1,
        }, fileEventResponse['event_id']);

        // Deprecate ourselves
        await this.files.client.sendStateEvent(this.parent.id, UNSTABLE_MSC3089_BRANCH.name, {
            ...this.indexEventContent,
            active: false,
        }, this.id);

        return fileEventResponse;
    }

    async addVersion(file: ArrayBufferBlob, newName?: string): Promise<MatrixFilesID> {
        const name = newName ?? this.name;
        this.trace('addVersion', `${this.path.join('/')} with name ${name}`);

        if (!this.sent) {
            this.trace('addVersion', `Current version ${this.version} with ID ${this.id} not sent so waiting`);
            await this.sentPromise;
            this.trace('addVersion', `Current version ${this.version} now sent with ID ${this.id}`);
        }

        // because adding a file/version is not atomic we add a placeholder pending entry to prevent concurrent adds:
        const newEntry = new PendingBranchEntry(
            this.files,
            this.parent,
            `(pending_version_for_${this.id}@${Date.now()})`,
            name,
            this,
            file,
            this.files.client.isRoomEncrypted(this.id) ? 'decrypted' : 'encryptionNotEnabled',
            this.files.client.getUserId(),
            {
                ...this.indexEventContent,
                version: this.version + 1,
            },
        );

        this.files.addPendingEntry(newEntry);

        const {
            mimetype,
            size,
            data,
        } = file;
        const encrypted = await encryptAttachment(data);

        const { event_id: id } = await this.createNewVersion(
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

        // set the real ID when known
        newEntry.setSent(id);

        return id;
    }

    async getBlob(): Promise<ArrayBufferBlob> {
        return this.blob;
    }

    async getSize(): Promise<number> {
        return this.blob.size;
    }

    locked = false;

    async setLocked(locked: boolean): Promise<void> {
        throw new Error('Unable to lock pending branch');
    }
}
