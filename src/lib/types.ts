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
  /** 較長描述（情境推薦展開區等） */
  description?: string;
  /** 商品圖原始寬度（建置時由 sharp 寫入） */
  imageWidth?: number;
  /** 商品圖原始高度 */
  imageHeight?: number;
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

