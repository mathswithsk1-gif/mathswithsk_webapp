export interface Database {
  public: {
    Tables: {
      courses: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string | null;
          price_pkr: number;
          vsl_video_id: string | null;
          status: "draft" | "published";
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          description?: string | null;
          price_pkr: number;
          vsl_video_id?: string | null;
          status?: "draft" | "published";
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          description?: string | null;
          price_pkr?: number;
          vsl_video_id?: string | null;
          status?: "draft" | "published";
          created_at?: string;
        };
      };
      lectures: {
        Row: {
          id: string;
          course_id: string;
          week_number: number;
          order_index: number;
          title: string;
          bunny_video_id: string;
          duration_seconds: number;
          published_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          week_number: number;
          order_index: number;
          title: string;
          bunny_video_id: string;
          duration_seconds: number;
          published_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          week_number?: number;
          order_index?: number;
          title?: string;
          bunny_video_id?: string;
          duration_seconds?: number;
          published_at?: string | null;
          created_at?: string;
        };
      };
      students: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          role: "student" | "admin";
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          phone?: string | null;
          role?: "student" | "admin";
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          role?: "student" | "admin";
          created_at?: string;
        };
      };
      enrollments: {
        Row: {
          id: string;
          student_id: string;
          course_id: string;
          status: "active" | "revoked";
          granted_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          course_id: string;
          status?: "active" | "revoked";
          granted_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          course_id?: string;
          status?: "active" | "revoked";
          granted_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          student_id: string;
          course_id: string;
          amount_pkr: number;
          coupon_id: string | null;
          gateway: string;
          gateway_ref: string;
          status: "pending" | "paid" | "failed";
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          course_id: string;
          amount_pkr: number;
          coupon_id?: string | null;
          gateway: string;
          gateway_ref: string;
          status?: "pending" | "paid" | "failed";
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          course_id?: string;
          amount_pkr?: number;
          coupon_id?: string | null;
          gateway?: string;
          gateway_ref?: string;
          status?: "pending" | "paid" | "failed";
          created_at?: string;
        };
      };
      coupons: {
        Row: {
          id: string;
          code: string;
          discount_type: "percent" | "fixed";
          value: number;
          max_uses: number | null;
          used_count: number;
          expires_at: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          discount_type: "percent" | "fixed";
          value: number;
          max_uses?: number | null;
          used_count?: number;
          expires_at?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          discount_type?: "percent" | "fixed";
          value?: number;
          max_uses?: number | null;
          used_count?: number;
          expires_at?: string | null;
          active?: boolean;
          created_at?: string;
        };
      };
      progress: {
        Row: {
          id: string;
          student_id: string;
          lecture_id: string;
          max_position_seconds: number;
          completed: boolean;
          completed_at: string | null;
          last_seen_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          lecture_id: string;
          max_position_seconds?: number;
          completed?: boolean;
          completed_at?: string | null;
          last_seen_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          lecture_id?: string;
          max_position_seconds?: number;
          completed?: boolean;
          completed_at?: string | null;
          last_seen_at?: string;
        };
      };
    };
  };
}

export type Course = Database["public"]["Tables"]["courses"]["Row"];
export type Lecture = Database["public"]["Tables"]["lectures"]["Row"];
export type Student = Database["public"]["Tables"]["students"]["Row"];
export type Enrollment = Database["public"]["Tables"]["enrollments"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type Coupon = Database["public"]["Tables"]["coupons"]["Row"];
export type Progress = Database["public"]["Tables"]["progress"]["Row"];
