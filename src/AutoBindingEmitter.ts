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
import type { MatrixClient } from 'matrix-js-sdk/lib';

/**
 * Wrapper to automatically bind and unbind to a shared MatrixClient depending on if anyone in turn has bound to us
 */
export abstract class AutoBindingEmitter extends EventEmitter {
    constructor(private matrixClient: MatrixClient) {
        super();
    }

    private eventHandlers: EventHandlers = {};

    /**
     *
     * @param eventHandlers The event handlers to be bound on the underlying MatrixClient
     */
    setEventHandlers(eventHandlers: EventHandlers) {
        this.eventHandlers = eventHandlers;
        for (const e in this.eventHandlers) {
            this.eventHandlers[e] = this.eventHandlers[e].bind(this);
        }
    }

    bound = false;

    private autobind() {
        if (this.eventNames().length > 0) {
            if (!this.bound) {
                for (const e in this.eventHandlers) {
                    this.matrixClient.on(e, this.eventHandlers[e]);
                }
                this.bound = true;
            }
        } else {
            if (this.bound) {
                for (const e in this.eventHandlers) {
                    this.matrixClient.off(e, this.eventHandlers[e]);
                }
                this.bound = false;
            }
        }
    }

    addListener(event: string | symbol, listener: (...args: any[]) => void): this {
        super.addListener(event, listener);
        this.autobind();
        return this;
    }

    on(event: string | symbol, listener: (...args: any[]) => void): this {
        super.on(event, listener);
        this.autobind();
        return this;
    }

    once(event: string | symbol, listener: (...args: any[]) => void): this {
        super.once(event, listener);
        this.autobind();
        return this;
    }

    removeListener(event: string | symbol, listener: (...args: any[]) => void): this {
        super.removeListener(event, listener);
        this.autobind();
        return this;
    }

    off(event: string | symbol, listener: (...args: any[]) => void): this {
        super.off(event, listener);
        this.autobind();
        return this;
    }

    removeAllListeners(event?: string | symbol): this {
        super.removeAllListeners(event);
        this.autobind();
        return this;
    }

    setMaxListeners(n: number): this {
        return super.setMaxListeners(n);
    }

    getMaxListeners(): number {
        return super.getMaxListeners();
    }

    listeners(event: string | symbol): Function[] {
        return super.listeners(event);
    }

    rawListeners(event: string | symbol): Function[] {
        return super.rawListeners(event);
    }

    emit(event: string | symbol, ...args: any[]): boolean {
        return super.emit(event, ...args);
    }

    listenerCount(event: string | symbol): number {
        return super.listenerCount(event);
    }

    prependListener(event: string | symbol, listener: (...args: any[]) => void): this {
        super.prependListener(event, listener);
        this.autobind();
        return this;
    }

    prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this {
        super.prependOnceListener(event, listener);
        this.autobind();
        return this;
    }

    eventNames(): (string | symbol)[] {
        return super.eventNames();
    }
}

export type EventHandlers = Record<string, (...args: any[]) => void>;
