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
import type { IFolderEntry } from '.';

export type MatrixFilesID = string;

/**
 * Represents an abstract entry in a Matrix Files SDK hierarchy.
 */
export interface IEntry extends EventEmitter {
    /**
     * The identifier for this entry. It corresponds to a {@link matrix-js-sdk#Room} or {@link matrix-js-sdk#Event}.
     */
    id: MatrixFilesID;

    /**
     * @returns Returns the parent of this entry or undefined if it is at the top-level.
     */
    getParent(): IFolderEntry | undefined;

    /**
     * All parts of the path including the file/leaf name. This is the same path that would be resolved by {@link IMatrixFiles.resolvePath}.
     */
    getPath(): string[];

    /**
     * @returns The name of this entry.
     */
    getName(): string;

    /**
     * `true` if this entry is an {@link IFolder}
     */
    isFolder: boolean;

    /**
     * @returns The Matrix user ID that created the entry or `undefined` if not available/known.
     */
    getCreatedByUserId(): Promise<string | undefined>;

    /**
     * @returns The date/time that the entry was created or `undefined` if not available/known.
     */
    getCreationDate(): Promise<Date | undefined>;

    /**
     * @returns The date/time that the entry was last modified at or `undefined` if not available/known.
     */
    getLastModifiedDate(): Promise<Date | undefined>;

    /**
     * Delete/redact the entry.
     */
    delete(): Promise<void>;

    /**
     * Rename an entry.
     *
     * @param newName The new name for the entry.
     */
    rename(newName: string): Promise<void>;

    /**
     * Copy the entry to a new parent in the hierarchy. The history of the entry will *not* be preserved. Folders will be deep copied.
     *
     * @param newParent The destination folder that should contain the copy.
     * @param newName The new name for the entry in the destination folder.
     */
    copyTo(newParent: IFolderEntry, newName: string): Promise<MatrixFilesID>;

    /**
     * Move the entry to a new parent in the hierarchy. The history of the entry will be preserved.
     *
     * If the @newParent is the same as the current parent then this should be equivalent to {@link rename}.
     *
     * @param newParent The destination folder that should be the new parent.
     * @param newName The new name for the entry in the destination folder.
     */
    moveTo(newParent: IFolderEntry, newName: string): Promise<MatrixFilesID>;
}
