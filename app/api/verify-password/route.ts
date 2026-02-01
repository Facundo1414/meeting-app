import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Verificar las credenciales en la base de datos
    const { data, error } = await supabase
      .from("users_meeting_app")
      .select("id")
      .eq("username", username.toLowerCase())
      .eq("password", password)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, message: "Invalid password" },
        { status: 401 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 },
    );
  }
}
