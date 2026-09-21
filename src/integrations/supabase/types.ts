export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_predictions: {
        Row: {
          complaint_id: string | null
          confidence: number | null
          created_at: string
          id: string
          input_reference: string | null
          model_name: string | null
          prediction: Json | null
          prediction_type: string | null
        }
        Insert: {
          complaint_id?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          input_reference?: string | null
          model_name?: string | null
          prediction?: Json | null
          prediction_type?: string | null
        }
        Update: {
          complaint_id?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          input_reference?: string | null
          model_name?: string | null
          prediction?: Json | null
          prediction_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_predictions_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      complaint_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          complaint_id: string
          department_id: string | null
          id: string
          officer_id: string | null
          reason: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          complaint_id: string
          department_id?: string | null
          id?: string
          officer_id?: string | null
          reason?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          complaint_id?: string
          department_id?: string | null
          id?: string
          officer_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "complaint_assignments_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaint_assignments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      complaint_duplicates: {
        Row: {
          complaint_id: string
          created_at: string
          detection_method: string | null
          id: string
          matched_complaint_id: string | null
          similarity_score: number | null
        }
        Insert: {
          complaint_id: string
          created_at?: string
          detection_method?: string | null
          id?: string
          matched_complaint_id?: string | null
          similarity_score?: number | null
        }
        Update: {
          complaint_id?: string
          created_at?: string
          detection_method?: string | null
          id?: string
          matched_complaint_id?: string | null
          similarity_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "complaint_duplicates_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaint_duplicates_matched_complaint_id_fkey"
            columns: ["matched_complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      complaint_media: {
        Row: {
          ai_analysis: Json | null
          complaint_id: string
          created_at: string
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
        }
        Insert: {
          ai_analysis?: Json | null
          complaint_id: string
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
        }
        Update: {
          ai_analysis?: Json | null
          complaint_id?: string
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaint_media_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      complaint_timeline: {
        Row: {
          changed_by: string | null
          complaint_id: string
          created_at: string
          id: string
          message: string | null
          metadata: Json | null
          status: Database["public"]["Enums"]["complaint_status"] | null
        }
        Insert: {
          changed_by?: string | null
          complaint_id: string
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          status?: Database["public"]["Enums"]["complaint_status"] | null
        }
        Update: {
          changed_by?: string | null
          complaint_id?: string
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          status?: Database["public"]["Enums"]["complaint_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "complaint_timeline_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          address: string | null
          ai_classification: Json | null
          ai_priority_reason: string | null
          ai_priority_score: number | null
          ai_summary: string | null
          assigned_department_id: string | null
          assigned_officer_id: string | null
          category: string
          citizen_id: string
          city: string | null
          closed_at: string | null
          complaint_number: string
          confidence_score: number | null
          created_at: string
          description: string
          duplicate_group_id: string | null
          duplicate_of: string | null
          id: string
          landmark: string | null
          language: string
          latitude: number | null
          longitude: number | null
          priority: Database["public"]["Enums"]["complaint_priority"]
          resolved_at: string | null
          severity_score: number | null
          sla_deadline: string | null
          sla_hours: number
          status: Database["public"]["Enums"]["complaint_status"]
          subcategory: string | null
          title: string
          updated_at: string
          ward: string | null
        }
        Insert: {
          address?: string | null
          ai_classification?: Json | null
          ai_priority_reason?: string | null
          ai_priority_score?: number | null
          ai_summary?: string | null
          assigned_department_id?: string | null
          assigned_officer_id?: string | null
          category: string
          citizen_id: string
          city?: string | null
          closed_at?: string | null
          complaint_number: string
          confidence_score?: number | null
          created_at?: string
          description: string
          duplicate_group_id?: string | null
          duplicate_of?: string | null
          id?: string
          landmark?: string | null
          language?: string
          latitude?: number | null
          longitude?: number | null
          priority?: Database["public"]["Enums"]["complaint_priority"]
          resolved_at?: string | null
          severity_score?: number | null
          sla_deadline?: string | null
          sla_hours?: number
          status?: Database["public"]["Enums"]["complaint_status"]
          subcategory?: string | null
          title: string
          updated_at?: string
          ward?: string | null
        }
        Update: {
          address?: string | null
          ai_classification?: Json | null
          ai_priority_reason?: string | null
          ai_priority_score?: number | null
          ai_summary?: string | null
          assigned_department_id?: string | null
          assigned_officer_id?: string | null
          category?: string
          citizen_id?: string
          city?: string | null
          closed_at?: string | null
          complaint_number?: string
          confidence_score?: number | null
          created_at?: string
          description?: string
          duplicate_group_id?: string | null
          duplicate_of?: string | null
          id?: string
          landmark?: string | null
          language?: string
          latitude?: number | null
          longitude?: number | null
          priority?: Database["public"]["Enums"]["complaint_priority"]
          resolved_at?: string | null
          severity_score?: number | null
          sla_deadline?: string | null
          sla_hours?: number
          status?: Database["public"]["Enums"]["complaint_status"]
          subcategory?: string | null
          title?: string
          updated_at?: string
          ward?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "complaints_assigned_department_id_fkey"
            columns: ["assigned_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          category: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          citizen_id: string
          comment: string | null
          complaint_id: string
          created_at: string
          id: string
          rating: number
        }
        Insert: {
          citizen_id: string
          comment?: string | null
          complaint_id: string
          created_at?: string
          id?: string
          rating: number
        }
        Update: {
          citizen_id?: string
          comment?: string | null
          complaint_id?: string
          created_at?: string
          id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "feedback_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: true
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          complaint_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          complaint_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          complaint_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          department_id: string | null
          email: string | null
          full_name: string | null
          id: string
          language: string
          phone: string | null
          updated_at: string
          user_id: string
          ward: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          language?: string
          phone?: string | null
          updated_at?: string
          user_id: string
          ward?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          language?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          ward?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      routing_rules: {
        Row: {
          category: string
          created_at: string
          department_id: string
          id: string
          keyword: string | null
          priority_boost: number
          sla_hours: number
        }
        Insert: {
          category: string
          created_at?: string
          department_id: string
          id?: string
          keyword?: string | null
          priority_boost?: number
          sla_hours?: number
        }
        Update: {
          category?: string
          created_at?: string
          department_id?: string
          id?: string
          keyword?: string | null
          priority_boost?: number
          sla_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "routing_rules_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      my_department: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "CITIZEN" | "OFFICER" | "DEPARTMENT_ADMIN" | "SUPER_ADMIN"
      complaint_priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
      complaint_status:
        | "SUBMITTED"
        | "AI_ANALYZED"
        | "ASSIGNED"
        | "IN_PROGRESS"
        | "RESOLVED"
        | "CLOSED"
        | "REJECTED"
        | "DUPLICATE"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["CITIZEN", "OFFICER", "DEPARTMENT_ADMIN", "SUPER_ADMIN"],
      complaint_priority: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      complaint_status: [
        "SUBMITTED",
        "AI_ANALYZED",
        "ASSIGNED",
        "IN_PROGRESS",
        "RESOLVED",
        "CLOSED",
        "REJECTED",
        "DUPLICATE",
      ],
    },
  },
} as const
