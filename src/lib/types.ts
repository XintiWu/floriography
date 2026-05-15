export type CardStatus = "available" | "sold" | "custom_only";

export type CardTagKey = "occasions" | "colors" | "flowers" | "moods";

export type Card = {
  id: string;
  title: string;
  priceTwd: number;
  status: CardStatus;
  images: string[];
  size?: string;
  materials?: string[];
  leadTimeDays?: number;
  tags: {
    occasions: string[];
    colors: string[];
    flowers: string[];
    moods: string[];
  };
  blurb?: string;
  description?: string;
};

export type Flower = {
  id: string;
  name: string;
  meanings: string[];
  story?: string;
  relatedTags?: string[];
};

export type OrderRequestStatus =
  | "new"
  | "contacted"
  | "scheduled"
  | "completed"
  | "cancelled";

export type OrderRequest = {
  id: string;
  createdAt: string;
  customerName: string;
  contact: string;
  preferredPickup: string;
  timeWindow: string;
  budgetTwd?: number;
  purpose?: string;
  notes?: string;
  status: OrderRequestStatus;
  cardId?: string;
  customRequest?: string;
};

