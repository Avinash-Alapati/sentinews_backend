import { NextResponse } from "next/server";
import { registerUser } from "@/modules/auth/services/auth.service";
import { registerSchema } from "@/modules/auth/validators/auth.validator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Validation failed" },
        { status: 422 }
      );
    }

    const user = await registerUser({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      mobileNumber: parsed.data.mobileNumber,
    });

    return NextResponse.json({ user, message: "Registration successful. Mobile number saved." }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
      return NextResponse.json({ message: "Email already exists" }, { status: 409 });
    }

    if (error instanceof Error && error.message) {
      return NextResponse.json({ message: error.message }, { status: 422 });
    }

    return NextResponse.json({ message: "Registration failed" }, { status: 500 });
  }
}
