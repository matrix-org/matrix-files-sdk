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
import type { Room } from 'matrix-js-sdk/lib';
import type { IEntry } from '.';

/**
 * Represents the main Matrix Files SDK entry point.
 */
export interface IMatrixFiles extends EventEmitter {
    /**
     * Resolve a path in the hierarchy to an {@link IEntry}.
     *
     * @param path The entry path to resolve.
     * @returns The matching entry or undefined if not found.
     */
    resolvePath(path: string[]): Promise<IEntry | undefined>;

    /**
     * Perform a {@link matrix-js-sdk#MatrixClient.startClient} and sync with necessary configuration to work with Matrix Files SDK.
     *
     * @returns Promise that resolves when initial sync has been completed.
     */
    sync(): Promise<void>;

    /**
     * Convenience function for stopping and logging out of {@link matrix-js-sdk#MatrixClient}.
     */
    logout(): Promise<void>;

    /**
     * Convenience function for deactivating the user account on the home server and stopping the {@link matrix-js-sdk#MatrixClient}.
     * @param erase @see{@link matrix-js-sdk#MatrixClient.deactivateAccount}
     */
    deactivate(erase?: boolean): Promise<void>;

    /**
     * Get any pending folder (room) invitations.
     *
     * @returns The array of pending invites represented as {@link matrix-js-sdk#Room} objects.
     */
    getPendingInvites(): Promise <Room[]>;

    /**
     * Accept a pending invitation to join a folder (room).
     *
     * @param invite The invitation to be accepted represented as {@link matrix-js-sdk#Room} object.
     */
    acceptInvite(invite: Room): Promise <void>;
}
