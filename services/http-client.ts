import { ReadableStream } from 'node:stream/web'

export type Method =
  | 'get'
  | 'GET'
  | 'delete'
  | 'DELETE'
  | 'head'
  | 'HEAD'
  | 'options'
  | 'OPTIONS'
  | 'post'
  | 'POST'
  | 'put'
  | 'PUT'
  | 'patch'
  | 'PATCH'
  | 'purge'
  | 'PURGE'
  | 'link'
  | 'LINK'
  | 'unlink'
  | 'UNLINK'

export class HttpClientHeaderList extends Map<
  string,
  string | ReadonlyArray<string> | number | boolean
> {}

export type HttpClientRequestRedirect = 'error' | 'follow' | 'manual'
export type HttpClientHeaders =
  | HttpClientHeaderList
  | [string, string][] | Record<string, string>;

  
export type HttpClientBody = ReadableStream | Blob | BufferSource | FormData | URLSearchParams | string;
  
export type HttpClientRequestCredentials = 'omit' | 'include' | 'same-origin'
export type HttpClientRequestMode =
  | 'cors'
  | 'navigate'
  | 'no-cors'
  | 'same-origin'
export type HttpClientReferrerPolicy =
  | ''
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url'

export type HttpClientRequestDuplex = 'half'

export interface HttpClientRequestOptions {
  method?: string
  keepalive?: boolean
  headers?: HttpClientHeaders
  body?: HttpClientBody
  redirect?: HttpClientRequestRedirect
  integrity?: string
  signal?: AbortSignal
  credentials?: HttpClientRequestCredentials
  mode?: HttpClientRequestMode
  referrer?: string
  referrerPolicy?: HttpClientReferrerPolicy
  window?: null
  allowUnauthorizedSsl?: boolean
  duplex?: HttpClientRequestDuplex
  keepAlive?: boolean
}

export type HttpClientResponseType =
  | 'basic'
  | 'cors'
  | 'default'
  | 'error'
  | 'opaque'
  | 'opaqueredirect'


  /**********************************************************************************
 * MIT License                                                                    *
 *                                                                                *
 * Copyright (c) 2021 Hyperjump Technology                                        *
 *                                                                                *
 * Permission is hereby granted, free of charge, to any person obtaining a copy   *
 * of this software and associated documentation files (the "Software"), to deal  *
 * in the Software without restriction, including without limitation the rights   *
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell      *
 * copies of the Software, and to permit persons to whom the Software is          *
 * furnished to do so, subject to the following conditions:                       *
 *                                                                                *
 * The above copyright notice and this permission notice shall be included in all *
 * copies or substantial portions of the Software.                                *
 *                                                                                *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR     *
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,       *
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE    *
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER         *
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,  *
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE  *
 * SOFTWARE.                                                                      *
 **********************************************************************************/


export class HttpClientResponse {
  _fetchResponse: Response
  _headers: HttpClientHeaderList | null = null
  _isStreamResponseType: boolean
  _data: unknown

  constructor(
    fetchResponse: Response,
    isStreamResponseType: boolean,
    data?: unknown
  ) {
    this._fetchResponse = fetchResponse
    this._isStreamResponseType = isStreamResponseType
    this._data = data
  }

  get headers(): HttpClientHeaders {
    if (!this._headers) {
      this._headers = new HttpClientHeaderList()

      for (const [k, v] of this._fetchResponse.headers.entries()) {
        this._headers!.set(k, v)
      }
    }

    return this._headers
  }

  get ok(): boolean {
    return this._fetchResponse.ok
  }

  get status(): number {
    return this._fetchResponse.status
  }

  get statusText(): string {
    return this._fetchResponse.statusText
  }

  get type(): HttpClientResponseType {
    return this._fetchResponse.type
  }

  json(): Promise<unknown> {
    if (this._data) return Promise.resolve(this._data)
    return this._fetchResponse.json()
  }

  text(): Promise<string> {
    if (this._data) return Promise.resolve(this._data as string)
    return this._fetchResponse.text()
  }

  // static error (): Response;

  get data(): ReadableStream | unknown {
    if (this._isStreamResponseType) {
      const reader = this._fetchResponse.body?.getReader()
      return new ReadableStream({
        start(controller) {
          return pump()

          function pump() {
            if (!reader) return

            return reader
              .read()
              .then(({ done, value }: { done: unknown; value?: unknown }): unknown => {
                // When no more data needs to be consumed, close the stream
                if (done) {
                  controller.close()
                  return
                }

                // Enqueue the next data chunk into our target stream
                controller.enqueue(value)
                return pump()
              })
          }
        },
      })
    }

    return this._data
  }
}

export const httpClient = async (
  url: string,
  requestOptions: HttpClientRequestOptions,
  isStreamResponseType: boolean = false
): Promise<HttpClientResponse> => {
  const fetchResponse = await fetch(url, {
    body: requestOptions.body as BodyInit,
    redirect: requestOptions.redirect,    
    headers: requestOptions.headers  as HeadersInit,
    keepalive: requestOptions.keepAlive,
    method: requestOptions.method,
    signal: requestOptions.signal,
  })

  let data: unknown = ''
  if (!isStreamResponseType) {
    try {
      data = await fetchResponse.json()
    } catch {
      data = await fetchResponse.text()
    }
  }

  return new HttpClientResponse(fetchResponse, isStreamResponseType, data)
}
