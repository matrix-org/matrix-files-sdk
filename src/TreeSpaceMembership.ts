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

import type { RoomMember } from 'matrix-js-sdk/lib';
import { EventType } from 'matrix-js-sdk/lib/@types/event';
import { MSC3089TreeSpace, TreePermissions } from 'matrix-js-sdk/lib/models/MSC3089TreeSpace';
import EventEmitter from 'events';
import { IFolderMembership, MatrixFiles } from '.';

export class TreeSpaceMembership extends EventEmitter implements IFolderMembership {
    constructor(private files: MatrixFiles, private treespace: MSC3089TreeSpace, private roomMember: RoomMember) {
        super();
    }

    get userId() {
        return this.roomMember.userId;
    }

    get role() {
        return this.treespace.getPermissions(this.roomMember.userId);
    }

    since = new Date(); // FIXME implement this

    get canInvite() {
        return this.treespace.room.canInvite(this.files.getClient().getUserId()!);
    }

    get canRemove() {
        return this.treespace.room.currentState.getStateEvents(
            EventType.RoomPowerLevels, '').getContent().kick <= this.roomMember.powerLevel ?? 0;
    }

    get canManageRoles() {
        return this.treespace.room.currentState.maySendStateEvent(
            EventType.RoomPowerLevels, this.files.getClient().getUserId()!);
    }

    get canWrite() {
        return [TreePermissions.Editor, TreePermissions.Owner].includes(this.treespace.getPermissions(this.userId));
    }
}
