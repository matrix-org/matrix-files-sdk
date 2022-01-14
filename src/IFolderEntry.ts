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

import EventEmitter from 'events';
import type { IEntry, FolderRole, MatrixFilesID } from '.';
import { IFolderMembership } from './IFolderMembership';
import { ArrayBufferBlob } from './utils';

export interface IFolderEntry extends IEntry, EventEmitter {
    getChildren(): Promise<IEntry[]>;
    getChildByName(name: string): Promise<IEntry | undefined>;
    getChildById(id: MatrixFilesID): Promise<IEntry | undefined>;
    getDescendentById(id: MatrixFilesID, maxSearchDepth?: number): Promise<IEntry | undefined>;
    addFolder(name: string | string[]): Promise<MatrixFilesID>;
    addFile(name: string, file: ArrayBufferBlob): Promise<MatrixFilesID>;
    getMembers(): IFolderMembership[];
    getMembership(userId: string): IFolderMembership;
    /**
     * n.b. The user will be invited recursively to all sub-folders.
     */
    inviteMember(userId: string, role: FolderRole): Promise<IFolderMembership>;
    setMemberRole(userId: string, role: FolderRole): Promise<IFolderMembership>;
    removeMember(userId: string): Promise<void>;
    getOwnMembership(): IFolderMembership;
}
