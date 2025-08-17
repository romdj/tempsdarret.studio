export interface CreateShootDto {
  title: string;
  clientEmail: string;
  photographerId: string;
  scheduledDate?: string;
  location?: string;
}

export interface ShootResponseDto {
  id: string;
  title: string;
  clientEmail: string;
  photographerId: string;
  scheduledDate?: string;
  location?: string;
  status: 'planned';
  createdAt: string;
}