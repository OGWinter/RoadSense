import { Readable } from 'stream';

export interface FilePayload {
  buffer?: Buffer;
  path?: string;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface IStorageProvider {
  save(file: FilePayload): Promise<string>;
  getReadStream(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getFilePath?(key: string): string;
}
