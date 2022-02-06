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
import type { IEntry, FolderRole, MatrixFilesID, ArrayBufferBlob, IFolderMembership } from '.';

/**
 * Represents a file stored in the Matrix Files SDK hierarchy.
 */
export interface IFolderEntry extends IEntry, EventEmitter {
    /**
     * @returns The immediate descendants of this folder.
     */
    getChildren(): Promise<IEntry[]>;

    /**
     * Find an immediate descendant entry by name.
     *
     * @param name The name of the child to locate.
     * @returns The entry if found, otherwise `undefined`.
     */
    getChildByName(name: string): Promise<IEntry | undefined>;

    /**
     * Find an immediate descendant entry by {@link MatrixFilesID}`.
     *
     * @param name The ID of the child to locate.
     * @returns The entry if found, otherwise `undefined`.
     */
    getChildById(id: MatrixFilesID): Promise<IEntry | undefined>;

    /**
     * Find a descendant entry by {@link MatrixFilesID}`.
     *
     * @param name The ID of the descendant to locate.
     * @returns The entry if found, otherwise `undefined`.
     */
    getDescendantById(id: MatrixFilesID, maxSearchDepth?: number): Promise<IEntry | undefined>;

    /**
     * Add a (sub) folder to this folder.
     *
     * @param name Name of the sub folder to add.
     * @returns The ID of the new folder.
     */
    addFolder(name: string | string[]): Promise<MatrixFilesID>;

    /**
     * Add a file  to this folder.
     *
     * @param name Name of the file to add.
     * @param file The file contents to add.
     * @returns The ID of the new folder.
     */
    addFile(name: string, file: ArrayBufferBlob): Promise<MatrixFilesID>;

    /**
     * Current members of the folder.
     */
    members: IFolderMembership[];

    /**
     * Get the membership for a user ID. Throws an exception if the user is not a member.
     *
     * @param userId The user ID of the member to return.
     * @returns The membership representation for the user.
     */
    getMembership(userId: string): IFolderMembership;

    /**
     * Invite another user to access this folder. The user will be invited recursively to all sub-folders.
     *
     * @param userId The Matrix user ID to be invited.
     * @param role The role for the new member.
     * @returns The membership representation of the newly invited user.
     */
    inviteMember(userId: string, role: FolderRole): Promise<IFolderMembership>;

    /**
     * Change the role/power level of an existing member.
     *
     * @param userId The Matrix user ID of the member.
     * @param role  The new role for the member.
     * @returns The updated membership representation
     */
    setMemberRole(userId: string, role: FolderRole): Promise<IFolderMembership>;

    /**
     * Remove an existing member from a folder.
     *
     * @param userId The Matrix user ID of the member to remove.
     */
    removeMember(userId: string): Promise<void>;

    /**
     * The representation of the authenticated user on this folder.
     */
    ownMembership: IFolderMembership;
}
