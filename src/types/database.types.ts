// DB 열 이름은 snake_case, 기존 HTTP 응답은 camelCase를 유지합니다.
export type RestaurantRow = {
  id: number;
  name: string;
  category: string;
  location: string;
  price_range: string;
  rating: number;
  description: string;
  recommended_menu: string[];
  likes: number;
  image: string;
};

export type RestaurantInsert = Pick<RestaurantRow, 'name' | 'category' | 'location'> &
  Partial<Omit<RestaurantRow, 'id' | 'name' | 'category' | 'location'>>;

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: RestaurantRow;
        Insert: RestaurantInsert;
        Update: Partial<RestaurantInsert>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      reset_restaurant_demo_data: { Args: Record<never, never>; Returns: undefined };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}
