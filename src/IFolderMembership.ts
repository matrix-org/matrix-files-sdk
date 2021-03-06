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
import type { FolderRole } from '.';

/**
 * Represents the membership of a folder. This is an abstraction on top of Matrix room membership.
 */
export interface IFolderMembership extends EventEmitter {
    /**
     * The Matrix user ID for this member.
     */
    userId: string;

    /**
     * The MSC3089 role of this member.
     */
    role: FolderRole;

    /**
     * The date/time that the member joined (or was invited?).
     */
    since: Date;

    /**
     * `true` if the member has power to invite other members to the folder.
     */
    canInvite: boolean;

    /**
     * `true` if the member has power to remove another member from the folder.
     */
    canRemove: boolean;

    /**
     * `true` if the member has power to remove change the power of another member of the folder.
     */
    canManageRoles: boolean;

    /**
     * `true` if the member has power to write or change the content of the folder.
     */
    canWrite: boolean;
}
