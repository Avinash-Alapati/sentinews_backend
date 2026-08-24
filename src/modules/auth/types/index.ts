export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: "FREE" | "PREMIUM" | "INSTITUTIONAL" | "ADMIN";
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  mobileNumber?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
