import { generateShootId } from '../../../shared/utils/id';

export interface IShoot {
  id: string;
  title: string;
  clientEmail: string;
  photographerId: string;
  scheduledDate?: string | undefined;
  location?: string | undefined;
  status: 'planned' | 'in_progress' | 'completed' | 'delivered' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export class Shoot implements IShoot {
  public id: string;
  public title: string;
  public clientEmail: string;
  public photographerId: string;
  public scheduledDate?: string | undefined;
  public location?: string | undefined;
  public status: 'planned' | 'in_progress' | 'completed' | 'delivered' | 'archived';
  public createdAt: string;
  public updatedAt: string;

  constructor(data: {
    title: string;
    clientEmail: string;
    photographerId: string;
    scheduledDate?: string;
    location?: string;
  }) {
    this.id = generateShootId();
    this.title = data.title;
    this.clientEmail = data.clientEmail;
    this.photographerId = data.photographerId;
    this.scheduledDate = data.scheduledDate;
    this.location = data.location;
    this.status = 'planned';
    this.createdAt = new Date().toISOString();
    this.updatedAt = this.createdAt;
  }

  public toJSON(): IShoot {
    return {
      id: this.id,
      title: this.title,
      clientEmail: this.clientEmail,
      photographerId: this.photographerId,
      scheduledDate: this.scheduledDate,
      location: this.location,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}