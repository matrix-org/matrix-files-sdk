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

import type EventEmitter from 'events';
import type { IEntry, ArrayBufferBlob } from '.';

/**
 * Helper enum to represent the encryption status of the file.
 */
export type FileEncryptionStatus =
'encryptionNotEnabled' |
'encrypted' |
'decryptionPending' |
'decrypted' |
'decryptionFailed';

/**
 * Represents a file stored in the Matrix Files SDK hierarchy.
 */
export interface IFileEntry extends IEntry, EventEmitter {
    /**
     * The revision number of this file. Revisions start at `1` and increment.
     */
    version: number;

    /**
     * Copy this file as a new version on another file.
     *
     * @param fileTo The entry to add a version to.
     */

    copyAsVersion(fileTo: IFileEntry): Promise<void>;

    /**
     * Add a new version/revision to this file.
     *
     * @param file The contents of the new version.
     * @param newName The new name for the file, or `undefined` if no change.
     */
    addVersion(file: ArrayBufferBlob, newName?: string): Promise<void>;

    /**
     * @returns The contents of the file in binary form.
     */
    getBlob(): Promise<ArrayBufferBlob>;

    /**
     * @returns The size of this file in bytes.
     */
    getSize(): Promise<number>;

    /**
     * @returns The current lock disposition for this file.
     */
    isLocked(): boolean;

    /**
     * Set the lock status of this file.
     *
     * @param locked The lock status to set.
     */
    setLocked(locked: boolean): Promise<void>;

    /**
     * Get versions of this file.
     *
     * @returns Array of versions including this version.
     */
    getVersionHistory(): Promise<IFileEntry[]>;

    /**
     * @returns The disposition of this file with regards to Matrix end-to-end encryption.
     */
    getEncryptionStatus(): FileEncryptionStatus;
}
