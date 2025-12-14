import { NextRequest, NextResponse } from "next/server";
import { validateCredentials } from "@/lib/auth-supabase";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    const user = await validateCredentials(username, password);

    if (user) {
      return NextResponse.json({ success: true, user });
    } else {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
