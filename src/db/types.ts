export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  agent_api: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      ping: { Args: Record<PropertyKey, never>; Returns: Json };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      appointment_clients: {
        Row: {
          address: string | null;
          appointment_id: string;
          client_card_id: string | null;
          client_ip: unknown;
          created_at: string;
          id: string;
          master_id: string;
          name: string;
          unconfirmed_email: string | null;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          appointment_id: string;
          client_card_id?: string | null;
          client_ip?: unknown;
          created_at?: string;
          id?: string;
          master_id: string;
          name: string;
          unconfirmed_email?: string | null;
        };
        Update: {
          address?: string | null;
          appointment_id?: string;
          client_card_id?: string | null;
          client_ip?: unknown;
          created_at?: string;
          id?: string;
          master_id?: string;
          name?: string;
          unconfirmed_email?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "appointment_clients_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: true;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointment_clients_master_id_appointment_id_fkey";
            columns: ["master_id", "appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["master_id", "id"];
          },
          {
            foreignKeyName: "appointment_clients_master_id_client_card_id_fkey";
            columns: ["master_id", "client_card_id"];
            isOneToOne: false;
            referencedRelation: "client_cards";
            referencedColumns: ["master_id", "id"];
          },
        ];
      };
      appointments: {
        Row: {
          buffer_minutes: number;
          cancel_comment: string | null;
          cancelled_by: Database["public"]["Enums"]["canceller"] | null;
          contact_confirmed_at: string | null;
          created_at: string;
          during: unknown;
          hold_until: string | null;
          id: string;
          locale: Database["public"]["Enums"]["locale"];
          master_id: string;
          service_id: string;
          source: Database["public"]["Enums"]["appointment_source"];
          status: Database["public"]["Enums"]["appointment_status"];
        };
        ComputedFields: never;
        Insert: {
          buffer_minutes?: number;
          cancel_comment?: string | null;
          cancelled_by?: Database["public"]["Enums"]["canceller"] | null;
          contact_confirmed_at?: string | null;
          created_at?: string;
          during: unknown;
          hold_until?: string | null;
          id?: string;
          locale: Database["public"]["Enums"]["locale"];
          master_id: string;
          service_id: string;
          source: Database["public"]["Enums"]["appointment_source"];
          status: Database["public"]["Enums"]["appointment_status"];
        };
        Update: {
          buffer_minutes?: number;
          cancel_comment?: string | null;
          cancelled_by?: Database["public"]["Enums"]["canceller"] | null;
          contact_confirmed_at?: string | null;
          created_at?: string;
          during?: unknown;
          hold_until?: string | null;
          id?: string;
          locale?: Database["public"]["Enums"]["locale"];
          master_id?: string;
          service_id?: string;
          source?: Database["public"]["Enums"]["appointment_source"];
          status?: Database["public"]["Enums"]["appointment_status"];
        };
        Relationships: [
          {
            foreignKeyName: "appointments_master_id_fkey";
            columns: ["master_id"];
            isOneToOne: false;
            referencedRelation: "masters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_master_id_service_id_fkey";
            columns: ["master_id", "service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["master_id", "id"];
          },
        ];
      };
      blocks: {
        Row: {
          created_at: string;
          during: unknown;
          id: string;
          master_id: string;
          note: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          during: unknown;
          id?: string;
          master_id: string;
          note?: string | null;
        };
        Update: {
          created_at?: string;
          during?: unknown;
          id?: string;
          master_id?: string;
          note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "blocks_master_id_fkey";
            columns: ["master_id"];
            isOneToOne: false;
            referencedRelation: "masters";
            referencedColumns: ["id"];
          },
        ];
      };
      client_cards: {
        Row: {
          created_at: string;
          id: string;
          master_id: string;
          name: string;
          note: string | null;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          master_id: string;
          name: string;
          note?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          master_id?: string;
          name?: string;
          note?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_cards_master_id_fkey";
            columns: ["master_id"];
            isOneToOne: false;
            referencedRelation: "masters";
            referencedColumns: ["id"];
          },
        ];
      };
      contacts: {
        Row: {
          address: string;
          channel: Database["public"]["Enums"]["contact_channel"];
          confirmed_at: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          address: string;
          channel: Database["public"]["Enums"]["contact_channel"];
          confirmed_at: string;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          address?: string;
          channel?: Database["public"]["Enums"]["contact_channel"];
          confirmed_at?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      masters: {
        Row: {
          auto_confirm: boolean;
          cancel_deadline_minutes: number;
          created_at: string;
          currency: string;
          horizon_days: number;
          id: string;
          locales: Database["public"]["Enums"]["locale"][];
          max_active_bookings: number;
          min_notice_minutes: number;
          name: string;
          primary_locale: Database["public"]["Enums"]["locale"];
          published_at: string | null;
          slot_step_minutes: number;
          slug: string;
          timezone: string;
        };
        ComputedFields: never;
        Insert: {
          auto_confirm?: boolean;
          cancel_deadline_minutes?: number;
          created_at?: string;
          currency?: string;
          horizon_days?: number;
          id: string;
          locales?: Database["public"]["Enums"]["locale"][];
          max_active_bookings?: number;
          min_notice_minutes?: number;
          name: string;
          primary_locale?: Database["public"]["Enums"]["locale"];
          published_at?: string | null;
          slot_step_minutes?: number;
          slug: string;
          timezone?: string;
        };
        Update: {
          auto_confirm?: boolean;
          cancel_deadline_minutes?: number;
          created_at?: string;
          currency?: string;
          horizon_days?: number;
          id?: string;
          locales?: Database["public"]["Enums"]["locale"][];
          max_active_bookings?: number;
          min_notice_minutes?: number;
          name?: string;
          primary_locale?: Database["public"]["Enums"]["locale"];
          published_at?: string | null;
          slot_step_minutes?: number;
          slug?: string;
          timezone?: string;
        };
        Relationships: [];
      };
      schedule_exceptions: {
        Row: {
          day: string;
          hours: unknown;
          master_id: string;
        };
        ComputedFields: never;
        Insert: {
          day: string;
          hours?: unknown;
          master_id: string;
        };
        Update: {
          day?: string;
          hours?: unknown;
          master_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_exceptions_master_id_fkey";
            columns: ["master_id"];
            isOneToOne: false;
            referencedRelation: "masters";
            referencedColumns: ["id"];
          },
        ];
      };
      service_categories: {
        Row: {
          created_at: string;
          id: string;
          master_id: string;
          name: NonNullable<Json>;
          position: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          master_id: string;
          name: NonNullable<Json>;
          position?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          master_id?: string;
          name?: NonNullable<Json>;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "service_categories_master_id_fkey";
            columns: ["master_id"];
            isOneToOne: false;
            referencedRelation: "masters";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          archived_at: string | null;
          buffer_minutes: number;
          category_id: string | null;
          created_at: string;
          description: NonNullable<Json>;
          duration_minutes: number;
          format: Database["public"]["Enums"]["service_format"];
          id: string;
          master_id: string;
          name: NonNullable<Json>;
          position: number;
          price: number | null;
          price_kind: Database["public"]["Enums"]["price_kind"];
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          buffer_minutes?: number;
          category_id?: string | null;
          created_at?: string;
          description?: NonNullable<Json>;
          duration_minutes: number;
          format?: Database["public"]["Enums"]["service_format"];
          id?: string;
          master_id: string;
          name: NonNullable<Json>;
          position?: number;
          price?: number | null;
          price_kind?: Database["public"]["Enums"]["price_kind"];
        };
        Update: {
          archived_at?: string | null;
          buffer_minutes?: number;
          category_id?: string | null;
          created_at?: string;
          description?: NonNullable<Json>;
          duration_minutes?: number;
          format?: Database["public"]["Enums"]["service_format"];
          id?: string;
          master_id?: string;
          name?: NonNullable<Json>;
          position?: number;
          price?: number | null;
          price_kind?: Database["public"]["Enums"]["price_kind"];
        };
        Relationships: [
          {
            foreignKeyName: "services_master_id_category_id_fkey";
            columns: ["master_id", "category_id"];
            isOneToOne: false;
            referencedRelation: "service_categories";
            referencedColumns: ["master_id", "id"];
          },
          {
            foreignKeyName: "services_master_id_fkey";
            columns: ["master_id"];
            isOneToOne: false;
            referencedRelation: "masters";
            referencedColumns: ["id"];
          },
        ];
      };
      work_template: {
        Row: {
          hours: unknown;
          master_id: string;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          hours: unknown;
          master_id: string;
          weekday: number;
        };
        Update: {
          hours?: unknown;
          master_id?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "work_template_master_id_fkey";
            columns: ["master_id"];
            isOneToOne: false;
            referencedRelation: "masters";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      book_appointment: {
        Args: {
          address?: string;
          client_ip?: unknown;
          email: string;
          locale: Database["public"]["Enums"]["locale"];
          name: string;
          service_id: string;
          starts_at: string;
        };
        Returns: {
          appointment_id: string;
          hold_until: string;
        }[];
      };
      booking_email_details: {
        Args: { appointment_id: string; email: string };
        Returns: {
          address: string;
          currency: string;
          ends_at: string;
          hold_until: string;
          locale: Database["public"]["Enums"]["locale"];
          master_name: string;
          price: number;
          price_kind: Database["public"]["Enums"]["price_kind"];
          primary_locale: Database["public"]["Enums"]["locale"];
          service_name: Json;
          starts_at: string;
          time_zone: string;
        }[];
      };
      cancel_appointment: {
        Args: { appointment_id: string; comment?: string };
        Returns: undefined;
      };
      claim_bookings: {
        Args: { appointment_ids: string[] };
        Returns: {
          appointment_id: string;
          hold_until: string;
          status: Database["public"]["Enums"]["appointment_status"];
        }[];
      };
      claim_due_notifications: {
        Args: { max_count: number };
        Returns: {
          address: string;
          appointment_id: string;
          attempts: number;
          audience: string;
          cancel_comment: string;
          client_name: string;
          currency: string;
          data: Json;
          ends_at: string;
          hold_until: string;
          id: string;
          kind: Database["public"]["Enums"]["notification_kind"];
          locale: Database["public"]["Enums"]["locale"];
          master_name: string;
          master_slug: string;
          price: number;
          price_kind: Database["public"]["Enums"]["price_kind"];
          primary_locale: Database["public"]["Enums"]["locale"];
          recipient_email: string;
          recipient_id: string;
          service_name: Json;
          starts_at: string;
          status: Database["public"]["Enums"]["appointment_status"];
          time_zone: string;
        }[];
      };
      confirm_appointment: {
        Args: { appointment_id: string };
        Returns: undefined;
      };
      finish_notification: {
        Args: {
          channel?: Database["public"]["Enums"]["contact_channel"];
          error?: string;
          notification_id: string;
          outcome: string;
        };
        Returns: undefined;
      };
      get_available_days: {
        Args: {
          day_from: string;
          day_to: string;
          duration_minutes?: number;
          ignore_appointment_id?: string;
          ignore_booking_rules?: boolean;
          service_id: string;
        };
        Returns: string[];
      };
      get_available_slots: {
        Args: {
          day_from: string;
          day_to: string;
          duration_minutes?: number;
          ignore_appointment_id?: string;
          ignore_booking_rules?: boolean;
          service_id: string;
        };
        Returns: string[];
      };
      get_my_bookings: {
        Args: Record<PropertyKey, never>;
        Returns: {
          address: string;
          appointment_id: string;
          auto_confirm: boolean;
          can_reschedule: boolean;
          change_until: string;
          currency: string;
          ends_at: string;
          format: Database["public"]["Enums"]["service_format"];
          hold_until: string;
          horizon_days: number;
          master_name: string;
          master_slug: string;
          price: number;
          price_kind: Database["public"]["Enums"]["price_kind"];
          primary_locale: Database["public"]["Enums"]["locale"];
          service_id: string;
          service_name: Json;
          starts_at: string;
          status: Database["public"]["Enums"]["appointment_status"];
          time_zone: string;
        }[];
      };
      health: { Args: Record<PropertyKey, never>; Returns: string };
      release_booking: { Args: { appointment_id: string }; Returns: undefined };
      reschedule_appointment: {
        Args: { appointment_id: string; starts_at: string };
        Returns: undefined;
      };
      reschedule_booking: {
        Args: { appointment_id: string; starts_at: string };
        Returns: Database["public"]["Enums"]["appointment_status"];
      };
      set_no_show: {
        Args: { appointment_id: string; no_show: boolean };
        Returns: undefined;
      };
      take_rate_limit: {
        Args: { bucket: string; max_hits: number; window_seconds: number };
        Returns: boolean;
      };
    };
    Enums: {
      appointment_source: "client" | "manual";
      appointment_status:
        "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
      canceller: "client" | "master" | "system";
      contact_channel: "email" | "telegram";
      locale: "uk" | "ru" | "en";
      notification_kind:
        | "decision_needed"
        | "confirmed"
        | "declined"
        | "cancelled_by_master"
        | "cancelled_by_client"
        | "rescheduled_by_master"
        | "rescheduled_by_client"
        | "master_did_not_respond"
        | "booked_by_master"
        | "reminder";
      price_kind: "fixed" | "from" | "none";
      service_format: "on_site" | "online" | "at_client";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  agent_api: {
    Enums: {},
  },
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      appointment_source: ["client", "manual"],
      appointment_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      canceller: ["client", "master", "system"],
      contact_channel: ["email", "telegram"],
      locale: ["uk", "ru", "en"],
      notification_kind: [
        "decision_needed",
        "confirmed",
        "declined",
        "cancelled_by_master",
        "cancelled_by_client",
        "rescheduled_by_master",
        "rescheduled_by_client",
        "master_did_not_respond",
        "booked_by_master",
        "reminder",
      ],
      price_kind: ["fixed", "from", "none"],
      service_format: ["on_site", "online", "at_client"],
    },
  },
} as const;
