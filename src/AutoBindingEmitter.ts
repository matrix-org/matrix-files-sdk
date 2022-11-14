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

import { log } from './log';

/**
 * Wrapper to automatically bind and unbind to a shared MatrixClient depending on if anyone in turn has bound to us
 */
export abstract class AutoBindingEmitter extends EventEmitter {
    constructor(private matrixClient: MatrixClient, private logName?: string | (() => string)) {
        super();
    }

    protected trace(type: string, message?: string) {
        if (log.isTraceEnabled()) {
            const logName = typeof this.logName === 'function' ? this.logName() : this.logName;
            log.trace(`${logName}.${type}()${message ? ` ${message}` : ''}`);
        }
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
                // eslint-disable-next-line max-len
                this.trace('autobind', `Binding ${Object.values(this.eventHandlers).length} handlers: ${Object.keys(this.eventHandlers)}`);
                for (const e in this.eventHandlers) {
                    this.matrixClient.on(e as any, this.eventHandlers[e]);
                }
                this.bound = true;
            }
        } else {
            if (this.bound) {
                // eslint-disable-next-line max-len
                this.trace('autobind', `Unbinding ${Object.values(this.eventHandlers).length} handlers: ${Object.keys(this.eventHandlers)}`);
                for (const e in this.eventHandlers) {
                    this.matrixClient.off(e as any, this.eventHandlers[e]);
                }
                this.bound = false;
            }
        }
    }

    addListener(event: string | symbol, listener: (...args: any[]) => void): this {
        this.trace('addListener', event.toString());
        super.addListener(event, listener);
        this.autobind();
        return this;
    }

    on(event: string | symbol, listener: (...args: any[]) => void): this {
        this.trace('on', event.toString());
        super.on(event, listener);
        this.autobind();
        return this;
    }

    once(event: string | symbol, listener: (...args: any[]) => void): this {
        this.trace('once', event.toString());
        super.once(event, listener);
        this.autobind();
        return this;
    }

    removeListener(event: string | symbol, listener: (...args: any[]) => void): this {
        this.trace('removeListener', event.toString());
        super.removeListener(event, listener);
        this.autobind();
        return this;
    }

    off(event: string | symbol, listener: (...args: any[]) => void): this {
        this.trace('off', event.toString());
        super.off(event, listener);
        this.autobind();
        return this;
    }

    removeAllListeners(event?: string | symbol): this {
        this.trace('removeAllListeners', event?.toString());
        super.removeAllListeners(event);
        this.autobind();
        return this;
    }

    prependListener(event: string | symbol, listener: (...args: any[]) => void): this {
        this.trace('prependListener', event.toString());
        super.prependListener(event, listener);
        this.autobind();
        return this;
    }

    prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this {
        this.trace('prependOnceListener', event.toString());
        super.prependOnceListener(event, listener);
        this.autobind();
        return this;
    }

    emit(event: string | symbol, ...args: any[]): boolean {
        this.trace('emit', event.toString());
        return super.emit(event, ...args);
    }
}

export type EventHandlers = Record<string, (...args: any[]) => void>;
