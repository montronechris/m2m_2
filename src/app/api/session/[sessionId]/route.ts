// src/app/api/session/[sessionId]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: session, error } = await supabase
      .from('qr_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return NextResponse.json(
        { error: 'Sessione non valida o scaduta.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      tableNumber: session.table_number,
      restaurantId: session.restaurant_id,
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: 'Errore interno del server', details: err.message },
      { status: 500 }
    );
  }
}