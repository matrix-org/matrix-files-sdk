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

import type { MatrixClient } from 'matrix-js-sdk/lib';
import type { IFolderEntry, IEntry, FolderRole, MatrixFilesID } from '.';
import { AutoBindingEmitter } from './AutoBindingEmitter';
import { IFolderMembership } from './IFolderMembership';
import { ArrayBufferBlob } from './ArrayBufferBlob';

export abstract class AbstractFolderEntry extends AutoBindingEmitter implements IFolderEntry {
    constructor(client: MatrixClient, public parent: IFolderEntry | undefined) {
        super(client);
    }
    abstract addFile(name: string, file: ArrayBufferBlob): Promise<MatrixFilesID>;
    abstract id: string;
    abstract name: string;
    abstract getCreationDate(): Promise<Date | undefined>;
    abstract getLastModifiedDate(): Promise<Date | undefined>;
    abstract delete(): Promise<void>;
    abstract rename(newName: string): Promise<void>;
    abstract copyTo(newParent: IFolderEntry, newName: string): Promise<MatrixFilesID>;
    abstract moveTo(newParent: IFolderEntry, newName: string): Promise<MatrixFilesID>;
    abstract getCreatedByUserId(): Promise<string | undefined>;
    abstract members: IFolderMembership[];
    abstract ownMembership: IFolderMembership;
    abstract getMembership(userId: string): IFolderMembership;
    abstract inviteMember(userId: string, role: FolderRole): Promise<IFolderMembership>;
    abstract setMemberRole(userId: string, role: FolderRole): Promise<IFolderMembership>;
    abstract removeMember(userId: string): Promise<void>;
    abstract writable: boolean;

    isFolder = true;

    get path(): string[] {
        if (this.parent) {
            return [...this.parent.path, this.name];
        }
        return [];
    }

    abstract getChildren(): Promise<IEntry[]>;

    async getChildByName(name: string) {
        return (await this.getChildren()).find(x => x.name === name);
    }

    async getChildById(id: MatrixFilesID) {
        return (await this.getChildren()).find(x => x.id === id);
    }

    abstract addChildFolder(name: string): Promise<MatrixFilesID>;

    async addFolder(_name: string | string[]): Promise<MatrixFilesID> {
        const name = typeof _name === 'string' ? [_name] : _name;
        const first = name[0];
        const existingChild = await this.getChildByName(first);
        let childId = (existingChild)?.id;
        if (!childId) {
            childId = await this.addChildFolder(first);
        } else if (!existingChild?.isFolder) {
            throw new Error(`Not a folder: ${this.path} => ${first}`);
        }

        const folder = await this.getChildById(childId) as IFolderEntry | undefined;

        if (!folder) {
            throw new Error('New folder not found');
        }

        const remaining = name.slice(1);
        if (remaining.length > 0) {
            return folder.addFolder(remaining);
        } else {
            return folder.id;
        }
    }

    async getDescendentById(id: string, maxDepth?: number): Promise<IEntry | undefined> {
        return this.getDescendantById(id, maxDepth);
    }

    async getDescendantById(id: string, maxDepth?: number): Promise<IEntry | undefined> {
        const children = await this.getChildren();
        // breadth first search
        for (const c of children) {
            if (c.id === id) {
                return c;
            }
        }
        if (typeof maxDepth !== 'number' || maxDepth > 0) {
            for (const c of children) {
                if (c.isFolder) {
                    const f = c as IFolderEntry;
                    const found = await f.getDescendantById(
                        id,
                        typeof maxDepth !== 'number' ? undefined : maxDepth - 1,
                    );
                    if (found) {
                        return found;
                    }
                }
            }
        }
        return undefined;
    }
}
