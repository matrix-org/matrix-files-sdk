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

import { IStartClientOpts, MatrixClient, MatrixEvent, Room, RoomState } from 'matrix-js-sdk/lib';
import { PendingEventOrdering } from 'matrix-js-sdk/lib/client';
import { simpleRetryOperation } from 'matrix-js-sdk/lib/utils';
import { EventType, UNSTABLE_MSC3089_TREE_SUBTYPE } from 'matrix-js-sdk/lib/@types/event';
import { SyncState } from 'matrix-js-sdk/lib/sync';
import type { IFolderEntry, IEntry, FolderRole, MatrixFilesID, ArrayBufferBlob, IFolderMembership } from '.';
import { AbstractFolderEntry } from './AbstractFolderEntry';
import { TreeSpaceEntry } from './TreeSpaceEntry';
import promiseRetry from 'p-retry';

export class MatrixFiles extends AbstractFolderEntry {
    constructor(public client: MatrixClient) {
        super(client, undefined);
        super.setEventHandlers({
            'Room': this.newRoom,
            'RoomState.events': this.roomState,
        });
    }

    get id(): MatrixFilesID {
        return this.client.getUserId();
    }

    isFolder = true;

    getClient() {
        return this.client;
    }

    getPath() {
        return [];
    }

    getName() {
        return '';
    }

    async getCreatedByUserId() {
        return '';
    }

    async getChildren(): Promise<IEntry[]> {
        return this.client.getVisibleRooms()
            .map(r => this.client.unstableGetFileTreeSpace(r.roomId))
            .filter(r => !!r && !r.room.currentState.getStateEvents(EventType.SpaceParent)?.length)
            .map(r => new TreeSpaceEntry(this, this, r!));
    }

    async addChildFolder(name: string): Promise<MatrixFilesID> {
        const w = await this.client.unstableCreateFileTree(name);
        return w.id;
    }

    async getCreationDate() {
        return undefined;
    }

    async getLastModifiedDate() {
        return undefined;
    }

    async delete() {
        throw new Error('Cannot remove root');
    }

    async rename(name: string) {
        throw new Error('Cannot rename root');
    }

    async copyTo(resolvedParent: IFolderEntry, fileName: string): Promise<MatrixFilesID> {
        throw new Error('Cannot copy root');
    }

    async moveTo(resolvedParent: IFolderEntry, fileName: string): Promise<MatrixFilesID> {
        throw new Error('Cannot move root');
    }

    async addFile(name: string, file: ArrayBufferBlob): Promise<MatrixFilesID> {
        throw new Error('Cannot add file at root');
    }

    async resolvePath(path: string[]): Promise<IEntry | undefined> {
        if (path.length === 0) {
            return this;
        }

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let next: IFolderEntry | undefined = this;
        const paths = path.slice(); // make a clone as we are modifying the array

        while (next) {
            const matching = (await next.getChildren()).find(x => x.getName() === paths[0]);
            if (!matching) {
                next = undefined;
            } else {
                if (paths.length === 1) {
                    return matching;
                }

                if (!matching.isFolder) {
                    next = undefined;
                } else {
                    paths.shift();
                    next = matching as IFolderEntry;
                }
            }
        }

        // not found
        return undefined;
    }

    async sync(): Promise<void> {
        const opts: IStartClientOpts = {
            pendingEventOrdering: PendingEventOrdering.Detached,
            lazyLoadMembers: true,
            initialSyncLimit: 0,
            // clientWellKnownPollPeriod: 2 * 60 * 60, // 2 hours
        };

        // We delay the ready state until after the first sync has completed
        const readyPromise = new Promise <void>((resolve) => {
            const fn = (newState: SyncState, oldState: SyncState) => {
                if (newState === SyncState.Syncing && oldState === SyncState.Prepared) {
                    resolve();
                    this.client.off('sync', fn.bind(this));
                }
            };
            this.client.on('sync', fn.bind(this));
        });
        return this.client.startClient(opts).then(async () => readyPromise);
    }

    async logout(): Promise<void> {
        await this.client.logout();
        this.client.stopClient();
    }

    async deactivate(erase = true): Promise<void> {
        this.client.stopClient();
        await this.client.deactivateAccount(undefined, erase);
    }

    public async getPendingInvites(): Promise <Room[]> {
        return this.client.getRooms().filter(r => r.getMyMembership() === 'invite');
    }

    public async acceptInvite(invite: Room): Promise <void> {
        await this.client.joinRoom(invite.roomId);
    }

    /**
     * Accepts all pending invites. Note that this can cause stacked requests if called
     * multiple times. Joins will be re-tried forever, or until the runtime is interrupted.
     * @returns {Promise<void>} Resolves when complete.
     */
    public async acceptAllInvites(): Promise <void> {
        const invites = this.client.getRooms().filter(r => r.getMyMembership() === 'invite');
        return Promise.all(invites.map(async (r) => this.retryJoin(r))).then(); // .then() to coerce types
    }

    private async retryJoin(room: Room): Promise <Room> {
        return simpleRetryOperation(async () => {
            return this.client.joinRoom(room.roomId, {
                viaServers: [this.client.getDomain()],
            }).catch(e => {
                if (e?.errcode === 'M_FORBIDDEN') {
                    throw new promiseRetry.AbortError(e);
                }
                throw e;
            });
        });
    }

    getMembers(): IFolderMembership[] {
        throw new Error('Function not available on root.');
    }

    async inviteMember(userId: string, role: FolderRole): Promise<IFolderMembership> {
        throw new Error('Function not available on root.');
    }

    async removeMember(userId: string): Promise<void> {
        throw new Error('Function not available on root.');
    }

    async setMemberLevel(userId: string, role: FolderRole): Promise<IFolderMembership> {
        throw new Error('Function not available on root.');
    }

    getMembership(userId: string): IFolderMembership {
        throw new Error('Function not available on root.');
    }

    getOwnMembership(): IFolderMembership {
        throw new Error('Function not available on root.');
    }

    async setMemberRole(userId: string, role: FolderRole): Promise<IFolderMembership> {
        throw new Error('Function not available on root.');
    }

    private newRoom(r: Room) {
        if (r.getMyMembership() === 'invite' && r.getType() === UNSTABLE_MSC3089_TREE_SUBTYPE.unstable) {
            this.emit('invite', this, r);
        } else {
            // TODO: maybe we don't need this as we are monitoring roomstate?
            // this might not be a top-level folder, but we can't tell at this point
            this.emit('modified', this, r);
        }
    }

    private roomState(e: MatrixEvent, s: RoomState) {
        // TODO: don't emit events that are for sub folders
        this.emit('modified', this, e);
    }
}
