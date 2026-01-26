/* eslint-disable @typescript-eslint/unified-signatures */
declare module 'archiver' {
  import { Readable, Transform, Writable } from 'stream';

  interface ArchiverOptions {
    zlib?: { level: number };
  }

  interface EntryData {
    name: string;
  }

  interface Archiver extends Transform {
    append(source: Readable | Buffer | string, data: EntryData): this;
    directory(dirpath: string, destpath: string | false): this;
    file(filepath: string, data: EntryData): this;
    finalize(): Promise<void>;
    pointer(): number;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'warning', listener: (err: Error) => void): this;
    on(event: 'entry', listener: (entry: EntryData) => void): this;
    on(event: 'progress', listener: (progress: { entries: { total: number; processed: number }; fs: { totalBytes: number; processedBytes: number } }) => void): this;
    pipe<T extends Writable>(destination: T): T;
  }

  function archiver(format: 'zip' | 'tar', options?: ArchiverOptions): Archiver;
  export = archiver;
}
